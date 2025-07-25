import type { Command } from '@nemo-cli/shared'
import {
  colors,
  createConfirm,
  createSearch,
  createSelect,
  createSpinner,
  dynamicX,
  isEmpty,
  log,
} from '@nemo-cli/shared'

import { getLocalOptions, getRemoteOptions, handleGitPop, handleGitStash } from '../utils'

const handleMerge = async (branch: string, { isRemote = false }: { isRemote?: boolean } = {}) => {
  const spinner = createSpinner(`Merging branch ${branch}...`)
  const args = ['merge', branch]

  await handleGitStash()

  // 使用 stdio: 'inherit' 来支持交互式合并确认
  const process = dynamicX('git', args, { stdio: 'inherit' })

  const { exitCode, stderr } = await process
  if (exitCode) {
    spinner.stop(`Failed to merge branch ${branch}. Command exited with code ${exitCode}.`)
    log.show(stderr, { type: 'error' })
  } else {
    spinner.stop(`Successfully merged branch ${branch}.`)
  }

  await handleGitPop()
}

export function mergeCommand(command: Command) {
  command
    .command('merge')
    .alias('me')
    .argument('[branch]', 'The branch to merge')
    .option('-l, --local', 'Merge a local branch')
    .option('-r, --remote', 'Merge a remote branch')
    .option('-b, --branch <branch>', 'Create and merge a new branch')
    .description('Merge a branch')
    .action(async (_inputBranch, params: { local?: boolean; remote?: boolean; branch?: string; _: string[] }) => {
      let isLocal = params.local
      const branch = params.branch

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
          initialValue: true,
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

        if (check) handleMerge(selectedBranch, { isRemote: true })
      }
    })
}
