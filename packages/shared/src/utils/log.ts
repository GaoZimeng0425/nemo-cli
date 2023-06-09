import chalk from 'chalk'
import npmlog from 'npmlog'
import ansiEscapes from 'ansi-escapes'
import { isString } from './types.js'

// type LogLevels = "silly" | "verbose" | "info" | "timing" | "http" | "notice" | "warn" | "error" | "silent";
const DEFAULT_OPTIONS = {
  heading: '@nemo-cli',
  level: 'warn'
}
const init = (customOptions?: typeof DEFAULT_OPTIONS) => {
  const options = { ...DEFAULT_OPTIONS, ...customOptions }

  npmlog.heading = options.heading
  npmlog.level = options.level

  npmlog.addLevel('success', 8000, {
    fg: 'green',
    bg: 'black',
    bold: true,
    bell: true
  })
}

init()
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
  ...npmlog,
  init,
  get level() {
    throw new Error("can't visit level")
  },
  set level(_: unknown) {
    throw new Error('use setLevel')
  },
  stopDebug() {
    npmlog.level = 'warn'
    npmlog.warn('current npmlog level', npmlog.level)
  },
  debug() {
    npmlog.level = 'silly'
    npmlog.warn('current npmlog level', npmlog.level)
  },
  timing(prefix = '', time: string | number) {
    npmlog.timing(prefix, `${time}`)
  },
  error(prefix = '', ...messages: unknown[]) {
    transformMessage(messages).forEach((message) => {
      if (isString(message)) {
        npmlog.error(prefix, chalk.red.bgBlack(message))
      } else {
        console.log(message)
      }
    })
  },
  verbose(prefix = '', ...messages: unknown[]) {
    transformMessage(messages).forEach((message) => {
      if (isString(message)) {
        npmlog.verbose(prefix, message)
      } else {
        npmlog.verbose(prefix, JSON.stringify(message, null, 2))
      }
    })
  },
  success(prefix = '', ...messages: unknown[]) {
    transformMessage(messages).forEach((message) => {
      if (isString(message)) {
        npmlog.success(prefix, chalk.green.bgBlack(message))
      } else {
        console.log(message)
      }
    })
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
    // process.stdout.moveCursor(0, -1)
    // process.stdout.clearLine(0)
    process.stdout.write(ansiEscapes.cursorPrevLine)
    process.stdout.write(ansiEscapes.eraseLine)
  }
}
