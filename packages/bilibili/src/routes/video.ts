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

// Get video info
app.get('/:bvid', async (c) => {
  try {
    const bvid = c.req.param('bvid')
    const cacheKey = `video:${bvid}`

    const cached = cache.get(cacheKey)
    if (cached) {
      return c.json({ code: 0, data: cached })
    }

    const info = await service.getVideoInfo(bvid)
    cache.set(cacheKey, info, 1800)

    return c.json({ code: 0, data: info })
  } catch (error) {
    return c.json(
      {
        code: -1,
        message: error instanceof Error ? error.message : '获取视频信息失败',
      },
      500
    )
  }
})

// Get video AI summary
app.get('/:bvid/summary', async (c) => {
  try {
    const bvid = c.req.param('bvid')
    const cid = Number.parseInt(c.req.query('cid') || '0')

    if (!cid) {
      const info = await service.getVideoInfo(bvid)
      const summary = await service.getVideoSummary(bvid, info.cid)
      return c.json({ code: 0, data: summary })
    }

    const summary = await service.getVideoSummary(bvid, cid)
    return c.json({ code: 0, data: summary })
  } catch (error) {
    return c.json(
      {
        code: -1,
        message: error instanceof Error ? error.message : '获取视频摘要失败',
      },
      500
    )
  }
})

// Get video subtitle
app.get('/:bvid/subtitle', async (c) => {
  try {
    const bvid = c.req.param('bvid')
    const cid = Number.parseInt(c.req.query('cid') || '0')

    if (!cid) {
      const info = await service.getVideoInfo(bvid)
      const playerInfo = await service.getPlayerInfo(bvid, info.cid)
      const subtitles = playerInfo?.subtitle.subtitles || []
      return c.json({ code: 0, data: { subtitles } })
    }

    const playerInfo = await service.getPlayerInfo(bvid, cid)
    const subtitles = playerInfo?.subtitle.subtitles || []

    const subtitleId = Number.parseInt(c.req.query('subtitle_id') || '0')
    if (subtitleId && subtitles.length > 0) {
      const subtitle = subtitles.find((s) => s.id === subtitleId)
      if (subtitle) {
        const content = await service.downloadSubtitle(subtitle.subtitle_url)
        return c.json({ code: 0, data: { subtitle, content } })
      }
    }

    return c.json({ code: 0, data: { subtitles } })
  } catch (error) {
    return c.json(
      {
        code: -1,
        message: error instanceof Error ? error.message : '获取字幕失败',
      },
      500
    )
  }
})

// Get video audio URL
app.get('/:bvid/audio', async (c) => {
  try {
    const bvid = c.req.param('bvid')
    const cid = Number.parseInt(c.req.query('cid') || '0')

    if (!cid) {
      const info = await service.getVideoInfo(bvid)
      const audioUrl = await service.getAudioUrl(bvid, info.cid)
      return c.json({ code: 0, data: { audio_url: audioUrl } })
    }

    const audioUrl = await service.getAudioUrl(bvid, cid)
    return c.json({ code: 0, data: { audio_url: audioUrl } })
  } catch (error) {
    return c.json(
      {
        code: -1,
        message: error instanceof Error ? error.message : '获取音频链接失败',
      },
      500
    )
  }
})

export default app
