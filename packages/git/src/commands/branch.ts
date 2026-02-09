import {
  type ColorsType,
  type Command,
  colors,
  createCheckbox,
  createConfirm,
  createNote,
  createSelect,
  createSpinner,
  log,
  type Result,
  x,
} from '@nemo-cli/shared'
import { ErrorMessage, Message, renderBranchViewer } from '@nemo-cli/ui'
import { HELP_MESSAGE } from '../constants'
import {
  type BranchInfo,
  getBranchCommitTime,
  getLocalBranches,
  getRemoteBranches,
  isBranchMergedToMain,
} from '../utils'

const formatTime = (time: number) => new Date(time * 1000).toLocaleString()
const formatBranch = (branch: string) => (branch.startsWith('origin/') ? branch.slice(7) : branch)

const displayBranches = (branches: string[], currentBranch: string, label: string, color: ColorsType) => {
  log.show(`${label} ${branches.length} branches`, { colors: colors[color] })
  for (const branch of branches) {
    if (branch === currentBranch) {
      log.show(`${branch}  (current)`, { type: 'info' })
    } else {
      log.show(branch, { type: 'step' })
    }
  }
}

const handleDelete = async (branch: BranchInfo, { isRemote }: { isRemote: boolean }) => {
  if (!branch.isMerged) {
    const confirm = await createConfirm({
      message: `Branch ${branch.branch} is not merged to main. Are you sure you want to delete it?`,
    })
    if (!confirm) return
  }

  const spinner = createSpinner(`Deleting branch ${branch.branch}...`)
  const process: Result = x(
    'git',
    isRemote ? ['push', 'origin', '--delete', formatBranch(branch.branch)] : ['branch', '-D', branch.branch]
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
          const time = await getBranchCommitTime(branch)
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
        deleteBranches.map((branch) => handleDelete({ branch: branch.branch, isMerged: true }, { isRemote: false }))
      )
      Message({ text: 'Successfully deleted branches' })
    })

  subCommand
    .command('delete')
    .description('Git branch delete')
    .addHelpText('after', HELP_MESSAGE.branchDelete)
    .option('-r, --remote', 'remote branch')
    .action(async (options: { remote?: boolean }) => {
      const { branches } = options.remote ? await getRemoteBranches() : await getLocalBranches()
      if (!branches || branches.length === 0) {
        ErrorMessage({ text: 'No branches found. Please check your git repository.' })
        return
      }
      const mergeInfoList: BranchInfo[] = await isBranchMergedToMain(
        (options.remote ? branches.map((branch) => `origin/${branch}`) : branches).filter(
          (branch) => !excludeBranch.includes(branch)
        )
      )

      if (mergeInfoList.length === 0) {
        ErrorMessage({ text: 'No branches to delete. Please check your git repository.' })
        return
      }

      const enhancedOptions = await Promise.all(
        mergeInfoList.map(async (branch) => {
          const lastCommitTime = await getBranchCommitTime(branch.branch)
          return {
            label: `${branch.branch} ${branch.isMerged ? colors.green('(merged)') : colors.yellow('(not merged)')}`,
            value: {
              lastCommitTime,
              branch: branch.branch,
              isMerged: branch.isMerged,
            },
            hint: `last commit: ${formatTime(Number(lastCommitTime))}`,
          }
        })
      )

      const deleteBranches = await createCheckbox({
        message: 'Select the branch to delete',
        options: enhancedOptions,
      })

      if (!deleteBranches.length) {
        log.error('No branch selected. Aborting delete operation.')
        return
      }
      await Promise.all(
        deleteBranches.map((branch) =>
          handleDelete({ branch: branch.branch, isMerged: true }, { isRemote: options.remote ?? false })
        )
      )
      Message({ text: 'Successfully deleted branches' })
    })

  subCommand
    .command('list')
    .alias('ls')
    .description('List git branches')
    .addHelpText('after', HELP_MESSAGE.branchList)
    .option('-l, --local', 'List local branches')
    .option('-r, --remote', 'List remote branches')
    .option('-a, --all', 'List all branches', true)
    .option('-n, --number <count>', 'Limit number of branches to show')
    .action(async (options: { local?: boolean; remote?: boolean; all?: boolean; number?: string }) => {
      // 如果指定了 -a, --all 或者同时没有指定 -l 和 -r，则使用交互式 viewer
      if (options.all || (!options.local && !options.remote)) {
        const maxCount = options.number ? Number.parseInt(options.number, 10) : undefined
        await renderBranchViewer(maxCount)
        return
      }

      // 保持原有的简单输出方式用于 -l 或 -r 单独指定的情况
      if (options.local) {
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
