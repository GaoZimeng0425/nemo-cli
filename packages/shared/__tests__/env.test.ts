import { describe, expect, it } from 'vitest'
import { isDebug } from '../src/utils/env.js'

describe('shared utils test: env', () => {
  it('isDebug', () => {
    expect(isDebug()).toEqual(false)
    expect(isDebug()).toBeFalsy()
  })
})
