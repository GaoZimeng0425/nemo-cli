import { readPackage } from './utils/file'

// Re-export from constants
export * from './constants'
export * from './package-manager/adapter'
export * from './package-manager/adapters'
export * from './package-manager/detector'
// Package manager support
export * from './package-manager/types'
// Utils exports
export * from './utils/browser'
export * from './utils/color'
export * from './utils/command'
export * from './utils/common'
export * from './utils/config'
export * from './utils/env'
export * from './utils/error'
export * from './utils/file'
export * from './utils/format'
export * from './utils/git-handle'
export * from './utils/log'
export * from './utils/packageJson'
export * from './utils/pathname'
export * from './utils/promise'
export * from './utils/prompts'
export * from './utils/spinner'
export * from './utils/types'
export * from './utils/workspace'

export const pkg = readPackage(import.meta, '..')
