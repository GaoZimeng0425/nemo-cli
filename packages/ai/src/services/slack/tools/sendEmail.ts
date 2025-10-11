import { tool } from 'ai'
import z from 'zod/v4'

import { executeSendReleaseMail } from '../../mails/mcp'

type SendEmailToolProps = {
  onSuccess: (content: Awaited<ReturnType<typeof executeSendReleaseMail>>) => void
  onFailure: (error: string) => void
}
export const sendEmailTool = ({ onSuccess, onFailure }: SendEmailToolProps) => {
  return {
    sendEmailTool: tool({
      description: '发送上线邮件',
      inputSchema: z.object({
        id: z.number().describe('上线工单 id'),
      }),
      execute: async ({ id }) => {
        if (!id) {
          onFailure('请提供上线工单 id')
          return
        }
        const result = await executeSendReleaseMail({ id })
        onSuccess(result)
        return result
      },
    }),
  }
}
