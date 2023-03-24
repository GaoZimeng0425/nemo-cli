import * as openai from '../src/index.js'
import { strict as assert } from 'assert'

assert.strictEqual(openai.run(), 'Hello from openai')
console.info('openai tests passed')
