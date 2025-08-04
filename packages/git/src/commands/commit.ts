import type { Command } from '@nemo-cli/shared'
import {
  addFiles,
  colors,
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
  if (error) {
    log.show(error.message, { type: 'error' })
    exit(0)
  }

  if (result.stdout.includes('No staged files')) {
    log.show('No staged files.', { type: 'error' })
    exit(0)
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
      await lintHandle()
      spinner.stop()

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

      let selectedFiles: string[] = []

      // 如果有工作区文件，让用户选择要添加到暂存区的文件
      if (gitStatus.unstaged.length > 0) {
        selectedFiles = await createGroupMultiSelect({
          message: 'Select files to stage for commit:',
          options: fileGroups,
          initialValues: gitStatus.staged,
          required: true,
        })

        // 2. 将选择的工作区文件添加到暂存区
        if (selectedFiles.length > 0) {
          const addSpinner = createSpinner('Adding files to staging area...')
          await addFiles(selectedFiles)
          addSpinner.stop()
          log.show(`Added ${selectedFiles.length} file(s) to staging area`, { type: 'success' })
        }
      } else {
        // 如果没有工作区文件，仅展示暂存区文件
        log.show('\n📦 Files ready for commit:', { type: 'info' })
        gitStatus.staged.forEach((file) => {
          log.show(`  ✅ ${file}`, { type: 'step' })
        })
      }

      //3. 获取当前cwd文件夹下 commitlint 文件中的 type-enum 进行选择

      //4. 获取当前cwd文件夹下 commitlint 文件中的 scope-enum 进行选择

      //5. 用户输入 Write a brief title describing the commit , 限制 80个字符

      //6. 用户输入 Write a detailed description of the changes (optional), 无字数限制

      outro(colors.bgGreen(' Git Commit Success '))
    })
}
