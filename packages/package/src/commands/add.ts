import type { Command, Spinner } from '@nemo-cli/shared'
import {
  colors,
  createCheckbox,
  createInput,
  createSpinner,
  exit,
  getWorkspacePackages,
  isError,
  log,
  xASync,
} from '@nemo-cli/shared'

const addHandle = async (packageName: string[], dependencies: string[], { loading }: { loading: Spinner }) => {
  if (!packageName || dependencies.length === 0) {
    loading.stop('Package name and at least one dependency are required.')
    exit(1)
  }

  const depsString = dependencies.join(' ')
  log.show(
    `Attempting to add dependencies ${colors.bgGreen(depsString)} to package ${colors.bgGreen(packageName.join(','))}...`
  )

  const filter = packageName.map((name) => `--filter=${name}`)
  const commandParts = ['add', ...filter, ...dependencies]
  loading.message(`Executing command: ${colors.bgGreen('pnpm ', commandParts.join(' '))}`)
  const [error, result] = await xASync('pnpm', commandParts)
  if (error) {
    loading.stop(`An error occurred while adding dependencies: ${isError(error) ? error.message : error}`)
  } else {
    log.show(result.stdout, { type: 'success' })
  }
}

export const addCommand = (program: Command) => {
  program
    .command('add [dependencies...]')
    .alias('a')
    .description('Add dependencies to a specific workspace package.')
    .option('-p, --package <packageName>', 'Specify the target package directly')
    .action(async (dependencies: string[], options: { package?: string }) => {
      let selectedPackage = options.package?.split(',') ?? []

      if (selectedPackage.length > 0) {
        log.show(`Target package specified via option: ${selectedPackage}`)
      } else {
        log.show('Fetching workspace packages...')
        const packages = await getWorkspacePackages()
        if (!packages || packages.length === 0) {
          log.show('No workspace packages found. Please check your pnpm-workspace.yaml or run from a workspace root.')
          return
        }

        const packageChoices = packages.map((pkg) => ({
          label: `${pkg.name} (${pkg.path})`,
          value: pkg.name,
        }))

        selectedPackage = await createCheckbox({
          message: 'Select a workspace to add dependencies to:',
          options: packageChoices,
        })

        if (selectedPackage.length === 0) {
          log.show('No package selected. Aborting.', { type: 'error' })
          return
        }
      }

      let finalDependencies = dependencies
      if (finalDependencies.length === 0) {
        // Corrected condition for prompting
        const depsInput = await createInput({
          message: 'Enter dependency names (space-separated):',
        })
        if (!depsInput) {
          log.show('No dependencies entered. Aborting.', { type: 'error' })
          return
        }
        finalDependencies = depsInput
          .split(' ')
          .map((d: string) => d.trim())
          .filter((d: string) => d)
      }

      const spinner = createSpinner('Adding dependencies...')
      await addHandle(selectedPackage, finalDependencies, { loading: spinner })
      spinner.stop('Dependencies added successfully')
    })

  return program
}

export default addCommand
