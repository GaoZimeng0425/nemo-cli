/**
 * Wrapper for using the parser Web Worker
 */

import type { AiOutput } from '../types'
import type { WorkerInput, WorkerMessage } from './parser.worker'

let workerInstance: Worker | null = null

/**
 * Parse AiOutput using Web Worker
 *
 * @param file - File to parse
 * @param maxSize - Maximum file size
 * @returns Promise with parsed AiOutput
 */
export function parseWithWorker(file: File, maxSize?: number): Promise<AiOutput> {
  return new Promise((resolve, reject) => {
    // Terminate existing worker if any
    if (workerInstance) {
      workerInstance.terminate()
    }

    try {
      // Create new worker
      workerInstance = new Worker(new URL('./parser.worker.ts', import.meta.url), { type: 'module' })
    } catch (error) {
      // Fallback: if Worker fails (e.g., due to CORS or browser restrictions)
      // Parse in main thread instead
      console.warn('Web Worker not available, falling back to main thread:', error)
      import('./parser').then(({ parseAiOutput }) => {
        parseAiOutput(file, maxSize).then(resolve).catch(reject)
      })
      return
    }

    // Set up message handler
    workerInstance.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data

      if (message.status === 'success') {
        resolve(message.data as AiOutput)
      } else if (message.status === 'error') {
        reject(new Error(message.error))
      }

      // Clean up worker
      workerInstance?.terminate()
      workerInstance = null
    }

    workerInstance.onerror = (error) => {
      reject(new Error(`Worker error: ${error.message}`))
      workerInstance?.terminate()
      workerInstance = null
    }

    // Send file to worker
    const input: WorkerInput = { file, maxSize }
    workerInstance.postMessage(input)
  })
}

/**
 * Terminate the worker if running
 */
export function terminateWorker(): void {
  if (workerInstance) {
    workerInstance.terminate()
    workerInstance = null
  }
}
