import { createCommand, readPackage } from '@nemo-cli/shared'

import { addCommand } from './commands/add'
import { cleanCommand } from './commands/clean'
import { listCommand } from './commands/list'
import { removeCommand } from './commands/remove'
import { upgradeCommand } from './commands/upgrade'
import { HELP_MESSAGE } from './constants'

export const pkg = readPackage(import.meta, '..')

export const init = () => {
  const command = createCommand('np')
    .version(pkg.version)
    .description(`${pkg.name} CLI helper for pnpm workspaces`)
    .addHelpText('after', HELP_MESSAGE.main)

  addCommand(command)
  upgradeCommand(command)
  removeCommand(command)
  listCommand(command)
  cleanCommand(command)

  return command
}

export const run = () => {
  const command = init()
  command.parse(process.argv)
}
