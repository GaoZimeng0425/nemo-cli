import { Hono } from 'hono'
import { z } from 'zod'

import { BilibiliService } from '../services/bilibili.service.js'
import { cache } from '../services/cache.service.js'

const app = new Hono()
const service = new BilibiliService(
  process.env.BILIBILI_SESSDATA,
  process.env.BILIBILI_BILI_JCT,
  process.env.BILIBILI_DEDEUSERID
)

// Get user's favorite folders
app.get('/', async (c) => {
  try {
    const mid = c.req.query('mid')
    const cacheKey = `favorites:${mid || 'me'}`

    const cached = cache.get(cacheKey)
    if (cached) {
      return c.json({ code: 0, data: cached })
    }

    const favorites = await service.getUserFavorites(mid ? Number.parseInt(mid) : undefined)
    cache.set(cacheKey, favorites, 600)

    return c.json({ code: 0, data: favorites })
  } catch (error) {
    return c.json(
      {
        code: -1,
        message: error instanceof Error ? error.message : '获取收藏夹失败',
      },
      500
    )
  }
})

// Get favorite folder content
const contentSchema = z.object({
  id: z.string().transform(Number),
  page: z.string().transform(Number).optional().default('1'),
  pageSize: z.string().transform(Number).optional().default('20'),
})

app.get('/:id', async (c) => {
  try {
    const { id, page, pageSize } = contentSchema.parse({
      id: c.req.param('id'),
      page: c.req.query('pn'),
      pageSize: c.req.query('ps'),
    })

    const content = await service.getFavoriteContent(id, page, pageSize)
    return c.json({ code: 0, data: content })
  } catch (error) {
    return c.json(
      {
        code: -1,
        message: error instanceof Error ? error.message : '获取收藏夹内容失败',
      },
      500
    )
  }
})

// Move favorite resources
const moveSchema = z.object({
  src_media_id: z.number(),
  tar_media_id: z.number(),
  resources: z.array(z.string()),
})

app.post('/move', async (c) => {
  try {
    const body = await c.req.json()
    const { src_media_id, tar_media_id, resources } = moveSchema.parse(body)

    const result = await service.moveFavoriteResources(src_media_id, tar_media_id, resources)
    return c.json({ code: 0, data: result })
  } catch (error) {
    return c.json(
      {
        code: -1,
        message: error instanceof Error ? error.message : '移动收藏内容失败',
      },
      500
    )
  }
})

// Clean invalid favorite resources
const cleanSchema = z.object({
  media_id: z.number(),
})

app.post('/clean', async (c) => {
  try {
    const body = await c.req.json()
    const { media_id } = cleanSchema.parse(body)

    const result = await service.cleanFavoriteResources(media_id)
    return c.json({ code: 0, data: result })
  } catch (error) {
    return c.json(
      {
        code: -1,
        message: error instanceof Error ? error.message : '清理失效内容失败',
      },
      500
    )
  }
})

export default app
