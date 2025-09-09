import fs from 'node:fs/promises'
import path from 'node:path'
import yaml from 'yaml'

import { handleError } from './error'
import { filterDirList, glob, readJSON } from './file'
import { log } from './log' // Assuming log utility exists

interface PnpmWorkspaceConfig {
  packages?: string[]
}

export interface PackageNameInfo {
  name: string
  path: string // Relative path from workspace root
}

async function findWorkspaceRoot(startDir: string = process.cwd()): Promise<string> {
  let currentDir = startDir
  while (true) {
    try {
      await fs.access(path.join(currentDir, 'pnpm-workspace.yaml'))
      return currentDir
    } catch {
      const parentDir = path.dirname(currentDir)
      if (parentDir === currentDir) {
        throw new Error('pnpm-workspace.yaml not found in any parent directory.')
      }
      currentDir = parentDir
    }
  }
}

export async function getWorkspaceDirs(): Promise<{ root: string; packages: string[] }> {
  const workspaceRoot = await findWorkspaceRoot()
  try {
    log.info(`Found workspace root at: ${workspaceRoot}`)

    const workspaceConfigPath = path.join(workspaceRoot, 'pnpm-workspace.yaml')
    const configFileContent = await fs.readFile(workspaceConfigPath, 'utf8')
    const workspaceConfig = yaml.parse(configFileContent) as PnpmWorkspaceConfig

    if (!workspaceConfig?.packages?.length) {
      log.warn('No packages defined in pnpm-workspace.yaml or file is empty.')
      return {
        root: workspaceRoot,
        packages: [],
      }
    }
    log.info(`Workspace package patterns: ${workspaceConfig.packages.join(', ')}`)
    const dirs: string[] = []
    for (const pattern of workspaceConfig.packages) {
      const packagePaths = await glob(pattern, { cwd: workspaceRoot, absolute: true })
      dirs.push(...packagePaths)
    }
    return {
      root: workspaceRoot,
      packages: filterDirList(dirs),
    }
  } catch (err: unknown) {
    handleError(err, 'Failed to get workspace dirs: ')
    return { root: workspaceRoot, packages: [] }
  }
}

export async function getWorkspaceNames(): Promise<PackageNameInfo[]> {
  const workspacePackages: PackageNameInfo[] = []
  try {
    const { root, packages } = await getWorkspaceDirs()

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
