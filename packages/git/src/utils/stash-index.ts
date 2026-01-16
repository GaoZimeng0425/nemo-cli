import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { log } from '@nemo-cli/shared'
import { getGitRoot } from '../utils'

/**
 * Stash 元数据接口
 */
export interface StashMetadata {
  /** Stash 引用，如 "stash@{0}" */
  stashRef: string
  /** ISO 8601 格式的时间戳 */
  timestamp: string
  /** ISO 8601 格式的创建时间 */
  createdAt: string
  /** Stash 消息 */
  message: string
}

/**
 * Stash 索引数据结构
 * 键为分支名称，值为该分支的 Stash 元数据数组
 */
export interface StashIndex {
  [branchName: string]: StashMetadata[]
}

/**
 * Stash 索引文件路径
 */
const STASH_INDEX_FILENAME = 'ng-stash-index.json'

/**
 * 获取 Stash 索引文件的完整路径
 * @returns Stash 索引文件路径，如果不在 Git 仓库中则返回 null
 */
export async function getStashIndexPath(): Promise<string | null> {
  const gitRoot = await getGitRoot()
  if (!gitRoot) {
    return null
  }
  return join(gitRoot, '.git', STASH_INDEX_FILENAME)
}

/**
 * 读取 Stash 索引文件
 * @returns Stash 索引对象，如果文件不存在或读取失败则返回空对象
 */
export async function readStashIndex(): Promise<StashIndex> {
  const indexPath = await getStashIndexPath()
  if (!indexPath) {
    log.show('Not in a Git repository. Cannot read stash index.', { type: 'error' })
    return {}
  }

  try {
    const content = await readFile(indexPath, 'utf-8')
    const index = JSON.parse(content) as StashIndex

    // 验证数据结构
    if (typeof index !== 'object' || index === null || Array.isArray(index)) {
      throw new Error('Invalid stash index format: expected an object')
    }

    // 验证每个分支的数据结构
    for (const [branchName, stashes] of Object.entries(index)) {
      if (!Array.isArray(stashes)) {
        throw new Error(`Invalid stash index format: branch "${branchName}" should have an array of stashes`)
      }

      for (const stash of stashes) {
        if (
          typeof stash.stashRef !== 'string' ||
          typeof stash.timestamp !== 'string' ||
          typeof stash.createdAt !== 'string' ||
          typeof stash.message !== 'string'
        ) {
          throw new Error(
            `Invalid stash index format: stash metadata for branch "${branchName}" is missing required fields`
          )
        }
      }
    }

    return index
  } catch (error) {
    const err = error as NodeJS.ErrnoException

    // 文件不存在时返回空对象（这是正常情况）
    if (err.code === 'ENOENT') {
      return {}
    }

    // JSON 解析错误
    if (err instanceof SyntaxError) {
      log.show(`Failed to parse stash index file: ${err.message}. The file may be corrupted.`, { type: 'error' })
      return {}
    }

    // 其他错误
    log.show(`Failed to read stash index file: ${err.message}`, { type: 'error' })
    return {}
  }
}

/**
 * 写入 Stash 索引文件
 * @param index - Stash 索引对象
 * @throws 如果写入失败会抛出错误
 */
export async function writeStashIndex(index: StashIndex): Promise<void> {
  const indexPath = await getStashIndexPath()
  if (!indexPath) {
    throw new Error('Not in a Git repository. Cannot write stash index.')
  }

  try {
    // 确保 .git 目录存在
    const gitDir = join(await getGitRoot()!, '.git')
    await mkdir(gitDir, { recursive: true })

    // 将索引对象序列化为 JSON（格式化，2 空格缩进）
    const content = JSON.stringify(index, null, 2)

    // 写入文件
    await writeFile(indexPath, content, 'utf-8')
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    log.show(`Failed to write stash index file: ${err.message}`, { type: 'error' })
    throw new Error(`Failed to write stash index: ${err.message}`)
  }
}

/**
 * 为分支添加 Stash 元数据
 * @param branchName - 分支名称
 * @param metadata - Stash 元数据
 */
export async function addStashMetadata(branchName: string, metadata: StashMetadata): Promise<void> {
  const index = await readStashIndex()

  // 如果分支不存在，创建空数组
  if (!index[branchName]) {
    index[branchName] = []
  }

  // 添加新的 stash 元数据
  index[branchName].push(metadata)

  // 写入文件
  await writeStashIndex(index)
}

/**
 * 获取分支的所有 Stash 元数据
 * @param branchName - 分支名称
 * @returns Stash 元数据数组，如果分支不存在则返回空数组
 */
export async function getBranchStashes(branchName: string): Promise<StashMetadata[]> {
  const index = await readStashIndex()
  return index[branchName] ?? []
}

/**
 * 从索引中移除指定的 Stash 元数据
 * @param branchName - 分支名称
 * @param stashRef - Stash 引用
 */
export async function removeStashMetadata(branchName: string, stashRef: string): Promise<void> {
  const index = await readStashIndex()

  if (!index[branchName]) {
    return
  }

  // 过滤掉指定的 stash
  index[branchName] = index[branchName].filter((stash) => stash.stashRef !== stashRef)

  // 如果分支的 stash 数组为空，删除该分支的键
  if (index[branchName].length === 0) {
    delete index[branchName]
  }

  // 写入文件
  await writeStashIndex(index)
}
