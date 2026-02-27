import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

import authRoutes from './routes/auth.js'
import favoriteRoutes from './routes/favorite.js'
import videoRoutes from './routes/video.js'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', cors())

// Routes
app.route('/api/auth', authRoutes)
app.route('/api/favorites', favoriteRoutes)
app.route('/api/videos', videoRoutes)

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() })
})

// Root
app.get('/', (c) => {
  return c.json({
    name: '@nemo-cli/bilibili',
    version: '0.1.0',
    endpoints: {
      health: '/health',
      auth: {
        qrcode: 'GET /api/auth/qrcode',
        poll: 'GET /api/auth/qrcode/poll',
        userInfo: 'GET /api/user/info',
      },
      favorites: {
        list: 'GET /api/favorites',
        content: 'GET /api/favorites/:id',
        move: 'POST /api/favorites/move',
        clean: 'POST /api/favorites/clean',
      },
      videos: {
        info: 'GET /api/videos/:bvid',
        summary: 'GET /api/videos/:bvid/summary',
        subtitle: 'GET /api/videos/:bvid/subtitle',
        audio: 'GET /api/videos/:bvid/audio',
      },
    },
  })
})

export default app

// Start server if running directly
const port = Number.parseInt(process.env.PORT || '3001')
const host = process.env.HOST || 'localhost'

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`Starting Bilibili API service on http://${host}:${port}`)
  serve({
    fetch: app.fetch,
    port,
  })
  console.log(`Server running at http://${host}:${port}`)
}
