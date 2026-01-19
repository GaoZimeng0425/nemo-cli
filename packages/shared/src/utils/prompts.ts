import {
  cancel,
  confirm,
  type GroupMultiSelectOptions,
  group,
  groupMultiselect,
  isCancel,
  type MultiSelectOptions,
  multiselect,
  type NoteOptions,
  note,
  type Option,
  type PromptGroup,
  type SelectOptions,
  type SpinnerOptions,
  select,
  spinner,
  type TaskLogOptions,
  type TextOptions,
  taskLog,
  tasks,
  text,
} from '@clack/prompts'
import { search } from '@inquirer/prompts'
import Fuse from 'fuse.js'

import { exit } from './command'
import { log } from './log'
import { isString } from './types'

export type PromptOptions<T extends string | number | boolean | symbol = string> = {
  label: string
  value: T
}

export const createOptions = <const T extends string | number>(options: readonly T[]): Option<T>[] =>
  options.map((option) => ({ label: option.toString(), value: option }) as Option<T>)

const createPrompt = <T extends AnyFunction>(fn: T) => {
  return async (options: Parameters<T>[0]): Promise<Awaited<ReturnType<T>>> => {
    const result = await fn(options)

    if (isCancel(result)) {
      cancel('User cancelled')
      exit(0)
    }
    return result
  }
}

export const createShowList = createPrompt((options: string[] | PromptOptions[]) => {
  const result = options.map((option) => {
    return isString(option) ? option : option.label
  })
  result.forEach((item) => {
    log.show(item, { type: 'step' })
  })
})

export const createSearch = ({ message, options }: { message: string; options: PromptOptions[] }) => {
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

export const createCheckbox = async <Value>(opts: MultiSelectOptions<Value>) => {
  const result = await multiselect(opts)

  if (isCancel(result)) {
    cancel('User cancelled')
    exit(0)
  }
  return result as Value[]
}

export const createNote = ({
  message = '',
  title = '',
  opts,
}: {
  message?: string
  title?: string
  opts?: NoteOptions
}) => note(message, title, opts)

export const createConfirm = createPrompt(confirm)

export const createTasks = createPrompt(tasks)

export const createSelect = async <Value>(opts: SelectOptions<Value>) => {
  const result = await select(opts)

  if (isCancel(result)) {
    cancel('User cancelled')
    exit(0)
  }
  return result as Value
}

export const createInput = async (opts: TextOptions) => {
  const result = await text(opts)

  if (isCancel(result)) {
    cancel('User cancelled')
    exit(0)
  }
  return result as string
}

export const createGroupMultiSelect = async <Value>(opts: GroupMultiSelectOptions<Value>) => {
  const result = await groupMultiselect(opts)

  if (isCancel(result)) {
    cancel('User cancelled')
    process.exit(0)
  }
  return result
}

export const createGroup = async <Value>(opts: PromptGroup<Value>) => {
  const result = await group(opts)

  if (isCancel(result)) {
    cancel('User cancelled')
    exit(0)
  }
  return result
}

export type Spinner = ReturnType<typeof spinner>
export const createSpinner = (message: string, options?: SpinnerOptions) => {
  const s = spinner(options)
  s.start(message)
  return s
}

export const createTaskLog = (title: string, options?: TaskLogOptions) => taskLog({ title, ...options })

export { intro, outro, progress, stream } from '@clack/prompts'
