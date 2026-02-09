import { describe, expect, it, vi } from 'vitest'

import { getAdapter } from '../adapters'
import { PackageManagerDetector } from '../detector'
import type { AddOptions, RemoveOptions, UpgradeOptions } from '../types'

describe('PackageManagerAdapter', () => {
  describe('NpmAdapter', () => {
    const adapter = getAdapter('npm')

    it('should have correct metadata', () => {
      expect(adapter.name).toBe('npm')
      expect(adapter.command).toBe('npm')
      expect(adapter.supportsWorkspaces).toBe(true)
    })

    it('should build add command correctly', () => {
      const result = adapter.buildAddCommand(['react'], { saveDev: true, exact: true })
      expect(result).toContain('install')
      expect(result).toContain('react')
      expect(result).toContain('--save-dev')
      expect(result).toContain('--save-exact')
    })

    it('should build add command with workspace filter', () => {
      const result = adapter.buildAddCommand(['react'], {
        workspaces: ['@nemo-cli/package'],
      })
      expect(result).toContain('--workspace')
      expect(result).toContain('@nemo-cli/package')
    })

    it('should build remove command correctly', () => {
      const result = adapter.buildRemoveCommand(['react'], {})
      expect(result).toContain('uninstall')
      expect(result).toContain('react')
    })

    it('should build upgrade command correctly', () => {
      const result = adapter.buildUpgradeCommand(['react'], {})
      expect(result).toContain('install')
      expect(result).toContain('react@latest')
    })

    it('should parse package spec correctly', () => {
      const result = adapter.parsePackageSpec('react@18.0.0')
      expect(result.name).toBe('react')
      expect(result.version).toBe('18.0.0')
    })
  })

  describe('PnpmAdapter', () => {
    const adapter = getAdapter('pnpm')

    it('should have correct metadata', () => {
      expect(adapter.name).toBe('pnpm')
      expect(adapter.command).toBe('pnpm')
      expect(adapter.supportsWorkspaces).toBe(true)
    })

    it('should build add command correctly', () => {
      const result = adapter.buildAddCommand(['react'], { saveDev: true, exact: true })
      expect(result).toContain('add')
      expect(result).toContain('react')
      expect(result).toContain('--save-dev')
      expect(result).toContain('--save-exact')
    })

    it('should build add command with workspace filter', () => {
      const result = adapter.buildAddCommand(['react'], {
        workspaces: ['@nemo-cli/package'],
      })
      expect(result).toContain('--filter')
      expect(result).toContain('@nemo-cli/package')
    })

    it('should build add command for root workspace', () => {
      const result = adapter.buildAddCommand(['react'], { root: true })
      expect(result).toContain('-w')
    })

    it('should build remove command correctly', () => {
      const result = adapter.buildRemoveCommand(['react'], {})
      expect(result).toContain('remove')
      expect(result).toContain('react')
    })

    it('should build upgrade command correctly', () => {
      const result = adapter.buildUpgradeCommand(['react'], {})
      expect(result).toContain('add')
      expect(result).toContain('react@latest')
    })
  })

  describe('YarnAdapter', () => {
    const adapter = getAdapter('yarn')

    it('should have correct metadata', () => {
      expect(adapter.name).toBe('yarn')
      expect(adapter.command).toBe('yarn')
      expect(adapter.supportsWorkspaces).toBe(true)
    })

    it('should build add command correctly', () => {
      const result = adapter.buildAddCommand(['react'], { saveDev: true, exact: true })
      expect(result).toContain('add')
      expect(result).toContain('react')
      expect(result).toContain('--dev')
      expect(result).toContain('--exact')
    })

    it('should build remove command correctly', () => {
      const result = adapter.buildRemoveCommand(['react'], {})
      expect(result).toContain('remove')
      expect(result).toContain('react')
    })
  })

  describe('BunAdapter', () => {
    const adapter = getAdapter('bun')

    it('should have correct metadata', () => {
      expect(adapter.name).toBe('bun')
      expect(adapter.command).toBe('bun')
      expect(adapter.supportsWorkspaces).toBe(true)
    })

    it('should build add command correctly', () => {
      const result = adapter.buildAddCommand(['react'], { saveDev: true, exact: true })
      expect(result).toContain('add')
      expect(result).toContain('react')
      expect(result).toContain('--development')
      expect(result).toContain('--exact')
    })

    it('should build remove command correctly', () => {
      const result = adapter.buildRemoveCommand(['react'], {})
      expect(result).toContain('remove')
      expect(result).toContain('react')
    })
  })

  describe('DenoAdapter', () => {
    const adapter = getAdapter('deno')

    it('should have correct metadata', () => {
      expect(adapter.name).toBe('deno')
      expect(adapter.command).toBe('deno')
      expect(adapter.supportsWorkspaces).toBe(false)
    })

    it('should build add command correctly', () => {
      const result = adapter.buildAddCommand(['react'], { saveDev: true })
      expect(result).toContain('add')
      expect(result).toContain('react')
      expect(result).toContain('--dev')
    })

    it('should build remove command correctly', () => {
      const result = adapter.buildRemoveCommand(['react'], {})
      expect(result).toContain('remove')
      expect(result).toContain('react')
    })
  })
})
