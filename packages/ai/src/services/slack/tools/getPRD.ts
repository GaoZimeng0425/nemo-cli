import { tool } from 'ai'
import z from 'zod/v4'

import { fuzzySearchContent } from '../../confluence/getContent'

type GetPRDToolProps = {
  onSuccess: (content: Awaited<ReturnType<typeof fuzzySearchContent>>) => void
  onFailure: (error: string) => void
}
export const getPRDTool = ({ onSuccess, onFailure }: GetPRDToolProps) => {
  return {
    getPRDTool: tool({
      description: '获取需求文档地址',
      inputSchema: z.object({
        id: z.number(),
      }),
      outputSchema: z.object({
        webui: z.string().describe('需求文档地址'),
      }),
      execute: async ({ id }) => {
        if (!id) {
          onFailure('请提供上线工单 id')
          return
        }
        const content = await fuzzySearchContent({ id: Number(id) })
        if (!content) {
          onFailure('未找到内容')
          return
        }
        onSuccess(content)
        return content
      },
    }),
  }
}
