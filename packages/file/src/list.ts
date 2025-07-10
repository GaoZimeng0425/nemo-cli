import { type Command, cwdPathname, fileList, log } from '@nemo-cli/shared'

export const listCommand = (program: Command) => {
  program
    .command('list [dirname]')
    .alias('ls')
    .option('-a, --all', 'Show hidden files')
    .option('-d, --depth', 'Show sub-files')
    .action((dirname = '.') => {
      log.success('file command', fileList(cwdPathname(dirname ?? '.')))
    })
}
