import { type Command, createSelect, log } from '@nemo-cli/shared'

import { getRemoteOptions, handleGitPop, handleGitPull, handleGitStash } from '../utils'

export function pullCommand(command: Command) {
  command
    .command('pull')
    .alias('pl')
    .description('Pull git branch')
    .action(async () => {
      const { options, currentBranch } = await getRemoteOptions()
      if (!options.length) {
        log.error('No branches found. Please check your git repository.')
        return
      }

      const selectedBranch = await createSelect({
        message: 'Select the branch to pull',
        options,
        initialValue: currentBranch,
      })
      if (!selectedBranch) {
        log.error('No branch selected. Aborting pull operation.')
        return
      }

      const hasStash = await handleGitStash()

      await handleGitPull(selectedBranch)

      hasStash && handleGitPop()
    })
}
