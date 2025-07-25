import { log as clackLog } from '@clack/prompts'
import ansiEscapes from 'ansi-escapes'
import chalk from 'chalk'
import winston from 'winston'

import type { ColorInstance } from './color'
import { isString } from './types'

// type LogLevels = "silly" | "verbose" | "info" | "timing" | "http" | "notice" | "warn" | "error" | "silent";
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    success: 2,
    info: 3,
    verbose: 4,
    silly: 5,
    timing: 6,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    success: 'green',
    info: 'blue',
    verbose: 'cyan',
    silly: 'magenta',
    timing: 'grey',
  },
}
const DEFAULT_OPTIONS = {
  heading: '@nemo-cli',
  level: 'error',
}

winston.addColors(customLevels.colors)

const init = (customOptions?: typeof DEFAULT_OPTIONS) => {
  const options = { ...customOptions, ...DEFAULT_OPTIONS }
  const logger = winston.createLogger({
    level: options.level,
    levels: customLevels.levels,
    format: winston.format.combine(winston.format.colorize({ all: true })),
    transports: [
      new winston.transports.Console({
        format: winston.format.simple(),
      }),
    ],
  })
  return logger
}

export const logger = init()

const transformMessage = (messages: unknown[]) => {
  for (let i = 0; i < messages.length; i++) {
    const [current, next] = [messages[i], messages[i + 1]]
    if (isString(current) && isString(next)) {
      messages.splice(i, 2, `${current}${next}`)
    }
  }
  return messages
}

export const log = {
  init,
  get level() {
    throw new Error("can't visit level")
  },
  set level(_: unknown) {
    throw new Error('use setLevel')
  },
  setLevel(level: keyof typeof customLevels.levels) {
    logger.level = level
  },
  stopDebug() {
    logger.level = 'warn'
    logger.warn('current winston level', logger.level)
  },
  show(
    message: string,
    options?: {
      symbol?: string
      colors?: ColorInstance
      type?: 'info' | 'success' | 'step' | 'warn' | 'error' | 'message'
    }
  ) {
    const text = options?.colors?.bold(message) ?? message
    const type = options?.type ?? 'info'

    if (options?.symbol) {
      clackLog.message(text, { symbol: options.symbol })
    } else {
      clackLog[type](text)
    }
  },
  info(...messages: unknown[]) {
    for (const message of transformMessage(messages)) {
      if (isString(message)) {
        logger.info(`${message}`)
      } else {
        logger.info(`${JSON.stringify(message, null, 2)}`)
      }
    }
  },
  warn(...messages: unknown[]) {
    for (const message of transformMessage(messages)) {
      if (isString(message)) {
        logger.warn(`${message}`)
      } else {
        logger.warn(`${JSON.stringify(message, null, 2)}`)
      }
    }
  },
  debug() {
    // logger.level = 'silly'
    logger.warn('current winston level', logger.level)
  },
  timing(time: string | number) {
    logger.log('timing', `${time}`)
  },
  error(...messages: unknown[]) {
    for (const message of transformMessage(messages)) {
      if (isString(message)) {
        logger.error(`${chalk.red.bgBlack(message)}`)
      } else {
        // fallback to console for non-string
        console.log(message)
      }
    }
  },
  verbose(...messages: unknown[]) {
    for (const message of transformMessage(messages)) {
      if (isString(message)) {
        logger.verbose(`${message}`)
      } else {
        logger.verbose(`${JSON.stringify(message, null, 2)}`)
      }
    }
  },
  success(...messages: unknown[]) {
    for (const message of transformMessage(messages)) {
      if (isString(message)) {
        logger.log('success', `${chalk.green.bgBlack(message)}`)
      } else {
        console.log(message)
      }
    }
  },
  clearScreen() {
    process.stdout.write(ansiEscapes.clearScreen)
  },
  clearTerminal() {
    process.stdout.write(ansiEscapes.clearTerminal)
  },
  beep() {
    process.stdout.write(ansiEscapes.beep)
  },
  scrollDown() {
    process.stdout.write(ansiEscapes.scrollDown)
  },
  scrollUp() {
    process.stdout.write(ansiEscapes.scrollUp)
  },
  eraseEndLine() {
    process.stdout.write(ansiEscapes.cursorPrevLine)
    process.stdout.write(ansiEscapes.eraseLine)
  },
}
