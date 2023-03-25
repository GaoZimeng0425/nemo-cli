import { resolve } from 'node:path'
import fse, { type PathLike } from 'fs-extra'
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
    log.error('file', (err as any).message)
    process.exit(0)
  }
}

export const readJSON = (path: string, force = false) => {
  if (fse.existsSync(path)) {
    return fse.readJsonSync(path)
  } else {
    log.error('file', `你所查找的${path}文件不存在`)
  }
}

export const writeJSON = async (path: string, content: string, force = false) => {
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
export const deleteFiles = (files: string[]) => files.forEach((file) => fse.removeSync(file))

export const emptyDir = (src: string) => fse.emptyDirSync(src)
export const emptyDirs = (dirs: string[]) => dirs.forEach((dir) => fse.emptyDirSync(dir))

export const isEmptyDir = async (src: string) => {
  const list = fse.readdirSync(src)
  return list.length === 0
}

export const dirList = (src: string = './') => {
  const files = fileList(src)
  return files.filter((file) => fse.statSync(`${src}/${file}`).isDirectory())
}
export const fileList = (src: string = './') => {
  return fse.readdirSync(src)
}
