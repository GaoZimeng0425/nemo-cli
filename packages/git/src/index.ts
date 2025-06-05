import { readPackage } from '@nemo-cli/shared'
import { Command } from 'commander'
import { listCommand } from './commands/list'
import { pushCommand } from './commands/push'
import { HELP_MESSAGE } from './constants'

export const pkg = readPackage(import.meta, '..')

export const init = () => {
  const command = new Command('ng')
    .version(pkg.version)
    .description(`${pkg.name} CLI helper for git`)
    .addHelpText('after', HELP_MESSAGE.main)

  listCommand(command)
  pushCommand(command)

  return command
}

export const run = () => {
  const command = init()
  command.parse(process.argv)
}
