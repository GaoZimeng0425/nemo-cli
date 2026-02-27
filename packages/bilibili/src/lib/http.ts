interface HttpClientOptions {
  cookies?: Record<string, string>
}

export class HttpClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
    this.defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Referer: 'https://www.bilibili.com/',
      Origin: 'https://www.bilibili.com',
    }
  }

  async get<T>(path: string, params?: Record<string, string | number>, options?: HttpClientOptions): Promise<T> {
    const url = new URL(path, this.baseUrl)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value))
      })
    }

    const headers = { ...this.defaultHeaders }
    const cookies = options?.cookies || {}

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json() as Promise<T>
  }

  async post<T>(path: string, data?: Record<string, unknown>, options?: HttpClientOptions): Promise<T> {
    const url = new URL(path, this.baseUrl)
    const headers = {
      ...this.defaultHeaders,
      'Content-Type': 'application/x-www-form-urlencoded',
    }

    const body = new URLSearchParams()
    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        body.set(key, String(value))
      })
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: body.toString(),
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json() as Promise<T>
  }
}
