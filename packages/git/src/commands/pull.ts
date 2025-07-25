import { type Command, createSelect, log } from '@nemo-cli/shared'

import { getRemoteOptions, handleGitPull } from '../utils'


export function pullCommand(command: Command) {
  command
    .command('pull')
    .alias('pl')
    .description('Pull git branch')
    .action(async () => {
      const { options } = await getRemoteOptions()
      if (!options.length) {
        log.error('No branches found. Please check your git repository.')
        return
      }

      const selectedBranch = await createSelect({
        message: 'Select the branch to pull',
        options,
        initialValue: 'main',
      })
      if (!selectedBranch) {
        log.error('No branch selected. Aborting pull operation.')
        return
      }

      await handleGitPull(selectedBranch)
    })
}
