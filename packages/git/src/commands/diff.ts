import { type Command, createOptions, createSelect, getCurrentBranch, log, type Result, x } from '@nemo-cli/shared'
import { renderDiffViewer } from '@nemo-cli/ui'
import { getLocalBranches, getRemoteBranches } from '../utils'

const handleDiff = async (branch: string, { isLocal }: { isLocal: boolean }) => {
  // Get current branch for comparison
  const currentBranch = await getCurrentBranch()
  if (!currentBranch) {
    log.error('Could not determine current branch')
    return
  }

  // If selected branch is the same as current, show diff with working directory
  const targetBranch = branch === currentBranch ? undefined : branch

  log.show(
    `Showing diff between ${branch === currentBranch ? 'working directory and HEAD' : `${branch} and ${currentBranch}`}`
  )

  // Use the interactive diff viewer with error handling
  try {
    await renderDiffViewer(targetBranch)
  } catch (error) {
    log.error(
      `Failed to display diff viewer: ${error instanceof Error ? error.message : 'Unknown error'}${targetBranch ? ` (branch: ${targetBranch})` : ''}`
    )
  }
}

export function diffCommand(command: Command) {
  command
    .command('diff')
    .alias('di')
    .description('Show differences between branches or working directory')
    .option('-l, --local', 'Diff local branch', true)
    .option('-r, --remote', 'Diff remote branch')
    .action(async (options: { local?: boolean; remote?: boolean }) => {
      const { branches } = options.remote ? await getRemoteBranches() : await getLocalBranches()
      if (!branches || branches.length === 0) {
        log.error('No branches found. Please check your git repository.')
        return
      }
      const selectedBranch = await createSelect({
        message: 'Select the branch to diff',
        options: createOptions(branches),
      })
      if (!selectedBranch) {
        log.error('No branch selected. Aborting diff operation.')
        return
      }
      await handleDiff(selectedBranch, { isLocal: !options.remote })
    })
}
