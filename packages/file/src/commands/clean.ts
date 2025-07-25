import { type Command, createCheckbox, deleteFiles, fileList, log, parseNames } from '@nemo-cli/shared'

export const cleanCommand = (program: Command) => {
  program
    .command('clean [...dirnames]')
    .description('Clean file which you choose')
    .action(async (dirnames: string, _options) => {
      const files = fileList()
      if (files.length === 0) {
        return log.success('file', '当前文件夹为空')
      }

      const cwd = process.cwd()
      const dirnamesTrim = dirnames?.trim()
      const delFilesList: string[] = []
      if (dirnamesTrim) {
        const dirList: string[] = parseNames(dirnames)
        delFilesList.push(...dirList)
      } else {
        const choices: string[] = await createCheckbox({
          message: 'Choose file you want to Clean',
          options: files.map((file) => ({
            value: file,
            label: file,
          })),
        })
        delFilesList.push(...choices)
      }

      delFilesList.length && deleteFiles(delFilesList.map((dir) => `${cwd}/${dir}`))

      log.show('Clean success!', { type: 'success' })
    })
}
