/**
 * Web Worker for parsing deps.ai.json files
 * Runs in a separate thread to avoid blocking UI
 */

import { parseAiOutput } from './parser'

self.onmessage = async (event: MessageEvent<{ file: File; maxSize?: number }>) => {
  const { file, maxSize } = event.data

  try {
    const result = await parseAiOutput(file, maxSize)

    // Send success response
    self.postMessage({
      status: 'success',
      data: result,
    })
  } catch (error) {
    // Send error response
    self.postMessage({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

// TypeScript type for worker messages
export type WorkerMessage = { status: 'success'; data: unknown } | { status: 'error'; error: string }

export type WorkerInput = {
  file: File
  maxSize?: number
}
