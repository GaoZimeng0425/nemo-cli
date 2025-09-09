import { type Command, createInput, emptyDirs, getWorkspaceDirs, log } from '@nemo-cli/shared'

import { HELP_MESSAGE } from '../constants'

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
    .argument('[dirname]', 'Build directory name')
    .addHelpText('after', HELP_MESSAGE.clean)
    .action(async (dirname) => {
      const workspaceDir = await getWorkspaceDirs()
      const _dirname = dirname || (await createInput({ message: 'Enter folder name in all workspace cleanup' }))
      const target = workspaceDir.packages.map((cwd) => `${cwd}/${_dirname}`)
      cleanHandle(target)
    })
}
