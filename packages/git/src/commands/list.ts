import type { Command } from '@nemo-cli/shared'
import { log, x } from '@nemo-cli/shared'

const remotePrefix = /^origin\//

export const getRemoteBranches = async () => {
  const branches = await x('git', ['branch', '-r'])
  return branches.stdout
    .split('\n')
    .filter((line) => line.trim() && !line.includes('->'))
    .map((line) => line.trim().replace(remotePrefix, ''))
}

export const getLocalBranches = async () => {
  const branches = await x('git', ['branch'])
  return branches.stdout
    .split('\n')
    .filter((line) => line.trim() && !line.includes('->'))
    .map((line) => line.trim())
}

export function listCommand(command: Command) {
  command
    .command('list')
    .alias('ls')
    .description('List all remote branches')
    .action(async () => {
      const branches = await getRemoteBranches()
      if (!branches || branches.length === 0) {
        log.error('No remote branches found. Please check your git repository.')
        return
      }
      log.info(`Found ${branches.length} remote branches:`)
      for (const branch of branches) {
        log.info(branch)
      }
    })
}
