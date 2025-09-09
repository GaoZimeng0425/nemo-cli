import path from 'node:path'
import fse from 'fs-extra/esm'

import { handleError } from './error'
import { log } from './log'

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
    const packageJson = (await fse.readJSON(packageJsonPath)) as PackageJson

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
  } catch (err: unknown) {
    handleError(err, `Failed to read or parse package.json at ${packageJsonPath}: `)
    return []
  }
}
