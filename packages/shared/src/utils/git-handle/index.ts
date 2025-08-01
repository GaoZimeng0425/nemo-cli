import { createRequire } from 'node:module'

import { x, xASync } from '../command'

export const require = createRequire(import.meta.url)

const currentBranchPrefix = /^\* /
const formatBranch = (branch?: string) => branch?.trim().replace(currentBranchPrefix, '')

export const getCurrentBranch = async () => {
  const [error, result] = await xASync('git', ['branch', '--show-current'])
  if (error) return ''
  return result.stdout.trim() as string
}

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

export const getDiffFiles = async () => {
  const diffFiles = await x('git', ['diff', 'HEAD', 'origin/main', '--name-only'])
  return diffFiles.stdout.split('\n').filter((line) => line.trim() !== '')
}
