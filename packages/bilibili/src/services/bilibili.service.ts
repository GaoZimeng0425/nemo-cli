import QRCode from 'qrcode'

import { HttpClient } from '../lib/http.js'
import type { BiliResponse, QRCodePollResult, QRCodeResult, QRCodeStatus, UserInfo } from '../types/index.js'

const BASE_URL = 'https://api.bilibili.com'
const PASSPORT_URL = 'https://passport.bilibili.com'

export class BilibiliService {
  private http: HttpClient
  private passportHttp: HttpClient
  private sessdata?: string
  private biliJct?: string
  private dedeuserid?: string

  constructor(sessdata?: string, biliJct?: string, dedeuserid?: string) {
    this.http = new HttpClient(BASE_URL)
    this.passportHttp = new HttpClient(PASSPORT_URL)
    this.sessdata = sessdata
    this.biliJct = biliJct
    this.dedeuserid = dedeuserid
  }

  private getCookies() {
    const cookies: Record<string, string> = {}
    if (this.sessdata) cookies['SESSDATA'] = this.sessdata
    if (this.biliJct) cookies['bili_jct'] = this.biliJct
    if (this.dedeuserid) cookies['DedeUserID'] = this.dedeuserid
    return cookies
  }

  async generateQRCode(): Promise<QRCodeResult & { qrcode_image_base64: string }> {
    const data = await this.passportHttp.get<{
      code: number
      data: { qrcode_key: string; url: string }
    }>('/x/passport-login/web/qrcode/generate')

    if (data.code !== 0) {
      throw new Error(`生成二维码失败: ${JSON.stringify(data)}`)
    }

    const qrcodeKey = data.data.qrcode_key
    const qrcodeUrl = data.data.url

    const imageData = await QRCode.toDataURL(qrcodeUrl)

    return {
      qrcode_key: qrcodeKey,
      qrcode_url: qrcodeUrl,
      qrcode_image_base64: imageData,
    }
  }

  async pollQRCodeStatus(qrcodeKey: string): Promise<QRCodePollResult> {
    const data = await this.passportHttp.get<{
      code: number
      data: {
        code: number
        message: string
        url?: string
        refresh_token?: string
      }
    }>('/x/passport-login/web/qrcode/poll', { qrcode_key: qrcodeKey })

    if (data.code !== 0) {
      throw new Error(`轮询二维码状态失败: ${JSON.stringify(data)}`)
    }

    const innerCode = data.data.code
    const message = data.data.message

    const statusMap: Record<number, [QRCodeStatus, string]> = {
      86101: [QRCodeStatus.Waiting, '等待扫码'],
      86090: [QRCodeStatus.Scanned, '已扫码，等待确认'],
      86038: [QRCodeStatus.Expired, '二维码已过期'],
      0: [QRCodeStatus.Confirmed, '登录成功'],
    }

    const [status, msg] = statusMap[innerCode] || ['unknown' as QRCodeStatus, message]

    const result: QRCodePollResult = { status, message: msg }

    if (status === QRCodeStatus.Confirmed) {
      const urlStr = data.data.url || ''
      if (urlStr.includes('SESSDATA=')) {
        const parsed = new URLSearchParams(urlStr.split('?')[1] || '')
        const cookies: Record<string, string> = {}
        const sessdata = parsed.get('SESSDATA')
        const biliJct = parsed.get('bili_jct')
        const dedeuserid = parsed.get('DedeUserID')

        if (sessdata) cookies['SESSDATA'] = sessdata
        if (biliJct) cookies['bili_jct'] = biliJct
        if (dedeuserid) cookies['DedeUserID'] = dedeuserid

        result.cookies = cookies
      }
    }

    return result
  }

  async getUserInfo(): Promise<UserInfo> {
    const data = await this.http.get<BiliResponse<UserInfo>>('/x/web-interface/nav', undefined, {
      cookies: this.getCookies(),
    })

    if (data.code !== 0) {
      throw new Error(`获取用户信息失败: ${data.message}`)
    }

    return data.data!
  }

  setCredentials(sessdata: string, biliJct: string, dedeuserid: string): void {
    this.sessdata = sessdata
    this.biliJct = biliJct
    this.dedeuserid = dedeuserid
  }
}
