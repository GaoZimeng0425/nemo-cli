import instance, { type Options } from 'ora'
import { isString } from './types.js'

const BASE_OPTIONS = {
  timeout: 10000
}

export const ora = (options: string | Options) => {
  if (!isString(options)) return instance(options)

  // TODO: add logo...
  const spinner = instance({
    // spinner: {},
    text: options
  })

  return spinner
}
