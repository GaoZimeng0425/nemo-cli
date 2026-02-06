import { clearScreen as ansiClearScreen, clearTerminal as ansiClearTerminal } from 'ansi-escapes'
import colors, {
  type BackgroundColorName,
  type ChalkInstance,
  type ColorName,
  type ForegroundColorName,
  type ModifierName,
} from 'chalk'

export const clearScreen = () => console.log(ansiClearScreen)
export const clearTerminal = () => console.log(ansiClearTerminal)
export type ColorInstance = ChalkInstance
export type ColorsType = ColorName | ForegroundColorName | BackgroundColorName | ModifierName
export { colors }

// import pc from 'picocolors'

// export const colors = {
//   // fg
//   green: chalk.green,
//   red: chalk.red,
//   yellow: chalk.yellow,
//   blue: chalk.blue,
//   magenta: chalk.magenta,
//   cyan: chalk.cyan,
//   white: chalk.white,
//   // bg
//   bgGreen: chalk.bgGreen,
//   bgRed: chalk.bgRed,
//   bgYellow: chalk.bgYellow,
//   bgBlue: chalk.bgBlue,
//   bgMagenta: chalk.bgMagenta,
//   bgCyan: chalk.bgCyan,
//   bgWhite: chalk.bgWhite,
// } as const

// export * as chalk from 'chalk'
