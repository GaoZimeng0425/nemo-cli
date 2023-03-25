import { $ } from 'zx'
import { Command } from 'commander'

import {
  checkFile,
  createCheckbox,
  createInput,
  createList,
  dirList,
  isUndefined,
  log,
  ora,
  tryPromise
} from '@nemo-cli/shared'
import { HELP_MESSAGE } from './constants.js'

const searchWorkspaceDir = (): string[] => {
  // TODO: support custom workspace
  // const pkg = readPackage({ url: cwd })
  // const { workspaces } = pkg
  // const dirnames: string[] = []
  // if (isArray(workspaces)) {
  // } else {
  // }
  const cwd = process.cwd()
  const isWorkspaceDir = checkFile(`${cwd}/pnpm-workspace.yaml`)
  if (!isWorkspaceDir) {
    log.error('install', "It's not workspace directory")
    process.exit(0)
  }
  return dirList(`${cwd}/packages`) || []
}
const installHandle = async (
  packageNames: string,
  options: { dev: boolean; exact: boolean; peer: boolean }
) => {
  const workspaceDir = searchWorkspaceDir()
  log.success('install', workspaceDir.join(', '))
  const choose: string[] = await createCheckbox({
    choices: workspaceDir,
    message: `Choose Directory To Install Package`
  })
  const dev = options.dev ? '--save-dev' : '--save-prod'
  const exact = options.exact ? '--save-exact' : ''
  const peer = options.peer ? '--save-peer' : ''
  const filter = choose.map((name) => `--filter=./packages/${name}`)

  const spinner = ora(`${packageNames} installing in ${choose.join(' ')} directory!`).start()

  const flags = [dev, peer, exact].filter(Boolean)
  const [err] = await tryPromise($`pnpm ${filter} add -r ${packageNames} ${flags}`)

  err
    ? spinner.fail(err.message)
    : spinner.succeed(`workspace: ${choose.join(' ')} install ${packageNames} success!`)
}

export const installCommand = (program: Command) => {
  program
    .command('install [...packages]')
    .option('-D, --dev', 'Is development dependencies')
    .option('-S, --save', 'Is productive dependencies')
    .option('-E, --exact', 'Is exact dependencies')
    .addHelpText('after', HELP_MESSAGE.install)
    .action(async (packages, options) => {
      let packageNames = packages?.trim().split(/\W+/gm).join(' ')
      console.log('[高子蒙] : file: install.ts:64 : .action : packageNames:', packageNames)
      if (!packageNames) {
        packageNames = await createInput({
          message: 'Please enter the package name you want to install',
          validate: (name) => !!name
        })
      }
      if (isUndefined(options.dev) && isUndefined(options.save)) {
        options.dev = await createList({
          message: 'Is it a development dependencies?',
          choices: [
            { name: 'Yes', value: true },
            { name: 'No', value: false }
          ]
        })
      }
      installHandle(packageNames, options)
    })
}
