import { getConfig } from './config.js'
import { log } from './log.js'

type NPM_INFO = {
  'dist-tags': {
    latest: `${number}.${number}.${number}`
  }
}
export const getNpmInfo = (npmName: string): Promise<NPM_INFO> => {
  const config = getConfig()
  const url = new URL(npmName, config.register)
  return fetch(url.toString())
    .then((data) => data.json())
    .catch((err) => {
      log.error('network', err.message)
      throw new Error(err)
    })
}
