import { log } from './log'

type NPM_INFO = {
  'dist-tags': {
    latest: `${number}.${number}.${number}`
  }
}
export const getNpmInfo = (npmName: string, register: string): Promise<NPM_INFO> => {
  const url = new URL(npmName, register)
  return fetch(url.toString())
    .then((data) => data.json())
    .catch((err) => {
      log.error('network', err.message)
      throw new Error(err)
    }) as Promise<NPM_INFO>
}
