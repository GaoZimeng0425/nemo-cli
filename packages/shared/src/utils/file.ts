import fse, { type PathLike, ReadStream } from 'fs-extra'
import { createReadStream } from 'fs'
import { log } from './log.js'
import { dirname } from './pathname.js'
import { resolve } from 'path'
import { stdin as input, stdout as output } from 'node:process'

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
  return fileList(src).filter((file) => fse.statSync(file).isDirectory())
}
export const fileList = (src: string = './') => fse.readdirSync(src)
