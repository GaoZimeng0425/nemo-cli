// vite.config.ts

import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(() => {
  const aiDocsPath = process.env.VITE_AI_DOCS_PATH

  return {
    plugins: [
      react(),
      {
        name: 'elkjs-fix',
        config() {
          return {
            resolve: {
              alias: {
                elkjs: 'elkjs/lib/elk.bundled.js',
              },
            },
          }
        },
      },
      {
        name: 'ai-docs-middleware',
        configureServer(server) {
          if (!aiDocsPath) return

          server.middlewares.use((req, res, next) => {
            if (req.url?.startsWith('/ai-docs')) {
              const relativePath = req.url.replace('/ai-docs', '') || ''
              const fullPath = join(aiDocsPath, relativePath)

              // Enhanced logging
              console.log('\n=== AI Docs Request ===')
              console.log('Request URL:', req.url)
              console.log('Relative path:', relativePath)
              console.log('AI docs root:', aiDocsPath)
              console.log('Full file path:', fullPath)
              console.log('File exists:', existsSync(fullPath))

              if (existsSync(fullPath)) {
                const stats = statSync(fullPath)
                if (stats.isFile()) {
                  const ext = extname(fullPath)
                  const contentType =
                    ext === '.json' ? 'application/json' : ext === '.html' ? 'text/html' : 'text/plain'

                  res.setHeader('Content-Type', contentType)
                  res.setHeader('Access-Control-Allow-Origin', '*')
                  res.end(readFileSync(fullPath))
                  console.log('✓ File served successfully\n')
                  return
                }
                console.log("✗ Not a file, it's a directory\n")
              } else {
                console.log('✗ File not found\n')
              }

              // File not found
              res.statusCode = 404
              res.setHeader('Content-Type', 'application/json')
              res.end(
                JSON.stringify(
                  {
                    error: 'File not found',
                    requestUrl: req.url,
                    fullPath,
                    message: `Could not find file at ${fullPath}`,
                  },
                  null,
                  2
                )
              )
            } else {
              next()
            }
          })
        },
      },
    ],

    server: {
      port: 3000,
      open: false,
      cors: true,
    },

    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'reactflow-vendor': ['reactflow'],
          },
        },
      },
    },

    optimizeDeps: {
      include: ['react', 'react-dom', 'reactflow', 'zustand', 'd3', 'd3-hierarchy', 'd3-shape'],
      exclude: ['elkjs'],
    },

    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    },
  }
})
