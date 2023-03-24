import { fileURLToPath } from 'node:url'
import { dirname as _dirname } from 'node:path'

export const filename = <T extends { url: string }>(importMate: T) => fileURLToPath(importMate.url)
export const dirname = <T extends { url: string }>(importMate: T) => _dirname(filename(importMate))
