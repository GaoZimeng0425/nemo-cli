import type { Command } from '@nemo-cli/shared'
import {
  colors,
  createCheckbox,
  createInput,
  createOptions,
  exit,
  getCurrentBranch,
  log,
  xASync,
} from '@nemo-cli/shared'
import type { StashItem } from '@nemo-cli/ui'
import { renderStashList } from '@nemo-cli/ui'
import { HELP_MESSAGE } from '../constants/stash'
import { handleGitStash, handleGitStashCheck } from '../utils'
import { cleanOldStashes, getAllStashes } from '../utils/stash-index'

enum StashCommand {
  POP = 'pop',
  LIST = 'list',
  SAVE = 'save',
  DROP = 'drop',
}

const handleCheck =
  <T extends (stashes: string[]) => unknown>(callback: T) =>
  async () => {
    const stashes = await handleGitStashCheck()
    if (stashes.length === 0) {
      log.show('No stash found.', { type: 'error' })
      return
    }
    return callback(stashes)
  }

/**
 * 获取 stash 中的文件列表
 * @param stashRef - stash 引用，如 "stash@{0}"
 */
const getStashFiles = async (stashRef: string): Promise<string[]> => {
  const [error, result] = await xASync('git', ['stash', 'show', stashRef, '--name-only'], { quiet: true })
  if (error) return []
  return result.stdout.split('\n').filter((line) => line.trim())
}

/**
 * 从 stash 条目中提取 stash 引用
 * @param stashEntry - 完整的 stash 条目，如 "stash@{0}: On main: message"
 */
const extractStashRef = (stashEntry: string): string => {
  const match = stashEntry.match(/^(stash@\{\d+\})/)
  if (match?.[1]) return match[1]
  return stashEntry.split(':')[0] ?? stashEntry
}

const handlePop = handleCheck(async (stashes: string[]) => {
  const selectedStashes = await createCheckbox({
    message: 'Select the stash to pop',
    options: stashes.map((stash) => ({ label: stash, value: stash })),
  })
  for await (const stash of selectedStashes) {
    const stashRef = extractStashRef(stash)
    const [error] = await xASync('git', ['stash', 'pop', stashRef])
    if (error) {
      log.show('Failed to pop stash.', { type: 'error' })
    } else {
      log.show('Successfully popped changes.', { type: 'success' })
    }
  }
})

/**
 * 解析 stash 条目获取详细信息
 * @param stashEntry - 完整的 stash 条目，如 "stash@{0}: On main: message"
 */
interface StashInfo {
  ref: string // stash@{0}
  branch: string // main
  message: string // checkout:main@2026-02-04T10-24-57
}

const parseStashEntry = (stashEntry: string): StashInfo => {
  // 匹配格式: stash@{0}: On main: message
  const match = stashEntry.match(/^(stash@\{\d+\}):\s+On\s+(\S+):\s+(.+)$/)

  if (match) {
    return {
      ref: match[1] || stashEntry,
      branch: match[2] || 'unknown',
      message: match[3] || stashEntry,
    }
  }

  // 兼容旧格式或其他格式
  const refMatch = stashEntry.match(/^(stash@\{\d+\})/)
  return {
    ref: refMatch?.[1] ?? stashEntry.split(':')[0] ?? stashEntry,
    branch: 'unknown',
    message: stashEntry,
  }
}

const handleList = handleCheck(async (stashes: string[]) => {
  // 转换为 ink 组件需要的格式
  const stashItems: StashItem[] = await Promise.all(
    stashes.map(async (stash) => {
      const stashInfo = parseStashEntry(stash)
      const files = await getStashFiles(stashInfo.ref)

      return {
        ref: stashInfo.ref,
        branch: stashInfo.branch,
        message: stashInfo.message,
        files,
        fileCount: files.length,
      }
    })
  )

  // 使用 ink 组件渲染
  await renderStashList(stashItems)
})

const handleDrop = handleCheck(async (stashes: string[]) => {
  const selectedStashes = await createCheckbox({
    message: 'Select the stash to clear',
    options: createOptions(stashes),
  })

  for await (const stash of selectedStashes) {
    const stashRef = extractStashRef(stash)
    if (!stashRef) {
      log.show('Invalid stash name.', { type: 'error' })
      exit(0)
    }

    const [error] = await xASync('git', ['stash', StashCommand.DROP, stashRef])
    if (error) {
      log.show('Failed to drop stash.', { type: 'error' })
    } else {
      log.show(`Successfully dropped stash: ${stashRef}`, { type: 'success' })
    }
  }
})

const handleClear = handleCheck(async () => {
  const [error] = await xASync('git', ['stash', 'clear'])
  if (error) {
    log.show('Failed to clear stashes.', { type: 'error' })
  } else {
    log.show('Successfully cleared stashes.', { type: 'success' })
  }
})

