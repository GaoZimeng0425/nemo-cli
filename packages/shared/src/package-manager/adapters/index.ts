import type { PackageManagerAdapter } from '../adapter.js'
import type { PackageManager } from '../types.js'
import { BunAdapter } from './bun.js'
import { DenoAdapter } from './deno.js'
import { NpmAdapter } from './npm.js'
import { PnpmAdapter } from './pnpm.js'
import { YarnAdapter } from './yarn.js'

/**
 * Adapter registry
 */
const adapters: Record<PackageManager, PackageManagerAdapter> = {
  npm: new NpmAdapter(),
  pnpm: new PnpmAdapter(),
  yarn: new YarnAdapter(),
  bun: new BunAdapter(),
  deno: new DenoAdapter(),
}

/**
 * Get adapter for a specific package manager
 */
export function getAdapter(packageManager: PackageManager): PackageManagerAdapter {
  return adapters[packageManager]
}

/**
 * Get all available adapters
 */
export function getAllAdapters(): Record<PackageManager, PackageManagerAdapter> {
  return { ...adapters }
}

export { BunAdapter, DenoAdapter, NpmAdapter, PnpmAdapter, YarnAdapter }
