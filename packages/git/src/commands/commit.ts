import type { Command, PromptOptions } from '@nemo-cli/shared'
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
  getGitStatus,
  intro,
  log,
  outro,
  xASync,
} from '@nemo-cli/shared'
import { ErrorMessage } from '@nemo-cli/ui'

import { getCurrentBranch } from '../utils'
import { commitOptions } from './commit-options'
import { pushInteractive } from './push'

const lintHandle = async () => {
  const [error, result] = await xASync('lint-staged')
  if (error) return false
  if (result.stdout.includes('No staged files')) {
    log.show('No staged files.', { type: 'error' })
    exit(0)
  }
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

export const commitCommand = (command: Command) => {
  command
    .command('commit')
    .description('Commit a message')
    .action(async () => {
      console.clear()
      intro(colors.bgCyan.black(' Git Commit Message '))

      const spinner = createSpinner('linting...')
      const lintResult = await lintHandle()
      spinner.stop('linting done')
      if (!lintResult) {
        const confirm = await createConfirm({
          message: 'Lint failed. Do you want to continue?',
          initialValue: false,
        })
        !confirm && exit(0)
      }

      // 1. 获取Git状态并展示工作区和暂存区文件
      const { staged, unstaged } = await getGitStatus()

      // 如果没有任何文件变更，提示用户
      if (staged.length === 0 && unstaged.length === 0) {
        ErrorMessage({ text: 'No changes detected. Nothing to commit.' })
        exit(0)
      }

      // 创建选项对象，用于分组多选
      let fileGroups: PromptOptions[] = []

      log.show(`Changes to be committed:\n${staged.map((text) => colors.green(text)).join('\n')}`, { type: 'success' })

      // 工作区文件组（可选择）
      if (unstaged.length > 0) {
        fileGroups = createOptions(unstaged)
        const selectedFiles = await createCheckbox({
          message: 'Select files to stage for commit (optional):',
          options: fileGroups,
          required: false,
        })

        if (selectedFiles.length > 0) {
          // 2. 将选择的工作区文件添加到暂存区
          await addFiles(selectedFiles)
          log.show(`Added ${selectedFiles.length} file(s) to staging area`, { type: 'success' })
        }
      }

      //3. 获取当前cwd文件夹下 commitlint 文件中的 type-enum 进行选择
      // const options = 'commitlint.config.mjs'
      const commitType = await createSelect({
        message: 'Select type:',
        options: commitOptions.commit_type.options,
      })
      //4. 获取当前cwd文件夹下 commitlint 文件中的 scope-enum 进行选择
      const commitScope = await createSelect({
        message: 'Select scope:',
        options: commitOptions.commit_scope.options,
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
      const branch = await getCurrentBranch()
      const scopeMessage = commitScope ? `(${commitScope})` : ''
      const message = `${commitType}${scopeMessage}: ${branch} ${commitTitle}\n${commitBody}`
      const previewMessage = `${colors.blue(commitType)}${colors.green(scopeMessage)}: ${colors.redBright(branch)} ${commitTitle}\n${commitBody}`
      createNote({ message: previewMessage, title: 'Commit Message' })

      const confirm = await createConfirm({ message: 'Are you sure you want to commit?' })

      // 7. 发送 git commit 命令
      confirm && (await handleCommit(message))

      // 8. 发送 git push 命令
      const confirmPush = await createConfirm({ message: 'Do you want to push to remote?' })
      confirmPush && (await pushInteractive())
      outro(colors.bgGreen(' Git Commit Success '))
    })
}
