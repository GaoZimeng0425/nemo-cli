import type { Command } from '@nemo-cli/shared'
import { log, xASync } from '@nemo-cli/shared'
import type { StatusFile } from '@nemo-cli/ui'
import { renderStatusViewer } from '@nemo-cli/ui'

/**
 * 获取修改的文件列表
 */
const getStatusFiles = async (): Promise<StatusFile[]> => {
  const [error, result] = await xASync('git', ['status', '--porcelain'], { quiet: true })
  if (error) return []

  const lines = result.stdout.split('\n').filter((line) => line.trim())
  const files: StatusFile[] = []

  for (const line of lines) {
    if (line.length < 3) continue

    const stagedStatus = line[0] ?? ' '
    const unstagedStatus = line[1] ?? ' '
    const path = line.slice(3).trim()

    // 确定文件的最终状态
    let status = unstagedStatus
    let staged = false

    if (unstagedStatus === ' ' && stagedStatus !== ' ' && stagedStatus !== '?') {
      // 已暂存
      status = stagedStatus
      staged = true
    } else if (unstagedStatus !== ' ') {
      // 未暂存的修改
      status = unstagedStatus
      staged = false
    }

    // 跳过未跟踪的文件（可选）
    if (status === '?') continue

    files.push({ path, status, staged })
  }

  return files
}

export const statusCommand = (command: Command) => {
  command
    .command('status')
    .alias('s')
    .description('Show working tree status (interactive viewer)')
    .action(async () => {
      const files = await getStatusFiles()

      if (files.length === 0) {
        log.show('✓ Working directory clean', { type: 'success' })
        return
      }

      renderStatusViewer(files)
    })

  return command
}
