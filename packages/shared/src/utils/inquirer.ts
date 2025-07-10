// import { checkbox, confirm, input, password, rawlist, select } from '@inquirer/prompts'
import {
  cancel,
  confirm,
  isCancel,
  multiselect,
  password,
  type SpinnerOptions,
  select,
  spinner,
  text,
} from '@clack/prompts'

const createPrompt =
  <T extends (options: any) => Promise<any>>(fn: T) =>
  async (options: Parameters<T>[0]) => {
    const result = await fn(options)

    if (isCancel(result)) {
      cancel('User cancelled')
      process.exit(0)
    }
    return result
  }

export const createSelect = createPrompt(select)

export const createInput = createPrompt(text)

export const createPassword = createPrompt(password)

export const createCheckbox = createPrompt(multiselect)

export const createConfirm = confirm

export const createSpinner = (message: string, options?: SpinnerOptions) => {
  const s = spinner(options)
  s.start(message)
  return s
}
