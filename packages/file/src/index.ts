import { type Command, createCheckbox, createCommand, dirList, emptyDirs, log, readPackage } from '@nemo-cli/shared'

import { astFilesCommand } from './ast.js'
import { HELP_MESSAGE } from './constants.js'
import { deleteFilesCommand } from './delete.js'
import { listCommand } from './list.js'

export const pkg = readPackage(import.meta, '..')

export const init = () => {
  const program = createCommand('file')
    .name('file')
    .version(pkg.version)
    .description(`${pkg.name} Make file operations easier`)
    .addHelpText('after', HELP_MESSAGE.file)

  astFilesCommand(program)

  deleteFilesCommand(program)
  cleanCommand(program)
  listCommand(program)
  return program
}

const _parseNames = (names: string) => {
  const dirList: string[] = names.split(/\W+/gm)
  return dirList
}

const cleanCommand = (program: Command) => {
  program
    .command('clean')
    // .option('-a, --all', '清空当前文件夹(文件保存)')
    // .option('-r, --recursion', '清空子文件')
    .action(async (_options) => {
      const cwd = process.cwd()
      const list = dirList(cwd)
      if (list.length === 0) {
        return log.success('file', `Current path: ${cwd} is empty directory`)
      }
      const choices: string[] = await createCheckbox({
        message: 'Choose directory you want to Delete',
        options: list.map((dir) => ({
          value: dir,
          label: dir,
        })),
      })
      if (choices.length) {
        emptyDirs(choices)
      }
      log.success('file', 'Delete success!')
    })
}

export const run = () => {
  const command = init()
  command.parse(process.argv)
}
