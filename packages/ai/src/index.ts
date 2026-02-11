import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { createZhipu, zhipu } from 'zhipu-ai-provider'

export type AiProviderEngine = 'openai' | 'google' | 'zhipu' | 'none'

export interface RunModelTextOptions {
  prompt: string
  engine?: AiProviderEngine
  model?: string
  systemPrompt?: string
}

export function resolveAiEngine(engine?: AiProviderEngine | string): AiProviderEngine {
  if (engine === 'openai' || engine === 'google' || engine === 'zhipu' || engine === 'none') return engine
  if (process.env.GOOGLE_API_KEY) return 'google'
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (process.env.ZHIPU_API_KEY) return 'zhipu'
  return 'none'
}

export function getDefaultAiModel(engine: AiProviderEngine): string {
  if (engine === 'google') return 'gemini-2.5-flash'
  if (engine === 'openai') return 'gpt-4o-mini'
  if (engine === 'zhipu') return 'glm-4.7'
  return 'none'
}

export async function runModelText({
  prompt,
  engine,
  model,
  systemPrompt = '你是资深前端工程师，负责组件功能分析。',
}: RunModelTextOptions): Promise<string> {
  const resolvedEngine = resolveAiEngine(engine)
  const resolvedModel = model ?? getDefaultAiModel(resolvedEngine)

  if (resolvedEngine === 'google') {
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) throw new Error('GOOGLE_API_KEY is not set')
    const google = createGoogleGenerativeAI({ apiKey })
    const result = await generateText({
      model: google(resolvedModel),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    })
    return result.text
  }

  if (resolvedEngine === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set')
    const openai = createOpenAI({ apiKey })
    const result = await generateText({
      model: openai(resolvedModel),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    })
    return result.text
  }

  if (resolvedEngine === 'zhipu') {
    const apiKey = process.env.ZHIPU_API_KEY
    if (!apiKey) throw new Error('ZHIPU_API_KEY is not set')
    const baseURL = process.env.ZHIPU_BASE_URL
    const provider = baseURL ? createZhipu({ apiKey, baseURL }) : zhipu
    const result = await generateText({
      model: provider(resolvedModel),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    })
    return result.text
  }

  return ''
}

// import { FastMCP } from 'fastmcp'
// import { addConfluenceMCP } from './services/confluence/mcp'
// import { addMailMCP } from './services/mails/mcp'
// import { run } from './services/slack/bot'
//
// const server = new FastMCP({
//   name: 'Prime Workflow',
//   version: '0.0.1',
// })
//
// addConfluenceMCP(server)
// addMailMCP(server)
//
// server.start({
//   transportType: 'stdio',
// })
//
// run()
