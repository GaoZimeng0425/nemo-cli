import { type Command, colors, createConfirm, createSelect, createSpinner, log, type Result, x } from '@nemo-cli/shared'

import { type BranchInfo, getLocalBranches, getRemoteBranches, isBranchMergedToMain } from '../utils'

const handleDelete = async (branch: BranchInfo, { isLocal }: { isLocal: boolean }) => {
  if (!branch.isMerged) {
    const confirm = await createConfirm({
      message: `Branch ${branch.branch} is not merged to main. Are you sure you want to delete it?`,
    })
    if (!confirm) {
      return
    }
  }

  const spinner = createSpinner(`Deleting branch ${branch}...`)
  let process: Result
  if (isLocal) {
    process = x('git', ['branch', '-d', branch.branch])
  } else {
    process = x('git', ['push', 'origin', '--delete', branch.branch])
  }

  for await (const line of process) {
    spinner.message(line)
  }

  const code = process.exitCode
  if (code) {
    spinner.stop(`Failed to delete branch ${branch}. Command exited with code ${process.exitCode}.`)
    log.error(process)
  } else {
    spinner.stop(colors.green(`Successfully deleted branch ${colors.bgGreen(branch)}`))
  }
}

export function deleteCommand(command: Command) {
  command
    .command('delete')
    .alias('del')
    .description('Delete a branch')
    .option('-l, --local', 'Delete local branch', true)
    .option('-r, --remote', 'Delete remote branch')
    .option('-a, --all', 'Delete all branches')
    .action(async (options: { local?: boolean; remote?: boolean; all?: boolean }) => {
      const { branches } = options.remote ? await getRemoteBranches() : await getLocalBranches()
      if (!branches || branches.length === 0) {
        log.error('No branches found. Please check your git repository.')
        return
      }

      const mergeInfoList: BranchInfo[] = await isBranchMergedToMain(branches)
      const enhancedOptions = mergeInfoList.map((branch) => {
        return {
          label: `${branch.branch} ${branch.isMerged ? colors.green('(merged)') : colors.yellow('(not merged)')}`,
          value: {
            branch: branch.branch,
            isMerged: branch.isMerged,
          },
          hint: branch.isMerged ? 'Safe to delete - already merged to main' : 'Caution - not merged to main',
        }
      })

      if (enhancedOptions.length === 0) {
        log.error('No branches to delete. Please check your git repository.')
        return
      }

      const selectedBranch = await createSelect({
        message: 'Select the branch to delete',
        options: enhancedOptions,
      })

      if (!selectedBranch) {
        log.error('No branch selected. Aborting delete operation.')
        return
      }
      // await handleDelete(selectedBranch, { isLocal: !options.remote })
    })
}
