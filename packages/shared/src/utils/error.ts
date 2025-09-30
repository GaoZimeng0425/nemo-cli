import { ErrorMessage } from '@nemo-cli/ui'
import { log } from './log'
import { isError, isString } from './types'

export const handleError = (err: unknown, message: string) => {
  if (isError(err)) {
    ErrorMessage({ text: `${message}: ${err.message}` })
  } else if (isString(err)) {
    ErrorMessage({ text: `${message}: ${err}` })
  } else {
    log.error(message, err)
  }
}
