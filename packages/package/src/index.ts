import { Command } from 'commander'
import { readPackage } from '@nemo-cli/shared'
import { installCommand } from './install.js'
import { HELP_MESSAGE } from './constants.js'

export const pkg = readPackage(import.meta, '..')

export const init = () => {
  const command = new Command('pnpm')
    .version(pkg.version)
    .description(`${pkg.name} Make pnpm Workspace Operation Easier`)
    .addHelpText('after', HELP_MESSAGE.pnpm)

  installCommand(command)

  return command
}

export const run = () => {
  const command = init()
  command.parse(process.argv)
}
