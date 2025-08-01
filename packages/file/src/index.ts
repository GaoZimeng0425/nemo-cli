import { createCommand, readPackage } from '@nemo-cli/shared'

import { astFilesCommand } from './commands/ast'
import { cleanCommand } from './commands/clean'
import { createRoutesCommand } from './commands/create-routes'
import { deleteFilesCommand } from './commands/delete'
import { listCommand } from './commands/list'
import { HELP_MESSAGE } from './constants'

export const pkg = readPackage(import.meta, '..')

export const init = () => {
  const program = createCommand('nf')
    .version(pkg.version)
    .description(`${pkg.name} Make file operations easier`)
    .addHelpText('after', HELP_MESSAGE.file)

  astFilesCommand(program)
  deleteFilesCommand(program)
  cleanCommand(program)
  listCommand(program)
  createRoutesCommand(program)

  return program
}

export const run = () => {
  const command = init()
  command.parse(process.argv)
}
