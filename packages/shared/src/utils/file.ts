import { dirname as pathDirname, resolve } from 'node:path'
import fse, { type PathLike } from 'fs-extra'
import { type GlobOptions, glob as originalGlob, type Path } from 'glob'

import { log } from './log'
import { dirname } from './pathname'

export { loadConfig } from 'unconfig'

// const url = new URL(import.meta.resolve('./data.json'))
// const data = JSON.parse(fse.readFileSync(url, 'utf-8'))
type Package = {
  name: string
  version: `${number}.${number}.${number}`
  keywords: string[]
  license: string
  author: string
  description: string
  workspaces: string[] | Record<string, string[]>
}

export const readPackage = (importMeta: { url: string }, ...paths: string[]): Package => {
  try {
    const path = resolve(dirname(importMeta), ...paths)
    return readJSON(`${path}/package.json`)
  } catch (err) {
    log.error('file readPackage error:', (err as Error).message)
    process.exit(0)
  }
}

export const readJSON = (path: string, _overwrite = false) => {
  if (fse.existsSync(path)) {
    return fse.readJsonSync(path)
  }
  log.error('file', `你所查找的${path}文件不存在`)
}

export const writeJSON = (path: string, content: AnyObject, force = false) => {
  const exist = fse.existsSync(path)
  if (!exist) {
    force ? fse.mkdirSync(pathDirname(path), { recursive: true }) : log.error('file', `你所查找的${path}文件不存在`)
  }
  return fse.writeFileSync(path, JSON.stringify(content, null, 2))
}

export const readFile = (importMeta: { url: string }, ...paths: string[]): string => {
  const path = resolve(dirname(importMeta), ...paths)
  return fse.readFileSync(path, 'utf-8')
}

export const copyFile = (src: PathLike, dest: PathLike, _overwrite = false) => {
  if (fse.existsSync(dest)) {
    log.error('file', `${dest}`)
  }
  fse.copyFileSync(src, dest)
}

export const checkFile = (src: string) => fse.existsSync(src)

export const deleteFile = (file: string) => fse.removeSync(file)
export const deleteFiles = (files: string[]) => {
  for (const file of files) {
    fse.removeSync(file)
  }
}

export const emptyDir = (src: string) => {
  log.verbose('empty', src)
  fse.emptyDirSync(src)
}
export const emptyDirs = (dirs: string[]) => {
  for (const dir of dirs) {
    emptyDir(dir)
  }
}

export const isEmptyDir = (src: string) => {
  const list = fse.readdirSync(src)
  return list.length === 0
}

export const dirList = (src = './'): string[] => {
  const files = fileList(src)
  return files.filter((file) => fse.statSync(`${src}/${file}`).isDirectory())
}

export const fileList = (src = './') => {
  return fse.readdirSync(src)
}

export const filterDirList = (list: string[]) => {
  return list.filter((item) => fse.statSync(item).isDirectory())
}

export function glob(pattern: string, options: Partial<GlobOptions> & { withFileTypes: true }): Promise<Path[]>
export function glob(pattern: string, options?: Partial<GlobOptions>): Promise<string[]>
export function glob(pattern: string, options: Partial<GlobOptions> = {}) {
  return originalGlob(pattern, { ignore: 'node_modules/**', ...options })
}

/**
 * 读取当前执行文件夹内的 .gitignore 文件内容
 * @param cwd 当前工作目录，默认为 process.cwd()
 * @returns .gitignore 文件内容，如果文件不存在则返回 null
 */
export const readGitignore = (cwd: string = process.cwd()): string[] => {
  const gitignorePath = resolve(cwd, '.gitignore')

  if (!fse.existsSync(gitignorePath)) {
    log.verbose('gitignore', `未找到 .gitignore 文件: ${gitignorePath}`)
    return []
  }

  try {
    const content = fse.readFileSync(gitignorePath, 'utf-8')
    log.verbose('gitignore', `成功读取 .gitignore 文件: ${gitignorePath}`)
    return content.split('\n')
  } catch (err) {
    log.error('gitignore', `读取 .gitignore 文件失败: ${(err as Error).message}`)
    return []
  }
}
