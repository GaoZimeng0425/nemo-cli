import type { Command } from '@nemo-cli/shared'
import { colors, createConfirm, createSelect, createSpinner, getCurrentBranch, log, x, xASync } from '@nemo-cli/shared'
import { BigText } from '@nemo-cli/ui'
import { getRemoteOptions, getRemoteOptionsForRemotes } from '../utils'

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
  let remotes: string[]
  try {
    const result = await getRemoteOptionsForRemotes()
    remotes = result.remotes
  } catch (error) {
    log.error(`Failed to get remote repositories: ${error instanceof Error ? error.message : String(error)}`)
    log.show("Hint: Make sure you're in a git repository and have configured remotes.", { type: 'info' })
    return
  }

  if (remotes.length === 0) {
    log.error('No remote repositories found. Aborting push operation.')
    log.show('Hint: Run `git remote add <name> <url>` to add a remote repository.', { type: 'info' })
    return
  }

  // Select remote if multiple remotes exist
  let selectedRemote = remotes[0]
  if (remotes.length > 1) {
    selectedRemote = await createSelect({
      message: 'Select remote repository',
      options: remotes.map((remote) => ({ label: remote, value: remote })),
      initialValue: remotes[0],
    })
  }

  const check = await createConfirm({
    message: `Do you want to push ${colors.bgGreen(currentBranch)} to ${selectedRemote}?`,
  })

  if (check) {
    await handlePush(currentBranch, selectedRemote)
    return
  }

  const { options } = await getRemoteOptions()
  const selectedBranch = await createSelect({
    message: 'Select the branch to push',
    options,
    initialValue: 'main',
  })

  // Allow remote re-selection if multiple remotes exist
  let pushRemote = selectedRemote
  if (remotes.length > 1) {
    const changeRemote = await createConfirm({
      message: `Push ${colors.bgGreen(selectedBranch)} to ${selectedRemote}?`,
    })

    if (!changeRemote) {
      pushRemote = await createSelect({
        message: 'Select remote repository',
        options: remotes.map((remote) => ({ label: remote, value: remote })),
        initialValue: selectedRemote,
      })
    }
  }

  await handlePush(selectedBranch, pushRemote)
}
