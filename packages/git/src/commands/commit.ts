import type { Command } from '@nemo-cli/shared'
import {
  addFiles,
  colors,
  createConfirm,
  createGroupMultiSelect,
  createSpinner,
  exit,
  getGitStatus,
  intro,
  log,
  outro,
  xASync,
} from '@nemo-cli/shared'

const lintHandle = async () => {
  const [error, result] = await xASync('lint-staged')
  if (error) return false
  if (result.stdout.includes('No staged files')) {
    log.show('No staged files.', { type: 'error' })
    exit(0)
    return false
  }

  return true
}

export const commitCommand = (command: Command) => {
  command
    .command('commit')
    .description('Commit a message')
    .action(async () => {
      intro(colors.bgYellowBright(' Git Commit Message '))

      const spinner = createSpinner('linting...')
      const lintResult = await lintHandle()
      console.log('🚀 : commitCommand : lintResult:', lintResult)
      spinner.stop()
      if (!lintResult) {
        const confirm = await createConfirm({
          message: 'Lint failed. Do you want to continue?',
          initialValue: false,
        })
        !confirm && exit(0)
      }

      // 1. 获取Git状态并展示工作区和暂存区文件
      const gitStatus = await getGitStatus()

      // 如果没有任何文件变更，提示用户
      if (gitStatus.staged.length === 0 && gitStatus.unstaged.length === 0) {
        log.show('No changes detected. Nothing to commit.', { type: 'warn' })
        exit(0)
      }

      // 创建选项对象，用于分组多选
      const fileGroups: Record<string, { value: string; label?: string; hint?: string }[]> = {}

      // 暂存区文件组（仅展示，不可选择）
      if (gitStatus.staged.length > 0) {
        fileGroups[colors.bgGreen(` Staged files (${gitStatus.staged.length}) `)] = gitStatus.staged.map((file) => ({
          label: `${colors.green(file)}`,
          value: file,
        }))
      }

      // 工作区文件组（可选择）
      if (gitStatus.unstaged.length > 0) {
        fileGroups[`📝 Working directory files (${gitStatus.unstaged.length})`] = gitStatus.unstaged.map((file) => ({
          label: `${gitStatus.modified.includes(file) ? '📝' : '➕'} ${file}`,
          value: file,
          hint: gitStatus.modified.includes(file) ? 'Modified' : 'Untracked',
        }))
      }

      const selectedFiles = await createGroupMultiSelect({
        message: 'Select files to stage for commit:',
        options: fileGroups,
        initialValues: gitStatus.staged,
        required: true,
      })

      if (selectedFiles.length > 0) {
        // 2. 将选择的工作区文件添加到暂存区
        const addSpinner = createSpinner('Adding files to staging area...')
        await addFiles(selectedFiles)
        addSpinner.stop()
        log.show(`Added ${selectedFiles.length} file(s) to staging area`, { type: 'success' })
      }

      //3. 获取当前cwd文件夹下 commitlint 文件中的 type-enum 进行选择

      //4. 获取当前cwd文件夹下 commitlint 文件中的 scope-enum 进行选择

      //5. 用户输入 Write a brief title describing the commit , 限制 80个字符

      //6. 用户输入 Write a detailed description of the changes (optional), 无字数限制

      outro(colors.bgGreen(' Git Commit Success '))
    })
}
