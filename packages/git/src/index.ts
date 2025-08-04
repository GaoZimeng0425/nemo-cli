import { createCommand, readPackage } from '@nemo-cli/shared'

import { checkoutCommand } from './commands/checkout'
import { commitCommand } from './commands/commit'
import { deleteCommand } from './commands/delete'
import { diffCommand } from './commands/diff'
import { listCommand } from './commands/list'
import { mergeCommand } from './commands/merge'
import { pullCommand } from './commands/pull'
import { pushCommand } from './commands/push'
import { stashCommand } from './commands/stash'
import { HELP_MESSAGE } from './constants'

export const pkg = readPackage(import.meta, '..')

export const init = () => {
  const command = createCommand('ng')
    .version(pkg.version)
    .description(`${pkg.name} CLI helper for git`)
    .addHelpText('after', HELP_MESSAGE.main)

  pullCommand(command)
  listCommand(command)
  pushCommand(command)
  checkoutCommand(command)
  deleteCommand(command)
  diffCommand(command)
  mergeCommand(command)
  stashCommand(command)
  commitCommand(command)

  return command
}

export const run = () => {
  const command = init()
  command.parse(process.argv)
}
