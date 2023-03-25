import chalk from 'chalk'
import boxen, { Options as BoxenOptions } from 'boxen'
import { ChatCompletionRequestMessage } from 'openai'
import { cached } from '@nemo-cli/shared'

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
    name: 'AI:'
  },
  system: {
    style: chalk.blue.bold,
    name: 'SYSTEM'
  }
}
type Chat = (message: string) => string

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

export const talk = (message: ChatCompletionRequestMessage[]) => {
  message.forEach(({ role, content }) => {
    const c = cacheCreateType(role)(content)
    process.stdout.write(c + '\n')
  })
}
