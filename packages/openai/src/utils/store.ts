import { createPassword, createStore, log } from '@nemo-cli/shared'
import { API_KEY_NAME, PROMPT_KEY, STORE_PATH } from '../constants.js'
import { PROMPT_LIST, Prompt } from '../prompt.js'

export const store = createStore('openai', { path: STORE_PATH })

export const deleteKey = () => {
  store.delete(API_KEY_NAME)
}
export const setKey = async (apiKey: string) => {
  if (!apiKey) {
    log.error('error set key:', 'Need API Key')
    return false
  }
  store.set(API_KEY_NAME, apiKey)
  return true
}

export const getKey = async () => {
  const apiKey = store.get(API_KEY_NAME)
  return apiKey
}

export const ensureKey = async () => {
  const key = (await getKey()) || (await createPassword({ message: 'Input openai API Key' }))
  key && setKey(key)
  return key
}

export const clearPrompt = () => store.delete(PROMPT_KEY)
export const savePrompt = (prompt: Prompt) => {
  try {
    const promptList = getPrompt()
    const index = promptList.findIndex((store) => store.act === prompt.act)
    if (index !== -1) promptList.splice(index, 1)
    promptList.unshift(prompt)
    store.set(PROMPT_KEY, promptList)
    return true
  } catch (err) {
    return false
  }
}
export const getPrompt = () => {
  try {
    const promptList: Prompt[] = store.get(PROMPT_KEY) ?? PROMPT_LIST
    return promptList
  } catch (err) {
    return PROMPT_LIST
  }
}
