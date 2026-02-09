import type { AddOptions, PackageManager, RemoveOptions, UpgradeOptions } from './types'

/**
 * Interface for package manager adapters
 *
 * Each package manager implements this interface to translate
 * abstract operations into package-manager-specific commands.
 */
export interface PackageManagerAdapter {
  /** Package manager name */
  readonly name: PackageManager

  /** Whether this package manager supports workspaces */
  readonly supportsWorkspaces: boolean

  /** The command executable (e.g., 'pnpm', 'npm') */
  readonly command: string

  /**
   * Build an install/add command
   * @param packages - Package names to install
   * @param options - Installation options
   * @returns Array of command arguments (e.g., ['add', 'react', '--save-dev'])
   */
  buildAddCommand(packages: string[], options: AddOptions): string[]

  /**
   * Build a remove command
   * @param packages - Package names to remove
   * @param options - Removal options
   * @returns Array of command arguments
   */
  buildRemoveCommand(packages: string[], options: RemoveOptions): string[]

  /**
   * Build an upgrade command
   * @param packages - Package names to upgrade
   * @param options - Upgrade options
   * @returns Array of command arguments
   */
  buildUpgradeCommand(packages: string[], options: UpgradeOptions): string[]

  /**
   * Parse a version string to extract package name and version
   * @param packageSpec - Package specification (e.g., 'react@18.0.0')
   * @returns Object with name and version
   */
  parsePackageSpec(packageSpec: string): { name: string; version?: string }
}
