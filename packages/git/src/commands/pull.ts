import { type Command, createSelect, log } from '@nemo-cli/shared'
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
      let repositories: string[]
      try {
        const result = await getRemoteRepositoryOptions()
        repositories = result.remotes
      } catch (error) {
        log.error(`Failed to get remote repositories: ${error instanceof Error ? error.message : String(error)}`)
        return
      }

      if (repositories.length === 0) {
        log.error('No remote repositories found. Aborting pull operation.')
        log.show('Hint: Use "git remote add <name> <url>" to add a remote repository.', { type: 'info' })
        return
      }

      // Select remote if multiple remotes exist
      let selectedRepository = repositories[0]
      if (repositories.length > 1) {
        selectedRepository = await createSelect({
          message: 'Select remote repository',
          options: repositories.map((repo) => ({ label: repo, value: repo })),
          initialValue: repositories[0],
        })
        if (!selectedRepository) {
          log.error('No remote selected. Aborting pull operation.')
          return
        }
      }

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
