import type { PackageManagerAdapter } from '../adapter.js'
import type { AddOptions, PackageManager, RemoveOptions, UpgradeOptions } from '../types.js'

/**
 * Bun adapter - translates operations to bun-specific commands
 */
export class BunAdapter implements PackageManagerAdapter {
  readonly name: PackageManager = 'bun'
  readonly supportsWorkspaces = true
  readonly command = 'bun'

  buildAddCommand(packages: string[], options: AddOptions): string[] {
    const args: string[] = ['add']

    // Add packages
    args.push(...packages)

    // Add flags
    if (options.saveDev) {
      args.push('--development')
    }

    if (options.exact) {
      args.push('--exact')
    }

    // Workspace support
    if (options.root) {
      args.push('--workspace')
    } else if (options.workspaces && options.workspaces.length > 0) {
      options.workspaces.forEach((ws) => {
        args.push('--workspace', ws)
      })
    }

    return args
  }

  buildRemoveCommand(packages: string[], options: RemoveOptions): string[] {
    const args: string[] = ['remove', ...packages]

    // Workspace support
    if (options.root) {
      args.push('--workspace')
    } else if (options.workspaces && options.workspaces.length > 0) {
      options.workspaces.forEach((ws) => {
        args.push('--workspace', ws)
      })
    }

    return args
  }

  buildUpgradeCommand(packages: string[], options: UpgradeOptions): string[] {
    // Bun uses add with @latest for upgrades
    const target = options.target || 'latest'
    const packagesWithTarget = packages.map((pkg) => `${pkg}@${target}`)
    return this.buildAddCommand(packagesWithTarget, {})
  }

  parsePackageSpec(packageSpec: string): { name: string; version?: string } {
    const match = packageSpec.match(/^(@?[^@]+)(?:@(.+))?$/)
    if (!match) {
      return { name: packageSpec }
    }
    return {
      name: match[1],
      version: match[2],
    }
  }
}
