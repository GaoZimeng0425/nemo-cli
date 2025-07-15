import chalk from 'chalk'
import instance, { type Options, spinners } from 'ora'

import { isString } from './types.js'

export const BASE_OPTIONS = {
  timeout: 10000,
}

export const ora = (options: string | Options) => {
  if (!isString(options)) return instance(options)

  const spinner = instance({
    spinner: spinners.circleHalves,
    text: chalk.green(options),
  })

  return spinner
}
