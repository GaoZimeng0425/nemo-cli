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

  async getUserFavorites(mid?: number): Promise<
    Array<{
      id: number
      fid: number
      title: string
      media_count: number
    }>
  > {
    const userId = mid || this.dedeuserid
    if (!userId) {
      throw new Error('未指定用户 ID')
    }

    const data = await this.http.get<
      BiliResponse<{
        list: Array<{
          id: number
          fid: number
          title: string
          media_count: number
        }>
      }>
    >('/x/v3/fav/folder/created/list-all', { up_mid: userId }, { cookies: this.getCookies() })

    if (data.code !== 0) {
      throw new Error(`获取收藏夹失败: ${data.message}`)
    }

    return data.data?.list || []
  }

  async getFavoriteContent(
    mediaId: number,
    pn = 1,
    ps = 20
  ): Promise<{
    info: { id: number; title: string }
    medias: Array<{
      id: number
      bvid: string
      title: string
      cover: string
      intro: string
      owner: { mid: number; name: string }
    }>
    has_more: boolean
  }> {
    const data = await this.http.get<
      BiliResponse<{
        info: { id: number; title: string }
        medias: Array<{
          id: number
          bvid: string
          title: string
          cover: string
          intro: string
          owner: { mid: number; name: string }
        }>
        has_more: boolean
      }>
    >(
      '/x/v3/fav/resource/list',
      {
        media_id: mediaId,
        pn,
        ps: Math.min(ps, 20),
        platform: 'web',
      },
      { cookies: this.getCookies() }
    )

    if (data.code !== 0) {
      throw new Error(`获取收藏夹内容失败: ${data.message}`)
    }

    return {
      info: data.data!.info,
      medias: data.data!.medias || [],
      has_more: data.data!.has_more,
    }
  }

  async getAllFavoriteVideos(mediaId: number): Promise<
    Array<{
      id: number
      bvid: string
      title: string
      cover: string
      intro: string
      owner: { mid: number; name: string }
    }>
  > {
    const allVideos: Array<{
      id: number
      bvid: string
      title: string
      cover: string
      intro: string
      owner: { mid: number; name: string }
    }> = []
    let pn = 1

    while (true) {
      const result = await this.getFavoriteContent(mediaId, pn, 20)
      allVideos.push(...result.medias)

      if (!result.has_more) break

      pn++
      await new Promise((resolve) => setTimeout(resolve, 300))
    }

    return allVideos
  }

  async moveFavoriteResources(srcMediaId: number, tarMediaId: number, resources: string[]): Promise<{ moved: number }> {
    if (!this.biliJct) {
      throw new Error('缺少 bili_jct，无法进行收藏夹移动')
    }

    if (!resources.length) {
      return { moved: 0 }
    }

    const data = await this.http.post<BiliResponse<{ moved: number }>>(
      '/x/v3/fav/resource/move',
      {
        src_media_id: srcMediaId,
        tar_media_id: tarMediaId,
        resources: resources.join(','),
        csrf: this.biliJct,
        mid: this.dedeuserid,
      },
      { cookies: this.getCookies() }
    )

    if (data.code !== 0) {
      throw new Error(`移动收藏夹内容失败: ${data.message}`)
    }

    return data.data || { moved: 0 }
  }

  async cleanFavoriteResources(mediaId: number): Promise<{ cleaned: number }> {
    if (!this.biliJct) {
      throw new Error('缺少 bili_jct，无法清理失效内容')
    }

    const data = await this.http.post<BiliResponse<{ cleaned: number }>>(
      '/x/v3/fav/resource/clean',
      {
        media_id: mediaId,
        csrf: this.biliJct,
      },
      { cookies: this.getCookies() }
    )

    if (data.code !== 0) {
      throw new Error(`清理失效内容失败: ${data.message}`)
    }

    return data.data || { cleaned: 0 }
  }
}
