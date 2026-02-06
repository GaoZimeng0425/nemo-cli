import type { PackageManagerAdapter } from '../adapter.js'
import type { AddOptions, PackageManager, RemoveOptions, UpgradeOptions } from '../types.js'

/**
 * Yarn adapter - translates operations to yarn-specific commands
 */
export class YarnAdapter implements PackageManagerAdapter {
  readonly name: PackageManager = 'yarn'
  readonly supportsWorkspaces = true
  readonly command = 'yarn'

  buildAddCommand(packages: string[], options: AddOptions): string[] {
    const args: string[] = ['add']

    // Add packages
    args.push(...packages)

    // Add flags
    if (options.saveDev) {
      args.push('--dev')
    }

    if (options.exact) {
      args.push('--exact')
    }

    if (options.savePeer) {
      args.push('--peer')
    }

    if (options.saveOptional) {
      args.push('--optional')
    }

    // Workspace support
    if (options.root) {
      args.push('-W')
    } else if (options.workspaces && options.workspaces.length > 0) {
      // For Yarn, we need to use workspace focus
      if (options.workspaces.length === 1) {
        args.unshift('-c', '--', `workspace:${options.workspaces[0]}`)
      }
    }

    return args
  }

  buildRemoveCommand(packages: string[], options: RemoveOptions): string[] {
    const args: string[] = ['remove', ...packages]

    // Workspace support
    if (options.root) {
      args.push('-W')
    } else if (options.workspaces && options.workspaces.length > 0) {
      if (options.workspaces.length === 1) {
        args.unshift('-c', '--', `workspace:${options.workspaces[0]}`)
      }
    }

    return args
  }

  buildUpgradeCommand(packages: string[], options: UpgradeOptions): string[] {
    // Yarn doesn't have a built-in upgrade command in v1
    // Use add with @latest for simplicity
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
