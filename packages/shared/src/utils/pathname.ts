import { dirname as _dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const filename = <T extends { url: string }>(importMate: T) => fileURLToPath(importMate.url)
export const dirname = <T extends { url: string }>(importMate: T) => _dirname(filename(importMate))
export const cwdPathname = (dirname: string) => resolve(process.cwd(), dirname)

/**
 * Join path segments and resolve to absolute path from current working directory
 * @param segments - Path segments to join
 * @returns Absolute path
 *
 * @example
 * joinPath('packages', 'workspace', 'package.json')
 * // Returns: /Users/user/project/packages/workspace/package.json
 */
export const joinPath = (...segments: string[]) => resolve(process.cwd(), join(...segments))

const REGEXP_SPLIT_NAMES = /\W+/gm
export const parseNames = (names: string) => names.split(REGEXP_SPLIT_NAMES)
