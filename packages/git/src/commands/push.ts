import type { Command } from '@nemo-cli/shared'
import { createConfirm, createSelect, log, x } from '@nemo-cli/shared'
import { getRemoteBranches } from './list'

const getCurrentBranch = async () => {
  const result = await x('git rev-parse --abbrev-ref HEAD')
  if (result.exitCode) {
    log.error(`Failed to get current branch. Command exited with code ${result.exitCode}.`)
    log.error(result)
    return result.stderr.trim()
  }
  return result.stdout.trim()
}

const handlePush = async (branch: string) => {
  log.info(`Pushing branch ${branch} to remote...`)
  const process = x('git', ['push', 'origin', branch])

  for await (const line of process) {
    log.info(line)
  }

  const code = process.exitCode
  if (code) {
    log.error(`Failed to push branch ${branch}. Command exited with code ${process.exitCode}.`)
    log.error(process)
  } else {
    log.success(`Successfully pushed branch ${branch} to remote.`)
  }
}

export function pushCommand(command: Command) {
  command
    .command('push')
    .alias('p')
    .description('Push current branch to remote')
    .action(async () => {
      const currentBranch = await getCurrentBranch()
      if (!currentBranch) {
        log.error('No branch selected. Aborting push operation.')
        return
      }
      log.info(`Current branch is ${currentBranch}`)
      const check = await createConfirm({
        message: `Do you want to push ${currentBranch} to remote?`,
        default: true,
      })
      if (!check) {
        log.info('Aborting push operation.')
        return
      }
      await handlePush(currentBranch)

      const remoteBranches = await getRemoteBranches()
      const selectedBranch = await createSelect({
        message: 'Select the branch to push',
        choices: remoteBranches.map((branch) => ({
          name: branch,
          value: branch,
        })),
        default: currentBranch,
      })
      if (!selectedBranch) {
        log.error('No branch selected. Aborting push operation.')
        return
      }
      await handlePush(selectedBranch)
    })
}
