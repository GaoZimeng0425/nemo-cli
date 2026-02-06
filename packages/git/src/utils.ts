import { spawn } from 'node:child_process'
import { unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  colors,
  createConfirm,
  createNote,
  createSpinner,
  getCurrentBranch,
  handleError,
  log,
  x,
  xASync,
} from '@nemo-cli/shared'
import type { StashMetadata } from './utils/stash-index'
import { addStashMetadataWithDetails, updateStashStatus } from './utils/stash-index'

export { getBranchStashes } from './utils/stash-index'

const remotePrefix = /^origin\//

export const getRemotes = async (): Promise<{ remotes: string[] }> => {
  const [error, result] = await xASync('git', ['remote'])
  if (error) {
    throw new Error(`Failed to get remote repositories: ${error instanceof Error ? error.message : String(error)}`)
  }
  const remotes = result.stdout.split('\n').filter((line) => line.trim())
  return { remotes }
}

// creatordate committerdate authordate
export const getRemoteBranches = async (): Promise<{ branches: string[] }> => {
  const originBranches = await x('git', ['branch', '-r', '--sort=-committerdate'])
  const branches = originBranches.stdout
    .split('\n')
    .filter((line) => line.trim() && !line.includes('->'))
    .map((line) => line.trim().replace(remotePrefix, ''))

  return { branches }
}

const currentBranchPrefix = /^\* /
const formatBranch = (branch?: string) => branch?.trim().replace(currentBranchPrefix, '')

