import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

import { x } from '../utils/command.js'
import { log } from '../utils/log.js'
import type { PackageManagerAdapter } from './adapter.js'
import type { DetectionCache, DetectionMethod, DetectionResult, PackageManager } from './types.js'
import { LOCK_FILE_PATTERNS, PACKAGE_MANAGER_NAMES } from './types.js'

/**
 * Cache file location
 */
const CACHE_FILE = '.nemo/package-manager.json'
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

/**
 * PackageManagerDetector - Detects the package manager used by a project
 *
 * Detection priority:
 * 1. Lock file analysis (package-lock.json, pnpm-lock.yaml, yarn.lock, bun.lockb)
 * 2. package.json packageManager field
 * 3. Interactive user selection
 */
export class PackageManagerDetector {
  private projectRoot: string
  private cachePath: string

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot
    this.cachePath = path.join(projectRoot, CACHE_FILE)
  }

  /**
   * Detect the package manager for the project
   */
  async detect(forceRefresh = false): Promise<DetectionResult> {
    // Check cache first
    if (!forceRefresh) {
      const cached = await this.loadCache()
      if (cached && !this.isCacheExpired(cached)) {
        log.info(`Using cached package manager: ${cached.result.packageManager}`)
        return cached.result
      }
    }

    // Attempt detection by lock file
    const lockFileResult = await this.detectByLockFile()
    if (lockFileResult) {
      const result = await this.createDetectionResult(lockFileResult, 'lock-file')
      await this.saveCache(result)
      return result
    }

    // Attempt detection by package.json
    const packageJsonResult = await this.detectByPackageJson()
    if (packageJsonResult) {
      const result = await this.createDetectionResult(packageJsonResult, 'package-json')
      await this.saveCache(result)
      return result
    }

    // Fallback to user selection
    log.warn('Could not auto-detect package manager')
    const userSelection = await this.promptUser()
    const result = await this.createDetectionResult(userSelection, 'user-selection')
    await this.saveCache(result)
    return result
  }

  /**
   * Detect package manager from lock files
   */
  private async detectByLockFile(): Promise<PackageManager | null> {
    const priorityOrder: PackageManager[] = ['pnpm', 'yarn', 'npm', 'bun', 'deno']

    for (const pm of priorityOrder) {
      const patterns = LOCK_FILE_PATTERNS[pm]
      for (const pattern of patterns) {
        const lockFilePath = path.join(this.projectRoot, pattern)
        if (existsSync(lockFilePath)) {
          log.info(`Detected ${pm} from lock file: ${pattern}`)
          return pm
        }
      }
    }

    return null
  }

  /**
   * Detect package manager from package.json packageManager field
   */
  private async detectByPackageJson(): Promise<PackageManager | null> {
    const packageJsonPath = path.join(this.projectRoot, 'package.json')

    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8')
      const packageJson = JSON.parse(content)
      const packageManagerField = packageJson.packageManager

      if (!packageManagerField) {
        return null
      }

      // Parse packageManager field (e.g., "pnpm@8.0.0")
      const match = packageManagerField.match(/^([a-z]+)@/)
      if (match) {
        const pm = match[1] as PackageManager
        if (this.isValidPackageManager(pm)) {
          log.info(`Detected ${pm} from package.json packageManager field`)
          return pm
        }
      }

      return null
    } catch (error) {
      log.debug(`Could not read package.json: ${error}`)
      return null
    }
  }

  /**
   * Prompt user to select package manager interactively
   */
  private async promptUser(): Promise<PackageManager> {
    // Dynamic import to avoid circular dependency
    const { createSelect } = await import('../utils/prompts.js')

    const choices = Object.entries(PACKAGE_MANAGER_NAMES).map(([value, label]) => ({
      value,
      label,
    }))

    const selected = await createSelect({
      message: 'Could not detect package manager. Please select one:',
      options: choices,
    })

    if (!selected || !this.isValidPackageManager(selected)) {
      log.error('Invalid selection. Defaulting to npm.')
      return 'npm'
    }

    return selected as PackageManager
  }

  /**
   * Check if a package manager is installed and available
   */
  private async checkAvailability(pm: PackageManager): Promise<boolean> {
    try {
      const result = await x(pm, ['--version'])
      return result.exitCode === 0
    } catch {
      return false
    }
  }

  /**
   * Create a detection result with metadata
   */
  private async createDetectionResult(
    packageManager: PackageManager,
    method: DetectionMethod
  ): Promise<DetectionResult> {
    const isAvailable = await this.checkAvailability(packageManager)

    return {
      packageManager,
      method,
      detectedAt: new Date().toISOString(),
      isAvailable,
    }
  }

  /**
   * Load cached detection result
   */
  private async loadCache(): Promise<DetectionCache | null> {
    try {
      if (!existsSync(this.cachePath)) {
        return null
      }

      const content = await fs.readFile(this.cachePath, 'utf-8')
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  /**
   * Save detection result to cache
   */
  private async saveCache(result: DetectionResult): Promise<void> {
    try {
      const cacheDir = path.dirname(this.cachePath)
      await fs.mkdir(cacheDir, { recursive: true })

      const cache: DetectionCache = {
        result,
        expiresAt: new Date(Date.now() + CACHE_DURATION).toISOString(),
      }

      await fs.writeFile(this.cachePath, JSON.stringify(cache, null, 2))
    } catch (error) {
      log.debug(`Could not save cache: ${error}`)
    }
  }

  /**
   * Check if cache has expired
   */
  private isCacheExpired(cache: DetectionCache): boolean {
    return new Date(cache.expiresAt) < new Date()
  }

  /**
   * Validate package manager enum
   */
  private isValidPackageManager(pm: string): pm is PackageManager {
    return ['npm', 'pnpm', 'yarn', 'bun', 'deno'].includes(pm)
  }

  /**
   * Clear the cache (useful for testing or force re-detection)
   */
  async clearCache(): Promise<void> {
    try {
      if (existsSync(this.cachePath)) {
        await fs.unlink(this.cachePath)
        log.info('Package manager cache cleared')
      }
    } catch (error) {
      log.debug(`Could not clear cache: ${error}`)
    }
  }
}

/**
 * Get adapter for detected or specified package manager
 */
export async function getPackageManagerAdapter(packageManager?: PackageManager): Promise<PackageManagerAdapter> {
  const detector = new PackageManagerDetector()

  const pm = packageManager || (await detector.detect()).packageManager

  // Dynamic import to avoid circular dependencies
  const adapters = await import('./adapters/index.js')

  return adapters.getAdapter(pm)
}
