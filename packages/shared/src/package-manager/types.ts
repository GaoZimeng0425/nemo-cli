/**
 * Supported package managers
 */
export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun' | 'deno'

/**
 * Package manager detection method
 */
export type DetectionMethod = 'lock-file' | 'package-json' | 'user-selection'

/**
 * Detection result with metadata
 */
export interface DetectionResult {
  /** Detected package manager */
  packageManager: PackageManager
  /** How the package manager was detected */
  method: DetectionMethod
  /** Timestamp of detection */
  detectedAt: string
  /** Whether the package manager is installed and available */
  isAvailable: boolean
}

/**
 * Options for adding dependencies
 */
export interface AddOptions {
  /** Save to devDependencies */
  saveDev?: boolean
  /** Save to peerDependencies */
  savePeer?: boolean
  /** Save to optionalDependencies */
  saveOptional?: boolean
  /** Use exact version */
  exact?: boolean
  /** Workspace filter (for monorepos) */
  workspaces?: string[]
  /** Whether to install to root workspace */
  root?: boolean
}

/**
 * Options for removing dependencies
 */
export interface RemoveOptions {
  /** Workspace filter (for monorepos) */
  workspaces?: string[]
  /** Whether to remove from root workspace */
  root?: boolean
}

/**
 * Options for upgrading dependencies
 */
export interface UpgradeOptions {
  /** Workspace filter (for monorepos) */
  workspaces?: string[]
  /** Target version (e.g., 'latest', 'beta', 'next') */
  target?: string
}

/**
 * Cache configuration for detection results
 */
export interface DetectionCache {
  /** Cached detection result */
  result: DetectionResult
  /** Cache expiry timestamp */
  expiresAt: string
}

/**
 * Lock file patterns for detection
 */
export const LOCK_FILE_PATTERNS: Record<PackageManager, string[]> = {
  npm: ['package-lock.json'],
  pnpm: ['pnpm-lock.yaml'],
  yarn: ['yarn.lock'],
  bun: ['bun.lockb', 'bun.lock'],
  deno: ['deno.json', 'deno.jsonc'],
}

/**
 * Package manager display names
 */
export const PACKAGE_MANAGER_NAMES: Record<PackageManager, string> = {
  npm: 'npm',
  pnpm: 'pnpm',
  yarn: 'yarn',
  bun: 'Bun',
  deno: 'Deno',
}
