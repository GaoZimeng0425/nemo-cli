import { createHelpExample } from '@nemo-cli/shared'
export const API_KEY_NAME = 'API_KEY'
export const STORE_PATH = '.openai'
export const PROMPT_KEY = 'PROMPT_KEY'

export const HELP_MESSAGE = {
  ai: createHelpExample('n ai key', 'n ai model', 'n ai chat', 'n ai completion [question]'),
  key: createHelpExample('n key'),
  chat: createHelpExample('n chat', 'n chat -p', 'n chat -L')
}
