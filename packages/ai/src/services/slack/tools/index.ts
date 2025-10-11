import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { SlackEventMiddlewareArgs } from '@slack/bolt'
import { generateText } from 'ai'

import { getPRDTool } from './getPRD'
import { sendEmailTool } from './sendEmail'

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
})

export const tools = [getPRDTool, sendEmailTool]

export const generateTools = ({ message, say }: SlackEventMiddlewareArgs<'message'>) => {
  if (message.subtype) return
  const text = message.text ?? ''
  if (!text) return null
  return generateText({
    model: google('gemini-2.5-flash'),
    tools: {
      ...getPRDTool({
        onSuccess: (content) => {
          say({
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `<@${message.user}> ${content!.title}`,
                },
                accessory: {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'View Page',
                  },
                  url: content!.webui,
                },
              },
            ],
            text: `<@${message.user}>`,
          })
        },
        onFailure: () => {
          say({
            blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '获取需求文档地址失败' } }],
            text: '获取需求文档地址失败',
          })
        },
      }),
      ...sendEmailTool({
        onSuccess: (result: string) => {
          say({
            blocks: [{ type: 'section', text: { type: 'mrkdwn', text: result } }],
            text: result,
          })
        },
        onFailure: () => {
          say({
            blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '发送上线邮件失败' } }],
            text: '发送上线邮件失败',
          })
        },
      }),
    },
    temperature: 0,
    prompt: text,
  })
}
