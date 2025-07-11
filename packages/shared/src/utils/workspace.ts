import fs from 'node:fs/promises'
import path from 'node:path'
import yaml from 'yaml'

import { filterDirList, glob, readJSON } from './file.js'
import { log } from './log.js' // Assuming log utility exists

interface PnpmWorkspaceConfig {
  packages?: string[]
}

export interface PackageInfo {
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

export async function getWorkspacePackages(): Promise<PackageInfo[]> {
  const workspacePackages: PackageInfo[] = []
  try {
    const workspaceRoot = await findWorkspaceRoot()
    log.info(`Found workspace root at: ${workspaceRoot}`)

    const workspaceConfigPath = path.join(workspaceRoot, 'pnpm-workspace.yaml')
    const configFileContent = await fs.readFile(workspaceConfigPath, 'utf8')
    const workspaceConfig = yaml.parse(configFileContent) as PnpmWorkspaceConfig

    if (!workspaceConfig?.packages?.length) {
      log.warn('No packages defined in pnpm-workspace.yaml or file is empty.')
      return []
    }

    log.info(`Workspace package patterns: ${workspaceConfig.packages.join(', ')}`)

    for (const pattern of workspaceConfig.packages) {
      const packagePaths = await glob(pattern, { cwd: workspaceRoot, absolute: true })

      const packageDirs = filterDirList(packagePaths)

      for (const packageDir of packageDirs) {
        const packageJson = readJSON(`${packageDir}/package.json`)
        if (packageJson) {
          workspacePackages.push({
            name: packageJson.name,
            path: path.relative(workspaceRoot, packageDir),
          })
        } else {
          log.warn(`Skipping directory ${packageDir} as package.json does not contain a name.`)
        }
      }
    }
    log.info(`Found ${workspacePackages.length} packages.`)
    return workspacePackages
  } catch (err: any) {
    log.error(`Failed to get workspace packages: ${err.message}`)
    return [] // Return empty array on error as per robust error handling
  }
}
