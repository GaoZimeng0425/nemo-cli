import { Command } from 'commander'

import { createInput, log } from '@nemo-cli/shared'
import { listModels, createCompletion } from './openai.js'

log.debug()
export const init = () => {
  const program = new Command('ai').description('help you use openai').usage('<Command> [options]')
  program.showHelpAfterError()
  program.showSuggestionAfterError()
  chat(program)
  completion(program)
  models(program)
  return program
}

const completion = (program: Command) => {
  return program
    .command('completion')
    .alias('c')
    .argument('[prompts]', '问题', '')
    .description('使用 openai 询问')
    .action(async (prompts) => {
      if (!prompts) {
        prompts = await createInput({
          message: '请输入问题',
          validate: (answer) => !!answer
        })
      }
      const w = process.stdout.getWindowSize()
      log.success('', w[0], w[1])
    })
}

const chat = (program: Command) => {
  return program
    .command('chat')
    .description('使用 openai 聊天')
    .action(async (prompts) => {
      // const result = await createCompletion(prompts)
      // console.log(result)
      // log.success('openai', 'openai exec')
    })
}

const models = (program: Command) => {
  return program
    .command('model')
    .description('list gpt models')
    .action(async () => {
      const models = await listModels()
      log.success('models', models)
    })
}

export const run = () => {
  const command = init()
  command.parse(process.argv)
}
