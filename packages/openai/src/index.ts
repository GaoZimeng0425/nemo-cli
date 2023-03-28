import { Command } from 'commander'

import { readPackage } from '@nemo-cli/shared'

import { HELP_MESSAGE } from './constants.js'
import { chatCommand, completionCommand, keyCommand, modelsCommand } from './commands/index.js'

export const pkg = readPackage(import.meta, '..')

export const init = () => {
  const program = new Command('openai')
    .description(`${pkg.name} help you use openai in CLI`)
    .version(pkg.version)
    .usage('<Command> [options]')
    .addHelpText('after', HELP_MESSAGE.ai)

  chatCommand(program)
  completionCommand(program)
  modelsCommand(program)
  keyCommand(program)

  return program
}

export const run = () => {
  const command = init()
  command.parse(process.argv)
}
