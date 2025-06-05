import path from 'node:path'
import type { Command } from '@nemo-cli/shared'
import { createCheckbox, createSelect, getPackageDependencies, getWorkspacePackages, log, x } from '@nemo-cli/shared'

// New upgradeHandle function
async function upgradeHandle(packageName: string, dependencies: string[]) {
  if (!packageName || dependencies.length === 0) {
    log.error('Package name and at least one dependency to upgrade are required.')
    return
  }

  log.info(
    `Attempting to upgrade dependencies [${dependencies.join(', ')}] in package [${packageName}] to their latest versions...`
  )

  for (const dep of dependencies) {
    const depWithVersion = `${dep}@latest`
    log.info(`Upgrading ${dep} in ${packageName} to @latest... (pnpm add ${depWithVersion} --filter ${packageName})`)
    try {
      const commandParts = ['add', depWithVersion, '--filter', packageName]
      const { stdout, stderr, exitCode } = await x('pnpm', commandParts)

      if (stdout) {
        log.info(`Output for ${depWithVersion} (stdout):\n${stdout}`)
      }
      if (stderr) {
        // pnpm often uses stderr for progress or warnings, not just errors
        log.warn(`Output for ${depWithVersion} (stderr):\n${stderr}`)
      }

      if (exitCode) {
        log.error(`Failed to upgrade ${dep} in ${packageName}. Command exited with code ${exitCode}.`)
      } else {
        log.success(`Successfully upgraded ${dep} in ${packageName}.`)
      }
    } catch (error: any) {
      log.error(`An error occurred while upgrading ${dep} in ${packageName}: ${error.message}`)
      if (error.stdout) {
        log.info(`Command output for ${dep} (stdout):\n${error.stdout}`)
      }
      if (error.stderr) {
        log.error(`Command output for ${dep} (stderr):\n${error.stderr}`)
      }
    }
  }
  log.info(`Finished upgrade process for package [${packageName}].`)
}

// Refactored upgradeCommand function
export function upgradeCommand(command: Command) {
  command
    .command('upgrade')
    .alias('up')
    .description('Upgrade dependencies in a specific workspace package.')
    // Old options (-L, -g) are removed as per requirements
    .action(async () => {
      log.info('Fetching workspace packages...')
      const packages = await getWorkspacePackages()
      if (!packages || packages.length === 0) {
        log.error('No workspace packages found. Please check your pnpm-workspace.yaml or run from a workspace root.')
        return
      }

      const packageChoices = packages.map((pkg) => ({
        name: `${pkg.name} (path: ${pkg.path})`,
        value: { name: pkg.name, path: pkg.path }, // Store both name and relative path
      }))

      const selectedPackageInfo = await createSelect({
        message: 'Select the target package to upgrade dependencies for:',
        choices: packageChoices,
      })
      if (!selectedPackageInfo?.name) {
        log.info('No package selected. Aborting upgrade.')
        return
      }

      // Construct full path to the selected package's directory from workspace root
      // Assuming getWorkspacePackages returns paths relative to workspace root
      // And current working directory for getPackageDependencies should be absolute or relative to where the script runs.
      // For simplicity, we assume the shared functions handle path resolution correctly or this CLI runs from workspace root.
      // If packageInfo.path is relative to workspace root:
      const workspaceRoot = process.cwd() // Or find it dynamically if needed
      const selectedPackageDir = path.join(workspaceRoot, selectedPackageInfo.path)

      log.info(`Fetching dependencies for package ${selectedPackageInfo.name}...`)
      const dependencies = await getPackageDependencies(selectedPackageDir)

      if (!dependencies || dependencies.length === 0) {
        log.info(`No dependencies found in package ${selectedPackageInfo.name}. Nothing to upgrade.`)
        return
      }

      const dependencyChoices = dependencies.map((dep) => ({
        name: `${dep.name} (current: ${dep.version}, type: ${dep.type})`,
        value: dep.name,
        checked: false, // Default to not checked
      }))

      const selectedDependencies = await createCheckbox({
        message: `Select dependencies to upgrade in ${selectedPackageInfo.name} (space to select, enter to confirm):`,
        choices: dependencyChoices,
      })

      if (!selectedDependencies || selectedDependencies.length === 0) {
        log.info('No dependencies selected for upgrade. Aborting.')
        return
      }

      await upgradeHandle(selectedPackageInfo.name, selectedDependencies)
    })
}
