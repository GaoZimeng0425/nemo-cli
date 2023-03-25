import { Command } from 'commander'

import { createInput, createList, log, readPackage } from '@nemo-cli/shared'
import { listModels, createCompletion, chatHandle } from './openai.js'
import { deleteKey, getKey, setKey } from './utils/store.js'

import { HELP_MESSAGE } from './constants.js'

export const pkg = readPackage(import.meta, '..')

export const init = () => {
  const program = new Command('ai')
    .description(`${pkg.name} help you use openai easier`)
    .version(pkg.version)
    .usage('<Command> [options]')
    .addHelpText('after', HELP_MESSAGE.ai)

  chat(program)
  completion(program)
  models(program)
  key(program)

  return program
}

const completion = (program: Command) => {
  return program
    .command('completion')
    .alias('c')
    .argument('[prompts]', '问题', '')
    .description('使用 openai 询问')
    .action(async (prompts) => {
      const key = await getKey()
      if (!prompts) {
        prompts = await createInput({
          message: '请输入问题',
          validate: (answer) => !!answer
        })
      }
      createCompletion(key, prompts)
    })
}

const chat = (program: Command) => {
  return program
    .command('chat')
    .description('使用 openai 聊天')
    .action(async () => {
      const key = await getKey()
      const message = async () => {
        log.success('chat', '输入 stop 停止 chat')
        const prompts = await createInput({ message: 'You: ', validate: (a) => !!a })
        if (prompts === 'stop') {
          process.exit(0)
        }
        const result = await chatHandle(key, prompts)
        log.success('content: ', result)
        message()
      }
      message()
    })
}
enum KEY_CHOOSE {
  ADD = 'ADD',
  DELETE = 'DELETE',
  EXIT = 'EXIT'
}
const key = (program: Command) => {
  program
    .command('key')
    .description('添加, 更新或删除openai apikey')
    .action(async () => {
      const choose = await createList({
        choices: [
          { value: KEY_CHOOSE.ADD, name: '添加' },
          { value: KEY_CHOOSE.DELETE, name: '删除' },
          { value: KEY_CHOOSE.EXIT, name: '退出' }
        ]
      })
      if (choose === KEY_CHOOSE.EXIT) {
        process.exit(0)
      } else if (choose === KEY_CHOOSE.DELETE) {
        await deleteKey()
      } else {
        await setKey()
      }
      log.success('openai save key', 'success')
    })
  return program
}

const models = (program: Command) => {
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

export const run = () => {
  const command = init()
  command.parse(process.argv)
}
