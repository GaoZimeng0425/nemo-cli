import { beforeAll, describe, expect, it } from 'vitest'

import { BilibiliService } from '../../src/services/bilibili.service.js'

describe('BilibiliService', () => {
  describe('QR Code Login', () => {
    it('should generate QR code', async () => {
      const service = new BilibiliService()
      const result = await service.generateQRCode()

      expect(result).toHaveProperty('qrcode_key')
      expect(result).toHaveProperty('qrcode_url')
      expect(result).toHaveProperty('qrcode_image_base64')
      expect(result.qrcode_key).toBeTruthy()
      expect(result.qrcode_url).toContain('bilibili.com')
      expect(result.qrcode_image_base64).toMatch(/^data:image\/png;base64,/)
    })

    it('should poll QR code status', async () => {
      const service = new BilibiliService()
      const qrcode = await service.generateQRCode()

      const result = await service.pollQRCodeStatus(qrcode.qrcode_key)

      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('message')
      expect(['waiting', 'scanned', 'expired', 'confirmed']).toContain(result.status)
    })
  })

  describe('Public API (no auth required)', () => {
    it('should get video info without auth', async () => {
      const service = new BilibiliService()
      // Use a well-known video BV
      const info = await service.getVideoInfo('BV1xx411c7mD')

      expect(info).toHaveProperty('bvid', 'BV1xx411c7mD')
      expect(info).toHaveProperty('title')
      expect(info).toHaveProperty('owner')
      expect(info.owner).toHaveProperty('name')
    })

    it('should throw error for invalid bvid', async () => {
      const service = new BilibiliService()

      await expect(service.getVideoInfo('BV1invalid')).rejects.toThrow()
    })
  })
})
