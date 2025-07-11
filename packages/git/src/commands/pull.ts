import { type Command, createSelect, createSpinner, log, x } from '@nemo-cli/shared'

import { getRemoteOptions } from '../utils'

const handlePull = async (branch: string) => {
  const spinner = createSpinner('Pulling from remote...')
  try {
    const { stdout, exitCode, stderr } = await x('git', ['pull', 'origin', branch])

    if (stdout) {
      log.info(`Command output (stdout):\n${stdout}`)
    }

    if (stderr) {
      log.warn(`Pull error (stderr):\n${stderr}`)
    }

    if (exitCode) {
      log.error(`Failed to pull from remote. Command exited with code ${exitCode}.`)
      spinner.stop('Pull failed')
      throw new Error(stderr)
    }

    spinner.stop('Pull success')
    log.success('Successfully pulled from remote.')
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
