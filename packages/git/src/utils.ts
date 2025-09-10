import { spawn } from 'node:child_process'
import { unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { colors, createConfirm, createSpinner, log, x, xASync } from '@nemo-cli/shared'

const remotePrefix = /^origin\//

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

export const getCurrentBranch = async () => {
  const [error, result] = await xASync('git', ['branch', '--show-current'])
  if (error) {
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
  const [error, result] = await xASync('git', ['diff', branch, '--name-only'])
  if (error) return []
  return result.stdout.split('\n').filter((line) => line.trim())
}

/**
 * 处理合并提交信息
 */
const handleMergeCommit = async () => {
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

export const handleGitPull = async (branch: string, _stash = false) => {
  log.show('Pulling from remote...', { type: 'step' })
  try {
    const [error, result] = await xASync('git', ['pull', 'origin', branch], {
      nodeOptions: {
        stdio: 'inherit',
      },
    })
    if (error) {
      log.show(`Failed to pull from remote. Command exited with code ${error.message}.`, { type: 'error' })
      return
    }
    if (result.stdout.includes('Merge branch') || result.stdout.includes('Merge made by')) {
      await handleMergeCommit()
    }
    log.show(`Successfully pulled from remote: ${colors.bgGreen(branch)}`, { type: 'success' })
  } catch (error) {
    log.error(error)
    return
  }
}
export const _handleGitPull = async (branch: string, _stash = false) => {
  const spinner = createSpinner('Pulling from remote')
  try {
    // 使用 stdio: 'inherit' 来支持交互式操作
    const process = spawn('git', ['pull', 'origin', branch], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
    })

    let stdout = ''
    let stderr = ''

    process.stdout?.on('data', (data) => {
      const output = data.toString()
      stdout += output
      log.show(output)
      spinner.message(output)
    })

    process.stderr?.on('data', (data) => {
      const output = data.toString()
      stderr += output
      log.show(output, { type: 'warn' })
    })

    const exitCode = await new Promise<number>((resolve) => {
      process.on('close', (code) => {
        resolve(code || 0)
      })
    })

    if (exitCode) {
      log.show(`Failed to pull from remote. Command exited with code ${exitCode}.`, { type: 'error' })
      spinner.stop('Pull failed')
      throw new Error(stderr)
    }

    if (stdout.includes('Merge branch') || stdout.includes('Merge made by')) {
      // 检查是否有合并提交信息需要处理
      await handleMergeCommit()
    }

    spinner.stop(colors.green(`Successfully pulled from remote: ${colors.bgGreen(branch)}`))
  } catch (error) {
    spinner.stop('Pull failed')
    log.error(error)
    throw error
  }
}

const createStashName = () => `NEMO-CLI-STASH:${Date.now()}`
export const handleGitStash = async (name: string = createStashName()): Promise<null | string> => {
  const [error, result] = await xASync('git', ['stash', 'save', name])
  if (error) {
    log.show(`Failed to stash changes. ${name}`, { type: 'error' })
    return null
  }
  if (result?.stdout.includes(name)) {
    log.show(`Successfully stashed changes. ${name}`, { type: 'success' })
    return name
  }
  log.show('No file changes.')
  return null
}

export const handleGitStashCheck = async (): Promise<string[]> => {
  const [error, result] = await xASync('git', ['stash', 'list'])
  if (error) return []
  return result.stdout.split('\n').filter((line) => line.trim())
}

export const handleGitPop = async (branch: string) => {
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
    log.show(result.stdout)
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
  const [fetchError] = await xASync('git', ['fetch', 'origin', '--prune'])
  if (fetchError) {
    spinner.stop('Failed to fetch latest changes from remote. Proceeding with local information.')
  } else {
    spinner.stop('Fetching latest changes from remote Done')
  }

  // const [error, result] = await xASync('git', ['branch', '--merged', 'origin/main'])
  return Promise.all<BranchInfo>(
    branches.map(async (branch) => {
      // const [_, result] = await xASync('git', ['log', `origin/main..${branch}`])
      // list.push({ branch, isMerged: !!result?.stdout.trim() })
      const [_, result] = await xASync('git', ['merge-base', '--is-ancestor', branch, 'origin/main'], {
        quiet: true,
      })
      return { branch, isMerged: !!result }
    })
  )
}

export const checkGitRepository = async () => {
  try {
    const [error, result] = await xASync('git rev-parse --is-inside-work-tree')
    if (error) return false
    const output = result.stdout.trim()
    return output === 'true'
  } catch (err) {
    return false
  }
}
