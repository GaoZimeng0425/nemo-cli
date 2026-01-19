import type { Command } from '@nemo-cli/shared'
import { colors, createCheckbox, createOptions, exit, log, xASync } from '@nemo-cli/shared'
import { HELP_MESSAGE } from '../constants/stash'
import { handleGitStash, handleGitStashCheck } from '../utils'

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

const handleList = handleCheck(async (stashes: string[]) => {
  log.show(`\n${colors.bold(`📦 Found ${stashes.length} stash(es)`)}\n`)

  for await (const stash of stashes) {
    const stashRef = extractStashRef(stash)
    const files = await getStashFiles(stashRef)

    // 显示 stash 标题
    log.show(colors.cyan(`━━━ ${stash} ━━━`))

    if (files.length > 0) {
      log.show(colors.dim(`    ${files.length} file(s) changed:`))
      for (const file of files) {
        log.show(colors.yellow(`      • ${file}`))
      }
    } else {
      log.show(colors.dim('    (no files)'))
    }
    log.show('') // 空行分隔
  }
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

export const stashCommand = (command: Command) => {
  // 创建主 stash 命令
  const stashCmd = command
    .command('stash')
    .alias('st')
    .description('Git stash management')
    .addHelpText('after', HELP_MESSAGE.main)

  // 子命令：保存 stash
  stashCmd
    .command('save [message]')
    .alias('s')
    .description('Save current changes to stash')
    .action(async (message: string) => {
      await handleGitStash(message)
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

  return stashCmd
}
