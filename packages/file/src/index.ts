import { resolve } from 'node:path'
import { Command } from 'commander'

import {
  readPackage,
  createCheckbox,
  deleteFiles,
  dirList,
  emptyDirs,
  fileList,
  log
} from '@nemo-cli/shared'
import { HELP_MESSAGE } from './constants.js'

export const pkg = readPackage(import.meta, '..')

const pathResolve = (dirname: string) => resolve(process.cwd(), dirname)

export const init = () => {
  const program = new Command()
    .name('file')
    .version(pkg.version)
    .description(`${pkg.name} Make file operations easier`)
    .addHelpText('after', HELP_MESSAGE.file)

  deleteFilesCommand(program)
  cleanCommand(program)
  listCommand(program)
  return program
}

const parseNames = (names: string) => {
  const dirList: string[] = names.split(/\W+/gm)
  return dirList
}
const deleteFilesCommand = (program: Command) => {
  program
    .command('delete [...dirnames]')
    .description('Delete file which you choose')
    // .option('-a, --all', 'Delete all')
    // .option('-c, --current', '删除当前文件夹并返回上一层')
    .action(async (dirnames: string, options) => {
      const files = fileList()
      if (files.length === 0) {
        return log.success('file', '当前文件夹为空')
      }

      const cwd = process.cwd()
      dirnames = dirnames?.trim()
      const delFilesList: string[] = []
      if (dirnames) {
        const dirList: string[] = parseNames(dirnames)
        delFilesList.push(...dirList)
      } else {
        const choices: string[] = await createCheckbox({
          message: 'Choose file you want to Delete',
          choices: files
        })
        delFilesList.push(...choices)
      }
      delFilesList.length && deleteFiles(delFilesList.map((dir) => `${cwd}/${dir}`))

      log.success('file', 'Delete success!')
    })
}

const cleanCommand = (program: Command) => {
  program
    .command('clean')
    // .option('-a, --all', '清空当前文件夹(文件保存)')
    // .option('-r, --recursion', '清空子文件')
    .action(async (options) => {
      const cwd = process.cwd()
      const list = dirList(cwd)
      if (list.length === 0) {
        return log.success('file', `Current path: ${cwd} is empty directory`)
      }
      const choices: string[] = await createCheckbox({
        message: 'Choose directory you want to Delete',
        choices: list
      })
      if (choices.length) {
        emptyDirs(choices)
      }
      log.success('file', 'Delete success!')
    })
}

const listCommand = (program: Command) => {
  program
    .command('list [dirname]')
    .alias('ls')
    // .option('-a, --all', '显示隐藏')
    // .option('-d, --depth', '显示子文件')
    .action((dirname = '.', options) => {
      log.success('file command', fileList(pathResolve(dirname)))
    })
}
