import { describe, it, expectTypeOf, test, assert, expect } from 'vitest'

describe.concurrent('suite', () => {
  it('concurrent test 1', async ({ expect }) => {})
  it('concurrent test 1', async ({ expect }) => {})
  it('concurrent test 1', async ({ expect }) => {})
  it('concurrent test 1', async ({ expect }) => {})
})
