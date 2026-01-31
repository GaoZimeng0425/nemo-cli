import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { StashIndex, StashMetadata } from '../../src/utils/stash-index'

const mockState = { gitRoot: '' }

vi.mock('../../src/utils', () => ({
  getGitRoot: vi.fn(() => Promise.resolve(mockState.gitRoot)),
}))

const {
  addStashMetadata,
  addStashMetadataWithDetails,
  cleanOldStashes,
  findStashByInternalId,
  getAllStashes,
  getBranchStashes,
  getStashIndexPath,
  readStashIndex,
  removeStashMetadata,
  updateStashStatus,
  writeStashIndex,
} = await import('../../src/utils/stash-index')

describe('stash-index', () => {
  let testGitRoot: string

  beforeEach(async () => {
    testGitRoot = await mkdtemp(join(tmpdir(), 'nemo-cli-test-'))
    const gitDir = join(testGitRoot, '.git')
    await mkdir(gitDir, { recursive: true })
    mockState.gitRoot = testGitRoot
  })

  afterEach(async () => {
    await rm(testGitRoot, { recursive: true, force: true })
    mockState.gitRoot = ''
  })

  describe('getStashIndexPath', () => {
    it('should return the correct path to stash index file', async () => {
      const path = await getStashIndexPath()
      expect(path).toBe(join(testGitRoot, '.git', 'ng-stash-index.json'))
    })

    it('should return null when not in a Git repository', async () => {
      mockState.gitRoot = ''
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

      expect(content).toContain('\n')
      expect(content).toMatch(/\n\s{2}"feature/)
    })

    it('should throw error when not in a Git repository', async () => {
      mockState.gitRoot = ''

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

  describe('addStashMetadataWithDetails', () => {
    it('should add stash metadata with extended fields', async () => {
      const metadata: StashMetadata = {
        stashRef: 'stash@{0}',
        timestamp: '2025-12-21T10:00:00.000Z',
        createdAt: '2025-12-21T10:00:00.000Z',
        message: 'pull:feature/test@2025-12-21T10-00-00',
        internalId: '1703152800000_pull_feature_test',
        operation: 'pull',
        currentBranch: 'feature/test',
        targetBranch: 'main',
        files: ['src/index.ts', 'package.json'],
        status: 'active',
        commitHash: 'abc123def456',
      }

      await addStashMetadataWithDetails('feature/test', metadata)

      const index = await readStashIndex()
      const branchStashes = index['feature/test']
      expect(branchStashes).toBeDefined()
      expect(branchStashes).toHaveLength(1)
      expect(branchStashes![0]).toEqual(metadata)
      expect(branchStashes![0]!.internalId).toBe('1703152800000_pull_feature_test')
      expect(branchStashes![0]!.operation).toBe('pull')
      expect(branchStashes![0]!.files).toEqual(['src/index.ts', 'package.json'])
    })

    it('should use atomic rename for file write', async () => {
      const metadata: StashMetadata = {
        stashRef: 'stash@{0}',
        timestamp: '2025-12-21T10:00:00.000Z',
        createdAt: '2025-12-21T10:00:00.000Z',
        message: 'manual:main@2025-12-21T10-00-00',
        internalId: '1703152800000_manual_main',
        operation: 'manual',
        currentBranch: 'main',
        status: 'active',
      }

      await addStashMetadataWithDetails('main', metadata)

      // Verify file exists and contains correct data
      const indexPath = join(testGitRoot, '.git', 'ng-stash-index.json')
      const content = await readFile(indexPath, 'utf-8')
      const writtenIndex = JSON.parse(content)

      expect(writtenIndex['main']).toBeDefined()
      expect(writtenIndex['main'][0].internalId).toBe('1703152800000_manual_main')
    })

    it('should throw error when not in a Git repository', async () => {
      mockState.gitRoot = ''

      const metadata: StashMetadata = {
        stashRef: 'stash@{0}',
        timestamp: '2025-12-21T10:00:00.000Z',
        createdAt: '2025-12-21T10:00:00.000Z',
        message: 'test',
      }

      await expect(addStashMetadataWithDetails('feature/test', metadata)).rejects.toThrow('Not in a Git repository')
    })
  })

  describe('updateStashStatus', () => {
    it('should update stash status to popped', async () => {
      const metadata: StashMetadata = {
        stashRef: 'stash@{0}',
        timestamp: '2025-12-21T10:00:00.000Z',
        createdAt: '2025-12-21T10:00:00.000Z',
        message: 'pull:feature/test@2025-12-21T10-00-00',
        internalId: 'test_internal_id_1',
        operation: 'pull',
        currentBranch: 'feature/test',
        status: 'active',
      }

      await addStashMetadata('feature/test', metadata)
      await updateStashStatus('feature/test', 'test_internal_id_1', 'popped')

      const stashes = await getBranchStashes('feature/test')
      expect(stashes[0]!.status).toBe('popped')
    })

    it('should update stash status to dropped', async () => {
      const metadata: StashMetadata = {
        stashRef: 'stash@{0}',
        timestamp: '2025-12-21T10:00:00.000Z',
        createdAt: '2025-12-21T10:00:00.000Z',
        message: 'checkout:feature/test@2025-12-21T10-00-00',
        internalId: 'test_internal_id_2',
        operation: 'checkout',
        currentBranch: 'feature/test',
        status: 'active',
      }

      await addStashMetadata('feature/test', metadata)
      await updateStashStatus('feature/test', 'test_internal_id_2', 'dropped')

      const stashes = await getBranchStashes('feature/test')
      expect(stashes[0]!.status).toBe('dropped')
    })

    it('should update stash status to not_found with error message', async () => {
      const metadata: StashMetadata = {
        stashRef: 'stash@{0}',
        timestamp: '2025-12-21T10:00:00.000Z',
        createdAt: '2025-12-21T10:00:00.000Z',
        message: 'merge:feature/test@2025-12-21T10-00-00',
        internalId: 'test_internal_id_3',
        operation: 'merge',
        currentBranch: 'feature/test',
        status: 'active',
      }

      await addStashMetadata('feature/test', metadata)
      await updateStashStatus('feature/test', 'test_internal_id_3', 'not_found', 'Stash was manually deleted')

      const stashes = await getBranchStashes('feature/test')
      expect(stashes[0]!.status).toBe('not_found')
      expect(stashes[0]!.error).toBe('Stash was manually deleted')
    })

    it('should handle non-existent branch gracefully', async () => {
      await expect(updateStashStatus('nonexistent/branch', 'some_id', 'popped')).resolves.not.toThrow()
    })

    it('should handle non-existent internalId gracefully', async () => {
      const metadata: StashMetadata = {
        stashRef: 'stash@{0}',
        timestamp: '2025-12-21T10:00:00.000Z',
        createdAt: '2025-12-21T10:00:00.000Z',
        message: 'test',
        internalId: 'existing_id',
        status: 'active',
      }

      await addStashMetadata('feature/test', metadata)
      await expect(updateStashStatus('feature/test', 'non_existing_id', 'popped')).resolves.not.toThrow()

      // Original stash should remain unchanged
      const stashes = await getBranchStashes('feature/test')
      expect(stashes[0]!.status).toBe('active')
    })
  })

  describe('cleanOldStashes', () => {
    it('should remove stashes older than specified days', async () => {
      const now = Date.now()
      const oldTimestamp = new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString() // 40 days ago
      const recentTimestamp = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago

      const oldMetadata: StashMetadata = {
        stashRef: 'stash@{0}',
        timestamp: oldTimestamp,
        createdAt: oldTimestamp,
        message: 'old stash',
        status: 'popped',
      }

      const recentMetadata: StashMetadata = {
        stashRef: 'stash@{1}',
        timestamp: recentTimestamp,
        createdAt: recentTimestamp,
        message: 'recent stash',
        status: 'popped',
      }

      await addStashMetadata('feature/test', oldMetadata)
      await addStashMetadata('feature/test', recentMetadata)

      const removedCount = await cleanOldStashes(30)

      expect(removedCount).toBe(1)
      const stashes = await getBranchStashes('feature/test')
      expect(stashes).toHaveLength(1)
      expect(stashes[0]!.message).toBe('recent stash')
    })

    it('should preserve active stashes regardless of age', async () => {
      const now = Date.now()
      const veryOldTimestamp = new Date(now - 100 * 24 * 60 * 60 * 1000).toISOString() // 100 days ago

      const activeOldMetadata: StashMetadata = {
        stashRef: 'stash@{0}',
        timestamp: veryOldTimestamp,
        createdAt: veryOldTimestamp,
        message: 'old but active stash',
        status: 'active',
      }

      await addStashMetadata('feature/test', activeOldMetadata)

      const removedCount = await cleanOldStashes(30)

      expect(removedCount).toBe(0)
      const stashes = await getBranchStashes('feature/test')
      expect(stashes).toHaveLength(1)
      expect(stashes[0]!.status).toBe('active')
    })

    it('should remove empty branch entries after cleanup', async () => {
      const now = Date.now()
      const oldTimestamp = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString() // 60 days ago

      const oldMetadata: StashMetadata = {
        stashRef: 'stash@{0}',
        timestamp: oldTimestamp,
        createdAt: oldTimestamp,
        message: 'old stash to remove',
        status: 'dropped',
      }

      await addStashMetadata('feature/cleanup-test', oldMetadata)

      // Verify branch exists before cleanup
      let index = await readStashIndex()
      expect(index['feature/cleanup-test']).toBeDefined()

      await cleanOldStashes(30)

      // Branch should be removed after cleanup
      index = await readStashIndex()
      expect(index['feature/cleanup-test']).toBeUndefined()
    })

    it('should handle multiple branches during cleanup', async () => {
      const now = Date.now()
      const oldTimestamp = new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString()
      const recentTimestamp = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString()

      // Branch 1: all old stashes (should be removed entirely)
      await addStashMetadata('branch1', {
        stashRef: 'stash@{0}',
        timestamp: oldTimestamp,
        createdAt: oldTimestamp,
        message: 'old',
        status: 'popped',
      })

      // Branch 2: mix of old and recent
      await addStashMetadata('branch2', {
        stashRef: 'stash@{0}',
        timestamp: oldTimestamp,
        createdAt: oldTimestamp,
        message: 'old',
        status: 'dropped',
      })
      await addStashMetadata('branch2', {
        stashRef: 'stash@{1}',
        timestamp: recentTimestamp,
        createdAt: recentTimestamp,
        message: 'recent',
        status: 'popped',
      })

      // Branch 3: old but active
      await addStashMetadata('branch3', {
        stashRef: 'stash@{0}',
        timestamp: oldTimestamp,
        createdAt: oldTimestamp,
        message: 'old active',
        status: 'active',
      })

      const removedCount = await cleanOldStashes(30)

      expect(removedCount).toBe(2)

      const index = await readStashIndex()
      expect(index['branch1']).toBeUndefined()
      expect(index['branch2']).toHaveLength(1)
      expect(index['branch3']).toHaveLength(1)
    })
  })

  describe('getAllStashes', () => {
    it('should return all stashes across all branches', async () => {
      const metadata1: StashMetadata = {
        stashRef: 'stash@{0}',
        timestamp: '2025-12-21T10:00:00.000Z',
        createdAt: '2025-12-21T10:00:00.000Z',
        message: 'stash 1',
        status: 'active',
      }

      const metadata2: StashMetadata = {
        stashRef: 'stash@{1}',
        timestamp: '2025-12-21T11:00:00.000Z',
        createdAt: '2025-12-21T11:00:00.000Z',
        message: 'stash 2',
        status: 'popped',
      }

      const metadata3: StashMetadata = {
        stashRef: 'stash@{0}',
        timestamp: '2025-12-21T12:00:00.000Z',
        createdAt: '2025-12-21T12:00:00.000Z',
        message: 'stash 3',
        status: 'active',
      }

      await addStashMetadata('branch1', metadata1)
      await addStashMetadata('branch1', metadata2)
      await addStashMetadata('branch2', metadata3)

      const allStashes = await getAllStashes()

      expect(allStashes).toHaveLength(3)
    })

    it('should filter stashes by status', async () => {
      const metadata1: StashMetadata = {
        stashRef: 'stash@{0}',
        timestamp: '2025-12-21T10:00:00.000Z',
        createdAt: '2025-12-21T10:00:00.000Z',
        message: 'active stash',
        status: 'active',
      }

      const metadata2: StashMetadata = {
        stashRef: 'stash@{1}',
        timestamp: '2025-12-21T11:00:00.000Z',
        createdAt: '2025-12-21T11:00:00.000Z',
        message: 'popped stash',
        status: 'popped',
      }

      const metadata3: StashMetadata = {
        stashRef: 'stash@{2}',
        timestamp: '2025-12-21T12:00:00.000Z',
        createdAt: '2025-12-21T12:00:00.000Z',
        message: 'another active',
        status: 'active',
      }

      await addStashMetadata('branch1', metadata1)
      await addStashMetadata('branch1', metadata2)
      await addStashMetadata('branch2', metadata3)

      const activeStashes = await getAllStashes('active')
      expect(activeStashes).toHaveLength(2)
      expect(activeStashes.every((s) => s.status === 'active')).toBe(true)

      const poppedStashes = await getAllStashes('popped')
      expect(poppedStashes).toHaveLength(1)
      expect(poppedStashes[0]!.status).toBe('popped')
    })

    it('should return empty array when no stashes exist', async () => {
      const allStashes = await getAllStashes()
      expect(allStashes).toEqual([])
    })
  })

  describe('findStashByInternalId', () => {
    it('should find stash by internalId', async () => {
      const metadata: StashMetadata = {
        stashRef: 'stash@{0}',
        timestamp: '2025-12-21T10:00:00.000Z',
        createdAt: '2025-12-21T10:00:00.000Z',
        message: 'test stash',
        internalId: 'unique_internal_id_123',
        operation: 'pull',
        currentBranch: 'feature/test',
        status: 'active',
      }

      await addStashMetadata('feature/test', metadata)

      const result = await findStashByInternalId('unique_internal_id_123')

      expect(result).not.toBeNull()
      expect(result!.branchName).toBe('feature/test')
      expect(result!.metadata.internalId).toBe('unique_internal_id_123')
      expect(result!.metadata.operation).toBe('pull')
    })

    it('should return null for non-existent internalId', async () => {
      const metadata: StashMetadata = {
        stashRef: 'stash@{0}',
        timestamp: '2025-12-21T10:00:00.000Z',
        createdAt: '2025-12-21T10:00:00.000Z',
        message: 'test stash',
        internalId: 'existing_id',
        status: 'active',
      }

      await addStashMetadata('feature/test', metadata)

      const result = await findStashByInternalId('non_existent_id')
      expect(result).toBeNull()
    })

    it('should search across multiple branches', async () => {
      const metadata1: StashMetadata = {
        stashRef: 'stash@{0}',
        timestamp: '2025-12-21T10:00:00.000Z',
        createdAt: '2025-12-21T10:00:00.000Z',
        message: 'stash on branch1',
        internalId: 'id_branch1',
        status: 'active',
      }

      const metadata2: StashMetadata = {
        stashRef: 'stash@{0}',
        timestamp: '2025-12-21T11:00:00.000Z',
        createdAt: '2025-12-21T11:00:00.000Z',
        message: 'stash on branch2',
        internalId: 'id_branch2',
        status: 'active',
      }

      await addStashMetadata('branch1', metadata1)
      await addStashMetadata('branch2', metadata2)

      const result1 = await findStashByInternalId('id_branch1')
      expect(result1!.branchName).toBe('branch1')

      const result2 = await findStashByInternalId('id_branch2')
      expect(result2!.branchName).toBe('branch2')
    })
  })

  describe('concurrent write safety', () => {
    it('should handle sequential writes without data corruption', async () => {
      const writes = Array.from({ length: 5 }, (_, i) => ({
        stashRef: `stash@{${i}}`,
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        createdAt: new Date(Date.now() + i * 1000).toISOString(),
        message: `sequential stash ${i}`,
        internalId: `sequential_id_${i}`,
        status: 'active' as const,
      }))

      for (const [i, metadata] of writes.entries()) {
        await addStashMetadataWithDetails(`branch${i}`, metadata)
      }

      const index = await readStashIndex()
      let totalStashes = 0
      for (const branchName of Object.keys(index)) {
        totalStashes += index[branchName]!.length
      }

      expect(totalStashes).toBe(5)
    })

    it('should preserve data integrity during rapid sequential writes', async () => {
      const metadata: StashMetadata = {
        stashRef: 'stash@{0}',
        timestamp: '2025-12-21T10:00:00.000Z',
        createdAt: '2025-12-21T10:00:00.000Z',
        message: 'base stash',
        internalId: 'base_id',
        status: 'active',
      }

      await addStashMetadataWithDetails('feature/test', metadata)

      // Rapid sequential updates
      for (let i = 0; i < 5; i++) {
        await addStashMetadataWithDetails('feature/test', {
          ...metadata,
          stashRef: `stash@{${i + 1}}`,
          message: `sequential stash ${i}`,
          internalId: `sequential_id_${i}`,
        })
      }

      const stashes = await getBranchStashes('feature/test')
      expect(stashes).toHaveLength(6)
    })
  })
})
