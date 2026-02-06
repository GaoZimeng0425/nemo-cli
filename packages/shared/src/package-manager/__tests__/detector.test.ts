import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PackageManagerDetector } from '../src/package-manager/detector'
import type { DetectionResult } from '../src/package-manager/types'

// Mock dependencies
vi.mock('node:fs')
vi.mock('node:fs/promises')
vi.mock('../src/utils/command', () => ({
  x: vi.fn(),
}))

describe('PackageManagerDetector', () => {
  const mockProjectRoot = '/mock/project'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should detect pnpm from lock file', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      return path.toString().includes('pnpm-lock.yaml')
    })

    const detector = new PackageManagerDetector(mockProjectRoot)
    const result = await detector.detect(true)

    expect(result.packageManager).toBe('pnpm')
    expect(result.method).toBe('lock-file')
  })

  it('should detect npm from lock file', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      return path.toString().includes('package-lock.json')
    })

    const detector = new PackageManagerDetector(mockProjectRoot)
    const result = await detector.detect(true)

    expect(result.packageManager).toBe('npm')
    expect(result.method).toBe('lock-file')
  })

  it('should detect yarn from lock file', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      return path.toString().includes('yarn.lock')
    })

    const detector = new PackageManagerDetector(mockProjectRoot)
    const result = await detector.detect(true)

    expect(result.packageManager).toBe('yarn')
    expect(result.method).toBe('lock-file')
  })

  it('should detect bun from lock file', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      return path.toString().includes('bun.lockb')
    })

    const detector = new PackageManagerDetector(mockProjectRoot)
    const result = await detector.detect(true)

    expect(result.packageManager).toBe('bun')
    expect(result.method).toBe('lock-file')
  })

  it('should respect detection priority (pnpm > yarn > npm)', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      const pathStr = path.toString()
      return (
        pathStr.includes('pnpm-lock.yaml') || pathStr.includes('yarn.lock') || pathStr.includes('package-lock.json')
      )
    })

    const detector = new PackageManagerDetector(mockProjectRoot)
    const result = await detector.detect(true)

    // pnpm should be detected first (highest priority)
    expect(result.packageManager).toBe('pnpm')
  })

  it('should detect from package.json packageManager field', async () => {
    // No lock files
    vi.mocked(existsSync).mockReturnValue(false)

    // Mock package.json reading
    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({
        name: 'test-project',
        packageManager: 'pnpm@8.0.0',
      })
    )

    const detector = new PackageManagerDetector(mockProjectRoot)
    const result = await detector.detect(true)

    expect(result.packageManager).toBe('pnpm')
    expect(result.method).toBe('package-json')
  })

  it('should handle invalid packageManager field gracefully', async () => {
    vi.mocked(existsSync).mockReturnValue(false)

    vi.mocked(fs.readFile).mockResolvedValueOnce(
      JSON.stringify({
        name: 'test-project',
        packageManager: 'invalid-package@1.0.0',
      })
    )

    // Mock createSelect for user selection
    const { createSelect } = await import('../src/utils/prompts')
    vi.mocked(createSelect).mockResolvedValue('npm' as never)

    const detector = new PackageManagerDetector(mockProjectRoot)
    const result = await detector.detect(true)

    expect(result.method).toBe('user-selection')
  })

  it('should cache detection results', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      return path.toString().includes('pnpm-lock.yaml')
    })

    const detector = new PackageManagerDetector(mockProjectRoot)

    // First detection
    await detector.detect(true)

    // Verify cache file was written
    expect(fs.writeFile).toHaveBeenCalled()
  })

  it('should use cached results if not expired', async () => {
    const cacheData = {
      result: {
        packageManager: 'pnpm' as const,
        method: 'lock-file' as const,
        detectedAt: new Date().toISOString(),
        isAvailable: true,
      },
      expiresAt: new Date(Date.now() + 1000000).toISOString(),
    }

    vi.mocked(existsSync).mockImplementation((path) => {
      return path.toString().includes('package-manager.json')
    })

    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(cacheData))

    const detector = new PackageManagerDetector(mockProjectRoot)
    const result = await detector.detect(false)

    expect(result.packageManager).toBe('pnpm')
    expect(result.method).toBe('lock-file')
  })

  it('should clear cache', async () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(fs.unlink).mockResolvedValue(undefined)

    const detector = new PackageManagerDetector(mockProjectRoot)
    await detector.clearCache()

    expect(fs.unlink).toHaveBeenCalled()
  })
})
