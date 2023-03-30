import { Command } from 'commander'
import boxen from 'boxen'
import { createInput, createList, log, ora, tryPromise } from '@nemo-cli/shared'

import { createOpenai } from '../openai.js'
import { HELP_MESSAGE } from '../constants.js'
import { Prompt } from '../prompt.js'
import { clearPrompt, ensureKey, getPrompt, savePrompt } from '../utils/store.js'
import { promptBox } from '../utils/chatBox.js'
import { addContext, getContext, initializationPrompt } from '../utils/context.js'
import { copy } from '../utils/copy.js'

const chatHandle = (apiKey: string, choosePrompt: Prompt) => {
  initializationPrompt(choosePrompt)

  const generatorChat = createOpenai(apiKey)

  return async (content: string) => {
    addContext(content)
    log.verbose('chat add content', content)

    const spinner = ora({
      hideCursor: true,
      text: boxen(`Loading...`, { padding: 1, margin: { top: 1 } })
    }).start()

    process.stdin.pause()
    const [err, message] = await tryPromise(generatorChat(getContext()))
    process.stdin.resume()

    spinner.stop()

    if (err) {
      addContext({ role: 'system', content: (err as Error).message })
      log.error('error', (err as any)?.message)
      process.exit(0)
    } else {
      log.verbose('chat response message', message)
      message && addContext(message)
    }
  }
}
const copyHandle = async () => {
  const messages = getContext()
    .map(({ role, content }) => `${role}: ${content}`)
    .join('\n')

  const [err] = await tryPromise(copy(messages))
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

        const choices = prompts.map((prompt) => ({ name: prompt.act, value: prompt }))
        const choosePrompt = await (options.new
          ? createInput({ message: 'Type in the prompt you want to know about' })
          : createList({
              choices,
              message: 'Choose a prompt that interests you',
              loop: false
            }))

        savePrompt(choosePrompt)

        const sender = chatHandle(apiKey, choosePrompt)

        const sendMessage = async () => {
          const message = await createInput({
            message: 'You: ',
            validate: Boolean,
            default: 'Type exit to stop, copy to copy all message'
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
