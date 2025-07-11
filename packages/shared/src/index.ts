import { readPackage } from './utils/file.js'

export * from './constants'
export * from './utils/color'
export * from './utils/command'
export * from './utils/common'
export * from './utils/config'
export * from './utils/env'
export * from './utils/file'
export * from './utils/prompts'
export * from './utils/log'
export * from './utils/packageJson'
export * from './utils/pathname'
export * from './utils/promise'
export * from './utils/spinner'
export * from './utils/types'
export * from './utils/workspace'

export const pkg = readPackage(import.meta, '..')
