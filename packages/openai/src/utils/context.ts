import { type ChatCompletionRequestMessage } from 'openai'
import { isString } from '@nemo-cli/shared'
import { Prompt } from '../prompt.js'
import { talk } from './chatBox.js'

const CONTEXT: ChatCompletionRequestMessage[] = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Who won the world series in 2020?' },
  { role: 'assistant', content: 'The Los Angeles Dodgers won the World Series in 2020.' }
]

export const getContext = () => CONTEXT

export const addContext = (message: string | ChatCompletionRequestMessage) => {
  const result: ChatCompletionRequestMessage = isString(message)
    ? { role: 'user', content: message }
    : message
  CONTEXT.push(result)
  talk.emit('message', result)
  return CONTEXT
}

export const initializationPrompt = (prompt: Prompt) => {
  CONTEXT.length = 0
  const message: ChatCompletionRequestMessage = { role: 'system', content: prompt.prompt }
  CONTEXT.push(message)
  talk.emit('message', message)
  return CONTEXT
}
