import { createCommand, exit, readPackage } from '@nemo-cli/shared'
import { ErrorMessage } from '@nemo-cli/ui'
import { blameCommand } from './commands/blame'
import { branchCommand } from './commands/branch'
import { checkoutCommand } from './commands/checkout'
import { commitCommand } from './commands/commit'
import { configCommand } from './commands/config'
import { diffCommand } from './commands/diff'
import { histCommand } from './commands/hist'
import { mergeCommand } from './commands/merge'
import { pullCommand } from './commands/pull'
import { pushCommand } from './commands/push'
import { stashCommand } from './commands/stash'
import { statusCommand } from './commands/status'
import { HELP_MESSAGE } from './constants'
import { checkGitRepository } from './utils'

export const pkg = readPackage(import.meta, '..')

export const init = () => {
  const command = createCommand('ng')
    .version(pkg.version)
    .description(`${pkg.name} CLI helper for git`)
    .addHelpText('after', HELP_MESSAGE.main)

  pullCommand(command)
  pushCommand(command)
  checkoutCommand(command)
  branchCommand(command)
  diffCommand(command)
  mergeCommand(command)
  stashCommand(command)
  blameCommand(command)
  commitCommand(command)
  statusCommand(command)
  histCommand(command)
  configCommand(command)

  return command
}

export const run = async () => {
  const isGitRepository = await checkGitRepository()
  if (!isGitRepository) {
    ErrorMessage({ text: 'Not a git repository' })
    exit(0)
  }

  const command = init()
  command.parse(process.argv)
}
