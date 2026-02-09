import type { PackageManagerAdapter } from '../adapter'
import type { AddOptions, PackageManager, RemoveOptions, UpgradeOptions } from '../types'

/**
 * NPM adapter - translates operations to npm-specific commands
 */
export class NpmAdapter implements PackageManagerAdapter {
  readonly name: PackageManager = 'npm'
  readonly supportsWorkspaces = true
  readonly command = 'npm'

  buildAddCommand(packages: string[], options: AddOptions): string[] {
    const args: string[] = ['install']

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
      if (options.workspaces.length === 1) {
        args.push('--workspace', options.workspaces[0] ?? '')
      } else {
        options.workspaces.forEach((ws) => {
          args.push('--workspace', ws)
        })
      }
    }

    return args
  }

  buildRemoveCommand(packages: string[], options: RemoveOptions): string[] {
    const args: string[] = ['uninstall', ...packages]

    // Workspace support
    if (options.root) {
      args.push('-w')
    } else if (options.workspaces && options.workspaces.length > 0) {
      if (options.workspaces.length === 1) {
        args.push('--workspace', options.workspaces[0] ?? '')
      } else {
        options.workspaces.forEach((ws) => {
          args.push('--workspace', ws)
        })
      }
    }

    return args
  }

  buildUpgradeCommand(packages: string[], options: UpgradeOptions): string[] {
    // npm doesn't have a built-in upgrade command, use install with @latest
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
