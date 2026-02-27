import QRCode from 'qrcode'

import { HttpClient } from '../lib/http.js'
import type { BiliResponse, QRCodePollResult, QRCodeResult, UserInfo } from '../types/index.js'
import { QRCodeStatus } from '../types/index.js'

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
    if (this.sessdata) cookies.SESSDATA = this.sessdata
    if (this.biliJct) cookies.bili_jct = this.biliJct
    if (this.dedeuserid) cookies.DedeUserID = this.dedeuserid
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

        if (sessdata) cookies.SESSDATA = sessdata
        if (biliJct) cookies.bili_jct = biliJct
        if (dedeuserid) cookies.DedeUserID = dedeuserid

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

  async getVideoInfo(bvid: string): Promise<{
    bvid: string
    aid: number
    cid: number
    title: string
    desc: string
    pic: string
    owner: { mid: number; name: string }
    stat: { view: number; like: number; coin: number; favorite: number }
  }> {
    const data = await this.http.get<
      BiliResponse<{
        bvid: string
        aid: number
        cid: number
        title: string
        desc: string
        pic: string
        owner: { mid: number; name: string }
        stat: { view: number; like: number; coin: number; favorite: number }
      }>
    >('/x/web-interface/view', { bvid }, { cookies: this.getCookies() })

    if (data.code !== 0) {
      throw new Error(`获取视频信息失败: ${data.message}`)
    }

    return data.data!
  }

  async getVideoSummary(
    bvid: string,
    cid: number
  ): Promise<{
    model: string
    summary: string
  } | null> {
    const { sign } = await import('../lib/wbi.js')

    const params = await sign({ bvid, cid })

    const data = await this.http.get<
      BiliResponse<{
        model: string
        summary: string
      }>
    >('/x/web-interface/view/conclusion/get', params, { cookies: this.getCookies() })

    if (data.code !== 0) {
      console.warn(`获取视频摘要失败 [${bvid}]: ${data.message}`)
      return null
    }

    return data.data || null
  }

  async getPlayerInfo(
    bvid: string,
    cid: number
  ): Promise<{
    subtitle: {
      subtitles: Array<{
        id: number
        lang: string
        subtitle_url: string
      }>
    }
  } | null> {
    const { sign } = await import('../lib/wbi.js')

    try {
      const params = await sign({ bvid, cid })
      const data = await this.http.get<
        BiliResponse<{
          subtitle: {
            subtitles: Array<{
              id: number
              lang: string
              subtitle_url: string
            }>
          }
        }>
      >('/x/player/wbi/v2', params, { cookies: this.getCookies() })

      if (data.code === 0) {
        return data.data || null
      }
    } catch (e) {
      console.warn(`WBI 播放器信息失败 [${bvid}]: ${e}`)
    }

    const data = await this.http.get<
      BiliResponse<{
        subtitle: {
          subtitles: Array<{
            id: number
            lang: string
            subtitle_url: string
          }>
        }
      }>
    >('/x/player/v2', { bvid, cid }, { cookies: this.getCookies() })

    if (data.code !== 0) {
      console.warn(`获取播放器信息失败 [${bvid}]: ${data.message}`)
      return null
    }

    return data.data || null
  }

  async getAudioUrl(bvid: string, cid: number): Promise<string | null> {
    const { sign } = await import('../lib/wbi.js')

    const params = {
      bvid,
      cid,
      fnval: 16,
      fnver: 0,
      fourk: 1,
    }

    let data: {
      code: number
      data?: { dash?: { audio?: Array<{ baseUrl: string; bandwidth: number }> } }
    } | null = null

    try {
      const signedParams = await sign(params)
      data = await this.http.get('/x/player/wbi/playurl', signedParams, { cookies: this.getCookies() })
    } catch (e) {
      console.warn(`获取音频信息失败(WBI) [${bvid}]: ${e}`)
    }

    if (!data || data.code !== 0) {
      try {
        data = await this.http.get('/x/player/playurl', params, { cookies: this.getCookies() })
      } catch (e) {
        console.warn(`获取音频信息失败 [${bvid}]: ${e}`)
        return null
      }
    }

    const audioList = data.data?.dash?.audio || []
    if (audioList.length > 0) {
      const preferred = audioList.filter((a) => (a.bandwidth || 0) <= 96_000)
      if (preferred.length > 0) {
        return preferred.reduce((prev, curr) => ((curr.bandwidth || 0) > (prev.bandwidth || 0) ? curr : prev)).baseUrl
      }
      return audioList[0].baseUrl
    }

    return null
  }

  async downloadSubtitle(subtitleUrl: string): Promise<string> {
    const url = subtitleUrl.startsWith('//') ? `https:${subtitleUrl}` : subtitleUrl

    const response = await fetch(url)
    const data = (await response.json()) as { body: Array<{ content: string }> }

    const texts = data.body.map((item) => item.content).filter(Boolean)

    return texts.join('\n')
  }
}
