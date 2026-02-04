import { type Command, createSelect, log } from '@nemo-cli/shared'
import { getRemoteOptions, handleGitPop, handleGitPull, handleGitStash } from '../utils'

export function pullCommand(command: Command) {
  command
    .command('pull')
    .alias('pl')
    .description('Pull git branch')
    .option('-r, --rebase', 'Use rebase mode instead of merge')
    .option('-m, --merge', 'Use merge mode (default)')
    .action(async (options: { rebase?: boolean; merge?: boolean }) => {
      const { options: branchOptions, currentBranch } = await getRemoteOptions()
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
            { label: 'Merge (default)', value: 'merge', hint: 'git pull origin <branch>' },
            { label: 'Rebase', value: 'rebase', hint: 'git pull --rebase origin <branch>' },
          ],
          initialValue: 'merge',
        })
        useRebase = pullMode === 'rebase'
      }

      const stashResult = await handleGitStash(undefined, { branch: selectedBranch, operation: 'pull' })

      await handleGitPull(selectedBranch, { rebase: useRebase })

      stashResult && handleGitPop(stashResult)
    })
}
