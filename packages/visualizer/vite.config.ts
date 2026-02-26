// vite.config.ts

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
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
              const fs = require('fs')
              const path = require('path')

              const relativePath = req.url.replace('/ai-docs', '') || ''
              const fullPath = path.join(aiDocsPath, relativePath)

              // Log the request
              console.log(`[AI Docs] ${req.url} -> ${fullPath}`)

              if (fs.existsSync(fullPath)) {
                const stats = fs.statSync(fullPath)
                if (stats.isFile()) {
                  const ext = path.extname(fullPath)
                  const contentType =
                    ext === '.json' ? 'application/json' : ext === '.html' ? 'text/html' : 'text/plain'

                  res.setHeader('Content-Type', contentType)
                  res.setHeader('Access-Control-Allow-Origin', '*')
                  res.end(fs.readFileSync(fullPath))
                  return
                }
              }

              // File not found
              res.statusCode = 404
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'File not found', path: req.url }))
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
