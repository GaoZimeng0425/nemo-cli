import type { FastMCP } from 'fastmcp'
import z from 'zod'

import { sendMail } from '@nemo-cli/mail'
import { fuzzySearchContent } from '../confluence/getContent'

export const addMailMCP = (server: FastMCP) => {
  server.addTool({
    name: 'sendReleaseMail',
    description: 'send release mail',
    parameters: z.object({
      id: z.number(),
    }),
    execute: async ({ id }) => {
      const content = await fuzzySearchContent({ id, release: true })

      if (!content) return 'Not Found Confluence Page, Please Check the ID or Create the Release Confluence Page'

      const [error] = await sendMail({ id, content })

      if (error) return `Failed to send mail, Message: ${error.message}`
      return 'Success to send mail'
    },
  })
}
