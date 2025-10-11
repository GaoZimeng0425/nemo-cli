import type { FastMCP } from 'fastmcp'
import z from 'zod'

import { sendReleaseMail } from '@nemo-cli/mail'
import { fuzzySearchContent } from '../confluence/getContent'

export const executeSendReleaseMail = async ({ id }: { id: number }) => {
  const content = await fuzzySearchContent({ id, release: true })

  if (!content) return 'Not Found Confluence Page, Please Check the ID or Create the Release Confluence Page'

  const [error] = await sendReleaseMail({ id, content })

  if (error) return `Failed to send mail, Message: ${error.message}`
  return 'Success to send mail'
}

export const addMailMCP = (server: FastMCP) => {
  server.addTool({
    name: 'sendReleaseMail',
    description: 'send release mail',
    parameters: z.object({
      id: z.number(),
    }),
    execute: executeSendReleaseMail,
  })
}
