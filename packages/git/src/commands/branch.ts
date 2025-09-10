import {
  type Command,
  colors,
  createConfirm,
  createNote,
  createSelect,
  createSpinner,
  log,
  type Result,
  x,
  xASync,
} from '@nemo-cli/shared'
import { ErrorMessage, Message } from '@nemo-cli/ui'

import { HELP_MESSAGE } from '../constants'
import { type BranchInfo, getLocalBranches, getRemoteBranches, isBranchMergedToMain } from '../utils'

const handleDelete = async (branch: BranchInfo, { isLocal }: { isLocal: boolean }) => {
  if (!branch.isMerged) {
    const confirm = await createConfirm({
      message: `Branch ${branch.branch} is not merged to main. Are you sure you want to delete it?`,
    })
    if (!confirm) return
  }

  const spinner = createSpinner(`Deleting branch ${branch.branch}...`)
  const process: Result = x(
    'git',
    isLocal ? ['branch', '-d', branch.branch] : ['push', 'origin', '--delete', branch.branch]
  )

  for await (const line of process) {
    spinner.message(line)
  }

  const code = process.exitCode
  if (code) {
    spinner.stop(`Failed to delete branch ${branch}. Command exited with code ${process.exitCode}.`)
  } else {
    spinner.stop(`Successfully deleted branch ${branch.branch}`)
  }
}

const excludeBranch = ['main', 'master', 'develop']
const oneDay = 60 * 60 * 24 // 秒
export function branchCommand(command: Command) {
  const subCommand = command
    .command('branch')
    .description('Git branch management')
    .addHelpText('after', HELP_MESSAGE.branch)

  subCommand
    .command('clean')
    .description('Git branch clean merged to main')
    .addHelpText('after', HELP_MESSAGE.branchClean)
    .action(async () => {
      // 1. 选择时间范围: 1个月, 1年, 3个月
      const timeRange = await createSelect({
        message: 'Select the time range',
        options: [
          { label: 'all', value: 0 },
          { label: '1 month', value: oneDay * 30 },
          { label: '1 year', value: oneDay * 365 },
          { label: '3 months', value: oneDay * 90 },
        ],
      })
      // 2. 获得所有已经合并的分支
      const { branches } = await getLocalBranches()
      const mergeInfoList: BranchInfo[] = await isBranchMergedToMain(
        branches.filter((branch) => !excludeBranch.includes(branch))
      )
      // 3. 获取分支最后提交时间, 并过滤掉时间范围内的分支
      const mergedBranches = mergeInfoList.filter((branch) => branch.isMerged).map((branch) => branch.branch)

      const lastCommitBranches = await Promise.all(
        mergedBranches.map(async (branch) => {
          const [_, result] = await xASync('git', ['show', '--format=%at', `${branch}`])
          const time = result?.stdout.split('\n')[0] ?? Date.now()
          return {
            branch,
            lastCommitTime: Number(time),
          }
        })
      )
      const now = Date.now() / 1000
      const deleteBranches = lastCommitBranches.filter((branch) => now - branch.lastCommitTime >= timeRange)
      if (deleteBranches.length === 0) {
        Message({ text: 'No branches to delete. Please check your git repository.' })
        return
      }
      // 4. 创建提示
      createNote({
        message: `Found ${deleteBranches.length} branches, will delete\n${deleteBranches.map((branch) => colors.red(branch.branch)).join('\n')}`,
        title: 'Delete Branches',
      })
      // 5. 确认删除
      const confirm = await createConfirm({ message: 'Are you sure you want to delete these branches?' })
      if (!confirm) return
      // 6. 删除分支
      await Promise.all(
        deleteBranches.map((branch) => handleDelete({ branch: branch.branch, isMerged: true }, { isLocal: true }))
      )
      Message({ text: 'Successfully deleted branches' })
    })

  subCommand
    .command('delete')
    .description('Git branch delete')
    .addHelpText('after', HELP_MESSAGE.branchDelete)
    .option('-l, --local', 'local branch', true)
    .option('-r, --remote', 'remote branch')
    .action(async (options: { local?: boolean; remote?: boolean }) => {
      const { branches } = options.remote ? await getRemoteBranches() : await getLocalBranches()
      if (!branches || branches.length === 0) {
        ErrorMessage({ text: 'No branches found. Please check your git repository.' })
        return
      }
      const mergeInfoList: BranchInfo[] = await isBranchMergedToMain(
        branches.filter((branch) => !excludeBranch.includes(branch))
      )

      if (mergeInfoList.length === 0) {
        ErrorMessage({ text: 'No branches to delete. Please check your git repository.' })
        return
      }

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
