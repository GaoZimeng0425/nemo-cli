import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { request as httpsRequest } from 'node:https'
import { URL } from 'node:url'

const slackWebhookUrl = 'https://hooks.slack.com/services/XXXXXXXXXXXXXXXX'

const swaggerJsonUrls = {
  web: 'https://prime-dev1.metalpha.fund/swagger/service.json',
  webv2: 'https://prime-dev1.metalpha.fund/swagger-v2/prime-web.json',
  admin: 'https://prime-admin-dev1.metalpha.fund/swagger/service.json',
  provider: 'https://prime-sp-dev1.metalpha.fund/swagger/service.json',
} as const

const swaggerHtmlUrls = {
  web: 'https://prime-dev1.metalpha.fund/swagger/swagger-ui.html',
  webv2: 'https://prime-dev1.metalpha.fund/swagger-v2/swagger-ui.html?urls.primaryName=prime-web',
  admin: 'https://prime-admin-dev1.metalpha.fund/swagger/swagger-ui.html',
  provider: 'https://prime-sp-dev1.metalpha.fund/swagger/swagger-ui.html',
} as const

type ApiName = keyof typeof swaggerJsonUrls

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  try {
    return JSON.stringify(e)
  } catch {
    return String(e)
  }
}

// Fetch JSON helper
async function fetchJson<T = unknown>(url: string): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    try {
      const u = new URL(url)
      const req = httpsRequest(
        {
          protocol: u.protocol,
          hostname: u.hostname,
          port: u.port || (u.protocol === 'https:' ? 443 : 80),
          method: 'GET',
          path: `${u.pathname}${u.search}`,
          headers: { Accept: 'application/json' },
        },
        (res) => {
          const chunks: Buffer[] = []
          res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
          res.on('end', () => {
            try {
              const body = Buffer.concat(chunks).toString('utf-8')
              resolve(JSON.parse(body) as T)
            } catch (err) {
              reject(err)
            }
          })
        }
      )
      req.on('error', reject)
      req.end()
    } catch (err) {
      reject(err)
    }
  })
}

type OpenApiSpec = { paths?: Record<string, Record<string, unknown>> } & Record<string, unknown>

function getEndpointsMap(spec: OpenApiSpec): Map<string, unknown> {
  const map = new Map<string, unknown>()
  const paths = spec.paths ?? {}
  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, op] of Object.entries(methods)) {
      const key = `${method.toUpperCase()} ${path}`
      map.set(key, op)
    }
  }
  return map
}

function diffOpenApi(
  oldSpec: OpenApiSpec,
  newSpec: OpenApiSpec
): {
  added: string[]
  removed: string[]
  modified: string[]
} {
  const oldMap = getEndpointsMap(oldSpec)
  const newMap = getEndpointsMap(newSpec)

  const added: string[] = []
  const removed: string[] = []
  const modified: string[] = []

  for (const key of newMap.keys()) {
    if (!oldMap.has(key)) {
      added.push(key)
    }
  }
  for (const key of oldMap.keys()) {
    if (!newMap.has(key)) {
      removed.push(key)
    }
  }
  for (const key of newMap.keys()) {
    if (oldMap.has(key)) {
      const a = JSON.stringify(oldMap.get(key))
      const b = JSON.stringify(newMap.get(key))
      if (a !== b) {
        modified.push(key)
      }
    }
  }

  return { added, removed, modified }
}

function buildContent(
  swaggerHtmlUrl: string,
  diff: { added: string[]; removed: string[]; modified: string[] }
): {
  changed: boolean
  result: string
} {
  const { added, removed, modified } = diff
  const hasChanges = added.length > 0 || removed.length > 0 || modified.length > 0
  if (!hasChanges) return { changed: false, result: '' }

  let result = ''
  result += `:sunny: :mostly_sunny: :partly_sunny_rain: *接口有变更* 详见 <${swaggerHtmlUrl}|Swagger> :partly_sunny_rain: :mostly_sunny: :sunny:`

  if (added.length > 0) {
    result += '\n*【新增】*'
    for (const ep of added) {
      const display = ep.replace('/api/prime', '')
      result += `\n:point_right: \`${display}\``
    }
  }
  if (removed.length > 0) {
    result += '\n\n*【废弃】*'
    for (const ep of removed) {
      const display = ep.replace('/api/prime', '')
      result += `\n-- ~删除~ ：${display}`
    }
  }
  if (modified.length > 0) {
    result += '\n\n*【修改】*'
    for (const ep of modified) {
      const display = ep.replace('/api/prime', '')
      result += `\n·· 修改：${display}`
    }
  }

  return { changed: true, result }
}

