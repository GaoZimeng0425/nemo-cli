import { type Command, colors, createConfirm, createSelect, createSpinner, log, type Result, x } from '@nemo-cli/shared'
import { ErrorMessage, Message } from '@nemo-cli/ui'

import { HELP_MESSAGE } from '../constants'
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
    const message = (await process).stderr
    ErrorMessage({ text: `Failed to delete branch ${branch}. ${message}` })
  } else {
    Message({ text: `Successfully deleted branch ${colors.bgGreen(branch)}` })
  }
}

export function deleteCommand(command: Command) {
  const branchCommand = command
    .command('branch')
    .description('Git branch management')
    .addHelpText('after', HELP_MESSAGE.branch)

  branchCommand
    .command('clean')
    .description('Git branch clean merged to main')
    .addHelpText('after', HELP_MESSAGE.branchClean)
    .option('-l, --local', 'local branch', true)
    .option('-r, --remote', 'remote branch')
    .option('-a, --all', 'all branches')
    .action(async (_options: { local?: boolean; remote?: boolean; all?: boolean }) => {
      // 1. 选择时间范围: 1个月, 1年, 3个月
      // 2. 选择分支类型: 本地分支, 远程分支
      // 3. 多选分支: 所有分支, 已合并到主分支的分支
      // 4. 删除分支
    })

  branchCommand
    .command('delete')
    .description('Git branch delete')
    .addHelpText('after', HELP_MESSAGE.branchDelete)
    .option('-l, --local', 'local branch', true)
    .option('-r, --remote', 'remote branch')
    .option('-a, --all', 'all branches')
    .action(async (options: { local?: boolean; remote?: boolean; all?: boolean }) => {
      const { branches } = options.remote ? await getRemoteBranches() : await getLocalBranches()
      if (!branches || branches.length === 0) {
        ErrorMessage({ text: 'No branches found. Please check your git repository.' })
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
      await handleDelete(selectedBranch, { isLocal: !options.remote })
    })
}
