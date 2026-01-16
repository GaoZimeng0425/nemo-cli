import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as utils from '../../src/utils'
import {
  addStashMetadata,
  getBranchStashes,
  getStashIndexPath,
  readStashIndex,
  removeStashMetadata,
  type StashIndex,
  type StashMetadata,
  writeStashIndex,
} from '../../src/utils/stash-index'

// Mock the getGitRoot function
vi.mock('../../src/utils', async () => {
  const actual = await vi.importActual('../../src/utils')
  return {
    ...actual,
    getGitRoot: vi.fn(),
  }
})

describe('stash-index', () => {
  let testGitRoot: string
  let originalGetGitRoot: typeof utils.getGitRoot

  beforeEach(async () => {
    // Create a temporary directory to simulate a Git repository
    testGitRoot = await mkdtemp(join(tmpdir(), 'nemo-cli-test-'))
    const gitDir = join(testGitRoot, '.git')
    await mkdir(gitDir, { recursive: true })

    // Mock getGitRoot to return our test directory
    originalGetGitRoot = utils.getGitRoot as typeof utils.getGitRoot
    vi.mocked(utils.getGitRoot).mockResolvedValue(testGitRoot)
  })

  afterEach(async () => {
    // Clean up temporary directory
    await rm(testGitRoot, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  describe('getStashIndexPath', () => {
    it('should return the correct path to stash index file', async () => {
      const path = await getStashIndexPath()
      expect(path).toBe(join(testGitRoot, '.git', 'ng-stash-index.json'))
    })

    it('should return null when not in a Git repository', async () => {
      vi.mocked(utils.getGitRoot).mockResolvedValue('')
      const path = await getStashIndexPath()
      expect(path).toBeNull()
    })
  })

  describe('readStashIndex', () => {
    it('should return empty object when file does not exist', async () => {
      const index = await readStashIndex()
      expect(index).toEqual({})
    })

    it('should read and parse valid stash index file', async () => {
      const testIndex: StashIndex = {
        'feature/test': [
          {
            stashRef: 'stash@{0}',
            timestamp: '2025-12-21T10:00:00.000Z',
            createdAt: '2025-12-21T10:00:00.000Z',
            message: '[ng-auto] branch:feature/test timestamp:2025-12-21T10:00:00',
          },
        ],
      }

      const indexPath = join(testGitRoot, '.git', 'ng-stash-index.json')
      await writeFile(indexPath, JSON.stringify(testIndex, null, 2), 'utf-8')

      const index = await readStashIndex()
      expect(index).toEqual(testIndex)
    })

    it('should handle corrupted JSON file gracefully', async () => {
      const indexPath = join(testGitRoot, '.git', 'ng-stash-index.json')
      await writeFile(indexPath, 'invalid json content', 'utf-8')

      const index = await readStashIndex()
      expect(index).toEqual({})
    })

    it('should handle invalid data structure gracefully', async () => {
      const indexPath = join(testGitRoot, '.git', 'ng-stash-index.json')
      // Write an array instead of an object
      await writeFile(indexPath, JSON.stringify([]), 'utf-8')

      const index = await readStashIndex()
      expect(index).toEqual({})
    })

    it('should handle missing required fields gracefully', async () => {
      const indexPath = join(testGitRoot, '.git', 'ng-stash-index.json')
      const invalidIndex = {
        'feature/test': [
          {
            stashRef: 'stash@{0}',
            // Missing timestamp, createdAt, message
          },
        ],
      }
      await writeFile(indexPath, JSON.stringify(invalidIndex), 'utf-8')

      const index = await readStashIndex()
      expect(index).toEqual({})
    })
  })

  describe('writeStashIndex', () => {
    it('should write stash index to file', async () => {
      const testIndex: StashIndex = {
        'feature/test': [
          {
            stashRef: 'stash@{0}',
            timestamp: '2025-12-21T10:00:00.000Z',
            createdAt: '2025-12-21T10:00:00.000Z',
            message: '[ng-auto] branch:feature/test timestamp:2025-12-21T10:00:00',
          },
        ],
      }

      await writeStashIndex(testIndex)

      const indexPath = join(testGitRoot, '.git', 'ng-stash-index.json')
      const content = await readFile(indexPath, 'utf-8')
      const writtenIndex = JSON.parse(content)

      expect(writtenIndex).toEqual(testIndex)
    })

    it('should format JSON with 2-space indentation', async () => {
      const testIndex: StashIndex = {
        'feature/test': [
          {
            stashRef: 'stash@{0}',
            timestamp: '2025-12-21T10:00:00.000Z',
            createdAt: '2025-12-21T10:00:00.000Z',
            message: '[ng-auto] branch:feature/test timestamp:2025-12-21T10:00:00',
          },
        ],
      }

      await writeStashIndex(testIndex)

      const indexPath = join(testGitRoot, '.git', 'ng-stash-index.json')
      const content = await readFile(indexPath, 'utf-8')

      // Check that the file is formatted (contains newlines and spaces)
      expect(content).toContain('\n')
      expect(content).toMatch(/^\s{2}"feature/)
    })

    it('should throw error when not in a Git repository', async () => {
      vi.mocked(utils.getGitRoot).mockResolvedValue('')

      const testIndex: StashIndex = {}
      await expect(writeStashIndex(testIndex)).rejects.toThrow('Not in a Git repository. Cannot write stash index.')
    })
  })

  describe('addStashMetadata', () => {
    it('should add stash metadata for a new branch', async () => {
      const metadata: StashMetadata = {
        stashRef: 'stash@{0}',
        timestamp: '2025-12-21T10:00:00.000Z',
        createdAt: '2025-12-21T10:00:00.000Z',
        message: '[ng-auto] branch:feature/test timestamp:2025-12-21T10:00:00',
      }

      await addStashMetadata('feature/test', metadata)

      const index = await readStashIndex()
      const branchStashes = index['feature/test']
      expect(branchStashes).toBeDefined()
      expect(branchStashes).toHaveLength(1)
      expect(branchStashes![0]).toEqual(metadata)
    })

    it('should append stash metadata to existing branch', async () => {
      const metadata1: StashMetadata = {
        stashRef: 'stash@{0}',
        timestamp: '2025-12-21T10:00:00.000Z',
        createdAt: '2025-12-21T10:00:00.000Z',
        message: '[ng-auto] branch:feature/test timestamp:2025-12-21T10:00:00',
      }

      const metadata2: StashMetadata = {
        stashRef: 'stash@{1}',
        timestamp: '2025-12-21T11:00:00.000Z',
        createdAt: '2025-12-21T11:00:00.000Z',
        message: '[ng-auto] branch:feature/test timestamp:2025-12-21T11:00:00',
      }

      await addStashMetadata('feature/test', metadata1)
      await addStashMetadata('feature/test', metadata2)

      const index = await readStashIndex()
      const branchStashes = index['feature/test']
      expect(branchStashes).toBeDefined()
      expect(branchStashes).toHaveLength(2)
      expect(branchStashes![0]).toEqual(metadata1)
      expect(branchStashes![1]).toEqual(metadata2)
    })
  })

  describe('getBranchStashes', () => {
    it('should return empty array for non-existent branch', async () => {
      const stashes = await getBranchStashes('feature/nonexistent')
      expect(stashes).toEqual([])
    })

    it('should return stashes for existing branch', async () => {
      const metadata: StashMetadata = {
        stashRef: 'stash@{0}',
        timestamp: '2025-12-21T10:00:00.000Z',
        createdAt: '2025-12-21T10:00:00.000Z',
        message: '[ng-auto] branch:feature/test timestamp:2025-12-21T10:00:00',
      }

      await addStashMetadata('feature/test', metadata)

      const stashes = await getBranchStashes('feature/test')
      expect(stashes).toHaveLength(1)
      expect(stashes[0]).toEqual(metadata)
    })
  })

  describe('removeStashMetadata', () => {
    it('should remove specified stash from branch', async () => {
      const metadata1: StashMetadata = {
        stashRef: 'stash@{0}',
        timestamp: '2025-12-21T10:00:00.000Z',
        createdAt: '2025-12-21T10:00:00.000Z',
        message: '[ng-auto] branch:feature/test timestamp:2025-12-21T10:00:00',
      }

      const metadata2: StashMetadata = {
        stashRef: 'stash@{1}',
        timestamp: '2025-12-21T11:00:00.000Z',
        createdAt: '2025-12-21T11:00:00.000Z',
        message: '[ng-auto] branch:feature/test timestamp:2025-12-21T11:00:00',
      }

      await addStashMetadata('feature/test', metadata1)
      await addStashMetadata('feature/test', metadata2)

      await removeStashMetadata('feature/test', 'stash@{0}')

      const stashes = await getBranchStashes('feature/test')
      expect(stashes).toHaveLength(1)
      expect(stashes[0]).toEqual(metadata2)
    })

    it('should remove branch key when all stashes are removed', async () => {
      const metadata: StashMetadata = {
        stashRef: 'stash@{0}',
        timestamp: '2025-12-21T10:00:00.000Z',
        createdAt: '2025-12-21T10:00:00.000Z',
        message: '[ng-auto] branch:feature/test timestamp:2025-12-21T10:00:00',
      }

      await addStashMetadata('feature/test', metadata)
      await removeStashMetadata('feature/test', 'stash@{0}')

      const index = await readStashIndex()
      expect(index['feature/test']).toBeUndefined()
    })

    it('should handle removal from non-existent branch gracefully', async () => {
      await expect(removeStashMetadata('feature/nonexistent', 'stash@{0}')).resolves.not.toThrow()
    })
  })
})
