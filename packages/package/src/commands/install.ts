import { $ } from 'zx'
import { Command } from 'commander'

import {
  createCheckbox,
  createInput,
  createList,
  isString,
  isUndefined,
  log,
  ora,
  tryPromise
} from '@nemo-cli/shared'

import { HELP_MESSAGE } from '../constants.js'
import { relate, searchWorkspaceDir } from '../utils.js'

const join = (list: string[], separator = ' ') => list.join(separator)
const installHandle = async (
  packageNames: string[],
  options: { saveProd: boolean; exact: boolean; peer: boolean; workspace: string[] }
) => {
  const { saveProd = true, exact = false, peer = false } = options
  const installPath = options.workspace.map((path) => {
    const workspace = relate(path)
    return {
      name: workspace,
      value: `./${workspace}`
    }
  })

  log.verbose('install: installHandle workspace', installPath.map(({ name }) => name).join('\n'))

  const choose: string[] = await createCheckbox({
    choices: installPath,
    message: `Choose Directory To Install Package`,
    validate: (list: string[]) => list.length > 0
  })

  log.verbose('install: Choose Directory', join(choose, '\n'))

  const flags = [
    saveProd ? '--save-prod' : '--save-dev',
    exact ? '--save-exact' : '',
    peer ? '--save-peer' : ''
  ].filter(Boolean)

  const filter = choose.map((name) => `--filter=${name}`)

  const spinner = ora(`${join(packageNames)} installing in ${join(choose)} directory!`).start()

  log.verbose('install filter', filter)

  const script = `pnpm ${filter} add -r ${packageNames} ${flags}`
  log.verbose('install script', script)

  const [err] = await tryPromise($`pnpm ${filter} add -r ${packageNames} ${flags}`)

  err && log.verbose('install error', err)
  err
    ? spinner.fail(err.message)
    : spinner.succeed(`workspace: ${join(choose)} install ${join(packageNames)} success!`)
}

const ensurePackage = async (input: string | string[]): Promise<string[]> => {
  log.verbose('install ensurePackage input', input)
  if (isString(input)) input = [input]
  const packageNames = input?.map((input) => input.trim()) || []
  log.verbose('install ensurePackage', packageNames)

  if (packageNames.length === 0) {
    const packageName = await createInput({
      message: 'Please enter the package name you want to install',
      validate: (name) => !!name
    })
    packageNames.push(packageName)
  }
  return packageNames
}

export const installCommand = (program: Command) => {
  program
    .command('install [packages...]')
    .alias('add')
    .option('-D, --save-dev', 'Is Development dependencies')
    .option('-S, --save-prod', 'Is Productive dependencies')
    .option('-E, --exact', 'Is exact dependencies')
    .addHelpText('after', HELP_MESSAGE.install)
    .action(async (packages, options) => {
      const workspaceDir = searchWorkspaceDir()
      log.verbose('install workspaceDir', workspaceDir)

      const packageNames = await ensurePackage(packages)

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
