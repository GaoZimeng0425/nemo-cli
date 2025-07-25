import { type Command, createOptions, createSelect, createSpinner, log, type Result, x } from '@nemo-cli/shared'

import { getCurrentBranch, getLocalBranches, getRemoteBranches } from '../utils'

const handleDiff = async (branch: string, { isLocal }: { isLocal: boolean }) => {
  console.log('🚀 : handleDiff : branch:', branch, isLocal)

  // Get current branch for comparison
  const currentBranch = await getCurrentBranch()
  if (!currentBranch) {
    log.error('Could not determine current branch')
    return
  }

  // If selected branch is the same as current, show diff with working directory
  const diffArgs = branch === currentBranch ? ['diff'] : ['diff', `${branch}...${currentBranch}`]

  log.show(
    `Showing diff between ${branch === currentBranch ? 'working directory and HEAD' : `${branch} and ${currentBranch}`}`
  )

  const process: Result = x('git', diffArgs)

  let hasOutput = false
  for await (const line of process) {
    hasOutput = true
    log.show(line)
  }

  const { exitCode, stderr } = await process

  if (exitCode) {
    log.error(`Failed to diff. Command exited with code ${exitCode}.`)
    if (stderr) {
      log.error(stderr)
    }
  } else if (!hasOutput) {
    log.show('No differences found.', { type: 'info' })
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
