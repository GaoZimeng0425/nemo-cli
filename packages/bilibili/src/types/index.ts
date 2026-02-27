// Bilibili API Response Types
export interface BiliResponse<T> {
  code: number
  message: string
  data?: T
}

// User Info
export interface UserInfo {
  mid: number
  name: string
  face: string
  level: number
}

// QR Code Login
export interface QRCodeResult {
  qrcode_key: string
  qrcode_url: string
}

export enum QRCodeStatus {
  Waiting = 'waiting',
  Scanned = 'scanned',
  Confirmed = 'confirmed',
  Expired = 'expired',
}

export interface QRCodePollResult {
  status: QRCodeStatus
  message: string
  cookies?: Record<string, string>
}

// Favorites
export interface FavoriteFolder {
  id: number
  fid: number
  mid: number
  title: string
  media_count: number
}

export interface FavoriteVideo {
  id: number
  bvid: string
  title: string
  cover: string
  intro: string
  owner: {
    mid: number
    name: string
  }
}

export interface FavoriteContentResult {
  info: FavoriteFolder
  medias: FavoriteVideo[]
  has_more: boolean
}

// Video Info
export interface VideoInfo {
  bvid: string
  aid: number
  cid: number
  title: string
  desc: string
  pic: string
  owner: {
    mid: number
    name: string
  }
  stat: {
    view: number
    like: number
    coin: number
    favorite: number
  }
}

export interface VideoSummary {
  model: string
  summary: string
}

export interface SubtitleInfo {
  id: number
  lang: string
  subtitle_url: string
}
