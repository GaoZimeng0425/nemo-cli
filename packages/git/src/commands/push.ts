import type { Command } from '@nemo-cli/shared'
import { BigText, colors, createConfirm, createSelect, createSpinner, log, x } from '@nemo-cli/shared'

import { getCurrentBranch, getRemoteOptions } from '../utils'

const handlePush = async (branch: string) => {
  const spinner = createSpinner(`Pushing branch ${branch} to remote...`)
  try {
    const process = x('git', ['push', 'origin', branch])
    for await (const line of process) {
      spinner.message(line)
    }

    const code = process.exitCode
    if (code) {
      throw new Error(`Failed code ${code}`)
    }
    spinner.stop(colors.green(`Successfully pushed branch ${colors.bgGreen(branch)} to remote.`))
  } catch (error) {
    spinner.stop()
    BigText({ text: `Failed to push branch ${branch}.` })
    log.error(error)
  }
}

export function pushCommand(command: Command) {
  command
    .command('push')
    .alias('ps')
    .description('Push current branch to remote')
    .action(async () => {
      const currentBranch = await getCurrentBranch()
      if (!currentBranch) {
        log.error('No branch selected. Aborting push operation.')
        return
      }
      const check = await createConfirm({
        message: `Do you want to push ${colors.bgGreen(currentBranch)} to remote?`,
      })

      if (check) {
        await handlePush(currentBranch)
        return
      }

      const { options } = await getRemoteOptions()
      const selectedBranch = await createSelect({
        message: 'Select the branch to push',
        options,
        initialValue: 'main',
      })
      handlePush(selectedBranch)
    })
}