async function postJson(url: string, data: unknown): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    try {
      const u = new URL(url)
      const req = httpsRequest(
        {
          protocol: u.protocol,
          hostname: u.hostname,
          port: u.port || (u.protocol === 'https:' ? 443 : 80),
          method: 'POST',
          path: `${u.pathname}${u.search}`,
          headers: {
            'Content-Type': 'application/json',
          },
        },
        (res) => {
          // drain response
          res.on('data', () => {})
          res.on('end', () => resolve())
        }
      )
      req.on('error', reject)
      req.write(JSON.stringify(data))
      req.end()
    } catch (err) {
      reject(err)
    }
  })
}

async function diffSwagger(apiName: string, swaggerJsonUrl: string, swaggerHtmlUrl: string): Promise<void> {
  const swaggerJsonFile = `${apiName}-swagger.json`

  if (!existsSync(swaggerJsonFile)) {
    try {
      const latest = await fetchJson<OpenApiSpec>(swaggerJsonUrl)
      writeFileSync(swaggerJsonFile, JSON.stringify(latest, null, 2), 'utf-8')
      console.log(`最新接口文档已保存到本地 ${swaggerJsonFile}`)
    } catch (e) {
      console.error(`首次下载失败: ${getErrorMessage(e)}`)
    }
    return
  }

  let oldSpec: OpenApiSpec
  try {
    oldSpec = JSON.parse(readFileSync(swaggerJsonFile, 'utf-8')) as OpenApiSpec
  } catch (e) {
    console.error(`读取本地接口文档失败: ${getErrorMessage(e)}`)
    return
  }

  let newSpec: OpenApiSpec
  try {
    newSpec = await fetchJson<OpenApiSpec>(swaggerJsonUrl)
  } catch (e) {
    console.error(`下载最新接口文档失败: ${getErrorMessage(e)}`)
    return
  }

  const diff = diffOpenApi(oldSpec, newSpec)
  const { changed, result } = buildContent(swaggerHtmlUrl, diff)
  if (!changed) {
    console.log('接口没有变更')
  } else {
    const jsonPayload = {
      blocks: [{ type: 'divider' }, { type: 'section', text: { type: 'mrkdwn', text: result } }],
    }
    if (slackWebhookUrl.length > 64) {
      try {
        await postJson(slackWebhookUrl, jsonPayload)
        console.log('接口变更内容已发送到 Slack')
      } catch (e) {
        console.error('发送到 Slack 失败', e)
      }
    } else {
      console.log('\n\u001b[1;31m接口变更内容:\u001b[0m\n')
      console.log(result)
      console.log('\n\u001b[1;31mslack_webhook_url 未正确配置，请修改脚本\u001b[0m\n')
    }
  }

  try {
    writeFileSync(swaggerJsonFile, JSON.stringify(newSpec, null, 2), 'utf-8')
    console.log(`最新接口文档已保存到本地 ${swaggerJsonFile}`)
  } catch (e) {
    console.error(`保存最新接口文档失败: ${getErrorMessage(e)}`)
  }
}

async function main(): Promise<void> {
  const apiNames = Object.keys(swaggerJsonUrls) as ApiName[]
  for (const apiName of apiNames) {
    const swaggerJsonUrl = swaggerJsonUrls[apiName]
    console.log(`开始检查 ${apiName} 的接口变更`)
    await diffSwagger(apiName, swaggerJsonUrl, swaggerHtmlUrls[apiName])
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function scheduledJob(): Promise<void> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await main()
    } catch (e) {
      console.error(`Error occurred: ${getErrorMessage(e)}`)
      await sleep(300 * 1000)
    }
    await sleep(7200 * 1000)
  }
}

// start loop
void scheduledJob()
