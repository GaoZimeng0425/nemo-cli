import { createPassword, createStore } from '@nemo-cli/shared'
import { API_KEY_NAME, PROMPT_KEY, STORE_PATH } from '../constants.js'

const store = createStore('openai', { path: STORE_PATH })

export const deleteKey = () => {
  store.delete(API_KEY_NAME)
}
export const setKey = async () => {
  const apiKey = await createPassword({ message: 'input openai apikey' })
  store.set(API_KEY_NAME, apiKey)
}

export const getKey = async () => {
  let apiKey = store.get(API_KEY_NAME)
  if (!apiKey) {
    apiKey = await setKey()
  }
  return apiKey
}

export const savePrompt = (prompt: string[]) => {
  try {
    const promptList = store.get(PROMPT_KEY) || []
    promptList.push(prompt)
    store.set(PROMPT_KEY, promptList)
    return true
  } catch (err) {
    return false
  }
}
export const getPrompt = () => {
  try {
    const prompt: string[] = store.get(PROMPT_KEY)
    return prompt
  } catch (err) {
    return null
  }
}
