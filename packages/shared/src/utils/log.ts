import chalk from 'chalk'
import npmlog from 'npmlog'
import { isString } from './types.js'

// type LogLevels = "silly" | "verbose" | "info" | "timing" | "http" | "notice" | "warn" | "error" | "silent";
const reset = () => {
  npmlog.heading = '@nemo-cli'
  npmlog.addLevel('success', 1500, { fg: 'green', bg: 'black', bold: true, bell: true })
  npmlog.level = 'warn'
}
reset()

const transformMessage = (messages: any[]) => {
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
  reset,
  init() {},
  set lever(v: any) {
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
  error(prefix = '', ...messages: any[]) {
    transformMessage(messages).forEach((message) => {
      if (isString(message)) {
        npmlog.error(prefix, chalk.red.bgBlack(message))
      } else {
        console.log(message)
      }
    })
  },
  success(prefix = '', ...messages: any[]) {
    transformMessage(messages).forEach((message) => {
      if (isString(message)) {
        npmlog.success(prefix, chalk.green.bgBlack(message))
      } else {
        console.log(message)
      }
    })
  }
}
