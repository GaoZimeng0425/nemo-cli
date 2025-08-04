import type { Command } from '@nemo-cli/shared'
import { colors, createConfirm, createSearch, createSelect, createSpinner, isEmpty, xASync } from '@nemo-cli/shared'

import { getLocalOptions, getRemoteOptions, handleGitPop, handleGitStash } from '../utils'

const handleMerge = async (branch: string) => {
  const spinner = createSpinner(`Merging branch ${branch}...`)
  const args = ['merge', branch]

  const hasStash = await handleGitStash()

  // 使用 stdio: 'inherit' 来支持交互式合并确认
  const [error] = await xASync('git', args, {
    nodeOptions: {
      stdio: 'inherit',
    },
  })
  if (error) return

  spinner.stop(`Successfully merged branch ${branch}.`)

  hasStash && handleGitPop()
}

export function mergeCommand(command: Command) {
  command
    .command('merge')
    .alias('mg')
    .argument('[branch]', 'The branch to merge')
    .option('-l, --local', 'Merge a local branch')
    .option('-r, --remote', 'Merge a remote branch')
    .option('-b, --branch <branch>', 'Create and merge a new branch')
    .description('Merge a branch')
    .action(async (branch, params: { local?: boolean; remote?: boolean }) => {
      let isLocal = params.local

      if (branch) {
        handleMerge(branch)
        return
      }

      if (isEmpty(params)) {
        isLocal = await createSelect({
          message: 'Select the branch type',
          options: [
            { label: 'Remote', value: false },
            { label: 'Local', value: true },
          ],
          initialValue: false,
        })
      }

      if (isLocal) {
        const { options } = await getLocalOptions()
        const selectedBranch = await createSearch({
          message: 'Select the branch to merge',
          options,
        })
        handleMerge(selectedBranch)
      } else {
        const { options } = await getRemoteOptions()
        const selectedBranch = await createSearch({
          message: 'Select the branch to merge',
          options,
        })

        const check = await createConfirm({
          message: `Do you want to merge ${colors.bgRed(selectedBranch)}?`,
        })

        if (check) handleMerge(selectedBranch)
      }
    })
}
