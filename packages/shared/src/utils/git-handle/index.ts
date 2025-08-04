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

// 获取Git状态信息
export const getGitStatus = async () => {
  const status = await x('git', ['status', '--porcelain'])
  const lines = status.stdout.split('\n').filter((line) => line.trim() !== '')

  const staged: string[] = []
  const modified: string[] = []
  const untracked: string[] = []

  for (const line of lines) {
    const indexStatus = line[0]
    const workingStatus = line[1]
    const fileName = line.slice(3)

    if (indexStatus !== ' ' && indexStatus !== '?') {
      staged.push(fileName)
    }

    if (workingStatus === 'M' || workingStatus === 'D') {
      modified.push(fileName)
    }

    if (indexStatus === '?' && workingStatus === '?') {
      untracked.push(fileName)
    }
  }

  return {
    staged,
    modified,
    untracked,
    unstaged: [...modified, ...untracked],
  }
}

// 添加文件到暂存区
export const addFiles = async (files: string[]) => {
  if (files.length === 0) return
  const result = await x('git', ['add', ...files])
  return result
}
