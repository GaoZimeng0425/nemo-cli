import { Command } from 'commander'

import { createInput, createList, log } from '@nemo-cli/shared'
import { createOpenai } from '../openai.js'
import { clearPrompt, getKey, getPrompt, savePrompt } from '../utils/store.js'

import { HELP_MESSAGE } from '../constants.js'
import { promptBox } from '../utils/chatBox.js'

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
        if (options.clean) {
          clearPrompt()
          log.success('chat', 'Prompt clean success')
          process.exit(0)
        }

        const choices = prompts.map((prompt) => ({ name: prompt.act, value: prompt }))
        const choosePrompt = await (options.new
          ? createInput({ message: 'Type in the prompt you want to know about' })
          : createList({
              choices,
              message: 'Choose a prompt that interests you',
              loop: false
            }))

        savePrompt(choosePrompt)

        const apiKey = await getKey()
        const generatorChat = createOpenai(apiKey, choosePrompt)

        const sendMessage = async () => {
          const message = await createInput({ message: 'You: ', validate: (a) => !!a })
          log.eraseEndLine()
          log.beep()

          if (message === 'exit') {
            process.exit(0)
          }
          const result = await generatorChat(message)
          log.verbose('content: ', result)
          sendMessage()
        }
        sendMessage()
      })
  )
}