export const getLocalBranches = async (): Promise<{ branches: string[]; currentBranch: string | undefined }> => {
  const originBranches = await x('git', ['branch', '--sort=-committerdate'])
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

export const getRemoteBranchOptions = async () => {
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

export const getLocalBranchOptions = async () => {
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

export const getRemoteRepositoryOptions = async () => {
  const { remotes } = await getRemotes()
  // Validate and filter out empty/whitespace-only remote names
  const validRemotes = remotes.filter((remote) => remote.trim().length > 0)
  // Remove duplicates while preserving order
  const uniqueRemotes = Array.from(new Set(validRemotes))

  const options = uniqueRemotes.map((remote) => ({
    label: remote,
    value: remote,
  }))
  return {
    options,
    remotes: uniqueRemotes,
  } as const
}

export const getGitDiffFiles = async (branch: string) => {
  const [error, result] = await xASync('git', ['diff', branch, '--name-only'])
  if (error) return []
  return result.stdout.split('\n').filter((line) => line.trim())
}

/**
 * 处理合并提交信息
 */
export const handleMergeCommit = async () => {
  try {
    // 检查是否有待提交的合并
    const [error, result] = await xASync('git', ['status', '--porcelain'])
    if (error) return
    const statusOutput = result.stdout
    const hasUncommittedChanges = statusOutput.trim().length > 0

    if (!hasUncommittedChanges) {
      return
    }

    log.show('\n📝 Merge commit detected. You can customize the commit message.', { type: 'info' })

    const shouldCustomize = await createConfirm({
      message: 'Do you want to customize the merge commit message?',
    })

    if (!shouldCustomize) {
      // 使用默认的合并提交信息
      await xASync('git', ['commit', '--no-edit'])
      log.show('Using default merge commit message.', { type: 'info' })
      return
    }

    // 获取默认的合并提交信息
    const [processError, processResult] = await xASync('git', ['log', '--format=%B', '-n', '1', 'HEAD'])
    if (processError) return
    const defaultMessage = processResult.stdout

    // 创建临时文件用于编辑
    const tempFile = join(tmpdir(), `merge-commit-${Date.now()}.txt`)
    writeFileSync(tempFile, defaultMessage)

    // 打开编辑器让用户编辑
    const editor = process.env.EDITOR || process.env.VISUAL || 'vim'

    log.show(`Opening ${editor} to edit commit message...`, { type: 'info' })
    log.show('Save and close the editor to continue, or close without saving to cancel.', { type: 'info' })

    const editProcess = spawn(editor, [tempFile], {
      stdio: 'inherit',
      shell: true,
    })

    const editExitCode = await new Promise<number>((resolve) => {
      editProcess.on('close', (code) => {
        resolve(code || 0)
      })
    })

    if (editExitCode !== 0) {
      log.show('Editor was closed without saving. Using default commit message.', { type: 'warn' })
      await xASync('git', ['commit', '--no-edit'])
      unlinkSync(tempFile)
      return
    }

    // 读取编辑后的提交信息
    const { readFileSync } = await import('node:fs')
    const editedMessage = readFileSync(tempFile, 'utf-8')
    unlinkSync(tempFile)

    if (!editedMessage.trim()) {
      log.show('Commit message is empty. Using default commit message.', { type: 'warn' })
      await xASync('git', ['commit', '--no-edit'])
      return
    }

    // 使用编辑后的提交信息进行提交
    const commitProcess = spawn('git', ['commit', '-F', '-'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    })

    commitProcess.stdin?.write(editedMessage)
    commitProcess.stdin?.end()

    const commitExitCode = await new Promise<number>((resolve) => {
      commitProcess.on('close', (code) => {
        resolve(code || 0)
      })
    })

    if (commitExitCode === 0) {
      log.show('Merge commit completed with custom message.', { type: 'success' })
    } else {
      throw new Error('Failed to create merge commit with custom message')
    }
  } catch (error) {
    log.show('Error handling merge commit:', { type: 'error' })
    log.error(error)

    // 如果出错，尝试使用默认提交
    try {
      await xASync('git', ['commit', '--no-edit'])
      log.show('Fallback: Using default merge commit message.', { type: 'info' })
    } catch (fallbackError) {
      log.show('Failed to create merge commit. Please handle manually.', { type: 'error' })
      throw fallbackError
    }
  }
}

export type PullOptions = {
  rebase?: boolean
  remote?: string
}

export const handleGitPull = async (branch: string, options: PullOptions = {}) => {
  const { rebase = false, remote = 'origin' } = options
  const modeText = rebase ? 'rebase' : 'merge'
  log.show(`Pulling from remote (${modeText} mode)...`, { type: 'step' })

  try {
    // 构建 git pull 命令参数
    const args = rebase ? ['pull', '--rebase', remote, branch] : ['pull', remote, branch]

    const [error, result] = await xASync('git', args, {
      nodeOptions: {
        stdio: 'inherit',
      },
    })
    if (error) {
      log.show(`Failed to pull from remote. Command exited with code ${error.message}.`, { type: 'error' })
      return
    }

    if (!rebase && (result.stdout.includes('Merge branch') || result.stdout.includes('Merge made by'))) {
      // 仅在 merge 模式下检查合并提交
      await handleMergeCommit()
    }

    log.show(`Successfully pulled from remote: ${colors.bgGreen(branch)} (${modeText})`, { type: 'success' })
  } catch (error) {
    log.error(error)
    return
  }
}

export type StashResult = {
  metadata: StashMetadata
  stashName: string
}

export const handleGitStash = async (
  message?: string,
  options?: {
    branch?: string
    operation?: 'pull' | 'checkout' | 'merge' | 'manual'
  }
): Promise<StashResult | null> => {
  const [unstagedError, unstagedResult] = await xASync('git', ['diff', '--name-only'])
  const unstagedFiles = unstagedError ? [] : unstagedResult.stdout.split('\n').filter(Boolean)

  const [stagedError, stagedResult] = await xASync('git', ['diff', '--cached', '--name-only'])
  const stagedFiles = stagedError ? [] : stagedResult.stdout.split('\n').filter(Boolean)

  const [untrackedError, untrackedResult] = await xASync('git', ['ls-files', '--others', '--exclude-standard'])
  const untrackedFiles = untrackedError ? [] : untrackedResult.stdout.split('\n').filter(Boolean)

  const files = [...new Set([...unstagedFiles, ...stagedFiles, ...untrackedFiles])]

  if (files.length === 0) {
    log.show('No file changes to stash.')
    return null
  }

  const [, commitResult] = await xASync('git', ['rev-parse', 'HEAD'])
  const commitHash = commitResult?.stdout.trim() || ''

  const currentBranch = await getCurrentBranch()
  const { branch = undefined, operation = 'manual' } = options || {}

  // Generate stash name
  const now = new Date()
  let stashName: string
  if (message && message.trim()) {
    stashName = message.trim()
  } else {
    const formattedTime = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
    stashName = `${operation}:${currentBranch}@${formattedTime}`
  }

  const timestamp = Date.now()
  const encodedBranch = currentBranch.replace(/[/]/g, '_')
  const internalId = `${timestamp}_${operation}_${encodedBranch}`

  const [error, result] = await xASync('git', ['stash', 'save', '-u', stashName])
  if (error) {
    log.show(`Failed to stash changes. ${stashName}`, { type: 'error' })
    return null
  }

  if (!result?.stdout.includes(stashName)) {
    log.show('No file changes to stash.')
    return null
  }

  const stashRefMatch = result.stdout.match(/stash@\{(\d+)\}/)
  const stashRef = stashRefMatch ? stashRefMatch[0] : 'stash@{0}'

  const metadata: StashMetadata = {
    stashRef,
    timestamp: now.toISOString(),
    createdAt: now.toISOString(),
    message: stashName,
    internalId,
    operation,
    currentBranch,
    targetBranch: branch,
    files,
    status: 'active',
    commitHash,
  }

  await addStashMetadataWithDetails(currentBranch, metadata)

  log.show(`Successfully stashed changes. ${stashName}`, { type: 'success' })
  return {
    metadata,
    stashName,
  }
}

export const handleGitStashCheck = async (): Promise<string[]> => {
  const [error, result] = await xASync('git', ['stash', 'list'])
  if (error) return []
  return result.stdout.split('\n').filter((line) => line.trim())
}

export const handleGitPop = async (stashOrResult: string | StashResult): Promise<void> => {
  // Handle StashResult input (precise lookup)
  if (typeof stashOrResult !== 'string') {
    const { metadata } = stashOrResult

    // Try to pop using stashRef
    const [error, result] = await xASync('git', ['stash', 'pop', metadata.stashRef])

    if (error) {
      // Pop failed
      log.show(`Failed to pop stash: ${error.message}`, { type: 'error' })
      if (metadata.internalId && metadata.currentBranch) {
        await updateStashStatus(metadata.currentBranch, metadata.internalId, 'popped', error.message)
      }
      return
    }

    // Pop succeeded
    createNote({ message: result.stdout, title: 'Successfully popped changes.' })
    if (metadata.internalId && metadata.currentBranch) {
      await updateStashStatus(metadata.currentBranch, metadata.internalId, 'popped')
    }
    return
  }

  // Handle string input (backward compatibility - fuzzy match)
  const branch = stashOrResult
  const stashes = await handleGitStashCheck()
  const stashName = stashes.find((stash) => stash.includes(branch))
  if (!stashName) {
    log.show(`No stash found for this branch: ${colors.bgRed(branch)}.`, { type: 'warn' })
    return
  }
  const name = stashName.split(':')[0]
  if (!name) {
    log.error(name, 'is not valid')
    return
  }
  const [error, result] = await xASync('git', ['stash', 'pop', name])
  if (!error) {
    createNote({ message: result.stdout, title: 'Successfully popped changes.' })
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
  const [fetchError] = await xASync('git', ['fetch', 'origin', '--prune'])
  if (fetchError) {
    spinner.stop('Failed to fetch latest changes from remote. Proceeding with local information.')
  } else {
    spinner.stop('Fetching latest changes from remote Done')
  }

  // const [error, result] = await xASync('git', ['branch', '--merged', 'origin/main'])
  const remoteMainBranch = await getRemoteMainBranch()

  if (!remoteMainBranch) return []
  return Promise.all<BranchInfo>(
    branches.map(async (branch) => {
      const [error, result] = await xASync('git', ['log', `${remoteMainBranch}..${branch}`], { quiet: true })
      if (error) return { branch, isMerged: false }
      // const [_, result] = await xASync('git', ['merge-base', '--is-ancestor', branch, remoteMainBranch], {
      //   quiet: true,
      // })
      return { branch, isMerged: !result?.stdout.trim() }
    })
  )
}

export const getGitRoot = async () => {
  const [error, result] = await xASync('git', ['rev-parse', '--show-toplevel'])
  if (error) return ''
  return result.stdout.trim()
}
export const checkGitRepository = async () => {
  try {
    const [error, result] = await xASync('git', ['rev-parse', '--is-inside-work-tree'], { quiet: true })
    if (error) return false
    const output = result.stdout.trim()
    return output === 'true'
  } catch (_err) {
    return false
  }
}

export const getRemoteMainBranch = async () => {
  const [error, result] = await xASync('git', ['symbolic-ref', 'refs/remotes/origin/HEAD'])
  if (error) return null
  const branches = result.stdout.trim().split('/')
  return branches.splice(2).join('/')
}

export const guessLocalMainBranch = async () => {
  try {
    // 获取所有本地分支列表
    const [error, result] = await xASync('git', ['branch', '--list'])
    if (error) return null
    const branches = result.stdout.trim().split('\n')
    if (branches.includes('main')) {
      return 'main'
    }
    if (branches.includes('master')) {
      return 'master'
    }
    return null
  } catch (error) {
    handleError(error, 'Failed to guess local main branch')
    return null
  }
}

export const getBranchCommitTime = async (branch: string) => {
  const [_, result] = await xASync('git', ['show', '--format=%at', `${branch}`])
  return result?.stdout.split('\n')[0] ?? Date.now()
}
