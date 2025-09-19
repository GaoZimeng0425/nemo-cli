import { homedir } from 'node:os'
import path from 'node:path'
import Configstore from 'configstore'
import { config as dotenvConfig } from 'dotenv'

import { CONFIG_NAME } from '../constants'
import { log } from './log'
import { dirname } from './pathname'

const configRootPath = path.resolve(homedir(), CONFIG_NAME)

type StoreOptions = {
  path: string
  default?: Record<PropertyKey, unknown>
}

export const loadEnv = (importMeta: { url: string }, filename: string) => {
  dotenvConfig({ path: path.resolve(dirname(importMeta), filename), quiet: true })
}
export const createStore = (name: string, options: StoreOptions): Configstore => {
  if (!options.path) throw Error('Store subpath is necessary!')

  const configPath = path.resolve(configRootPath, options.path)
  const store = new Configstore(name, options.default ?? {}, { configPath })
  log.verbose('store created success', store.path)
  return store
}

export { Configstore }
