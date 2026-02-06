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

import {
  colors,
  createCheckbox,
  createConfirm,
  createInput,
  createSelect,
  createSpinner,
  log,
  readJSON,
  safeAwait,
  writeJSON,
  xASync,
} from '@nemo-cli/shared'

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
    log.show('Working directory is not clean. Please commit or stash changes first.', { type: 'warn' })
    log.show(gitStatus, { type: 'warn' })
    const proceed = await createConfirm({ message: 'Continue anyway?' })
    if (!proceed) process.exit(1)
  } else {
    log.show('Git working directory is clean', { type: 'success' })
  }

  // Check current branch
  const [, branchResult] = await xASync('git', ['branch', '--show-current'], {
    nodeOptions: { cwd: ROOT_DIR },
    quiet: true,
  })
  const branch = branchResult?.stdout.trim() ?? ''
  if (branch !== 'main' && branch !== 'master' && !isDryRun) {
    const proceed = await createConfirm({
      message: `Current branch is '${branch}', not main/master. Continue on this branch?`,
    })
    if (!proceed) process.exit(1)
  } else {
    log.show(`On branch: ${branch}`, { type: 'success' })
  }
  const spinner = createSpinner('npm whoami')

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
  spinner.message('git fetch origin')

  // Check remote sync
  await xASync('git', ['fetch', 'origin'], { nodeOptions: { cwd: ROOT_DIR }, quiet: true })
  const [, localResult] = await xASync('git', ['rev-parse', 'HEAD'], { nodeOptions: { cwd: ROOT_DIR }, quiet: true })
  const [, remoteResult] = await xASync('git', ['rev-parse', '@{u}'], { nodeOptions: { cwd: ROOT_DIR }, quiet: true })
  const localHead = localResult?.stdout.trim()
  const remoteHead = remoteResult?.stdout.trim()
  if (localHead && remoteHead && localHead !== remoteHead && !isDryRun) {
    const proceed = await createConfirm({ message: 'Local branch is not synced with remote, Continue anyway?' })
    if (!proceed) process.exit(1)
  } else if (localHead && remoteHead) {
    log.success('Local branch is synced with remote')
  } else {
    log.warn('Could not check remote sync status')
  }
  spinner.stop()
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

// biome-ignore lint/complexity/useRegexLiterals: ignore, qoder is always make error in literal regex
const changelogPattern = new RegExp('# Changelog\n\n(?:All notable changes[^\n]*\n\n)?')
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

  log.show('Updated CHANGELOG.md', { type: 'success' })
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

  log.show(`Created commit and tag v${version}`, { type: 'success' })
}

const pushToRemote = async (isDryRun: boolean): Promise<void> => {
  log.show('Pushing to remote...', { type: 'step' })

  if (isDryRun) {
    log.info('[DRY RUN] Would push commits and tags to remote')
    return
  }

  await xASync('git', ['push'], { nodeOptions: { cwd: ROOT_DIR }, quiet: true })
  await xASync('git', ['push', '--tags'], { nodeOptions: { cwd: ROOT_DIR }, quiet: true })

  log.show('Pushed to remote', { type: 'success' })
}

