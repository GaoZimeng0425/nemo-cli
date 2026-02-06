import type { PackageManagerAdapter } from '../adapter.js'
import type { AddOptions, PackageManager, RemoveOptions, UpgradeOptions } from '../types.js'

/**
 * Deno adapter - translates operations to deno-specific commands
 *
 * Note: Deno has a different model (URL-based imports) so some operations
 * are limited or not applicable.
 */
export class DenoAdapter implements PackageManagerAdapter {
  readonly name: PackageManager = 'deno'
  readonly supportsWorkspaces = false
  readonly command = 'deno'

  buildAddCommand(packages: string[], options: AddOptions): string[] {
    // Deno doesn't have a traditional package.json dependency system
    // Using deno add (new in Deno 2) for npm packages
    const args: string[] = ['add', ...packages]

    if (options.saveDev) {
      args.push('--dev')
    }

    // Deno doesn't support workspaces in the same way
    return args
  }

  buildRemoveCommand(packages: string[], options: RemoveOptions): string[] {
    // Deno 2 has remove command
    return ['remove', ...packages]
  }

  buildUpgradeCommand(packages: string[], options: UpgradeOptions): string[] {
    // Deno doesn't have built-in upgrade, use add with latest
    return this.buildAddCommand(packages, {})
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
