import { type Command, createSelect, log } from '@nemo-cli/shared'

import { listModels } from '../openai.js'
import { getKey, setModel } from '../utils/store.js'

export const modelsCommand = (program: Command) => {
  return program
    .command('model')
    .description('choose gpt model')
    .action(async () => {
      const key = await getKey()
      const models = await listModels(key)
      const model = await createSelect({
        message: 'Choose a model',
        options:
          models?.map((model) => ({
            value: model.value,
            label: model.name,
          })) ?? [],
      })
      setModel(model)
      log.success('model choose', model)
    })
}
