import { type Command, colors, log } from '@nemo-cli/shared'

import { getLocalBranches, getRemoteBranches } from '../utils'

export function listCommand(command: Command) {
  command
    .command('list')
    .alias('ls')
    .description('List git branches')
    .option('-l, --local', 'List local branches')
    .option('-r, --remote', 'List remote branches')
    .option('-a, --all', 'List all branches', true)
    .action(async (options: { local?: boolean; remote?: boolean; all?: boolean }) => {
      if (options.all) {
        const { branches: localBranches, currentBranch } = await getLocalBranches()
        const { branches: remoteBranches } = await getRemoteBranches()
        if (!localBranches.length && !remoteBranches.length) {
          log.error('No branches found. Please check your git repository.')
          return
        }

        log.show(`Local ${localBranches.length} branches`, { symbol: '🔖', colors: colors.bgGreen })
        for (const branch of localBranches) {
          if (branch === currentBranch) {
            log.show(`${branch}  (current)`, { symbol: '⚡' })
          } else {
            log.show(branch, { symbol: '📌' })
          }
        }
        log.show(`Remote ${remoteBranches.length} branches`, { symbol: '🔖', colors: colors.bgYellow })
        for (const branch of remoteBranches) {
          if (branch === currentBranch) {
            log.show(`${branch}  (current)`, { symbol: '⚡' })
          } else {
            log.show(branch, { symbol: '🌍' })
          }
        }
      } else if (options.local) {
        const { branches } = await getLocalBranches()
        if (!branches || branches.length === 0) {
          log.error('No local branches found. Please check your git repository.')
          return
        }
        log.info(`Found ${branches.length} local branches:`)
        for (const branch of branches) {
          log.info(branch)
        }
      } else {
        const { branches } = await getRemoteBranches()
        if (!branches || branches.length === 0) {
          log.error('No remote branches found. Please check your git repository.')
          return
        }
        log.info(`Found ${branches.length} remote branches:`)
        for (const branch of branches) {
          log.info(branch)
        }
      }
    })
}
