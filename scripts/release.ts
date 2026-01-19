#!/usr/bin/env tsx
/**
 * Release Script for nemo-cli monorepo
 *
 * Usage:
 *   pnpm release              # Interactive mode
 *   pnpm release patch        # Bump patch version
 *   pnpm release minor        # Bump minor version
 *   pnpm release major        # Bump major version
 *   pnpm release --dry-run    # Dry run without publishing
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { colors, createConfirm, createSelect, log, readJSON, writeJSON, xASync } from '@nemo-cli/shared'

// ============== Configuration ==============
const ROOT_DIR = resolve(import.meta.dirname, '..')
const PACKAGES_DIR = join(ROOT_DIR, 'packages')

const RELEASE_TYPES = ['patch', 'minor', 'major', 'prepatch', 'preminor', 'premajor', 'prerelease'] as const
type ReleaseType = (typeof RELEASE_TYPES)[number]

type PackageJson = {
  name: string
  version: string
  private?: boolean
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

// ============== Utils ==============

const readPackageJson = (dir: string): PackageJson => readJSON(join(dir, 'package.json'))

const writePackageJson = (dir: string, pkg: PackageJson): void => writeJSON(join(dir, 'package.json'), pkg)

// ============== Version Utils ==============
const parseVersion = (version: string): { major: number; minor: number; patch: number; prerelease?: string } => {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/)
  if (!match) throw new Error(`Invalid version: ${version}`)

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
    prerelease: match[4],
  }
}

const bumpVersion = (version: string, type: ReleaseType, preid = 'beta'): string => {
  const parsed = parseVersion(version)

  switch (type) {
    case 'major':
      return `${parsed.major + 1}.0.0`
    case 'minor':
      return `${parsed.major}.${parsed.minor + 1}.0`
    case 'patch':
      return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`
    case 'premajor':
      return `${parsed.major + 1}.0.0-${preid}.0`
    case 'preminor':
      return `${parsed.major}.${parsed.minor + 1}.0-${preid}.0`
    case 'prepatch':
      return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}-${preid}.0`
    case 'prerelease':
      if (parsed.prerelease) {
        const match = parsed.prerelease.match(/^(.+)\.(\d+)$/)
        if (match) {
          return `${parsed.major}.${parsed.minor}.${parsed.patch}-${match[1]}.${Number.parseInt(match[2], 10) + 1}`
        }
      }
      return `${parsed.major}.${parsed.minor}.${parsed.patch}-${preid}.0`
    default:
      throw new Error(`Unknown release type: ${type}`)
  }
}

// ============== Package Discovery ==============
const getPackages = (): { name: string; dir: string; pkg: PackageJson }[] => {
  const packages: { name: string; dir: string; pkg: PackageJson }[] = []

  const dirs = readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)

  for (const dir of dirs) {
    const pkgDir = join(PACKAGES_DIR, dir)
    const pkgJsonPath = join(pkgDir, 'package.json')

    if (existsSync(pkgJsonPath)) {
      const pkg = readPackageJson(pkgDir)
      if (!pkg.private) {
        packages.push({ name: pkg.name, dir: pkgDir, pkg })
      }
    }
  }

  return packages
}

// ============== Pre-flight Checks ==============
const runChecks = async (isDryRun: boolean): Promise<void> => {
  log.show('Running pre-flight checks...', { type: 'step' })

  // Check git status
  const [, statusResult] = await xASync('git', ['status', '--porcelain'], {
    nodeOptions: { cwd: ROOT_DIR },
    quiet: true,
  })
  const gitStatus = statusResult?.stdout.trim() ?? ''
  if (gitStatus && !isDryRun) {
    log.error('Working directory is not clean. Please commit or stash changes first.')
    log.show(gitStatus, { colors: colors.gray })
    const proceed = await createConfirm({ message: 'Continue anyway?' })
    if (!proceed) process.exit(1)
  } else {
    log.success('Git working directory is clean')
  }

  // Check current branch
  const [, branchResult] = await xASync('git', ['branch', '--show-current'], {
    nodeOptions: { cwd: ROOT_DIR },
    quiet: true,
  })
  const branch = branchResult?.stdout.trim() ?? ''
  if (branch !== 'main' && branch !== 'master' && !isDryRun) {
    log.warn(`Current branch is '${branch}', not main/master`)
    const proceed = await createConfirm({ message: 'Continue on this branch?' })
    if (!proceed) process.exit(1)
  } else {
    log.success(`On branch: ${branch}`)
  }

  // Check npm login
  const [npmErr, npmResult] = await xASync('npm', ['whoami'], { quiet: true })
  if (npmErr) {
    if (!isDryRun) {
      log.error("Not logged in to npm. Run 'npm login' first.")
      process.exit(1)
    }
    log.warn('Not logged in to npm (dry-run mode, continuing)')
  } else {
    log.success(`Logged in to npm as: ${npmResult.stdout.trim()}`)
  }

  // Check remote sync
  await xASync('git', ['fetch', 'origin'], { nodeOptions: { cwd: ROOT_DIR }, quiet: true })
  const [, localResult] = await xASync('git', ['rev-parse', 'HEAD'], { nodeOptions: { cwd: ROOT_DIR }, quiet: true })
  const [, remoteResult] = await xASync('git', ['rev-parse', '@{u}'], { nodeOptions: { cwd: ROOT_DIR }, quiet: true })
  const localHead = localResult?.stdout.trim()
  const remoteHead = remoteResult?.stdout.trim()
  if (localHead && remoteHead && localHead !== remoteHead && !isDryRun) {
    log.warn('Local branch is not synced with remote')
    const proceed = await createConfirm({ message: 'Continue anyway?' })
    if (!proceed) process.exit(1)
  } else if (localHead && remoteHead) {
    log.success('Local branch is synced with remote')
  } else {
    log.warn('Could not check remote sync status')
  }
}

// ============== Build ==============
const runBuild = async (): Promise<void> => {
  log.show('Building all packages...', { type: 'step' })
  const [err] = await xASync('pnpm', ['build'], { nodeOptions: { cwd: ROOT_DIR } })
  if (err) {
    log.error('Build failed')
    process.exit(1)
  }
  log.success('Build completed successfully')
}

// ============== Version Bump ==============
const updatePackageVersions = (packages: ReturnType<typeof getPackages>, newVersion: string): void => {
  log.show(`Updating versions to ${newVersion}...`, { type: 'step' })

  // Update root package.json
  const rootPkg = readPackageJson(ROOT_DIR)
  rootPkg.version = newVersion
  writePackageJson(ROOT_DIR, rootPkg)
  log.success('Updated root package.json')

  // Update all packages
  for (const { name, dir, pkg } of packages) {
    pkg.version = newVersion

    // Update workspace dependencies to use the new version
    if (pkg.dependencies) {
      for (const [dep, version] of Object.entries(pkg.dependencies)) {
        if (version.startsWith('workspace:') && packages.some((p) => p.name === dep)) {
          // Keep workspace protocol for development
          pkg.dependencies[dep] = 'workspace:*'
        }
      }
    }

    writePackageJson(dir, pkg)
    log.success(`Updated ${name}`)
  }
}

// ============== Changelog ==============
const generateChangelog = async (newVersion: string): Promise<string> => {
  const date = new Date().toISOString().split('T')[0]
  let changelog = `## [${newVersion}] - ${date}\n\n`

  try {
    // Get commits since last tag
    const [, tagResult] = await xASync('git', ['describe', '--tags', '--abbrev=0'], {
      nodeOptions: { cwd: ROOT_DIR },
      quiet: true,
    })
    const lastTag = tagResult?.stdout.trim() ?? ''
    const range = lastTag ? `${lastTag}..HEAD` : 'HEAD'
    const [, logResult] = await xASync('git', ['log', range, '--pretty=format:%s', '--no-merges'], {
      nodeOptions: { cwd: ROOT_DIR },
      quiet: true,
    })
    const commits = logResult?.stdout.trim() ?? ''

    if (commits) {
      const lines = commits.split('\n').filter(Boolean)

      const features = lines.filter((l) => l.startsWith('feat'))
      const fixes = lines.filter((l) => l.startsWith('fix'))
      const others = lines.filter((l) => !l.startsWith('feat') && !l.startsWith('fix'))

      if (features.length) {
        changelog += '### Features\n'
        for (const f of features) {
          changelog += `- ${f}\n`
        }
        changelog += '\n'
      }

      if (fixes.length) {
        changelog += '### Bug Fixes\n'
        for (const f of fixes) {
          changelog += `- ${f}\n`
        }
        changelog += '\n'
      }

      if (others.length) {
        changelog += '### Other Changes\n'
        for (const o of others) {
          changelog += `- ${o}\n`
        }
        changelog += '\n'
      }
    }
  } catch {
    changelog += '- Version bump\n\n'
  }

  return changelog
}

const changelogPattern = /# Changelog\n\n(?:All notable changes[^\n]*\n\n)?/
const updateChangelog = async (newVersion: string): Promise<void> => {
  log.show('Updating CHANGELOG.md...', { type: 'step' })

  const changelogPath = join(ROOT_DIR, 'CHANGELOG.md')
  const newChanges = await generateChangelog(newVersion)

  let existingChangelog = ''
  if (existsSync(changelogPath)) {
    existingChangelog = readFileSync(changelogPath, 'utf-8')
  }

  // Insert new changes after the header
  const header = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n'

  if (existingChangelog.includes('# Changelog')) {
    const content = existingChangelog.replace(changelogPattern, header + newChanges)
    writeFileSync(changelogPath, content)
  } else {
    writeFileSync(changelogPath, header + newChanges + existingChangelog)
  }

  log.success('Updated CHANGELOG.md')
}

// ============== Git Operations ==============
const createGitCommitAndTag = async (version: string, isDryRun: boolean): Promise<void> => {
  log.show('Creating git commit and tag...', { type: 'step' })

  if (isDryRun) {
    log.info(`[DRY RUN] Would commit with message: "chore(release): v${version}"`)
    log.info(`[DRY RUN] Would create tag: v${version}`)
    return
  }

  await xASync('git', ['add', '-A'], { nodeOptions: { cwd: ROOT_DIR }, quiet: true })
  await xASync('git', ['commit', '-m', `chore(release): v${version}`], { nodeOptions: { cwd: ROOT_DIR }, quiet: true })
  await xASync('git', ['tag', '-a', `v${version}`, '-m', `Release v${version}`], {
    nodeOptions: { cwd: ROOT_DIR },
    quiet: true,
  })

  log.success(`Created commit and tag v${version}`)
}

const pushToRemote = async (isDryRun: boolean): Promise<void> => {
  log.show('Pushing to remote...', { type: 'step' })

  if (isDryRun) {
    log.info('[DRY RUN] Would push commits and tags to remote')
    return
  }

  await xASync('git', ['push'], { nodeOptions: { cwd: ROOT_DIR }, quiet: true })
  await xASync('git', ['push', '--tags'], { nodeOptions: { cwd: ROOT_DIR }, quiet: true })

  log.success('Pushed to remote')
}

// ============== Publish ==============
const publishPackages = async (
  packages: ReturnType<typeof getPackages>,
  newVersion: string,
  isDryRun: boolean
): Promise<void> => {
  log.show('Publishing packages to npm...', { type: 'step' })

  // Determine publish order based on dependencies
  const publishOrder = getPublishOrder(packages)
  const isPrerelease = newVersion.includes('-')
  const tag = isPrerelease ? 'beta' : 'latest'

  for (const { name, dir } of publishOrder) {
    log.info(`Publishing ${name}...`)

    if (isDryRun) {
      log.info(`[DRY RUN] Would publish ${name} with tag: ${tag}`)
      continue
    }

    const [pubErr] = await xASync('npm', ['publish', '--access', 'public', '--tag', tag], { nodeOptions: { cwd: dir } })
    if (pubErr) {
      log.error(`Failed to publish ${name}`)
      const proceed = await createConfirm({ message: 'Continue with remaining packages?' })
      if (!proceed) process.exit(1)
    } else {
      log.success(`Published ${name}`)
    }
  }
}

const getPublishOrder = (packages: ReturnType<typeof getPackages>): ReturnType<typeof getPackages> => {
  // Simple topological sort based on dependencies
  const sorted: ReturnType<typeof getPackages> = []
  const visited = new Set<string>()
  const packageMap = new Map(packages.map((p) => [p.name, p]))

  const visit = (pkg: (typeof packages)[0]) => {
    if (visited.has(pkg.name)) return
    visited.add(pkg.name)

    // Visit dependencies first
    const deps = Object.keys(pkg.pkg.dependencies ?? {})
    for (const dep of deps) {
      const depPkg = packageMap.get(dep)
      if (depPkg) visit(depPkg)
    }

    sorted.push(pkg)
  }

  for (const pkg of packages) {
    visit(pkg)
  }

  return sorted
}

// ============== Main ==============
const main = async (): Promise<void> => {
  console.log(`\n${colors.cyan('🚀 nemo-cli Release Script')}\n`)

  const args = process.argv.slice(2)
  const isDryRun = args.includes('--dry-run')
  const releaseTypeArg = args.find((arg) => RELEASE_TYPES.includes(arg as ReleaseType)) as ReleaseType | undefined

  if (isDryRun) {
    log.warn('Running in dry-run mode - no changes will be made\n')
  }

  // Get packages
  const packages = getPackages()
  log.info(`Found ${packages.length} publishable packages:`)
  for (const p of packages) {
    console.log(`  ${colors.gray('-')} ${p.name} (v${p.pkg.version})`)
  }

  // Get current version
  const currentVersion = packages[0]?.pkg.version ?? '0.0.0'
  log.info(`Current version: ${currentVersion}`)

  // Determine release type
  let releaseType: ReleaseType
  if (releaseTypeArg) {
    releaseType = releaseTypeArg
  } else {
    releaseType = await createSelect<ReleaseType>({
      message: 'Select release type:',
      options: RELEASE_TYPES.map((type) => ({ label: type, value: type })),
    })
  }

  // Calculate new version
  const newVersion = bumpVersion(currentVersion, releaseType)
  log.info(`New version will be: ${newVersion}`)

  // Confirm
  if (!isDryRun) {
    const proceed = await createConfirm({ message: `Proceed with release v${newVersion}?` })
    if (!proceed) {
      log.info('Release cancelled')
      process.exit(0)
    }
  }

  // Run checks
  await runChecks(isDryRun)

  // Build
  await runBuild()

  // Update versions
  if (!isDryRun) {
    updatePackageVersions(packages, newVersion)
  } else {
    log.info(`[DRY RUN] Would update all packages to version ${newVersion}`)
  }

  // Update changelog
  if (!isDryRun) {
    await updateChangelog(newVersion)
  } else {
    log.info('[DRY RUN] Would update CHANGELOG.md')
  }

  // Git commit and tag
  await createGitCommitAndTag(newVersion, isDryRun)

  // Push to remote
  await pushToRemote(isDryRun)

  // Publish to npm
  await publishPackages(packages, newVersion, isDryRun)

  // Done!
  console.log(`\n${colors.green(`✨ Release v${newVersion} completed successfully!`)}\n`)

  if (!isDryRun) {
    log.info('Next steps:')
    console.log('  1. Create a GitHub release at https://github.com/GaoZimeng0425/nemo-cli/releases')
    console.log('  2. Announce the release')
  }
}

main().catch((error) => {
  log.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
