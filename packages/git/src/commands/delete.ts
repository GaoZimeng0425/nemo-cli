import { type Command, colors, createOptions, createSelect, createSpinner, log, type Result, x } from '@nemo-cli/shared'

import { getLocalBranches, getRemoteBranches } from '../utils'

const handleDelete = async (branch: string, { isLocal }: { isLocal: boolean }) => {
  const spinner = createSpinner(`Deleting branch ${branch}...`)
  let process: Result
  if (isLocal) {
    process = x('git', ['branch', '-d', branch])
  } else {
    process = x('git', ['push', 'origin', '--delete', branch])
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
      const selectedBranch = await createSelect({
        message: 'Select the branch to delete',
        options: createOptions(branches),
      })
      if (!selectedBranch) {
        log.error('No branch selected. Aborting delete operation.')
        return
      }
      await handleDelete(selectedBranch, { isLocal: !options.remote })
    })
}
