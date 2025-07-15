import type { Command } from '@nemo-cli/shared'
import { createCheckbox, createInput, getWorkspacePackages, log, ora, x } from '@nemo-cli/shared'

const addHandle = async (packageName: string[], dependencies: string[]) => {
  if (!packageName || dependencies.length === 0) {
    log.show('Package name and at least one dependency are required.', { type: 'error' })
    return
  }

  const depsString = dependencies.join(' ')
  log.show(`Attempting to add dependencies [${depsString}] to package [${packageName.join(',')}]...`)

  try {
    const filter = packageName.map((name) => `--filter=${name}`)
    const commandParts = ['add', ...filter, ...dependencies]
    log.show(`Executing command: pnpm add ${filter.join(' ')} ${depsString}`)

    const process = await x('pnpm', commandParts)

    if (process.exitCode) {
      log.show(`Failed to add dependencies. Command exited with code ${process.exitCode}.`, { type: 'error' })
      log.show(process.stdout, { type: 'error' })
    } else {
      log.show(`Successfully added dependencies [${depsString}] to package [${packageName}].`)
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      log.show(`An error occurred while adding dependencies: ${error.message}`, { type: 'error' })
    } else {
      log.show(`An error occurred while adding dependencies: ${error}`, { type: 'error' })
    }
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
      // Corrected condition for prompting
      if (finalDependencies.length === 0) {
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

      // Ensure selectedPackage is not undefined before calling addHandle
      if (selectedPackage && finalDependencies.length > 0) {
        const spinner = ora('Adding dependencies...').start()
        await addHandle(selectedPackage, finalDependencies)
        spinner.succeed('Dependencies added successfully')
      } else if (selectedPackage) {
        // finalDependencies is empty
        log.show('No dependencies provided to add.', { type: 'warn' })
      } else {
        // This case should ideally not be reached if prompts work correctly
        log.show('Package selection failed unexpectedly.', { type: 'error' })
      }
    })

  return program
}

export default addCommand
