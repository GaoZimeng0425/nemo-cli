import { render } from '@react-email/components'
import nodemailer from 'nodemailer'
import type Mail from 'nodemailer/lib/mailer'

import { loadEnv, safeAwait } from '@nemo-cli/shared'
import { ReleaseEmail } from '../../emails/release'

loadEnv(import.meta, '..', '..', '.env')
const TO = ['gaozimeng0425@gmail.com']
const CC = ['gzm1211@126.com']

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GOOGLE_AUTH_USER,
    /** https://myaccount.google.com/apppasswords */
    pass: process.env.GOOGLE_AUTH_PASS,
  },
})

export const sendMail = async ({ id, content }: { id: number; content: { webui: string } }) => {
  if (!content.webui) return [new Error('没有上线工单'), null]
  const subject = `PRIME-${id} [上线/预发] 申请`

  const template = await ReleaseEmail({
    id,
    title: subject,
    docLink: content.webui,
  })

  const emailHtml = await render(template)

  const options: Mail.Options = {
    from: process.env.GOOGLE_AUTH_USER,
    to: TO,
    subject,
    cc: CC,
    html: emailHtml,
  }

  const result = await safeAwait(transporter.sendMail(options))
  return result
}
