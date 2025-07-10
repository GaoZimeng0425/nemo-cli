import { type Command, createInput, createSelect, log, safeAwait } from '@nemo-cli/shared'

import { HELP_MESSAGE } from '../constants.js'
import type { Prompt } from '../prompt.js'
import { promptBox } from '../utils/chatBox.js'
import { addContext, getContext, initializationPrompt } from '../utils/context.js'
import { copy } from '../utils/copy.js'
import { OpenAIStream, type OpenAIStreamPayload, readStream } from '../utils/OpenaiStream.js'
import { clearPrompt, ensureKey, getPrompt, savePrompt } from '../utils/store.js'

const payload: OpenAIStreamPayload = {
  model: 'gpt-3.5-turbo-0301',
  messages: [],
  temperature: 0,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
  max_tokens: 2000,
  stream: true,
  n: 1,
}
const chatHandle = (apiKey: string, choosePrompt: Prompt) => {
  initializationPrompt(choosePrompt)

  // const generatorChat = createOpenai(apiKey)
  const createStream = () => OpenAIStream(apiKey, { ...payload, messages: getContext() as any })

  return async (content: string) => {
    addContext(content)
    const stream = await createStream()
    const message = await readStream(stream, (content: string) => {
      process.stdout.write(content)
    })
    message && addContext({ role: 'assistant', content: message })
    return message
  }

  // return async (content: string) => {
  //   addContext(content)
  //   log.verbose('chat add content', content)

  //   const spinner = ora({
  //     hideCursor: true,
  //     text: boxen(`Loading...`, { padding: 1, margin: { top: 1 } })
  //   }).start()

  //   process.stdin.pause()
  //   const [err, message] = await tryPromise(generatorChat(getContext()))
  //   process.stdin.resume()

  //   spinner.stop()

  //   if (err) {
  //     addContext({ role: 'system', content: (err as Error).message })
  //     log.error('error', (err as any)?.message)
  //     process.exit(0)
  //   } else {
  //     log.verbose('chat response message', message)
  //     message && addContext(message)
  //   }
  // }
}
const copyHandle = async () => {
  const messages = getContext()
    .map(({ role, content }) => `${role}: ${content}`)
    .join('\n')

  const [err] = await safeAwait(copy(messages))
  if (err) {
    log.error('Copy Error', (err as any).message)
    process.exit(0)
  } else {
    log.success('Copy', 'copy success!')
  }
}

export const chatCommand = (program: Command) => {
  return (
    program
      .command('chat')
      .description('Chat with openai')
      // .argument('[prompt]', 'Type in the prompt you want to know about')
      // .argument('[content]', 'Type in the prompt you want to know about')
      .option('-p, --prompt', 'Show all prompts')
      .option('-r, --reset', 'Clean prompt cache')
      .option('-L, --limit', 'Limit Token count')
      .option('-n, --new', 'Add an new Prompt to Chat')
      .addHelpText('after', HELP_MESSAGE.chat)
      .action(async (options) => {
        const prompts = getPrompt()
        if (options.prompt) {
          promptBox(prompts)
          process.exit(0)
        }
        if (options.reset) {
          clearPrompt()
          log.success('chat', 'Prompt clean success')
          process.exit(0)
        }

        const apiKey = await ensureKey()

        const choices = prompts.map((prompt) => ({ label: prompt.act, value: prompt }))
        const choosePrompt = options.new
          ? createInput({ message: 'Type in the prompt you want to know about' })
          : createSelect({
              options: choices,
              message: 'Choose a prompt that interests you',
            })

        savePrompt(choosePrompt as unknown as Prompt)

        const sender = chatHandle(apiKey, choosePrompt as unknown as Prompt)

        const sendMessage = async () => {
          const message = await createInput({
            message: 'You: ',
            validate: (answer) => {
              if (!answer) {
                return '请输入问题'
              }
              return undefined
            },
            placeholder: 'Type exit to stop, copy to copy all message',
          })
          log.eraseEndLine()
          log.beep()

          if (message === 'exit') {
            process.exit(0)
          }
          if (message === 'copy') {
            copyHandle()
            sendMessage()
            return
          }
          const result = await sender(message)
          log.verbose('chat content: ', result)
          sendMessage()
        }
        sendMessage()
      })
  )
}
