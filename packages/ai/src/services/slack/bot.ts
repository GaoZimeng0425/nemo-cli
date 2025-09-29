import SlackBolt from '@slack/bolt'

import { createSpinner, loadEnv } from '@nemo-cli/shared'
import { translateChat } from '../chat'

loadEnv(import.meta, '..', '..', '..', '..', '..', '.env')

// 初始化 Slack 应用
export const app = new SlackBolt.App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
})

const ACTION_ID = 'button_click'

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
//           text: `Hey there <@${message.user}>! !!asd;lfj asdlfjas `,
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

// app.action(ACTION_ID, async ({ body, ack, say }) => {
//   // Acknowledge the action
//   await ack()
//   await say(`<@${body.user.id}> clicked the button`)
// })

app.message(async ({ message, say }) => {
  const response = await translateChat({ message: message.text })

  await say({
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<@${message.user}> ${response.text}`,
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Click Me',
          },
          action_id: ACTION_ID,
        },
      },
    ],
    text: `<@${message.user}>!`,
  })
})

app.event('app_mention', async ({ event, say }) => {
  try {
    // 提取用户发送的消息（去除 @ 机器人部分）
    const userMessage = event.text.replace(/<@.*?>/, '').trim()

    // 回复用户
    await say({
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `你好 <@${event.user}>！你刚才说：*${userMessage}*`,
          },
        },
      ],
      text: `你好 @${event.user}！你刚才说：${userMessage}`,
    })
  } catch (error) {
    console.error('Error responding to mention:', error)
  }
})

const run = async () => {
  const spinner = createSpinner('Slack Bot starting up...')
  try {
    await app.start(process.env.PORT || 3000)
    spinner.stop('Slack Bot started')
  } catch (error) {
    spinner.stop('Slack Bot failed to start')
    console.error('Error starting Slack Bot:', error)
  }
}

run()
