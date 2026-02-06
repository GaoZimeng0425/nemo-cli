import { type Command, createSelect, createSpinner, log, safeAwait, xASync } from '@nemo-cli/shared'
import {
  getRemoteBranchOptions,
  getRemoteRepositoryOptions,
  handleGitPop,
  handleGitPull,
  handleGitStash,
} from '../utils'

export function pullCommand(command: Command) {
  command
    .command('pull')
    .alias('pl')
    .description('Pull git branch')
    .option('-r, --rebase', 'Use rebase mode instead of merge')
    .option('-m, --merge', 'Use merge mode (default)')
    .action(async (options: { rebase?: boolean; merge?: boolean }) => {
      // Get available remotes
      const [error, result] = await safeAwait(getRemoteRepositoryOptions())
      if (error) {
        log.error(`Failed to get remote repositories: ${error.message}`)
        return
      }
      const repositories = result.remotes

      if (repositories.length === 0) {
        log.error('No remote repositories found. Aborting pull operation.')
        log.show('Hint: Use "git remote add <name> <url>" to add a remote repository.', { type: 'info' })
        return
      }

      // Select remote if multiple remotes exist
      const selectedRepository =
        repositories.length > 1
          ? (
              await safeAwait(
                createSelect({
                  message: 'Select remote repository',
                  options: result.options,
                  initialValue: repositories[0],
                })
              )
            )[1]
          : repositories[0]

      if (!selectedRepository) {
        log.error('No remote selected. Aborting pull operation.')
        return
      }

      // Fetch latest remote branches to ensure we have the most up-to-date list
      const spinner = createSpinner('Fetching latest remote branches...')
      const [fetchError] = await xASync('git', ['fetch', selectedRepository, '--prune'], {
        timeout: 30000,
      })
      if (fetchError) {
        spinner.stop('Failed to fetch latest remote branches')
        log.error(`Failed to fetch from ${selectedRepository}: ${fetchError.message}`)
        log.show('Please check your network connection and try again.', { type: 'info' })
        return
      }
      spinner.stop('Successfully fetched latest remote branches')

      const { options: branchOptions, currentBranch } = await getRemoteBranchOptions()
      if (!branchOptions.length) {
        log.error('No branches found. Please check your git repository.')
        return
      }

      const selectedBranch = await createSelect({
        message: 'Select the branch to pull',
        options: branchOptions,
        initialValue: currentBranch,
      })
      if (!selectedBranch) {
        log.error('No branch selected. Aborting pull operation.')
        return
      }

      // 确定 pull 模式：如果命令行指定了 --rebase 或 --merge，直接使用；否则询问用户
      let useRebase = options.rebase === true

      if (!options.rebase && !options.merge) {
        const pullMode = await createSelect({
          message: 'Select pull mode',
          options: [
            { label: 'Merge (default)', value: 'merge', hint: `git pull ${selectedRepository} ${selectedBranch}` },
            { label: 'Rebase', value: 'rebase', hint: `git pull --rebase ${selectedRepository} ${selectedBranch}` },
          ],
          initialValue: 'merge',
        })
        useRebase = pullMode === 'rebase'
      }

      const stashResult = await handleGitStash(undefined, { branch: selectedBranch, operation: 'pull' })

      await handleGitPull(selectedBranch, { remote: selectedRepository, rebase: useRebase })

      stashResult && handleGitPop(stashResult)
    })
}
