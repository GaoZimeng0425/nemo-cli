import type { LoadConfigResult } from 'unconfig'

import type { Command } from '@nemo-cli/shared'
import {
  addFiles,
  colors,
  createCheckbox,
  createConfirm,
  createInput,
  createNote,
  createOptions,
  createSelect,
  createSpinner,
  exit,
  getCurrentBranch,
  getGitStatus,
  intro,
  loadConfig,
  log,
  outro,
  xASync,
} from '@nemo-cli/shared'
import { ErrorMessage } from '@nemo-cli/ui'
import {
  type CommitlintConfigType,
  commitlintConfig,
  mergeCommitScopeEnumOptions,
  mergeCommitTypeEnumOptions,
} from './commit-options'
import { pushInteractive } from './push'

const lintHandle = async () => {
  const [error, result] = await xASync('lint-staged')
  if (error?.message === 'spawn lint-staged ENOENT') return true
  if (error) return false
  return true
}
const handleCommit = async (message: string) => {
  const spinner = createSpinner('Committing...')
  const [error, _result] = await xASync('git', ['commit', '-m', message])
  if (error) {
    spinner.stop('Failed to commit')
  } else {
    spinner.stop('Committed')
  }
}
const handleLint = async () => {
  const spinner = createSpinner('run lint-staged linting...')
  const lintResult = await lintHandle()
  if (!lintResult) {
    const confirm = await createConfirm({
      message: 'Lint failed. Do you want to continue?',
      initialValue: false,
    })
    !confirm && exit(0)
  }
  spinner.stop('lint-staged done')
}

export const commitCommand = (command: Command) => {
  command
    .command('commit')
    .description('Commit a message')
    .action(async () => {
      console.clear()
      const title = colors.bgRed(`  ${await getCurrentBranch()}  `)
      intro(`${colors.bgCyan(' Current Branch: ')} ${title}`)

      // 1. 获取Git状态并展示工作区和暂存区文件
      const { staged, unstaged } = await getGitStatus()

      if (staged.length === 0 && unstaged.length === 0) {
        // 如果没有任何文件变更，提示用户
        ErrorMessage({ text: 'No changes detected. Nothing to commit.' })
        exit(0)
      }

      // 创建选项对象，用于分组多选

      log.show(`Changes to be committed:\n${staged.map((text) => colors.green(text)).join('\n')}`, { type: 'success' })
      const selectedStaged = staged

      if (unstaged.length > 0) {
        // 工作区文件组（可选择）
        const selectedFiles = await createCheckbox({
          message: 'Select files to stage for commit (optional):',
          options: createOptions(unstaged),
          required: false,
        })

        selectedStaged.push(...selectedFiles)

        if (selectedFiles.length > 0) {
          // 2. 将选择的工作区文件添加到暂存区
          await addFiles(selectedFiles)
          createNote({
            message: `Added ${selectedFiles.length} unstaged file(s) to staging area.\n${selectedFiles.map((file) => colors.green(file)).join('\n')}`,
            title: 'Add Files',
          })
        }
      }

      if (selectedStaged.length === 0) {
        ErrorMessage({ text: 'No staged files. Nothing to commit.' })
        exit(0)
      }

      await handleLint()

      const options: LoadConfigResult<CommitlintConfigType> = await loadConfig({
        sources: [
          {
            files: 'commitlint.config',
            extensions: ['js', 'ts', 'cjs', 'mjs', 'json', ''],
          },
        ],
      })

      //3. 获取当前cwd文件夹下 commitlint 文件中的 type-enum 进行选择
      const commitType = await createSelect({
        message: 'Select type:',
        options: mergeCommitTypeEnumOptions((options.config ?? commitlintConfig)!.rules['type-enum'][2] as string[]),
      })
      // 4. 获取当前cwd文件夹下 commitlint 文件中的 scope-enum 进行选择
      const commitScope = await createSelect({
        message: 'Select scope:',
        options: mergeCommitScopeEnumOptions((options.config ?? commitlintConfig)!.rules['scope-enum'][2] as string[]),
      })
      //5. 用户输入 Write a brief title describing the commit , 限制 80个字符
      const commitTitle = await createInput({
        message: 'Write a brief title describing the commit:',
        validate(value) {
          if (!value?.trim()) return 'Title is required'
          if (value.length > 80) return 'Title must be less than 80 characters'
        },
      })
      //6. 用户输入 Write a detailed description of the changes (optional), 无字数限制
      const commitBody = await createInput({
        message: 'Write a detailed description of the changes (optional):',
      })
      const ticket = await getTicket()

      const scopeMessage = commitScope ? `(${commitScope})` : ''
      const message = `${commitType}${scopeMessage}: ${ticket} ${commitTitle}\n${commitBody}`
      const previewMessage = `${colors.blue(commitType)}${colors.green(scopeMessage)}: ${colors.redBright(ticket)} ${commitTitle}\n${commitBody}`
      createNote({ message: previewMessage, title: 'Commit Message' })

      const confirm = await createConfirm({ message: 'Are you sure you want to commit?' })

      // 7. 发送 git commit 命令
      if (!confirm) return
      await handleCommit(message)

      // 8. 发送 git push 命令
      const confirmPush = await createConfirm({ message: 'Do you want to push to remote?' })
      confirmPush && (await pushInteractive())
      outro(colors.bgGreen(' Git Commit Success '))
    })
}

export const REGEX_SLASH_TAG = new RegExp(/\/(\w+-\d+)/)
export const REGEX_START_TAG = new RegExp(/^(\w+-\d+)/)
export const REGEX_START_UND = new RegExp(/^([A-Z]+-[[a-zA-Z\]\d]+)_/)
export const REGEX_SLASH_UND = new RegExp(/\/([A-Z]+-[[a-zA-Z\]\d]+)_/)
export const REGEX_SLASH_NUM = new RegExp(/\/(\d+)/)
export const REGEX_START_NUM = new RegExp(/^(\d+)/)

const getTicket = async () => {
  const branch = await getCurrentBranch()
  const chain = [REGEX_START_UND, REGEX_SLASH_UND, REGEX_SLASH_TAG, REGEX_SLASH_NUM, REGEX_START_TAG, REGEX_START_NUM]
  for (const regex of chain) {
    const match = branch.match(regex)
    if (match) return match[1]
  }
  return branch
}
