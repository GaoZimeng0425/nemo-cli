import fs from 'node:fs/promises'
import path from 'node:path'
import yaml from 'yaml'

import type { PackageManager } from '../package-manager/types'
import { handleError } from './error'
import { filterDirList, glob, readJSON } from './file'
import { log } from './log' // Assuming log utility exists

interface PnpmWorkspaceConfig {
  packages?: string[]
}

interface PackageJsonWorkspaceConfig {
  workspaces?: string[] | { packages?: string[] }
}

export interface PackageNameInfo {
  name: string
  path: string // Relative path from workspace root
}

/**
 * Workspace configuration files and their detection patterns
 */
const WORKSPACE_CONFIGS: Record<PackageManager, { file: string; checkField?: string }> = {
  pnpm: { file: 'pnpm-workspace.yaml' },
  yarn: { file: 'package.json', checkField: 'workspaces' },
  npm: { file: 'package.json', checkField: 'workspaces' },
  bun: { file: 'package.json', checkField: 'workspaces' },
  deno: { file: 'package.json', checkField: 'workspaces' },
}

/**
 * Priority order for workspace detection (matches package manager detector)
 */
const WORKSPACE_PRIORITY: PackageManager[] = ['pnpm', 'yarn', 'npm', 'bun']

/**
 * Find workspace root by detecting workspace configuration files
 * Supports pnpm, yarn, npm, and bun workspace configurations
 */
async function findWorkspaceRoot(startDir: string = process.cwd()): Promise<{
  root: string
  packageManager: PackageManager
}> {
  let currentDir = startDir

  while (true) {
    // Check each package manager's workspace config in priority order
    for (const pm of WORKSPACE_PRIORITY) {
      const config = WORKSPACE_CONFIGS[pm]
      const configPath = path.join(currentDir, config.file)

      try {
        await fs.access(configPath)

        // For package.json, verify it has workspaces field
        if (config.checkField === 'workspaces') {
          const packageJson = readJSON(configPath)
          if (packageJson?.workspaces) {
            log.info(`Found ${pm} workspace at: ${currentDir}`)
            return { root: currentDir, packageManager: pm }
          }
        } else {
          // For pnpm-workspace.yaml, existence is enough
          log.info(`Found ${pm} workspace at: ${currentDir}`)
          return { root: currentDir, packageManager: pm }
        }
      } catch {}
    }

    // Move to parent directory
    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir) {
      throw new Error(
        'Workspace configuration not found. Supported: pnpm-workspace.yaml or package.json with workspaces field'
      )
    }
    currentDir = parentDir
  }
}

/**
 * Get workspace directories based on detected package manager
 * Supports pnpm-workspace.yaml and package.json workspaces field
 */
export async function getWorkspaceDirs(): Promise<{
  root: string
  packages: string[]
  packageManager: PackageManager
}> {
  const { root: workspaceRoot, packageManager } = await findWorkspaceRoot()
  try {
    let packagePatterns: string[] = []

    if (packageManager === 'pnpm') {
      // Parse workspace configuration based on package manager
      const workspaceConfigPath = path.join(workspaceRoot, 'pnpm-workspace.yaml')
      const configFileContent = await fs.readFile(workspaceConfigPath, 'utf8')
      const workspaceConfig = yaml.parse(configFileContent) as PnpmWorkspaceConfig

      if (workspaceConfig?.packages?.length) {
        packagePatterns = workspaceConfig.packages
      }
    } else {
      // yarn, npm, bun all use package.json workspaces field
      const packageJsonPath = path.join(workspaceRoot, 'package.json')
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8')) as PackageJsonWorkspaceConfig

      if (packageJson?.workspaces) {
        // workspaces can be an array or an object with packages property
        if (Array.isArray(packageJson.workspaces)) {
          packagePatterns = packageJson.workspaces
        } else if (packageJson.workspaces?.packages && Array.isArray(packageJson.workspaces.packages)) {
          packagePatterns = packageJson.workspaces.packages
        }
      }
    }

    if (!packagePatterns.length) {
      log.warn('No packages defined in workspace configuration or file is empty.')
      return {
        root: workspaceRoot,
        packages: [],
        packageManager,
      }
    }

    log.info(`Workspace package patterns: ${packagePatterns.join(', ')}`)
    const dirs: string[] = []
    for (const pattern of packagePatterns) {
      const packagePaths = await glob(pattern, { cwd: workspaceRoot, absolute: true })
      dirs.push(...packagePaths)
    }
    return {
      root: workspaceRoot,
      packages: filterDirList(dirs),
      packageManager,
    }
  } catch (err: unknown) {
    handleError(err, 'Failed to get workspace dirs: ')
    return { root: workspaceRoot, packages: [], packageManager }
  }
}

export async function getWorkspaceNames(): Promise<PackageNameInfo[]> {
  const workspacePackages: PackageNameInfo[] = []
  try {
    const { root, packages } = await getWorkspaceDirs()
    console.log('🚀 : getWorkspaceNames : root, packages:', root, packages)

    for (const packageDir of packages) {
      const packageJson = readJSON(`${packageDir}/package.json`)
      if (packageJson) {
        workspacePackages.push({
          name: packageJson.name,
          path: path.relative(root, packageDir),
        })
      } else {
        log.warn(`Skipping directory ${packageDir} as package.json does not contain a name.`)
      }
    }
    log.info(`Found ${workspacePackages.length} packages.`)
    return workspacePackages
  } catch (err: unknown) {
    handleError(err, 'Failed to get workspace packages: ')
    return [] // Return empty array on error as per robust error handling
  }
}

/**
 * Export the type of detected package manager
 */
export type { PackageManager }
