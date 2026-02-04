import type { Command } from '@nemo-cli/shared'
import {
  colors,
  createConfirm,
  createInput,
  createOptions,
  createSelect,
  getCurrentBranch,
  isEmpty,
  isString,
  log,
  x,
} from '@nemo-cli/shared'
import { getBranchStashes, getLocalOptions, getRemoteOptions, handleGitPop, handleGitStash } from '../utils'
import type { StashMetadata } from '../utils/stash-index'

/**
 * 查找并恢复当前分支的 stash
 * 当用户 checkout 回之前的分支时，自动恢复该分支的 stash
 */
const restoreBranchStash = async (branchName: string) => {
  try {
    const branchStashes = await getBranchStashes(branchName)

    // 找到该分支最新的 active stash
    const activeStashes = branchStashes
      .filter((s: StashMetadata) => s.status === 'active' && s.operation === 'checkout')
      .sort((a: StashMetadata, b: StashMetadata) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    if (activeStashes.length === 0) {
      return
    }

    // 恢复最新的 stash
    const latestStash = activeStashes[0]
    if (!latestStash) {
      return
    }

    log.show(
      `Found stashed changes from previous checkout to ${colors.bgYellow(latestStash.targetBranch || 'unknown')}. Restoring...`,
      { type: 'info' }
    )

    await handleGitPop({ metadata: latestStash, stashName: latestStash.message })
  } catch (_error) {
    log.show(`Failed to restore stash for branch ${branchName}`, { type: 'warn' })
  }
}

const handleCheckout = async (
  branch: string,
  { isNew = false, isRemote = false }: { isNew?: boolean; isRemote?: boolean } = {}
) => {
  const currentBranchName = await getCurrentBranch()

  const args = ['checkout']

  if (isNew || isRemote) {
    args.push('-b')
  }

  args.push(branch)

  if (isRemote) {
    args.push(`origin/${branch}`)
  }

  // 如果目标分支和当前分支不同，才执行 stash
  const shouldStash = branch !== currentBranchName
  const stashResult = shouldStash ? await handleGitStash(branch, 'checkout') : null

  const process = x('git', args)
  log.show(stashResult?.stashName, { type: 'info' })

  for await (const line of process) {
    log.show(line)
  }

  const { exitCode, stderr } = await process
  if (exitCode) {
    log.show(`Failed to checkout branch ${branch}. Command exited with code ${exitCode}.`, { type: 'error' })
    log.show(stderr, { type: 'error' })
  } else {
    log.show(`Successfully checked out branch ${branch}.`, { type: 'success' })

    // Checkout 成功后，检查是否有该分支的 stash 需要恢复
    await restoreBranchStash(branch)
  }
}

export function checkoutCommand(command: Command) {
  command
    .command('checkout')
    .alias('co')
    .option('-l, --local', 'Checkout a local branch', true)
    .option('-r, --remote', 'Checkout a remote branch')
    .option('-b, --branch [branch]', 'Create and checkout a new branch')
    .description('Checkout a branch')
    .action(async (params: { local?: boolean; remote?: boolean; branch?: string | true }) => {
      let isLocal = params.local && !params.remote
      const branch = params.branch
      if (branch) {
        if (isString(branch)) {
          handleCheckout(branch, { isNew: true })
          return
        }
        const branchType = await createSelect({
          message: 'Enter the new branch name:',
          options: createOptions(['feature/PRIME-', 'feature/', 'bugfix/']),
        })
        const branchName = await createInput({
          message: 'Enter the new branch name:',
          validate: (value) => {
            if (!value?.trim()) return 'Branch name is required'
            if (value.length > 15) return 'Branch name must be less than 15 characters'
          },
        })
        handleCheckout(`${branchType}${branchName}`, { isNew: true })
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
        const selectedBranch = await createSelect({
          message: `Select the ${colors.bgGreen(' local ')} branch to checkout`,
          options,
        })
        handleCheckout(selectedBranch)
      } else {
        const { options } = await getRemoteOptions()
        const selectedBranch = await createSelect({
          message: `Select the ${colors.bgYellow(' remote ')} branch to checkout`,
          options,
        })

        const check = await createConfirm({
          message: `Do you want to checkout ${colors.bgRed(selectedBranch)}?`,
        })

        if (check) handleCheckout(selectedBranch, { isRemote: true })
      }
    })
}
