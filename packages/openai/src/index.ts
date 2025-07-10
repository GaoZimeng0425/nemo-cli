
import { createCommand, readPackage } from '@nemo-cli/shared'

import { completionCommand, keyCommand, modelsCommand } from './commands/index.js'
import { HELP_MESSAGE } from './constants.js'

export const pkg = readPackage(import.meta, '..')

export const init = () => {
  const program = createCommand('openai')
    .description(`${pkg.name} help you use openai in CLI`)
    .version(pkg.version)
    .usage('<Command> [options]')
    .addHelpText('after', HELP_MESSAGE.ai)

  // chatCommand(program)
  completionCommand(program)
  modelsCommand(program)
  keyCommand(program)

  return program
}

export const run = () => {
  const command = init()
  command.parse(process.argv)
}
