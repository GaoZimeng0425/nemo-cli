import { resolve } from 'node:path'
import fse, { type PathLike } from 'fs-extra'
import { glob as fastGlob } from 'glob'
import { log } from './log.js'
import { dirname } from './pathname.js'

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

export const readJSON = (path: string, overwrite = false) => {
  if (fse.existsSync(path)) {
    return fse.readJsonSync(path)
  }
  log.error('file', `你所查找的${path}文件不存在`)
}

export const writeJSON = (path: string, content: string, force = false) => {
  const exist = fse.existsSync(path)
  if (!exist) {
    force ? fse.ensureDirSync(path) : log.error('file', `你所查找的${path}文件不存在`)
  }
  return fse.writeFileSync(path, content)
}

export const copyFile = (src: PathLike, dest: PathLike, overwrite = false) => {
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

export const dirList = (src = './') => {
  const files = fileList(src)
  return files.filter((file) => fse.statSync(`${src}/${file}`).isDirectory())
}

export const fileList = (src = './') => {
  return fse.readdirSync(src)
}

export const filterDirList = (list: string[]) => {
  return list.filter((item) => fse.statSync(item).isDirectory())
}

export const glob = (pattern: string, options: any) => {
  return fastGlob(pattern, options)
}
