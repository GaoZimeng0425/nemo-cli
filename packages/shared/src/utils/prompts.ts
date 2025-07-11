import {
  cancel,
  confirm,
  group,
  isCancel,
  multiselect,
  password,
  type SpinnerOptions,
  select,
  spinner,
  tasks,
  text,
} from '@clack/prompts'

const createPrompt =
  <T extends (options: any) => Awaited<any>>(fn: T) =>
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

export const createConfirm = createPrompt(confirm)

export const createTasks = createPrompt(tasks)

export const createGroup = createPrompt(group)

export const createSpinner = (message: string, options?: SpinnerOptions) => {
  const s = spinner(options)
  s.start(message)
  return s
}

export { intro, outro, stream } from '@clack/prompts'
