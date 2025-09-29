import { type Command, createCheckbox, createInput, getWorkspaceNames, isString } from '@nemo-cli/shared'
import { ErrorMessage, Message, ProcessMessage } from '@nemo-cli/ui'
import { HELP_MESSAGE } from '../constants'

type AddHandleOptions = {
  workspaces: string[]
  saveProd?: boolean
  exact?: boolean
  peer?: boolean
}

const ROOT_VALUE = 'root'
const addHandle = async (dependencies: string[], options: AddHandleOptions) => {
  const { saveProd = true, exact = false, peer = false, workspaces } = options

  const flags = [
    saveProd ? '--save-prod' : '--save-dev',
    exact ? '--save-exact' : '',
    peer ? '--save-peer' : '',
  ].filter(Boolean)
  const isRootWorkspace = workspaces.find((item) => item === ROOT_VALUE)

  const filter = isRootWorkspace ? '-w' : workspaces.map((name) => `--filter=${name}`)

  const commandParts = [...flags, 'add', ...filter, ...dependencies]

  const instance = ProcessMessage({
    command: 'pnpm',
    commandArgs: commandParts,
    onSuccess: () => {
      Message({
        text: 'Dependencies added successfully',
        name: 'summer',
      })
    },
    onError: (_error) => {
      Message({
        text: 'Dependencies added failed',
        name: 'passion',
      })
      // spinner.stop(`An error occurred while adding dependencies: ${error}`)
    },
  })
  await instance.waitUntilExit()
}

const REGEXP_SPLIT_NAMES = /\W+/
const ensurePackage = async (input: string | string[]): Promise<string[]> => {
  const inputList = isString(input) ? [input] : input
  const packageNames = inputList?.map((input) => input.trim()) || []

  if (packageNames.length === 0) {
    const packageName = await createInput({
      message: 'Enter dependency names (space-separated):',
      validate: (name) => (!name ? 'Please enter the package name you want to install' : undefined),
    })
    return packageName.split(REGEXP_SPLIT_NAMES).filter(Boolean)
  }
  return packageNames
}

export const addCommand = (program: Command) => {
  program
    .command('add [dependencies...]')
    .alias('install')
    .alias('i')
    .description('Add dependencies to a specific workspace package.')
    .option('-D, --save-dev', 'Is Development dependencies')
    .option('-S, --save-prod', 'Is Productive dependencies')
    .option('-E, --exact', 'Is exact dependencies')
    .addHelpText('after', HELP_MESSAGE.install)
    .action(async (dependencies: string[], options: { saveDev?: boolean; saveProd?: boolean; exact?: boolean }) => {
      const workspaceNames = await getWorkspaceNames()
      if (!workspaceNames?.length) {
        ErrorMessage({
          text: 'No workspace packages found. Please check your pnpm-workspace.yaml or run from a workspace root.',
          name: 'summer',
        })
        return
      }

      const workspaceOptions = [{ label: 'Root', value: ROOT_VALUE }].concat(
        workspaceNames.map((pkg) => ({
          label: `${pkg.name} (${pkg.path})`,
          value: pkg.name,
        }))
      )

      const workspaces = await createCheckbox({
        message: 'Select a workspace to add dependencies to:',
        options: workspaceOptions,
        required: true,
      })

      const finalDependencies = await ensurePackage(dependencies)

      await addHandle(finalDependencies, { workspaces, ...options })
    })

  return program
}

export default addCommand
