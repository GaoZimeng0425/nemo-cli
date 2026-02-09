import type { PackageManagerAdapter } from '../adapter'
import type { PackageManager } from '../types'
import { BunAdapter } from './bun'
import { DenoAdapter } from './deno'
import { NpmAdapter } from './npm'
import { PnpmAdapter } from './pnpm'
import { YarnAdapter } from './yarn'

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

// Note: Adapter classes are exported in the main index.ts to avoid rolldown __exportAll issues
