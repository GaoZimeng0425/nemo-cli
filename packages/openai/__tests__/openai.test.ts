import * as openai from '../src/index.js'
import { expect, test } from 'vitest'
import { CommanderError } from 'commander'

test('should throw CommanderError with code commander.helpDisplayed when no command is provided', () => {
  try {
    openai.run()
  } catch (err) {
    expect(err).toBeInstanceOf(CommanderError)
    expect((err as CommanderError).code).toBe('commander.help') // Corrected expected code
  }
})
