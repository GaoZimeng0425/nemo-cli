import { type Command, colors, createSelect, createSpinner, exit, getWorkspaceNames, glob, log } from '@nemo-cli/shared'

const handleCreateRoutes = async (appPath: string) => {
  const spinner = createSpinner('Creating routes')
  try {
    log.show(`Creating routes for ${appPath}`)
    const files = await glob(`${appPath}/**/page.tsx`, { withFileTypes: true })
    log.show(files.map((file) => file.relative()).join('\n'), { type: 'success' })
    log.show(files.map((file) => file.parent?.relative()).join('\n'), { type: 'success' })

    spinner.stop(colors.green(`Successfully created routes for ${appPath}`))
  } catch (error) {
    spinner.stop('Create routes failed')
    log.error(error)
    throw error
  }
}

export function createRoutesCommand(command: Command) {
  command
    .command('create-routes')
    .alias('cr')
    .description('Create routes')
    .action(async () => {
      const workspaceNames = await getWorkspaceNames()
      if (!workspaceNames.length) {
        log.error('No packages found. Please check your workspace.')
        exit(1)
      }

      const selectedApp = await createSelect({
        message: 'Select the package to create routes',
        options: workspaceNames.map((pkg) => ({
          value: pkg.path,
          label: pkg.name,
        })),
        initialValue: 'main',
      })
      log.show(selectedApp)
      if (!selectedApp) {
        log.error('No package selected. Aborting pull operation.')
        return
      }

      await handleCreateRoutes(selectedApp)
    })
}
