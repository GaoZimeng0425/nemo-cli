import { type Command, createSelect, log } from '@nemo-cli/shared'

import { deleteKey, ensureKey } from '../utils/store.js'

enum KEY_CHOOSE {
  ADD = 'ADD',
  DELETE = 'DELETE',
  EXIT = 'EXIT',
}
export const keyCommand = (program: Command) => {
  program
    .command('key')
    .description(
      'Add, Change or Delete Openai API Key. (Missing an API Key can cause it to become unusable)'
    )
    .action(async () => {
      const choose = await createSelect({
        message: 'Choose an option',
        options: [
          { value: KEY_CHOOSE.ADD, label: 'Add or Change Openai API Key' },
          { value: KEY_CHOOSE.DELETE, label: 'Delete Openai API Key' },
          { value: KEY_CHOOSE.EXIT, label: 'Exit' },
        ],
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
