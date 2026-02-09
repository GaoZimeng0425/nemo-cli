import {
  type Command,
  createCheckbox,
  createConfirm,
  createInput,
  createSelect,
  getPackageManagerAdapter,
  getWorkspaceNames,
  isBoolean,
  isPlainObject,
  isString,
  joinPath,
  log,
  readJSON,
} from '@nemo-cli/shared'
import { ErrorMessage, Message, ProcessMessage } from '@nemo-cli/ui'
import { HELP_MESSAGE } from '../constants'

type AddCommandOptions = {
  saveDev?: boolean
  saveProd?: boolean
  exact?: boolean
  peer?: boolean
  interactive?: boolean | string
}

type AddHandleOptions = {
  workspaces: string[]
  saveDev?: boolean
  saveProd?: boolean
  exact?: boolean
  peer?: boolean
}

const ROOT_VALUE = 'root'

const validatePackageName = (name: string): boolean => {
  const scopedPattern = /^@([a-z0-9-~][a-z0-9-._~]*)\/([a-z0-9-~][a-z0-9-._~]*)$/
  const regularPattern = /^[a-z0-9-~][a-z0-9-._~]*$/
  const nameWithoutVersion = name.split('@')[0] || name
  return scopedPattern.test(nameWithoutVersion) || regularPattern.test(nameWithoutVersion)
}

const checkDependencyConflicts = async (dependencies: string[], workspaces: string[]): Promise<string[]> => {
  const conflicts: string[] = []

  for (const workspace of workspaces) {
    if (workspace === ROOT_VALUE) continue

    try {
      const packageJsonPath = joinPath('packages', workspace, 'package.json')
      const packageJson = readJSON(packageJsonPath)

      if (!packageJson) continue

      const allDeps = {
        ...(packageJson.dependencies ?? {}),
        ...(packageJson.devDependencies ?? {}),
        ...(packageJson.peerDependencies ?? {}),
      }

      for (const dep of dependencies) {
        const depName = dep.split('@')[0] || dep
        if (allDeps[depName]) {
          conflicts.push(`${depName} (in ${workspace})`)
        }
      }
    } catch {
      // Ignore errors reading package.json
    }
  }

  return conflicts
}

const addHandle = async (dependencies: string[], options: AddHandleOptions): Promise<void> => {
  const { saveProd = true, saveDev = false, exact = false, peer = false, workspaces } = options

  const adapter = await getPackageManagerAdapter()

  const isRootWorkspace = workspaces.find((item) => item === ROOT_VALUE)
  const workspaceFilters = isRootWorkspace ? [] : workspaces.filter((w) => w !== ROOT_VALUE)

  const adapterOptions = {
    saveDev: saveDev || !saveProd,
    exact,
    savePeer: peer,
    saveOptional: false,
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
    onError: (error) => {
      const errorMsg = isPlainObject(error) && 'message' in error ? String(error.message) : String(error)
      ErrorMessage({
        text: `Failed to add dependencies: ${errorMsg}`,
        name: 'passion',
      })
    },
  })

  await instance.waitUntilExit()
}

const ensurePackage = async (input: string | string[]): Promise<string[]> => {
  const inputList = isString(input) ? [input] : input
  const packageNames = inputList?.map((input) => input.trim()) ?? []

  if (packageNames.length === 0) {
    const packageName = await createInput({
      message: 'Enter dependency names (space or comma separated):',
      validate: (name) => {
        if (!name) {
          return 'Please enter the package name you want to install'
        }

        const names = name.split(/[\s,，]+/).filter(Boolean)
        if (names.length === 0) {
          return 'No package names provided'
        }

        const invalid = names.find((n) => !validatePackageName(n))
        return invalid
          ? `Invalid package name: "${invalid}". Package names must start with a letter or @ and contain only lowercase letters, numbers, hyphens, and dots.`
          : undefined
      },
    })
    return packageName.split(/[\s,，]+/).filter(Boolean)
  }

  const invalid = packageNames.find((n) => !validatePackageName(n))
  if (invalid) {
    throw new Error(`Invalid package name: "${invalid}"`)
  }

  return packageNames
}

const parseBooleanOption = (value: boolean | string | undefined): boolean => {
  if (isBoolean(value)) return value
  if (isString(value)) {
    return value.toLowerCase() === 'true'
  }
  return true // Default to true
}

const promptForOptions = async (cliOptions: AddCommandOptions): Promise<AddCommandOptions> => {
  // 解析 interactive 选项
  const interactive = parseBooleanOption(cliOptions.interactive)

  // 如果 interactive=false，跳过交互
  if (!interactive) {
    return cliOptions
  }

  // 检查是否通过 CLI 提供了选项
  const hasCliOptions = cliOptions.saveDev || cliOptions.saveProd || cliOptions.exact || cliOptions.peer

  // 如果提供了选项，使用 CLI 选项
  if (hasCliOptions) {
    return cliOptions
  }

  // 默认交互模式：询问用户
  const selectedType = await createSelect({
    message: 'Select dependency type:',
    options: [
      { label: 'Production (dependencies)', value: 'production' },
      { label: 'Development (devDependencies)', value: 'development' },
      { label: 'Peer (peerDependencies)', value: 'peer' },
    ],
  })

  const useExact = await createConfirm({
    message: 'Install exact version? (e.g., 1.2.3 instead of ^1.2.3)',
  })

  // Map selection to CLI options
  const options: AddCommandOptions = {
    exact: isBoolean(useExact) ? useExact : false,
  }

  if (selectedType === 'development') {
    options.saveDev = true
  } else if (selectedType === 'peer') {
    options.peer = true
  } else {
    options.saveProd = true
  }

  return options
}

export const addCommand = (program: Command): Command => {
  program
    .command('add [dependencies...]')
    .alias('install')
    .alias('i')
    .description('Add dependencies to a specific workspace package.')
    .option('-D, --save-dev', 'Install to devDependencies')
    .option('-S, --save-prod', 'Install to dependencies (default)')
    .option('-E, --exact', 'Install exact version (no caret ^)')
    .option('-P, --peer', 'Install to peerDependencies')
    .option('-I, --interactive [value]', 'Use interactive mode (default: true)', 'true')
    .addHelpText('after', HELP_MESSAGE.install)
    .action(async (dependencies: string[], options: AddCommandOptions) => {
      const workspaceNames = await getWorkspaceNames()

      if (!workspaceNames?.length) {
        ErrorMessage({
          text: 'No workspace packages found. Please check your workspace configuration (pnpm-workspace.yaml or package.json workspaces field) or run from a workspace root.',
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
        message: 'Select workspaces to add dependencies to:',
        options: workspaceOptions,
        required: true,
      })

      const finalDependencies = await ensurePackage(dependencies)

      // Default to interactive mode unless --interactive=false is specified
      const finalOptions = await promptForOptions(options)

      const workspaceFilters = workspaces.filter((w) => w !== ROOT_VALUE)

      if (workspaceFilters.length > 0) {
        const conflicts = await checkDependencyConflicts(finalDependencies, workspaceFilters)
        if (conflicts.length > 0) {
          log.warn(`Dependencies already exist: ${conflicts.join(', ')}`)
        }
      }

      await addHandle(finalDependencies, { workspaces, ...finalOptions })
    })

  return program
}

export default addCommand
