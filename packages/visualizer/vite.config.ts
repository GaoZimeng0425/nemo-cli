// vite.config.ts

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
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
})
