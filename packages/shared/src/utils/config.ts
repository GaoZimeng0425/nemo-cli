import { existsSync } from 'node:fs'
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

export const loadEnv = (importMeta: { url: string }, ...paths: string[]) => {
  console.log('🚀 : loadEnv : importMeta:', importMeta.url)

  // Try the provided path first
  const providedPath = path.resolve(dirname(importMeta), ...paths)
  console.log('Trying provided path:', providedPath)

  if (existsSync(providedPath)) {
    console.log('✅ Found .env at provided path:', providedPath)
    dotenvConfig({ path: providedPath, quiet: true })
    return
  }

  // If provided path doesn't work, try to find .env file by walking up the directory tree
  let currentDir = dirname(importMeta)
  console.log('🚀 : loadEnv : currentDir:', currentDir)
  const maxLevels = 10 // Prevent infinite loop

  for (let i = 0; i < maxLevels; i++) {
    const envPath = path.join(currentDir, '.env')
    console.log(`Trying level ${i}:`, envPath)

    if (existsSync(envPath)) {
      console.log('✅ Found .env at:', envPath)
      dotenvConfig({ path: envPath, quiet: true })
      return
    }

    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir) break // Reached root directory
    currentDir = parentDir
  }

  console.log('❌ Could not find .env file')
}
export const createStore = (name: string, options: StoreOptions): Configstore => {
  if (!options.path) throw Error('Store subpath is necessary!')

  const configPath = path.resolve(configRootPath, options.path)
  const store = new Configstore(name, options.default ?? {}, { configPath })
  log.verbose('store created success', store.path)
  return store
}

export { Configstore }
