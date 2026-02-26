/**
 * Visualize command - Launch dependency visualization web app
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createCommand, exit } from '@nemo-cli/shared'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface VisualizeOptions {
  port?: string
  open?: boolean
}

export function visualizeCommand() {
  return createCommand('visualize')
    .description('Launch dependency visualization web app')
    .option('-p, --port <number>', 'Port number', '3000')
    .option('--open', 'Open browser automatically')
    .action(async (options: VisualizeOptions) => {
      try {
        // Check if visualizer package exists
        const visualizerPath = resolve(__dirname, '../../visualizer')
        if (!existsSync(visualizerPath)) {
          console.error('❌ Error: Visualizer package not found')
          console.error('Please ensure the visualizer package is properly installed')
          console.error('Run: cd packages/visualizer && pnpm install')
          exit(1)
        }

        // Check if package.json exists
        const packageJsonPath = resolve(visualizerPath, 'package.json')
        if (!existsSync(packageJsonPath)) {
          console.error('❌ Error: Visualizer package.json not found')
          exit(1)
        }

        // Check for ai-docs directory in current working directory
        // Note: process.cwd() is where user runs 'nd visualize' from
        const cwd = process.cwd()
        console.log(`[Debug] Current working directory: ${cwd}`)

        const aiDocsPath = resolve(cwd, 'ai-docs')
        console.log(`[Debug] Checking for ai-docs at: ${aiDocsPath}`)
        console.log(`[Debug] Exists: ${existsSync(aiDocsPath)}`)

        if (existsSync(aiDocsPath)) {
          console.log(`📁 Serving AI docs from: ${aiDocsPath}`)
          console.log('   (includes components/, pages/, and other subdirectories)')
        } else {
          console.log('⚠️  No ai-docs directory found in current directory')
          console.log(`   Looked in: ${cwd}`)
          console.log('   Please ensure you are running this command from the project root directory')
          console.log('   Example: cd /Users/aa00930/Documents/Antalpha/prime-next/apps/risk')
          console.log('            nd visualize')
          console.log('   Run: nd ai to generate AI analysis results')
        }

        // Parse port
        const port = Number.parseInt(options.port || '3000', 10)
        if (Number.isNaN(port)) {
          console.error('❌ Error: Invalid port number')
          exit(1)
        }

        console.log(`🚀 Starting dependency visualizer on http://localhost:${port}`)
        console.log('')
        console.log('💡 Usage:')
        console.log('   1. Generate dependency data: nd analyze --format ai')
        console.log('   2. Load the generated ai-docs/deps.ai.json file in the browser')
        console.log('')

        // Prepare Vite args
        const viteArgs = ['--port', port.toString()]
        if (options.open) {
          viteArgs.push('--open')
        }

        // Set environment variable for ai-docs path
        const env = {
          ...process.env,
          VITE_AI_DOCS_PATH: existsSync(aiDocsPath) ? aiDocsPath : '',
        }

        console.log(`[Debug] VITE_AI_DOCS_PATH: ${env.VITE_AI_DOCS_PATH || '(empty)'}`)

        // Start Vite dev server
        const viteProcess = spawn('pnpm', ['run', 'dev', '--', ...viteArgs], {
          cwd: visualizerPath,
          stdio: 'inherit',
          shell: true,
          env,
        })

        // Handle process exit
        viteProcess.on('error', (error) => {
          console.error('❌ Failed to start visualizer:', error.message)
          console.error('Please ensure dependencies are installed:')
          console.error('  cd packages/visualizer && pnpm install')
          exit(1)
        })

        viteProcess.on('exit', (code) => {
          if (code !== null && code !== 0) {
            console.error(`\nVisualizer exited with code ${code}`)
            exit(code)
          }
        })

        // Handle shutdown
        const shutdown = () => {
          console.log('\n\n🛑 Shutting down visualizer...')
          viteProcess.kill()
          exit(0)
        }

        process.on('SIGINT', shutdown)
        process.on('SIGTERM', shutdown)
      } catch (error) {
        console.error('❌ Error starting visualizer:', error)
        exit(1)
      }
    })
}
