import { type Command, createInput, emptyDirs, log } from '@nemo-cli/shared'

import { HELP_MESSAGE } from '../constants'
import { searchWorkspaceDir } from '../utils'

const cleanHandle = (directory: string[]) => {
  try {
    emptyDirs(directory)
    log.success('pnpm clean success!', directory.join(', '))
  } catch (error) {
    log.error('pnpm clean', (error as Error).message ?? 'clean error!')
    process.exit(0)
  }
}
export const cleanCommand = (command: Command) => {
  command
    .command('clean')
    .description('Clear workspace build directory')
    .argument('[dirname]', 'Build directory name', 'dist')
    .addHelpText('after', HELP_MESSAGE.clean)
    .action(async (dirname) => {
      const workspaceDir = searchWorkspaceDir()
      const _dirname =
        dirname ||
        (await createInput({
          message: 'Enter folder name in all workspace cleanup',
        }))
      const target = workspaceDir.map((cwd) => `${cwd}/${_dirname}`)
      cleanHandle(target)
    })
}
