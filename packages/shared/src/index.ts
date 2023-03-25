export * from './utils/log.js'
export * from './utils/env.js'
export * from './utils/pathname.js'
export * from './utils/promise.js'
export * from './utils/types.js'
export * from './utils/config.js'
export * from './constants.js'
export * from './createInquirer.js'
export { ora } from './utils/spinner.js'
export * from './utils/file.js'

import pkg from '../package.json' assert { type: 'json' }
export { pkg }

export const cached = <Func extends (...args: any[]) => any>(fn: Func) => {
  const map: Map<PropertyKey, ReturnType<Func>> = new Map()
  return (content: PropertyKey): ReturnType<Func> => {
    if (map.has(content)) return map.get(content)!
    const result = fn(content)
    map.set(content, result)
    return result
  }
}
