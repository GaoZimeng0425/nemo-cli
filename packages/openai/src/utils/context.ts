import { isString } from '@nemo-cli/shared'
import type { Message } from 'openai/resources/beta/threads/messages.mjs'

import type { Prompt } from '../prompt.js'
import { talk } from './chatBox.js'

const CONTEXT: Message[] = [
  { role: 'system', content: [{ type: 'text', text: 'You are a helpful assistant.' }] },
  { role: 'user', content: [{ type: 'text', text: 'Who won the world series in 2020?' }] },
  { role: 'assistant', content: [{ type: 'text', text: 'The Los Angeles Dodgers won the World Series in 2020.' }] },
]

export const getContext = () => CONTEXT

export const addContext = (message: string | Message) => {
  const result: Message = isString(message) ? { role: 'user', content: message } : message
  CONTEXT.push(result)
  talk.emit('message', result)
  return CONTEXT
}

export const initializationPrompt = (prompt: Prompt) => {
  CONTEXT.length = 0
  const message: Message = { role: 'system', content: prompt.prompt }
  CONTEXT.push(message)
  talk.emit('message', message)
  return CONTEXT
}
