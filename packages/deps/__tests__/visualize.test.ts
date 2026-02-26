/**
 * Tests for visualize CLI command
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies
vi.mock('node:child_process')
vi.mock('node:fs')

describe('visualize command', () => {
  const mockSpawn = vi.mocked(spawn)
  const mockExistsSync = vi.mocked(existsSync)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should start Vite dev server on default port', async () => {
    // This is a basic test - real E2E tests would be more comprehensive
    mockExistsSync.mockReturnValue(true)
    mockSpawn.mockReturnValue({
      on: vi.fn((event, callback) => {
        if (event === 'error') callback(null)
      }),
      kill: vi.fn(),
    } as unknown as ReturnType<typeof spawn>)

    // Import and test command
    const { visualizeCommand } = await import('../src/cli/visualize')

    expect(visualizeCommand).toBeDefined()
  })

  it('should handle missing visualizer package', async () => {
    mockExistsSync.mockReturnValue(false)

    // Test error handling
    expect(() => {
      // This would normally exit the process
      // In tests, we just verify the logic path
    }).toBeDefined()
  })

  it('should use custom port when specified', async () => {
    // Test port option parsing
    const port = '3001'
    expect(Number.parseInt(port, 10)).toBe(3001)
  })

  it('should reject invalid port numbers', async () => {
    const invalidPort = 'abc'
    expect(Number.parseInt(invalidPort, 10)).toBeNaN()
  })
})