// ============== Publish ==============
const publishPackages = async (packages: ReturnType<typeof getPackages>, isDryRun: boolean): Promise<void> => {
  log.show('Publishing packages to npm...', { type: 'step' })

  const publishOrder = getPublishOrder(packages)

  // Check if any package is a prerelease
  const hasPrerelease = packages.some((p) => p.pkg.version.includes('-'))
  const tag = hasPrerelease ? 'beta' : 'latest'

  // 询问 OTP（如果账户启用了 2FA）
  let otp: string | undefined
  if (!isDryRun) {
    const needOtp = await createConfirm({ message: 'Does your npm account require OTP (2FA enabled)?' })
    if (needOtp) {
      otp = await createInput({ message: 'Enter OTP code:' })
    }
  }

  const spinner = createSpinner('Publishing packages to npm...')
  for await (const { name, dir, pkg } of publishOrder) {
    spinner.message(`Publishing ${name} @ v${pkg.version}...`)

    if (isDryRun) {
      log.info(`[DRY RUN] Would publish ${name} @ v${pkg.version} with tag: ${tag}`)
      continue
    }

    const args = ['publish', '--access', 'public', '--tag', tag]
    if (otp) args.push('--otp', otp)

    const [pubErr] = await xASync('pnpm', args, { nodeOptions: { cwd: dir } })
    if (pubErr) {
      log.error(`Failed to publish ${name}`)
      const proceed = await createConfirm({ message: 'Continue with remaining packages?' })
      if (!proceed) process.exit(1)
    } else {
      log.show(`Published ${name} @ v${pkg.version}`, { type: 'success' })
    }
  }
  spinner.stop()
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

/**
 * Collect packages with their dependencies
 * When a package is selected, all its workspace dependencies are automatically included
 */
const collectPackagesWithDependencies = (
  allPackages: ReturnType<typeof getPackages>,
  selectedNames: string[]
): ReturnType<typeof getPackages> => {
  const packageMap = new Map(allPackages.map((p) => [p.name, p]))
  const toInclude = new Set<string>()
  const visiting = new Set<string>() // Track current path to detect cycles

  const addDependencies = (packageName: string) => {
    const pkg = packageMap.get(packageName)
    if (!pkg) return

    // Cycle detection - if already visiting this package in current path, skip
    if (visiting.has(packageName)) {
      log.warn(`检测到循环依赖: ${packageName}`)
      return
    }

    // Already processed
    if (toInclude.has(packageName)) return

    // Add to visiting set
    visiting.add(packageName)

    // Add this package
    toInclude.add(packageName)

    // Recursively add workspace dependencies
    const deps = Object.keys(pkg.pkg.dependencies ?? {})
    for (const dep of deps) {
      if (packageMap.has(dep) && !toInclude.has(dep)) {
        addDependencies(dep)
      }
    }

    // Remove from visiting set (backtrack)
    visiting.delete(packageName)
  }

  // Start with selected packages
  for (const name of selectedNames) {
    addDependencies(name)
  }

  // Return the filtered packages
  return allPackages.filter((p) => toInclude.has(p.name))
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

  // Select packages to release
  const [selectError, selectedPackageNames] = await safeAwait(
    createCheckbox({
      message: 'Select packages to release (space to select, enter to confirm):',
      options: packages.map((pkg) => ({
        label: `${pkg.name} (v${pkg.pkg.version})`,
        value: pkg.name,
        checked: true, // Default all selected for backward compatibility
      })),
    })
  )

  if (selectError) {
    log.error(`Package selection error: ${selectError.message}`)
    log.info('Try specifying packages via command line args or check environment config')
    process.exit(1)
  }

  if (!selectedPackageNames || selectedPackageNames.length === 0) {
    log.warn('No packages selected')
    log.info('Please re-run and select packages to release')
    process.exit(0)
  }

  // Collect packages with their dependencies
  const packagesToRelease = collectPackagesWithDependencies(packages, selectedPackageNames)

  // Show which packages will be released
  const autoIncluded = packagesToRelease.filter((p) => !selectedPackageNames.includes(p.name))
  log.info(
    `Selected ${selectedPackageNames.length} package${selectedPackageNames.length > 1 ? 's' : ''}, ` +
      `including ${autoIncluded.length} dependenc${autoIncluded.length === 1 ? 'y' : 'ies'}: ` +
      `total ${packagesToRelease.length} package${packagesToRelease.length > 1 ? 's' : ''}`
  )
  for (const pkg of packagesToRelease) {
    const isSelected = selectedPackageNames.includes(pkg.name)
    const label = isSelected ? colors.green('✓') : colors.gray('⊕')
    const suffix = isSelected ? '' : colors.gray(' (auto-included dependency)')
    console.log(`  ${label} ${pkg.name}${suffix}`)
  }

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

  // Calculate new versions for all packages
  const versionChanges = packagesToRelease.map((pkg) => ({
    name: pkg.name,
    current: pkg.pkg.version,
    next: bumpVersion(pkg.pkg.version, releaseType),
  }))

  // Display version changes
  console.log(`\n${colors.cyan('Version changes:')}`)
  for (const { name, current, next } of versionChanges) {
    const arrow = current === next ? colors.gray('→') : colors.green('→')
    console.log(`  ${name}: ${colors.cyan(current)} ${arrow} ${colors.cyan(next)}`)
  }
  console.log('')

  // Confirm
  if (!isDryRun) {
    const proceed = await createConfirm({
      message: `Release ${packagesToRelease.length} package${packagesToRelease.length > 1 ? 's' : ''} with ${releaseType} bump?`,
    })
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
    for (const { name, current, next } of versionChanges) {
      const pkg = packagesToRelease.find((p) => p.name === name)
      if (pkg) {
        pkg.pkg.version = next

        // Update workspace dependencies
        if (pkg.pkg.dependencies) {
          for (const [dep, version] of Object.entries(pkg.pkg.dependencies)) {
            const depChange = versionChanges.find((vc) => vc.name === dep)
            if (version.startsWith('workspace:') && depChange) {
              pkg.pkg.dependencies[dep] = 'workspace:*'
            }
          }
        }

        writePackageJson(pkg.dir, pkg.pkg)
        log.show(`Updated ${name} to v${next}`, { type: 'success' })
      }
    }

    // Update root package.json only if releasing all packages
    if (packagesToRelease.length === packages.length) {
      const rootPkg = readPackageJson(ROOT_DIR)
      // Use the first package's version as root version
      rootPkg.version = versionChanges[0].next
      writePackageJson(ROOT_DIR, rootPkg)
      log.show('Updated root package.json', { type: 'success' })
    }

    // Update dependencies in non-selected packages
    const releasingNames = new Set(versionChanges.map((vc) => vc.name))
    const nonSelectedPackages = packages.filter((p) => !releasingNames.has(p.name))
    for (const { name, dir, pkg } of nonSelectedPackages) {
      let updated = false
      if (pkg.dependencies) {
        for (const [dep, version] of Object.entries(pkg.dependencies)) {
          // If this package depends on a package being released, update the version constraint
          if (releasingNames.has(dep) && version.startsWith('workspace:')) {
            pkg.dependencies[dep] = 'workspace:*'
            updated = true
          }
        }
      }

      if (updated) {
        writePackageJson(dir, pkg)
        log.show(`Updated dependencies in ${name}`, { type: 'info' })
      }
    }
  } else {
    log.info(`[DRY RUN] Would update ${packagesToRelease.length} packages`)
  }

  // Update changelog
  if (!isDryRun) {
    // Use the first package's version for changelog
    const primaryVersion = versionChanges[0].next
    await updateChangelog(primaryVersion)
  } else {
    log.info('[DRY RUN] Would update CHANGELOG.md')
  }

  // Git commit and tag
  if (!isDryRun) {
    // Use the first package's version for tag, or create multiple tags
    const primaryVersion = versionChanges[0].next
    await createGitCommitAndTag(primaryVersion, isDryRun)

    // Create additional tags for packages with different versions
    const uniqueVersions = [...new Set(versionChanges.map((vc) => vc.next))]
    if (uniqueVersions.length > 1) {
      log.info('Creating additional tags for different versions...')
      for (const version of uniqueVersions) {
        if (version !== primaryVersion) {
          await xASync('git', ['tag', '-a', `v${version}`, '-m', `Release v${version}`], {
            nodeOptions: { cwd: ROOT_DIR },
            quiet: true,
          })
          log.show(`Created tag v${version}`, { type: 'success' })
        }
      }
    }
  } else {
    log.info('[DRY RUN] Would create git tags')
  }

  // Push to remote
  await pushToRemote(isDryRun)

  // Publish to npm
  await publishPackages(packagesToRelease, isDryRun)

  // Done!
  const primaryVersion = versionChanges[0].next
  const releasedVersions = [...new Set(versionChanges.map((vc) => vc.next))]
  const versionSummary =
    releasedVersions.length === 1
      ? `v${primaryVersion}`
      : `${releasedVersions.length} versions (${releasedVersions.map((v) => `v${v}`).join(', ')})`

  console.log(`\n${colors.green(`✨ Release ${versionSummary} completed successfully!`)}\n`)

  if (!isDryRun) {
    log.info('Released packages:')
    for (const { name, next } of versionChanges) {
      console.log(`  ${colors.green('✓')} ${name} @ v${next}`)
    }

    log.info('\nNext steps:')
    console.log('  1. Create a GitHub release at https://github.com/GaoZimeng0425/nemo-cli/releases')
    console.log('  2. Announce the release')
  }
}

main().catch((error) => {
  log.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
