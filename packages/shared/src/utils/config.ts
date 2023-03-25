import path from 'node:path'
import { homedir } from 'node:os'
import Configstore from 'configstore'
import { log } from './log.js'
import { CONFIG_NAME } from '../constants.js'

const configRootPath = path.resolve(homedir(), CONFIG_NAME)

type StoreOptions = {
  path: string
  default?: Record<PropertyKey, unknown>
}
export const createStore = (name: string, options: StoreOptions) => {
  if (!options.path) throw Error('Store subpath is necessary!')

  const configPath = path.resolve(configRootPath, options.path)
  const store = new Configstore(name, options.default ?? null, { configPath })
  log.success('store created success', store.path)
  return store
}
