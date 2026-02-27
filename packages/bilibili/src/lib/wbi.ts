// WBI (Web Interface) signature for Bilibili API
// Reference: https://github.com/SocialSisterYi/bilibili-API-collect

import { createHash } from 'crypto'

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41,
  13, 37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34,
  44, 52,
]

const KEY_TTL_MS = 30 * 60 * 1000 // 30 minutes

interface CachedKeys {
  keys: { imgKey: string; subKey: string }
  fetchedAt: number
}

let cachedKeys: CachedKeys | null = null

export async function getWbiKeys(): Promise<{ imgKey: string; subKey: string }> {
  // Return cached keys if still valid
  if (cachedKeys && Date.now() - cachedKeys.fetchedAt < KEY_TTL_MS) {
    return cachedKeys.keys
  }

  try {
    const response = await fetch('https://api.bilibili.com/x/web-interface/nav')

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = (await response.json()) as {
      code: number
      data?: { wbi_img: { img_url: string; sub_url: string } }
    }

    if (data.code !== 0 || !data.data?.wbi_img) {
      throw new Error('Invalid response from Bilibili API')
    }

    const imgUrl = data.data.wbi_img.img_url
    const subUrl = data.data.wbi_img.sub_url

    const imgKey = imgUrl.split('/').pop()?.replace('.png', '') || ''
    const subKey = subUrl.split('/').pop()?.replace('.png', '') || ''

    if (!imgKey || !subKey) {
      throw new Error('Failed to extract WBI keys from URLs')
    }

    cachedKeys = { keys: { imgKey, subKey }, fetchedAt: Date.now() }
    return cachedKeys.keys
  } catch (error) {
    throw new Error(`Failed to get WBI keys: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function sign(params: Record<string, string | number>): Promise<Record<string, string>> {
  const { imgKey, subKey } = await getWbiKeys()

  // Concatenate keys first, then reorder using MIXIN_KEY_ENC_TAB
  const rawKey = imgKey + subKey
  let key = ''
  for (const i of MIXIN_KEY_ENC_TAB) {
    if (i < rawKey.length) {
      key += rawKey[i]
    }
  }
  key = key.slice(0, 32) // Take only first 32 characters

  // Add timestamp
  const paramsWithTime = { ...params, wts: Math.floor(Date.now() / 1000) }

  // Sort keys alphabetically
  const sorted = Object.fromEntries(Object.entries(paramsWithTime).sort(([a], [b]) => a.localeCompare(b)))

  // Build query string
  const query = new URLSearchParams()
  for (const [k, v] of Object.entries(sorted)) {
    query.set(k, String(v))
  }

  // Calculate signature using MD5 hash with mixed key as salt
  const queryString = query.toString()
  const signature = createHash('md5')
    .update(queryString + key)
    .digest('hex')

  return {
    ...Object.fromEntries(query),
    w_rid: signature,
  }
}
