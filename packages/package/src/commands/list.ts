import path from 'node:path'
import type { Command } from '@nemo-cli/shared'
import { createSelect, getPackageDependencies, getWorkspacePackages, log } from '@nemo-cli/shared'

function displayDependencies(
  packageName: string,
  dependencies: Array<{
    name: string
    version: string
    type: 'dependencies' | 'devDependencies'
  }>
) {
  log.info(`Dependencies for ${packageName}:`)

  const prodDeps = dependencies.filter((dep) => dep.type === 'dependencies')
  const devDeps = dependencies.filter((dep) => dep.type === 'devDependencies')

  if (prodDeps.length > 0) {
    log.success('  Production:')
    for (const dep of prodDeps) {
      log.info(`    - ${dep.name}: ${dep.version}`)
    }
  } else {
    log.info('  Production: (No production dependencies)')
  }

  if (devDeps.length > 0) {
    log.info('  Development:')
    for (const dep of devDeps) {
      log.info(`    - ${dep.name}: ${dep.version}`)
    }
  } else {
    log.info('  Development: (No development dependencies)')
  }
}

export function listCommand(command: Command) {
  command
    .command('list')
    .alias('ls')
    .description('List dependencies of a specific workspace package.')
    .action(async () => {
      log.info('Fetching workspace packages...')
      const packages = await getWorkspacePackages()
      if (!packages || packages.length === 0) {
        log.error('No workspace packages found. Please check your pnpm-workspace.yaml or run from a workspace root.')
        return
      }

      const packageChoices = packages.map((pkg) => ({
        label: `${pkg.name} (path: ${pkg.path})`,
        value: { name: pkg.name, path: pkg.path },
      }))

      const selectedPackageInfo = await createSelect({
        message: 'Select the target package to list its dependencies:',
        options: packageChoices,
      })
      if (!selectedPackageInfo) {
        log.info('No package selected. Aborting list operation.')
        return
      }

      const workspaceRoot = process.cwd() // Assuming CLI runs from workspace root
      const selectedPackageDir = path.join(workspaceRoot, selectedPackageInfo.path)

      log.info(`Fetching dependencies for package ${selectedPackageInfo.name}...`)
      const dependencies = await getPackageDependencies(selectedPackageDir)

      if (!dependencies || dependencies.length === 0) {
        log.info(`No dependencies found in package ${selectedPackageInfo.name}.`)
        return
      }

      displayDependencies(selectedPackageInfo.name, dependencies)
    })
}
