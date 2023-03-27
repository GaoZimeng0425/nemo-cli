import { Command } from 'commander'
import { createList, log } from '@nemo-cli/shared'

import { getKey } from '../utils/store.js'
import { listModels } from '../openai.js'

export const modelsCommand = (program: Command) => {
  return program
    .command('model')
    .description('choose gpt model')
    .action(async () => {
      const key = await getKey()
      const models = await listModels(key)
      log.success('model list', models)
      const model = createList({ choices: models })
      log.success('model choose', model)
    })
}
