import { App, type SlackEventMiddlewareArgs } from '@slack/bolt'

import { createSpinner } from '@nemo-cli/shared'
import { generateTools } from './tools'

// 初始化 Slack 应用
export const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
})

const ACTION_ID = 'send_email_action'

// app.message('hello', async ({ message, say }) => {
//   // say() sends a message to the channel where the event was triggered
//   console.log(message, '<<<<')
//   console.log(message.event_ts, '<<<<')
//   console.log(message.user, '<<<<')
//   console.log(message.ts, '<<<<')
//   await say({
//     blocks: [
//       {
//         type: 'section',
//         text: {
//           type: 'mrkdwn',
//           text: `Hey there <@${message.user}>!`,
//         },
//         accessory: {
//           type: 'button',
//           text: {
//             type: 'plain_text',
//             text: 'Click Me',
//           },
//           action_id: ACTION_ID,
//         },
//       },
//     ],
//     text: `Hey there <@${message.user}>!`,
//   })
// })

app.message(':wave:', async ({ message, say }) => {
  // Handle only newly posted messages here
  if (
    message.subtype === undefined ||
    message.subtype === 'bot_message' ||
    message.subtype === 'file_share' ||
    message.subtype === 'thread_broadcast'
  ) {
    await say(`Hello, <@${message.user}>`)
  }
})

// biome-ignore lint/correctness/noUnusedFunctionParameters: ignore
app.action(ACTION_ID, async ({ body, ack, client, respond }) => {
  await ack()
  // Use client.chat.postMessage instead of say, as say is not available in action middleware

  // const channelId = body.channel?.id ?? body.user.id
  // await client.chat.postMessage({
  //   channel: channelId,
  //   text: `<@${body.user.id}> clicked the button`,
  // })
  await respond({
    text: `已处理来自 <@${body.user.id}> 的点击`,
    response_type: 'ephemeral',
  })
})

app.message(async ({ message, say, ...props }: SlackEventMiddlewareArgs<'message'>) => {
  if (message.subtype) return

  const response = await generateTools({ message, say, ...props })
  console.log(JSON.stringify(response?.content, null, 2))
  console.log(JSON.stringify(response?.reasoning, null, 2))
})

const REPLACE_BOT_EXPRESSION = /<@.*?>/
app.event('app_mention', async ({ event, say }) => {
  try {
    const userMessage = event.text.replace(REPLACE_BOT_EXPRESSION, '').trim()

    const text = `你好 <@${event.user}>！你刚才说：*${userMessage}*`
    // 回复用户
    await say({
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text },
        },
      ],
      text,
      thread_ts: event.ts,
    })
  } catch (error) {
    console.error('Error responding to mention:', error)
  }
})

export const run = async () => {
  const spinner = createSpinner('Slack Bot starting up...')
  try {
    await app.start(process.env.PORT || 3000)
    spinner.stop('Slack Bot started')
  } catch (error) {
    spinner.stop('Slack Bot failed to start')
    console.error('Error starting Slack Bot:', error)
  }
}
