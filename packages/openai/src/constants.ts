import { createHelpExample } from '@nemo-cli/shared'
export const API_KEY_NAME = 'API_KEY'
export const STORE_PATH = '.openai'
export const PROMPT_KEY = 'PROMPT_KEY'
export const MODEL_KEY = 'MODEL_KEY'

export const HELP_MESSAGE = {
  ai: createHelpExample('n ai key', 'n ai model', 'n ai chat', 'n ai completion [question]'),
  key: createHelpExample('n key'),
  chat: createHelpExample('n chat', 'n chat -p', 'n chat -L')
}

export const ERROR_MESSAGE: Record<string, string> = {
  400: 'Bad Request: Prompt provided is empty or too long. Prompt should be between 1 and 4096 tokens.',
  401: 'Incorrect API key provided. You can find your API key at https://platform.openai.com/account/api-keys.',
  402: 'Payment Required: ChatGPT quota exceeded. Please check you chatGPT account.',
  404: 'Not Found: Model not found. Please check the model name.',
  429: 'API Rate Limit Exceeded: ChatGPT is getting too many requests from the user in a short period of time. Please wait a while before sending another message.',
  503: 'Service Unavailable: ChatGPT is currently unavailable, possibly due to maintenance or high traffic. Please try again later.',
  default: 'Something Wrong!'
}

export const CHAT_OPTIONS = {
  EXIT: 'exit',
  COPY: 'copy'
}
