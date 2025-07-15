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
import search from '@inquirer/search'
import Fuse from 'fuse.js'

import { log } from './log'
import { isString } from './types'

export const createOptions = <const T extends string | number>(options: T[]): SearchOptions[] =>
  options.map((option) => ({ label: option.toString(), value: option.toString() }))

const createPrompt = <T extends AnyFunction>(fn: T) => {
  return async (options: Parameters<T>[0]) => {
    const result = await fn(options)

    if (isCancel(result)) {
      cancel('User cancelled')
      process.exit(0)
    }
    return result
  }
}

type SearchOptions = {
  label: string
  value: string
}

export const createShowList = createPrompt((options: string[] | SearchOptions[]) => {
  const result = options.map((option) => {
    return isString(option) ? option : option.label
  })
  log.show(result.join('\n'), { type: 'step' })
})

export const createSearch = ({ message, options }: { message: string; options: SearchOptions[] }) => {
  const fuse = new Fuse(options, { keys: ['label'] })

  return search({
    message,
    source: (term) => {
      if (!term) return options
      const result = fuse.search(term)
      return result.map(({ item }) => item)
    },
  })
}

// Handle inquirer Prompt exceptions
process.on('uncaughtException', (error) => {
  if (error instanceof Error && error.name === 'ExitPromptError') {
    log.show('User cancelled', { type: 'error' })
  } else {
    throw error
  }
})

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
