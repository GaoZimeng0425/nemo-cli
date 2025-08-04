import type { Command } from '@nemo-cli/shared'
import { createOptions, createSelect, log, xASync } from '@nemo-cli/shared'

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
  const selectedStash = await createSelect({
    message: 'Select the stash to clear',
    options: createOptions([ALL_STASH, ...stashes]),
    initialValue: ALL_STASH,
  })
  const params = selectedStash === ALL_STASH ? ['stash', 'clear'] : ['stash', StashCommand.DROP, selectedStash]
  const [error] = await xASync('git', params)
  if (error) {
    log.show('Failed to clear stash.', { type: 'error' })
  } else {
    log.show('Successfully cleared stash.', { type: 'success' })
  }
})

export const stashCommand = (command: Command) => {
  command
    .command('stash <command> [name]')
    .alias('st')
    .description('Stash current branch')
    .action(async (command: StashCommand, name: string) => {
      if (command === StashCommand.POP) {
        await handlePop()
      } else if (command === StashCommand.LIST) {
        await handleList()
      } else if (command === StashCommand.DROP) {
        await handleDrop()
      } else if (command === StashCommand.SAVE) {
        await handleGitStash(name)
      } else {
        log.show('Invalid command.', { type: 'error' })
      }
    })
}
