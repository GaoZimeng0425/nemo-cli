import { Command } from 'commander'
import { createList, log } from '@nemo-cli/shared'

import { getKey, setModel } from '../utils/store.js'
import { listModels } from '../openai.js'

export const modelsCommand = (program: Command) => {
  return program
    .command('model')
    .description('choose gpt model')
    .action(async () => {
      const key = await getKey()
      const models = await listModels(key)
      const model = await createList({ choices: models })
      setModel(model)
      log.success('model choose', model)
    })
}
