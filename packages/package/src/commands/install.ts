import type { Command } from '@nemo-cli/shared'
import { createCheckbox, createInput, createSelect, isString, isUndefined, log, ora, x } from '@nemo-cli/shared'

import { HELP_MESSAGE } from '../constants'
import { relate, searchWorkspaceDir } from '../utils'

const join = (list: string[], separator = ' ') => list.join(separator)
const installHandle = async (
  packageNames: string[],
  options: { saveProd: boolean; exact: boolean; peer: boolean; workspace: string[] }
) => {
  const { saveProd = true, exact = false, peer = false } = options
  const installPath = options.workspace.map((path) => {
    const workspace = relate(path)
    return {
      label: workspace,
      value: `./${workspace}`,
    }
  })

  log.verbose('install: installHandle workspace', installPath.map(({ label }) => label).join('\n'))

  const choose: string[] = await createCheckbox({
    options: installPath,
    message: 'Choose Directory To Install Package',
    required: true,
  })

  log.verbose('install: Choose Directory', join(choose, '\n'))

  const flags = [
    saveProd ? '--save-prod' : '--save-dev',
    exact ? '--save-exact' : '',
    peer ? '--save-peer' : '',
  ].filter(Boolean)

  const filter = choose.map((name) => `--filter=${name}`)

  const spinner = ora(`${join(packageNames)} installing in ${join(choose)} directory!`).start()

  log.verbose('install filter', filter)

  const script = `pnpm ${filter} add -r ${packageNames} ${flags}`
  log.verbose('install script', script)

  const p = await x('pnpm', [...filter, 'add', '-r', ...packageNames, ...flags])

  p.exitCode && log.verbose('install error', p.exitCode)
  p.exitCode
    ? spinner.fail(p.stderr)
    : spinner.succeed(`workspace: ${join(choose)} install ${join(packageNames)} success!`)
}

const ensurePackage = async (input: string | string[]): Promise<string[]> => {
  log.verbose('install ensurePackage input', input)
  const inputList = isString(input) ? [input] : input
  const packageNames = inputList?.map((input) => input.trim()) || []
  log.verbose('install ensurePackage', packageNames)

  if (packageNames.length === 0) {
    const packageName = await createInput({
      message: 'Please enter the package name you want to install',
      validate: (name) => (!name ? 'Please enter the package name you want to install' : undefined),
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
        options.saveProd = await createSelect({
          message: 'Is it a productive dependencies?',
          options: [
            { label: 'Yes', value: true },
            { label: 'No', value: false },
          ],
        })
      }

      installHandle(packageNames, { ...options, workspace: workspaceDir })
    })
}
