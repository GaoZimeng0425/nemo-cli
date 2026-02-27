import { Hono } from 'hono'
import { z } from 'zod'

import { BilibiliService } from '../services/bilibili.service.js'

const app = new Hono()
const service = new BilibiliService(
  process.env.BILIBILI_SESSDATA,
  process.env.BILIBILI_BILI_JCT,
  process.env.BILIBILI_DEDEUSERID
)

// Generate QR Code for login
app.get('/qrcode', async (c) => {
  try {
    const result = await service.generateQRCode()
    return c.json({
      code: 0,
      data: result,
    })
  } catch (error) {
    return c.json(
      {
        code: -1,
        message: error instanceof Error ? error.message : '生成二维码失败',
      },
      500
    )
  }
})

// Poll QR code status
const pollSchema = z.object({
  qrcode_key: z.string(),
})

app.get('/qrcode/poll', async (c) => {
  try {
    const { qrcode_key } = pollSchema.parse(c.req.query())
    const result = await service.pollQRCodeStatus(qrcode_key)

    if (result.status === 'confirmed' && result.cookies) {
      service.setCredentials(
        result.cookies['SESSDATA'] || '',
        result.cookies['bili_jct'] || '',
        result.cookies['DedeUserID'] || ''
      )
    }

    return c.json({
      code: 0,
      data: result,
    })
  } catch (error) {
    return c.json(
      {
        code: -1,
        message: error instanceof Error ? error.message : '轮询二维码状态失败',
      },
      500
    )
  }
})

// Get user info
app.get('/user/info', async (c) => {
  try {
    const userInfo = await service.getUserInfo()
    return c.json({
      code: 0,
      data: userInfo,
    })
  } catch (error) {
    return c.json(
      {
        code: -1,
        message: error instanceof Error ? error.message : '获取用户信息失败',
      },
      500
    )
  }
})

export default app
