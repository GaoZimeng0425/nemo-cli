import type { Command } from '@nemo-cli/shared'
import { createOptions, createSelect, exit, log, xASync } from '@nemo-cli/shared'

import { HELP_MESSAGE } from '../constants/stash'
import { handleGitStash, handleGitStashCheck } from '../utils'

enum StashCommand {
  POP = 'pop',
  LIST = 'list',
  SAVE = 'save',
  DROP = 'drop',
}

const handleCheck = (callback: (stashes: string[]) => Promise<void>) => async () => {
  const stashes = await handleGitStashCheck()
  if (stashes.length === 0) {
    log.show('No stash found.', { type: 'error' })
    return
  }
  return callback(stashes)
}

const handlePop = handleCheck(async (stashes: string[]) => {
  const selectedStash = await createSelect({
    message: 'Select the stash to pop',
    options: stashes.map((stash) => ({ label: stash, value: stash })),
  })
  const [error] = await xASync('git', ['stash', 'pop', selectedStash])
  if (error) {
    log.show('Failed to pop stash.', { type: 'error' })
  } else {
    log.show('Successfully popped changes.', { type: 'success' })
  }
})

const handleList = handleCheck(async (stashes: string[]) => {
  log.show(stashes.join('\n'), { type: 'step' })
})

const ALL_STASH = 'all'
const handleDrop = handleCheck(async (stashes: string[]) => {
  const options = stashes.length > 1 ? [ALL_STASH, ...stashes] : stashes
  const selectedStash = await createSelect({
    message: 'Select the stash to clear',
    options: createOptions(options),
    initialValue: ALL_STASH,
  })
  const name = selectedStash.split(':')?.[0]
  if (!name) {
    log.show('Invalid stash name.', { type: 'error' })
    exit(0)
  }
  const params = selectedStash === ALL_STASH ? ['stash', 'clear'] : ['stash', StashCommand.DROP, name]

  const [error] = await xASync('git', params)
  if (error) {
    log.show('Failed to clear stash.', { type: 'error' })
  } else {
    log.show('Successfully cleared stash.', { type: 'success' })
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
    .alias('clear')
    .alias('d')
    .description('Drop/clear stashes')
    .action(async () => {
      await handleDrop()
    })

  return stashCmd
}
