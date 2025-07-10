import { dirname as _dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const filename = <T extends { url: string }>(importMate: T) => fileURLToPath(importMate.url)
export const dirname = <T extends { url: string }>(importMate: T) => _dirname(filename(importMate))
export const cwdPathname = (dirname: string) => resolve(process.cwd(), dirname)
const REGEXP_SPLIT_NAMES = /\W+/gm
export const parseNames = (names: string) => names.split(REGEXP_SPLIT_NAMES)
