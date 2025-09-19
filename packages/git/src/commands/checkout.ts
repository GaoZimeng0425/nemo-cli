import type { Command } from '@nemo-cli/shared'
import { colors, createConfirm, createInput, createSearch, createSelect, isEmpty, log, x } from '@nemo-cli/shared'
import { getLocalOptions, getRemoteOptions, handleGitPop, handleGitStash } from '../utils'

const handleCheckout = async (
  branch: string,
  { isNew = false, isRemote = false }: { isNew?: boolean; isRemote?: boolean } = {}
) => {
  const args = ['checkout']

  if (isNew || isRemote) {
    args.push('-b')
  }

  args.push(branch)

  if (isRemote) {
    args.push(`origin/${branch}`)
  }

  const stashName = await handleGitStash(branch)

  const process = x('git', args)

  for await (const line of process) {
    log.show(line)
  }

  const { exitCode, stderr } = await process
  if (exitCode) {
    log.show(`Failed to checkout branch ${branch}. Command exited with code ${exitCode}.`, { type: 'error' })
    log.show(stderr, { type: 'error' })
  } else {
    log.show(`Successfully checked out branch ${branch}.`, { type: 'success' })
  }

  stashName && handleGitPop(stashName)
}

const allDigits = /^\d+$/
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
        const newBranchName = branch === true ? await createInput({ message: 'Enter the new branch name:' }) : branch
        const isAllDigits = allDigits.test(newBranchName)
        handleCheckout(isAllDigits ? `feature/PRIME-${newBranchName}` : newBranchName, { isNew: true })
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
        const selectedBranch = await createSearch({
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
