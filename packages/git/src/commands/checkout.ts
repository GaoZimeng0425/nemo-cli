import type { Command } from '@nemo-cli/shared'
import { colors, createConfirm, createSelect, createSpinner, isEmpty, log, x } from '@nemo-cli/shared'

import { getLocalOptions, getRemoteOptions } from '../utils.js'

const handleCheckout = async (branch: string, isNew = false) => {
  const spinner = createSpinner(`Checking out branch ${branch}...`)
  const args = ['checkout']
  if (isNew) {
    args.push('-b')
  }
  args.push(branch)
  const process = x('git', args)

  for await (const line of process) {
    spinner.message(line)
  }

  const code = process.exitCode
  if (code) {
    spinner.stop(`Failed to checkout branch ${branch}. Command exited with code ${process.exitCode}.`)
    log.error(process)
  } else {
    spinner.stop(`Successfully checked out branch ${branch}.`)
  }
}

export function checkoutCommand(command: Command) {
  command
    .command('checkout')
    .alias('co')
    .argument('[branch]', 'The branch to checkout')
    .option('-l, --local', 'Checkout a local branch')
    .option('-r, --remote', 'Checkout a remote branch', true)
    .option('-b, --branch <branch>', 'Create and checkout a new branch')
    .description('Checkout a branch')
    .action(async (inputBranch, params: { local?: boolean; remote?: boolean; branch?: string; _: string[] }) => {
      let isLocal = params.local
      const branch = params.branch

      if (branch) {
        handleCheckout(branch, true)
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
        const selectedBranch = await createSelect({
          message: 'Select the branch to checkout',
          options,
          initialValue: inputBranch,
        })
        handleCheckout(selectedBranch)
      } else {
        const { options } = await getRemoteOptions()
        const selectedBranch = await createSelect({
          message: 'Select the branch to checkout',
          options,
          initialValue: inputBranch ?? 'main',
        })

        const check = await createConfirm({
          message: `Do you want to checkout ${colors.bgGreen(selectedBranch)}?`,
        })

        if (check) handleCheckout(selectedBranch)
      }
    })
}
