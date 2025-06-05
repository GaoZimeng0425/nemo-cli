import fs from 'node:fs/promises'
import path from 'node:path'
import { log } from './log.js' // Assuming log utility exists

interface DependencyInfo {
  name: string
  version: string
  type: 'dependencies' | 'devDependencies'
}

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

export async function getPackageDependencies(packageDir: string): Promise<DependencyInfo[]> {
  const dependenciesList: DependencyInfo[] = []
  const packageJsonPath = path.join(packageDir, 'package.json')

  try {
    log.info(`Reading package.json from: ${packageJsonPath}`)
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8')
    const packageJson = JSON.parse(packageJsonContent) as PackageJson

    if (packageJson.dependencies) {
      for (const [name, version] of Object.entries(packageJson.dependencies)) {
        dependenciesList.push({ name, version, type: 'dependencies' })
      }
    }

    if (packageJson.devDependencies) {
      for (const [name, version] of Object.entries(packageJson.devDependencies)) {
        dependenciesList.push({ name, version, type: 'devDependencies' })
      }
    }

    log.info(`Found ${dependenciesList.length} dependencies in ${packageJsonPath}`)
    return dependenciesList
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      log.error(`package.json not found at ${packageJsonPath}`)
    } else {
      log.error(`Failed to read or parse package.json at ${packageJsonPath}: ${err.message}`)
    }
    return [] // Return empty array on error
  }
}
