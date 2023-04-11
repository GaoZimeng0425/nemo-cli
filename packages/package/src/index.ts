import { Command } from 'commander'
import { readPackage } from '@nemo-cli/shared'
import { installCommand } from './commands/install.js'
import { HELP_MESSAGE } from './constants.js'
import { cleanCommand } from './commands/clean.js'
import { upgradeCommand } from './commands/upgrade.js'

export const pkg = readPackage(import.meta, '..')

export const init = () => {
  const command = new Command('pnpm')
    .version(pkg.version)
    .description(`${pkg.name} Make pnpm Workspace Operation Easier`)
    .addHelpText('after', HELP_MESSAGE.pnpm)

  installCommand(command)
  cleanCommand(command)
  upgradeCommand(command)

  return command
}

export const run = () => {
  const command = init()
  command.parse(process.argv)
}
