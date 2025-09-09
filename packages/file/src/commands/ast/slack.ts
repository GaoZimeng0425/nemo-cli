import { isEmpty } from '@nemo-cli/shared'
import { ErrorCode, WebClient } from '@slack/web-api'

const web = new WebClient(process.env.SLACK_TOKEN)
const SlackMessage = {
  title: (title: string) => {
    return {
      type: 'header',
      text: {
        type: 'plain_text',
        text: title,
        emoji: true,
      },
    }
  },
  content: (content: string[]) => {
    return {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: content.map((item) => `> ${item}`).join('\n'),
      },
    }
  },
  button: (text: string, url: string) => {
    return {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: text,
            emoji: true,
          },
          url: url,
        },
      ],
    }
  },
  table: (data: Record<string, PropertyKey>[]) => {
    if (isEmpty(data)) return { type: 'table', rows: [] }
    const header = Object.keys(data[0]!).map((t) => SlackMessage.tableRow(t, { bold: true }))
    const body = data.map((v) => Object.values(v).map((v) => SlackMessage.tableRow(v.toString())))
    console.log(body)
    return {
      type: 'table',
      rows: [header, ...body],
    }
  },
  tableRow: (text: string, style: { bold?: boolean } = {}) => {
    return {
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_section',
          elements: [
            {
              type: 'text',
              text: text,
              style,
            },
          ],
        },
      ],
    }
  },
  format: (words: string[]) => {
    const showMore = words.length > 5
    const result = (showMore ? words.slice(0, 5) : words).map((w, i) => ({ column: (i + 1).toString(), word: w }))
    return result.concat(
      showMore
        ? [
            { column: '...', word: '...' },
            { column: 'Total', word: words.length.toString() },
          ]
        : []
    )
  },
}

const data = SlackMessage.format(['asldla', 'a[dlfiqw123', 'doc', '4lwodjqui', '5lsdl', '6123123b', '65 s'])
export const sendMessage = async (_message: string) => {
  await web.chat.postMessage({
    channel: 'C09D00FR465',
    text: '',
    blocks: [
      SlackMessage.title('新增词汇'),
      SlackMessage.content(['标题：网站登录问题', '优先级：高', '状态：待处理', '辛苦 <@U06UBU4E40L> 处理']),
      SlackMessage.table(data),
      SlackMessage.button('Crowdin 翻译地址 - zh-TW', ''),
      SlackMessage.button('Crowdin 翻译地址 - en-US', ''),
    ],
  })
}

const run = async () => {
  try {
    const info = await sendMessage('你好啊')
    console.log('🚀 : run : info:', info)
    // biome-ignore lint/suspicious/noExplicitAny: any
  } catch (error: any) {
    if (error.code === ErrorCode.PlatformError) {
      console.log(error.data)
    } else {
      // Some other error, oh no!
      console.log('Well, that was unexpected.')
    }
  }
}

run()
