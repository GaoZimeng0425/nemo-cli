import type { Command } from '@nemo-cli/shared'
import { colors, createConfirm, createSelect, createSpinner, log, x } from '@nemo-cli/shared'

import { getCurrentBranch, getRemoteOptions } from '../utils'


const handlePush = async (branch: string) => {
  const spinner = createSpinner(`Pushing branch ${branch} to remote...`)
  const process = x('git', ['push', 'origin', branch])

  for await (const line of process) {
    spinner.message(line)
  }

  const code = process.exitCode
  if (code) {
    spinner.stop(`Failed to push branch ${branch}. Command exited with code ${process.exitCode}.`)
    log.error(process)
  } else {
    spinner.stop(colors.green(`Successfully pushed branch ${colors.bgGreen(branch)} to remote.`))
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
