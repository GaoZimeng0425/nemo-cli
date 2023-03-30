import { Command } from 'commander'
import { createList, log } from '@nemo-cli/shared'

import { deleteKey, ensureKey } from '../utils/store.js'

enum KEY_CHOOSE {
  ADD = 'ADD',
  DELETE = 'DELETE',
  EXIT = 'EXIT'
}
export const keyCommand = (program: Command) => {
  program
    .command('key')
    .description(
      'Add, Change or Delete Openai API Key. (Missing an API Key can cause it to become unusable)'
    )
    .action(async () => {
      const choose = await createList({
        choices: [
          { value: KEY_CHOOSE.ADD, name: 'Add or Change Openai API Key' },
          { value: KEY_CHOOSE.DELETE, name: 'Delete Openai API Key' },
          { value: KEY_CHOOSE.EXIT, name: 'Exit' }
        ]
      })
      if (choose === KEY_CHOOSE.EXIT) {
        process.exit(0)
      }

      await deleteKey()

      if (choose === KEY_CHOOSE.ADD) {
        await ensureKey()
      }
      log.success('openai save key', 'success')
    })
  return program
}
