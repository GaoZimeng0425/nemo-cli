import EventEmitter from 'node:events'
import chalk from 'chalk'
import boxen, { Options as BoxenOptions } from 'boxen'
import { ChatCompletionRequestMessage } from 'openai'
import { cached, isArray } from '@nemo-cli/shared'
import { Prompt } from '../prompt.js'

type RoleKey = 'user' | 'assistant' | 'system'
const BASE_BOXEN_OPTIONS: BoxenOptions = {
  padding: 1,
  backgroundColor: '#222',
  float: 'left',
  titleAlignment: 'left'
}

type ChatOption = {
  [key in RoleKey]: {
    style: typeof chalk
    boxenOptions?: BoxenOptions
    name: string
  }
}

const STYLES: ChatOption = {
  user: {
    style: chalk.green.bold,
    boxenOptions: {
      float: 'right',
      titleAlignment: 'right'
    },
    name: 'YOU'
  },
  assistant: {
    style: chalk.white.bold,
    name: 'AI'
  },
  system: {
    style: chalk.blue.bold,
    name: 'SYSTEM'
  }
}

const createChatType = (key: RoleKey) => {
  const { style, boxenOptions, name } = STYLES[key]
  return (message: string) => {
    return `
${boxen(style(`${message}`), {
  ...BASE_BOXEN_OPTIONS,
  ...boxenOptions,
  title: style(`${name}:`)
})}`
  }
}

const cacheCreateType = cached(createChatType)

export const promptBox = (prompts: Prompt[]) => {
  prompts.forEach((prompt) => {
    const content = `
${boxen(`${prompt.prompt}`, {
  ...BASE_BOXEN_OPTIONS,
  title: `${prompt.act}:`
})}`
    process.stdout.write(content)
  })
}

class Talk extends EventEmitter {
  constructor() {
    super()
    this.on('message', (message: ChatCompletionRequestMessage | ChatCompletionRequestMessage[]) => {
      const messages = !isArray(message) ? [message] : message
      this.print(messages)
    })
  }

  print(message: ChatCompletionRequestMessage[]) {
    message.forEach(({ role, content }) => {
      const styledContent = cacheCreateType(role)(content)
      process.stdout.write(styledContent + '\n')
    })
  }
}

export const talk = new Talk()
