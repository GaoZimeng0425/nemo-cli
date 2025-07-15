import { log, x } from '@nemo-cli/shared'

const remotePrefix = /^origin\//

export const getRemoteBranches = async (): Promise<{ branches: string[] }> => {
  const originBranches = await x('git', ['branch', '-r'])
  const branches = originBranches.stdout
    .split('\n')
    .filter((line) => line.trim() && !line.includes('->'))
    .map((line) => line.trim().replace(remotePrefix, ''))

  return {
    branches,
  }
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
  const result = await x('git', ['branch', '--show-current'])
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
