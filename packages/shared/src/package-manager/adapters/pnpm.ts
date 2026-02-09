import type { PackageManagerAdapter } from '../adapter'
import type { AddOptions, PackageManager, RemoveOptions, UpgradeOptions } from '../types'

/**
 * pnpm adapter - translates operations to pnpm-specific commands
 */
export class PnpmAdapter implements PackageManagerAdapter {
  readonly name: PackageManager = 'pnpm'
  readonly supportsWorkspaces = true
  readonly command = 'pnpm'

  buildAddCommand(packages: string[], options: AddOptions): string[] {
    const args: string[] = ['add']

    // Add packages
    args.push(...packages)

    // Add flags
    if (options.saveDev) {
      args.push('--save-dev')
    }

    if (options.exact) {
      args.push('--save-exact')
    }

    if (options.savePeer) {
      args.push('--save-peer')
    }

    if (options.saveOptional) {
      args.push('--save-optional')
    }

    // Workspace support
    if (options.root) {
      args.push('-w')
    } else if (options.workspaces && options.workspaces.length > 0) {
      options.workspaces.forEach((ws) => {
        args.push('--filter', ws)
      })
    }

    return args
  }

  buildRemoveCommand(packages: string[], options: RemoveOptions): string[] {
    const args: string[] = ['remove', ...packages]

    // Workspace support
    if (options.root) {
      args.push('-w')
    } else if (options.workspaces && options.workspaces.length > 0) {
      options.workspaces.forEach((ws) => {
        args.push('--filter', ws)
      })
    }

    return args
  }

  buildUpgradeCommand(packages: string[], options: UpgradeOptions): string[] {
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
      name: match[1] ?? packageSpec,
      version: match[2],
    }
  }
}