const handleHistory = async (options: { all?: boolean; active?: boolean; clean?: string }) => {
  // Clean mode
  if (options.clean) {
    const days = Number.parseInt(options.clean, 10) || 30
    const count = await cleanOldStashes(days)
    log.show(`Cleaned ${count} old stash records (${days} days)`, { type: 'success' })
    return
  }

  // Fetch stashes
  const stashes = await getAllStashes(options.active ? 'active' : undefined)
  const displayList = options.all ? stashes : stashes.slice(0, 10)

  // Sort by timestamp (newest first)
  displayList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  if (displayList.length === 0) {
    log.show('No stash records found.', { type: 'info' })
    return
  }

  log.show(`\n${colors.bold(`📚 Stash History (${displayList.length} records)`)}\n`)

  for (const stash of displayList) {
    const statusEmoji = stash.status === 'active' ? '📦' : '✅'
    const statusColor = stash.status === 'active' ? colors.yellow : colors.green

    log.show(colors.cyan(`━━━ ${statusEmoji} ${stash.message} ━━━`))
    log.show(colors.dim(`    Operation: ${stash.operation || 'unknown'}`))
    log.show(colors.dim(`    Status: ${statusColor(stash.status || 'unknown')}`))
    log.show(colors.dim(`    Branch: ${stash.currentBranch || 'unknown'}`))
    log.show(colors.dim(`    Time: ${new Date(stash.timestamp).toLocaleString()}`))

    if (stash.files && stash.files.length > 0) {
      log.show(colors.dim(`    Files (${stash.files.length}):`))
      // Show first 5 files
      const filesToShow = stash.files.slice(0, 5)
      for (const file of filesToShow) {
        log.show(colors.yellow(`      • ${file}`))
      }
      if (stash.files.length > 5) {
        log.show(colors.dim(`      ... and ${stash.files.length - 5} more`))
      }
    }

    if (stash.error) {
      log.show(colors.red(`    Error: ${stash.error}`))
    }
    log.show('') // Empty line separator
  }

  if (!options.all && stashes.length > 10) {
    log.show(colors.dim(`\nShowing 10 of ${stashes.length} records. Use --all to see all.\n`))
  }
}

export const stashCommand = (command: Command) => {
  // 创建主 stash 命令
  const stashCmd = command
    .command('stash')
    .alias('st')
    .description('Git stash management')
    .addHelpText('after', HELP_MESSAGE.main)

  // 直接执行 stash（自动命名，不提示用户）
  stashCmd.action(async () => {
    const result = await handleGitStash(undefined, { operation: 'manual' })
    if (!result) {
      log.show('No changes to stash.', { type: 'info' })
    }
  })

  // 子命令：保存 stash
  stashCmd
    .command('save [message]')
    .alias('s')
    .description('Save current changes to stash')
    .action(async (message?: string) => {
      if (message) {
        // 如果提供了 message 参数，直接使用
        const result = await handleGitStash(message, { operation: 'manual' })
        if (!result) {
          log.show('No changes to stash.', { type: 'info' })
        }
      } else {
        // 如果没有提供 message，提示用户输入（带默认值）
        try {
          const userMessage = await createInput({
            message: 'Enter stash message (press Enter to use default)',
            validate: (value) => {
              if (!value?.trim()) return 'Message cannot be empty'
              return undefined
            },
          })

          const result = await handleGitStash(userMessage, { operation: 'manual' })
          if (!result) {
            log.show('No changes to stash.', { type: 'info' })
          }
        } catch (error) {
          // User cancelled the prompt
          log.show('Stash cancelled.', { type: 'info' })
        }
      }
    })

  // 子命令：列出 stash
  stashCmd
    .command('list')
    .alias('ls')
    .alias('l')
    .description('List all stashes')
    .action(async () => {
      await handleList()
    })

  // 子命令：弹出 stash
  stashCmd
    .command('pop')
    .alias('p')
    .description('Pop the most recent stash')
    .action(async () => {
      await handlePop()
    })

  // 子命令：删除 stash
  stashCmd
    .command('drop')
    .alias('d')
    .description('Drop/clear stashes')
    .action(async () => {
      await handleDrop()
    })

  stashCmd
    .command('clear')
    .alias('c')
    .description('clear stashes')
    .action(async () => {
      await handleClear()
    })

  // 子命令：查看 stash 历史
  stashCmd
    .command('history')
    .alias('his')
    .alias('h')
    .description('View stash history from persistent index')
    .option('--all', 'Show all records (no limit)')
    .option('--active', 'Show only active records')
    .option('--clean [days]', 'Clean old records (default: 30 days)')
    .action(async (options: { all?: boolean; active?: boolean; clean?: string }) => {
      await handleHistory(options)
    })

  return stashCmd
}
