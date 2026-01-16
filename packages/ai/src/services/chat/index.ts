import { execSync } from 'node:child_process'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, Output, streamText } from 'ai'
import z from 'zod/v4'

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
})

export const get = () => {
  const diff = getGitDiff()
  const result = generateText({
    model: google('gemini-2.5-flash'),
    output: Output.object({
      schema: z.object({
        summary: z.string().max(50),
      }),
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

  return result as any
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
export const useChat = async ({ onMessage, onReasoning, onFinish }: ChatParams) => {
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

// const result = await get()

// Message({ text: result.object.summary })

export const translateChat = async ({ message }: { message: string }) => {
  const response = await generateText({
    model: google('gemini-2.5-flash'),
    messages: [
      {
        role: 'system',
        content: '请你扮演一名优秀的资深翻译, 将所有语言翻译为英语. 只返回翻译文字, 不返回其他信息',
      },
      {
        role: 'user',
        content: `以下是需要翻译的文字: ${message}`,
      },
    ],
  })
  return response as any
}

const chat = async () => {
  const deepseek = createDeepSeek({
    baseURL: 'https://www.sophnet.com/api/open-apis/v1/',
    apiKey: 'wb1pJyqXUaxKoD1AR8tkEY_kWw4f-na9UMHedUSMY0YaxUVGMyI9Bq3MuBIYaxBk1qGFO2h-AUWejUC8bo4A',
    headers: {
      Authorization: 'Bearer wb1pJyqXUaxKoD1AR8tkEY_kWw4f-na9UMHedUSMY0YaxUVGMyI9Bq3MuBIYaxBk1qGFO2h-AUWejUC8bo4A',
      'Content-Type': 'application/json',
    },
  })
  const t = generateText({
    model: deepseek('DeepSeek-V3.2'),
    messages: [
      {
        role: 'system',
        content: '请你扮演一名优秀的资深翻译, 将所有语言翻译为英语. 只返回翻译文字, 不返回其他信息',
      },
      {
        role: 'user',
        content: '你可以帮我做什么',
      },
    ],
  })
  console.log(t)
}

const getUsageSummary = async () => {
  const response = await fetch('https://cursor.com/api/usage-summary', {
    headers: {
      Cookie:
        'IndrX2ZuSmZramJSX0NIYUZoRzRzUGZ0cENIVHpHNXk0VE0ya2ZiUkVzQU14X2Fub255bW91c1VzZXJJZCI%3D=IjA4OWJjYzUxLTA1NGItNDAxMy04YzE5LWM1YTgyOWMzNWZmZiI=; htjs_anonymous_id=4db895ba-e7b8-40a4-acd6-3f16d75062a0; ph_phc_TXdpocbGVeZVm5VJmAsHTMrCofBQu3e0kN8HGMNGTVW_posthog=%7B%22distinct_id%22%3A%220196b94c-328c-7986-b6fa-ea8e2e7b919c%22%2C%22%24sesid%22%3A%5B1758797385804%2C%220199807e-4fdc-7ea1-98b8-3b771bdd9b40%22%2C1758797385692%5D%7D; htjs_sesh={%22id%22:1758797389639%2C%22expiresAt%22:1758799189639%2C%22timeout%22:1800000%2C%22sessionStart%22:true%2C%22autoTrack%22:true}; WorkosCursorSessionToken=user_01JTSV5YSQK7856VAXAMKA16AN%3A%3AeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnb29nbGUtb2F1dGgyfHVzZXJfMDFKVFNWNVlTUUs3ODU2VkFYQU1LQTE2QU4iLCJ0aW1lIjoiMTc2Mzg2ODUwNCIsInJhbmRvbW5lc3MiOiIxNGMxZTYzYy0yZTAyLTRhMzkiLCJleHAiOjE3NjkwNTI1MDQsImlzcyI6Imh0dHBzOi8vYXV0aGVudGljYXRpb24uY3Vyc29yLnNoIiwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCBvZmZsaW5lX2FjY2VzcyIsImF1ZCI6Imh0dHBzOi8vY3Vyc29yLmNvbSIsInR5cGUiOiJ3ZWIifQ.9aIO6ABOu3Aaz86oFtfcafJSDW9wbHlmmjo0xdKq0io; generaltranslation.locale-routing-enabled=true; generaltranslation.referrer-locale=cn; muxData==undefined&mux_viewer_id=6b59ec2e-7d67-464a-9c34-43d1fccdf846&msn=0.8767201413627559&sid=fcdff277-0408-498a-83c3-e3a601f2c410&sst=1765264245776&sex=1765265745820; __stripe_mid=7ad1b12f-e499-43ca-94fc-93b741f3a62066e72a; statsig_stable_id=904a492a-88a7-46f4-8341-43dfdede1bd5; _ca_device_id=ca_e554ec3d-ed90-4435-bb04-e7aa5edd6161; cursor_anonymous_id=9345ad42-f5a1-47fc-b85e-03c51795a66d; __stripe_sid=068989b8-bd97-405a-a58c-d2a46f3c249744d510',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
    },
  })
  const data = await response.json()
  console.log(data)
}

getUsageSummary()
