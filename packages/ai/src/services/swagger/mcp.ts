import type { FastMCP } from 'fastmcp'
import z from 'zod'

import { getJSON } from '.'

export const addSwaggerMCP = (server: FastMCP) => {
  server.addTool({
    name: 'getSwaggerJson',
    description: 'Get Swagger JSON',
    parameters: z.object({
      APIUrl: z.string(),
    }),
    execute: async ({ APIUrl }): Promise<any> => {
      const response = await getJSON(APIUrl)
      return response
    },
  })
}
