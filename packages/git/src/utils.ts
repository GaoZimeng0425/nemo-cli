import { colors, createSpinner, createX, dynamicX, log, type PromptOptions, type Spinner, x } from '@nemo-cli/shared'

const remotePrefix = /^origin\//

export const getRemoteBranches = async (): Promise<{ branches: string[] }> => {
  const originBranches = await x('git', ['branch', '-r'])
  const branches = originBranches.stdout
    .split('\n')
    .filter((line) => line.trim() && !line.includes('->'))
    .map((line) => line.trim().replace(remotePrefix, ''))

  return { branches }
}

const currentBranchPrefix = /^\* /
const formatBranch = (branch?: string) => branch?.trim().replace(currentBranchPrefix, '')

export const getLocalBranches = async (): Promise<{ branches: string[]; currentBranch: string | undefined }> => {
  const originBranches = await x('git', ['branch'])
  const list = originBranches.stdout.split('\n')
  const currentBranch = list.find((line) => line.includes('*'))

  const branches = list
    .filter((line) => line.trim() && !line.includes('->'))
    .map((line) => line.trim().replace(currentBranchPrefix, ''))

  return {
    branches,
    currentBranch: formatBranch(currentBranch),
  }
}

export const getCurrentBranch = async () => {
  const result = await dynamicX('git', ['branch', '--show-current'])
  if (result.exitCode) {
    log.error(`Failed to get current branch. Command exited with code ${result.exitCode}.`)
    log.error('Error message:', result.stderr)
    return ''
  }
  return result.stdout.trim()
}

export const getRemoteOptions = async () => {
  const { branches } = await getRemoteBranches()
  const currentBranch = await getCurrentBranch()
  const options = branches.map((branch) => ({
    label: branch,
    value: branch,
    hint: branch === currentBranch ? 'current branch' : undefined,
  }))
  return {
    options,
    currentBranch,
  } as const
}

export const getLocalOptions = async () => {
  const { branches, currentBranch } = await getLocalBranches()
  const options = branches.map((branch) => ({
    label: branch,
    value: branch,
    hint: branch === currentBranch ? 'current branch' : undefined,
  }))
  return {
    options,
    currentBranch,
  } as const
}

export const getGitDiffFiles = async (branch: string) => {
  const result = await createX('git', ['diff', branch, '--name-only'])
  if (!result) return []
  return result.stdout.split('\n').filter((line) => line.trim())
}

export const handleGitPull = async (branch: string, stash = false) => {
  const spinner = createSpinner('Pulling from remote')
  try {
    const { stdout, exitCode, stderr } = await createX('git', ['pull', 'origin', branch])

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

export const handleGitStash = async () => {
  const process = x('git', ['stash'])
  for await (const line of process) {
    log.show(line)
  }
  const { exitCode, stderr, stdout } = await process
  if (exitCode) {
    log.show(stderr, { type: 'error' })
  } else {
    log.show('Successfully stashed changes.')
  }
  return { stdout, exitCode, stderr }
}
export const handleGitPop = async () => {
  const process = x('git', ['stash', 'pop'])
  for await (const line of process) {
    log.show(line)
  }
  const { exitCode, stderr } = await process
  if (exitCode) {
    log.show(stderr, { type: 'error' })
  } else {
    log.show('Successfully popped changes.')
  }
}

/**
 * Check if a branch has been merged into remote main branch
 * @param branch - The branch name to check
 * @returns Promise<boolean> - true if merged, false if not merged
 */
export type BranchInfo = { isMerged: boolean; branch: string }
export const isBranchMergedToMain = async (branches: string[]): Promise<BranchInfo[]> => {
  const spinner = createSpinner('Fetching latest changes from remote')

  const list: BranchInfo[] = []
  try {
    const fetchResult = await dynamicX('git', ['fetch', 'origin'])
    if (fetchResult.exitCode) {
      log.show('Failed to fetch latest changes from remote. Proceeding with local information.', { type: 'warn' })
    }

    spinner.message('Checking if branches are merged to main')

    await Promise.all(
      branches.map(async (branch) => {
        try {
          await dynamicX('git', ['merge-base', '--is-ancestor', branch, 'origin/main'])
          list.push({ branch, isMerged: true })
        } catch (error) {
          list.push({ branch, isMerged: false })
        }
      })
    )

    spinner.stop('Fetching latest changes from remote Done')

    return list
  } catch (error) {
    return list
  }
}
