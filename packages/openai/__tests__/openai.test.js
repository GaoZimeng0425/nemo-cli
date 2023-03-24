import openai from '../src/openai.js';
import { strict as assert } from 'assert';

assert.strictEqual(openai(), 'Hello from openai');
console.info('openai tests passed');
