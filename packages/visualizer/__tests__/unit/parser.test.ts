/**
 * Unit tests for JSON parser
 */

import { describe, expect, it } from 'vitest'

import { getFileSizeMB, isValidDepsAiFile, parseAiOutput } from '../../src/lib/parser'
import type { AiOutput } from '../../src/types'

// Mock valid AiOutput data
const createValidAiOutput = (): AiOutput => ({
  meta: {
    generatedAt: new Date().toISOString(),
    appRoot: '/app',
    appDir: '/app/app',
  },
  nodes: {
    'app/page.tsx': {
      id: 'app/page.tsx',
      path: '/app/page.tsx',
      relativePath: 'app/page.tsx',
      scope: 'app',
      moduleSystem: 'es6',
      dynamic: false,
      type: 'page',
      dependencies: ['components/Button.tsx'],
      dependents: [],
    },
  },
  pages: {},
  nodeToPages: {},
  sccs: [],
  nodeToScc: {},
})

describe('parseAiOutput', () => {
  it('should parse valid deps.ai.json', async () => {
    const validData = createValidAiOutput()
    const jsonText = JSON.stringify(validData)
    const file = new File([jsonText], 'deps.ai.json', { type: 'application/json' })

    const result = await parseAiOutput(file)

    expect(result).toEqual(validData)
  })

  it('should handle file not found', async () => {
    // In browser API, this is handled by file input
    // We simulate empty file
    const file = new File([], 'empty.json', { type: 'application/json' })

    await expect(parseAiOutput(file)).rejects.toThrow('文件为空')
  })

  it('should validate invalid JSON', async () => {
    const invalidJson = '{ invalid json }'
    const file = new File([invalidJson], 'invalid.json', { type: 'application/json' })

    await expect(parseAiOutput(file)).rejects.toThrow('JSON 格式错误')
  })

  it('should reject oversized files', async () => {
    const largeContent = 'x'.repeat(51 * 1024 * 1024) // 51MB
    const file = new File([largeContent], 'large.json', { type: 'application/json' })

    await expect(parseAiOutput(file, 50 * 1024 * 1024)).rejects.toThrow('文件过大')
  })

  it('should validate schema structure', async () => {
    const invalidStructure = {
      meta: {
        // Missing required fields
      },
      nodes: {}, // Missing required fields
    }
    const file = new File([JSON.stringify(invalidStructure)], 'invalid.json', { type: 'application/json' })

    await expect(parseAiOutput(file)).rejects.toThrow()
  })

  it('should accept valid file with all fields', async () => {
    const validData: AiOutput = {
      meta: {
        generatedAt: '2025-01-01T00:00:00.000Z',
        appRoot: '/app',
        appDir: '/app/app',
        workspaceRoot: '/workspace',
        nodeKeyStrategy: 'relative',
        toolVersion: '0.1.0',
      },
      nodes: {
        'app/page.tsx': {
          id: 'app/page.tsx',
          path: '/app/page.tsx',
          relativePath: 'app/page.tsx',
          scope: 'app',
          packageName: '@my/app',
          workspacePackage: 'packages/app',
          moduleSystem: 'es6',
          dynamic: false,
          type: 'page',
          dependencies: ['components/Button.tsx'],
          dependents: [],
        },
      },
      pages: {
        '/': {
          route: '/',
          routeType: 'page',
          entryFile: 'app/page.tsx',
          layoutChain: [],
          rootIds: ['app/page.tsx'],
          nodeIds: ['app/page.tsx'],
          orderGroups: [['app/page.tsx']],
        },
      },
      nodeToPages: {
        'app/page.tsx': ['/'],
      },
      sccs: [],
      nodeToScc: {},
    }

    const file = new File([JSON.stringify(validData)], 'deps.ai.json', { type: 'application/json' })
    const result = await parseAiOutput(file)

    expect(result.meta.toolVersion).toBe('0.1.0')
    expect(result.nodes['app/page.tsx'].workspacePackage).toBe('packages/app')
  })
})

describe('isValidDepsAiFile', () => {
  it('should return true for deps.ai.json', () => {
    const file = new File(['{}'], 'deps.ai.json', { type: 'application/json' })
    expect(isValidDepsAiFile(file)).toBe(true)
  })

  it('should return true for .ai.json files', () => {
    const file = new File(['{}'], 'custom.ai.json', { type: 'application/json' })
    expect(isValidDepsAiFile(file)).toBe(true)
  })

  it('should return false for other files', () => {
    const file = new File(['{}'], 'data.json', { type: 'application/json' })
    expect(isValidDepsAiFile(file)).toBe(false)
  })
})

describe('getFileSizeMB', () => {
  it('should calculate file size in MB', () => {
    const content = 'x'.repeat(1024 * 1024) // 1MB
    const file = new File([content], 'test.json', { type: 'application/json' })

    expect(getFileSizeMB(file)).toBeCloseTo(1.0, 2)
  })

  it('should handle small files', () => {
    const content = 'x'.repeat(1024) // 1KB
    const file = new File([content], 'test.json', { type: 'application/json' })

    expect(getFileSizeMB(file)).toBeCloseTo(0.0009765, 6)
  })
})
