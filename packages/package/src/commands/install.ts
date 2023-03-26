import { $ } from 'zx'
import { Command } from 'commander'

import {
  createCheckbox,
  createInput,
  createList,
  isUndefined,
  log,
  ora,
  tryPromise
} from '@nemo-cli/shared'

import { HELP_MESSAGE } from '../constants.js'
import { searchWorkspaceDir } from '../utils.js'

const installHandle = async (
  packageNames: string,
  options: { saveProd: boolean; exact: boolean; peer: boolean; workspace: string[] }
) => {
  const { workspace, saveProd = true, exact = false, peer = false } = options
  log.success('install: installHandle workspace', workspace.join(', '))

  const choose: string[] = await createCheckbox({
    choices: workspace,
    message: `Choose Directory To Install Package`
  })

  const flags = [
    saveProd ? '--save-prod' : '--save-dev',
    exact ? '--save-exact' : '',
    peer ? '--save-peer' : ''
  ].filter(Boolean)

  const filter = choose.map((name) => `--filter=./packages/${name}`)

  const spinner = ora(`${packageNames} installing in ${choose.join(' ')} directory!`).start()

  const [err] = await tryPromise($`pnpm ${filter} add -r ${packageNames} ${flags}`)

  err
    ? spinner.fail(err.message)
    : spinner.succeed(`workspace: ${choose.join(' ')} install ${packageNames} success!`)
}

export const installCommand = (program: Command) => {
  program
    .command('install [...packages]')
    .option('-D, --save-dev', 'Is Development dependencies')
    .option('-S, --save-prod', 'Is Productive dependencies')
    .option('-E, --exact', 'Is exact dependencies')
    .addHelpText('after', HELP_MESSAGE.install)
    .action(async (packages, options) => {
      const workspaceDir = searchWorkspaceDir()

      let packageNames = packages?.trim().split(/\W+/gm).join(' ')

      if (!packageNames) {
        packageNames = await createInput({
          message: 'Please enter the package name you want to install',
          validate: (name) => !!name
        })
      }
      if (isUndefined(options.saveProd) && isUndefined(options.saveDev)) {
        options.saveProd = await createList({
          message: 'Is it a productive dependencies?',
          choices: [
            { name: 'Yes', value: true },
            { name: 'No', value: false }
          ]
        })
      }
      installHandle(packageNames, { ...options, workspace: workspaceDir })
    })
}
