import { execSync } from 'node:child_process'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateObject, streamText } from 'ai'
import z from 'zod/v4'

import { loadEnv } from '@nemo-cli/shared'
import { Message } from '@nemo-cli/ui'

loadEnv(import.meta, '../.env')

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
})

const get = () => {
  const diff = getGitDiff()
  const result = generateObject({
    model: google('gemini-2.5-flash'),
    schema: z.object({
      summary: z.string().max(50),
    }),
    messages: [
      {
        role: 'system',
        content: '你是一個優秀的開發者，負責撰寫簡潔又描述清楚的 Git commit 訊息。',
      },
      {
        role: 'user',
        content: `根據以下的 git 差異生成一個有意義的 commit 繁體中文訊息，請包含兩個部分：\n1. Summary（不超過50字）\n${diff}`,
      },
    ],
  })

  return result
}

function getGitDiff() {
  try {
    // 首先獲取所有更改的檔案列表
    const changedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
      .split('\n')
      .filter((file) => file && !file.includes('.min.') && file.trim() !== '')

    // 然後只對這些檔案執行 git diff
    const diff = changedFiles
      .map((file) => {
        try {
          return execSync(`git diff --cached -- "${file}"`, { encoding: 'utf-8' })
        } catch (error) {
          console.error(`Error getting diff for file ${file}:`, error)
          return ''
        }
      })
      .join('\n')

    return diff
  } catch (error) {
    console.error('Error fetching git diff:', error)
    return ''
  }
}

type ChatParams = {
  onMessage?: (message: string) => void
  onReasoning?: (reasoning: string) => void
  onFinish?: ({ message, reasoning }: { message: string; reasoning: string }) => void
}
const useChat = async ({ onMessage, onReasoning, onFinish }: ChatParams) => {
  const diff = getGitDiff()

  const result = streamText({
    model: google('gemini-2.5-flash'),
    messages: [
      {
        role: 'system',
        content: '你是一個優秀的開發者，負責撰寫簡潔又描述清楚的 Git commit 訊息。',
      },
      {
        role: 'user',
        content: `根據以下的 git 差異生成一個有意義的 commit 繁體中文訊息，請包含兩個部分：\n1. Summary（不超過50字）\n2. Description（條列描述變更內容）：\n${diff}`,
      },
    ],
  })

  let reasoning = ''
  let message = ''

  for await (const part of result.fullStream) {
    if (part.type === 'reasoning-start') {
      reasoning = ''
    } else if (part.type === 'reasoning-delta') {
      reasoning += part.text
      onReasoning?.(part.text)
    } else if (part.type === 'reasoning-end') {
    } else if (part.type === 'text-start') {
      message = ''
    } else if (part.type === 'text-delta') {
      message += part.text
      onMessage?.(part.text)
    } else if (part.type === 'text-end') {
    }
  }
  onFinish?.({ message, reasoning })
}

const result = await get()

Message({ text: result.object.summary })
