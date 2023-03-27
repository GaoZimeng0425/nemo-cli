import { Command } from 'commander'
import { createInput, emptyDirs, log } from '@nemo-cli/shared'
import { searchWorkspaceDir } from '../utils.js'
import { HELP_MESSAGE } from '../constants.js'

const cleanHandle = (directory: string[]) => {
  try {
    emptyDirs(directory)
    log.success('pnpm clean success!', directory.join(', '))
  } catch (error) {
    log.error('pnpm clean', (error as any).message ?? 'clean error!')
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
      dirname =
        dirname || (await createInput({ message: 'Enter folder name in all workspace cleanup' }))
      const target = workspaceDir.map((cwd) => `${cwd}/${dirname}`)
      cleanHandle(target)
    })
}
