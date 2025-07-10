import EventEmitter from 'node:events'
import { cached, colors, isArray } from '@nemo-cli/shared'
import boxen, { type Options as BoxenOptions } from 'boxen'
import type { Message } from 'openai/resources/beta/threads/messages.mjs'

import type { Prompt } from '../prompt.js'

type RoleKey = 'user' | 'assistant' | 'system'
const BASE_BOXEN_OPTIONS: BoxenOptions = {
  padding: 1,
  backgroundColor: '#222',
  float: 'left',
  titleAlignment: 'left',
}

type ChatOption = {
  [key in RoleKey]: {
    style: typeof colors
    boxenOptions?: BoxenOptions
    name: string
  }
}

const STYLES: ChatOption = {
  user: {
    style: colors.green.bold,
    boxenOptions: {
      float: 'right',
      titleAlignment: 'right',
    },
    name: 'YOU',
  },
  assistant: {
    style: colors.white.bold,
    name: 'AI',
  },
  system: {
    style: colors.blue.bold,
    name: 'SYSTEM',
  },
}

const createChatType = (key: RoleKey) => {
  const { style, boxenOptions, name } = STYLES[key]
  return (message: string) => {
    return `
${boxen(style(`${message}`), {
  ...BASE_BOXEN_OPTIONS,
  ...boxenOptions,
  title: style(`${name}:`),
})}`
  }
}

const cacheCreateType = cached(createChatType)

export const promptBox = (prompts: Prompt[]) => {
  for (const prompt of prompts) {
    const content = `
${boxen(`${prompt.prompt}`, {
  ...BASE_BOXEN_OPTIONS,
  title: `${prompt.act}:`,
})}`
    process.stdout.write(content)
  }
}

class Talk extends EventEmitter {
  constructor() {
    super()
    this.on('message', (message: Message | Message[]) => {
      const messages = isArray(message) ? message : [message]
      this.print(messages)
    })
  }

  print(message: Message[]) {
    for (const { role, content } of message) {
      const styledContent = cacheCreateType(role)(content?.[0]?.type ?? '')
      process.stdout.write(`${styledContent}\n`)
    }
  }
}

export const talk = new Talk()
