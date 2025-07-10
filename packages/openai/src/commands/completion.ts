import { type Command, createInput } from '@nemo-cli/shared'

import { createCompletion } from '../openai.js'
import { getKey } from '../utils/store.js'

export const completionCommand = (program: Command) => {
  return program
    .command('completion')
    .alias('c')
    .argument('[prompts]', '问题', '')
    .description('使用 openai 询问')
    .action(async (prompts) => {
      const apiKey = await getKey()
      const promptsInput =
        prompts ??
        (await createInput({
          message: '请输入问题',
          validate: (answer) => {
            if (!answer) {
              return '请输入问题'
            }
            return undefined
          },
        }))

      createCompletion(apiKey, promptsInput)
    })
}
