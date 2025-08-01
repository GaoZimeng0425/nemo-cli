import type { Command } from '@nemo-cli/shared'
import { colors, createConfirm, createSearch, createSelect, createSpinner, isEmpty, log, x } from '@nemo-cli/shared'

import { getLocalOptions, getRemoteOptions, handleGitPop, handleGitStash } from '../utils'

const handleCheckout = async (
  branch: string,
  { isNew = false, isRemote = false }: { isNew?: boolean; isRemote?: boolean } = {}
) => {
  const spinner = createSpinner(`Checking out branch ${branch}...`)
  const args = ['checkout']

  if (isNew || isRemote) {
    args.push('-b')
  }

  args.push(branch)

  if (isRemote) {
    args.push(`origin/${branch}`)
  }

  await handleGitStash()

  const process = x('git', args)

  for await (const line of process) {
    log.show(line)
  }

  const { exitCode, stderr } = await process
  if (exitCode) {
    spinner.stop(`Failed to checkout branch ${branch}. Command exited with code ${exitCode}.`)
    log.show(stderr, { type: 'error' })
  } else {
    spinner.stop(`Successfully checked out branch ${branch}.`)
  }

  await handleGitPop()
}

export function checkoutCommand(command: Command) {
  command
    .command('checkout')
    .alias('co')
    .argument('[branch]', 'The branch to checkout')
    .option('-l, --local', 'Checkout a local branch')
    .option('-r, --remote', 'Checkout a remote branch')
    .option('-b, --branch <branch>', 'Create and checkout a new branch')
    .description('Checkout a branch')
    .action(async (_inputBranch, params: { local?: boolean; remote?: boolean; branch?: string; _: string[] }) => {
      let isLocal = params.local
      const branch = params.branch

      if (branch) {
        handleCheckout(branch, { isNew: true })
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
          message: 'Select the branch to checkout',
          options,
        })
        handleCheckout(selectedBranch)
      } else {
        const { options } = await getRemoteOptions()
        const selectedBranch = await createSearch({
          message: 'Select the branch to checkout',
          options,
        })

        const check = await createConfirm({
          message: `Do you want to checkout ${colors.bgRed(selectedBranch)}?`,
        })

        if (check) handleCheckout(selectedBranch, { isRemote: true })
      }
    })
}
