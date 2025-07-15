import { type Command, colors, createSelect, createSpinner, log, x } from '@nemo-cli/shared'

import { getRemoteOptions } from '../utils'

const handlePull = async (branch: string) => {
  const spinner = createSpinner('Pulling from remote')
  try {
    const { stdout, exitCode, stderr } = await x('git', ['pull', 'origin', branch])

    if (stderr) {
      log.show(stderr, { type: 'warn' })
    }

    if (stdout) {
      log.show(stdout)
      spinner.message(`Command output: ${stdout}`)
    }

    if (exitCode) {
      log.show(`Failed to pull from remote. Command exited with code ${exitCode}.`, { type: 'error' })
      spinner.stop('Pull failed')
      throw new Error(stderr)
    }

    spinner.stop(colors.green(`Successfully pulled from remote: ${colors.bgGreen(branch)}`))
  } catch (error) {
    spinner.stop('Pull failed')
    log.error(error)
    throw error
  }
}

export function pullCommand(command: Command) {
  command
    .command('pull')
    .alias('pl')
    .description('Pull git branch')
    .action(async () => {
      const { options } = await getRemoteOptions()
      if (!options.length) {
        log.error('No branches found. Please check your git repository.')
        return
      }

      const selectedBranch = await createSelect({
        message: 'Select the branch to pull',
        options,
        initialValue: 'main',
      })
      if (!selectedBranch) {
        log.error('No branch selected. Aborting pull operation.')
        return
      }

      await handlePull(selectedBranch)
    })
}
