import path from 'node:path'
import type { Command } from '@nemo-cli/shared'
import { createCheckbox, createSelect, getPackageDependencies, getWorkspacePackages, log, x } from '@nemo-cli/shared'

async function removeHandle(packageName: string, dependencies: string[]) {
  if (!packageName || dependencies.length === 0) {
    log.error('Package name and at least one dependency to remove are required.')
    return
  }

  const depsString = dependencies.join(' ')
  log.info(`Attempting to remove dependencies [${depsString}] from package [${packageName}]...`)

  try {
    const commandParts = ['remove', ...dependencies, '--filter', packageName]
    log.info(`Executing command: pnpm remove ${depsString} --filter ${packageName}`)

    const { stdout, stderr, exitCode } = await x('pnpm', commandParts)

    if (stdout) {
      log.info(`Command output (stdout):\n${stdout}`)
    }
    // pnpm often uses stderr for progress or warnings, not just errors for `remove`
    if (stderr) {
      log.warn(`Command output (stderr):\n${stderr}`)
    }

    if (exitCode) {
      log.error(`Failed to remove dependencies. Command exited with code ${exitCode}.`)
    } else {
      log.success(`Successfully removed dependencies [${depsString}] from package [${packageName}].`)
    }
  } catch (error: any) {
    log.error(`An error occurred while removing dependencies: ${error.message}`)
    if (error.stdout) {
      log.info(`Command output (stdout):\n${error.stdout}`)
    }
    if (error.stderr) {
      log.error(`Command output (stderr):\n${error.stderr}`)
    }
  }
}

export function removeCommand(command: Command) {
  command
    .command('remove')
    .alias('rm')
    .description('Remove dependencies from a specific workspace package.')
    .action(async () => {
      log.info('Fetching workspace packages...')
      const packages = await getWorkspacePackages()
      if (!packages || packages.length === 0) {
        log.error('No workspace packages found. Please check your pnpm-workspace.yaml or run from a workspace root.')
        return
      }

      const packageChoices = packages.map((pkg) => ({
        name: `${pkg.name} (path: ${pkg.path})`,
        value: { name: pkg.name, path: pkg.path },
      }))

      const selectedPackageInfo = await createSelect({
        message: 'Select the target package to remove dependencies from:',
        choices: packageChoices,
      })
      if (!selectedPackageInfo?.name) {
        log.info('No package selected. Aborting remove operation.')
        return
      }

      const workspaceRoot = process.cwd() // Assuming CLI runs from workspace root
      const selectedPackageDir = path.join(workspaceRoot, selectedPackageInfo.path)

      log.info(`Fetching dependencies for package ${selectedPackageInfo.name}...`)
      const dependencies = await getPackageDependencies(selectedPackageDir)

      if (!dependencies || dependencies.length === 0) {
        log.info(`No dependencies found in package ${selectedPackageInfo.name}. Nothing to remove.`)
        return
      }

      const dependencyChoices = dependencies.map((dep) => ({
        name: `${dep.name} (current: ${dep.version}, type: ${dep.type})`,
        value: dep.name,
        checked: false,
      }))

      const selectedDependencies = await createCheckbox({
        message: `Select dependencies to remove from ${selectedPackageInfo.name} (space to select, enter to confirm):`,
        choices: dependencyChoices,
      })

      if (!selectedDependencies || selectedDependencies.length === 0) {
        log.info('No dependencies selected for removal. Aborting.')
        return
      }

      await removeHandle(selectedPackageInfo.name, selectedDependencies)
    })
}
