import {
  type Command,
  createCheckbox,
  createInput,
  getPackageManagerAdapter,
  getWorkspaceNames,
  isString,
  x,
} from '@nemo-cli/shared'
import { ErrorMessage, Message, ProcessMessage } from '@nemo-cli/ui'
import { HELP_MESSAGE } from '../constants'

type AddHandleOptions = {
  workspaces: string[]
  saveDev?: boolean
  saveProd?: boolean
  exact?: boolean
  peer?: boolean
}

const ROOT_VALUE = 'root'

const addHandle = async (dependencies: string[], options: AddHandleOptions) => {
  const { saveProd = true, saveDev = false, exact = false, peer = false, workspaces } = options

  // Get the appropriate package manager adapter
  const adapter = await getPackageManagerAdapter()

  // Build command arguments using the adapter
  const isRootWorkspace = workspaces.find((item) => item === ROOT_VALUE)
  const workspaceFilters = isRootWorkspace ? [] : workspaces.filter((w) => w !== ROOT_VALUE)

  const adapterOptions = {
    saveDev: saveDev || !saveProd,
    exact,
    savePeer: peer,
    workspaces: workspaceFilters,
    root: isRootWorkspace != null,
  }

  const commandArgs = adapter.buildAddCommand(dependencies, adapterOptions)

  const instance = ProcessMessage({
    command: adapter.command,
    commandArgs,
    onSuccess: () => {
      Message({
        text: `Dependencies added successfully using ${adapter.name}`,
        name: 'summer',
      })
    },
    onError: (_error) => {
      Message({
        text: 'Dependencies added failed',
        name: 'passion',
      })
    },
  })
  await instance.waitUntilExit()
}

const ensurePackage = async (input: string | string[]): Promise<string[]> => {
  const inputList = isString(input) ? [input] : input
  const packageNames = inputList?.map((input) => input.trim()) || []

  if (packageNames.length === 0) {
    const packageName = await createInput({
      message: 'Enter dependency names (space or comma separated):',
      validate: (name) => (!name ? 'Please enter the package name you want to install' : undefined),
    })
    return packageName.split(/[\s,，]+/).filter(Boolean)
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
