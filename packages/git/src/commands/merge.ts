import type { Command } from '@nemo-cli/shared'
import {
  colors,
  createConfirm,
  createSearch,
  createSelect,
  createSpinner,
  isEmpty,
  log,
  xASync,
} from '@nemo-cli/shared'
import {
  getLocalBranchOptions,
  getRemoteBranchOptions,
  handleGitPop,
  handleGitStash,
  handleMergeCommit,
} from '../utils'

const handleMerge = async (branch: string) => {
  const spinner = createSpinner(`Merging branch ${branch}...`)
  const args = ['merge', '--no-edit', branch]

  const stashResult = await handleGitStash(undefined, { branch, operation: 'merge' })

  if (!stashResult) {
    spinner.stop('Cannot proceed with merge: failed to stash changes.')
    return
  }

  try {
    // 使用 stdio: 'inherit' 来支持交互式合并确认
    const [error, result] = await xASync('git', args, {
      nodeOptions: {
        stdio: 'inherit',
      },
    })

    if (error) {
      spinner.stop()
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to merge branch ${branch}: ${errorMessage}`)
    }

    // 停止 spinner，准备可能的编辑器交互
    spinner.stop()

    // 检查是否需要处理合并提交
    if (result.stdout.includes('Merge branch') || result.stdout.includes('Merge made by')) {
      await handleMergeCommit()
    }

    log.show(colors.green(`Successfully merged branch ${colors.bgGreen(branch)}.`), { type: 'success' })
  } catch (error) {
    spinner.stop()
    log.show(`Failed to merge branch ${branch}.`, { type: 'error' })
    log.error(error)
    throw error
  } finally {
    if (stashResult) {
      await handleGitPop(stashResult)
    }
  }
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
        await handleMerge(branch)
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
        const { options } = await getLocalBranchOptions()
        const selectedBranch = await createSearch({
          message: 'Select the branch to merge',
          options,
        })
        await handleMerge(selectedBranch)
      } else {
        const { options } = await getRemoteBranchOptions()
        const selectedBranch = await createSearch({
          message: 'Select the branch to merge',
          options,
        })

        const check = await createConfirm({
          message: `Do you want to merge ${colors.bgRed(selectedBranch)}?`,
        })

        if (check) await handleMerge(selectedBranch)
      }
    })
}
