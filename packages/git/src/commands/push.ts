import type { Command } from '@nemo-cli/shared'
import { colors, createConfirm, createSelect, createSpinner, getCurrentBranch, log, xASync } from '@nemo-cli/shared'
import { BigText } from '@nemo-cli/ui'
import { getRemoteBranchOptions, getRemoteRepositoryOptions } from '../utils'

const handlePush = async (branch: string, remote = 'origin') => {
  const spinner = createSpinner(`Pushing branch ${branch} to ${remote}...`)
  try {
    const [error, result] = await xASync('git', ['push', remote, branch])

    if (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed with error: ${errorMessage}`)
    }

    spinner.stop(colors.green(`Successfully pushed branch ${colors.bgGreen(branch)} to ${remote}.`))
  } catch (error) {
    spinner.stop()
    BigText({ text: `Failed to push branch ${branch} to ${remote}.` })
    log.error(error)
  }
}

export function pushCommand(command: Command) {
  command
    .command('push')
    .alias('ps')
    .description('Push current branch to remote')
    .action(async () => {
      await pushInteractive()
    })
}

export const pushInteractive = async () => {
  const currentBranch = await getCurrentBranch()
  if (!currentBranch) {
    log.error('No branch selected. Aborting push operation.')
    return
  }

  // Get available remotes
  let repositories: string[]
  try {
    const result = await getRemoteRepositoryOptions()
    repositories = result.remotes
  } catch (error) {
    log.error(`Failed to get remote repositories: ${error instanceof Error ? error.message : String(error)}`)
    log.show("Hint: Make sure you're in a git repository and have configured remotes.", { type: 'info' })
    return
  }

  if (repositories.length === 0) {
    log.error('No remote repositories found. Aborting push operation.')
    log.show('Hint: Run `git remote add <name> <url>` to add a remote repository.', { type: 'info' })
    return
  }

  // Select remote if multiple remotes exist
  let selectedRepository = repositories[0]
  if (repositories.length > 1) {
    selectedRepository = await createSelect({
      message: 'Select remote repository',
      options: repositories.map((repo) => ({ label: repo, value: repo })),
      initialValue: repositories[0],
    })
  }

  const check = await createConfirm({
    message: `Do you want to push ${colors.bgGreen(currentBranch)} to ${selectedRepository}?`,
  })

  if (check) {
    await handlePush(currentBranch, selectedRepository)
    return
  }

  const { options } = await getRemoteBranchOptions()
  const selectedBranch = await createSelect({
    message: 'Select the branch to push',
    options,
    initialValue: 'main',
  })

  // Allow remote re-selection if multiple remotes exist
  selectedRepository = repositories[0]
  if (repositories.length > 1) {
    const changeRemote = await createConfirm({
      message: `Push ${colors.bgGreen(selectedBranch)} to ${selectedRepository}?`,
    })

    if (!changeRemote) {
      selectedRepository = await createSelect({
        message: 'Select remote repository',
        options: repositories.map((repo) => ({ label: repo, value: repo })),
        initialValue: selectedRepository,
      })
    }
  }

  await handlePush(selectedBranch, selectedRepository)
}
