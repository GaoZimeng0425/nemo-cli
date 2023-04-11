import { $ } from 'zx'
import { Command } from 'commander'
import { createList } from '@nemo-cli/shared'

import { HELP_MESSAGE } from '../constants.js'

const upgradeHandle = ({ global, latest }: { global: boolean; latest: boolean }) => {
  $.verbose = false
  const stream = $`pnpm upgrade ${global ? '--global' : ''} ${latest ? '--latest' : ''} --color`

  stream.pipe(process.stdout)
}
export const upgradeCommand = (command: Command) => {
  command
    .command('upgrade')
    .alias('up')
    .description('Upgrade packages version use pnpm')
    .option('-L, --latest', 'Upgrade to latest version', true)
    .option('-g, --global', 'Upgrade to global version')
    .addHelpText('after', HELP_MESSAGE.clean)
    .action(async (options) => {
      options.global =
        options.global ??
        (await createList({
          message: 'global or locale',
          choices: ['global', 'locale']
        }))
      if (options.global) {
        await upgradeHandle({ global: true, latest: false })
      } else if (options.latest) {
        await upgradeHandle({ global: false, latest: true })
      }
    })
}
