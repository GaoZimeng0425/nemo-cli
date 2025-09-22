import type { FastMCP } from 'fastmcp'
import z from 'zod'

import { openBrowser } from '@nemo-cli/shared'
import { createPage } from './createContent'
import { fuzzySearchContent } from './getContent'

export const addConfluenceMCP = (server: FastMCP) => {
  server.addTool({
    name: 'createReleasePage',
    description: 'Create Confluence release page',
    parameters: z.object({
      id: z.number(),
    }),
    execute: async ({ id }) => {
      const link = await createPage({ id })
      return link ? `Success to Create Release Doc Page ${id}. link: ${link}` : `Failed Create Release Doc Page ${id}`
    },
  })
  server.addTool({
    name: 'openConfluence',
    description: 'Open Confluence page by id',
    parameters: z.object({
      id: z.number(),
    }),
    execute: async ({ id }) => {
      const result = await fuzzySearchContent({ id })
      if (!result) return `Failed Search Confluence Page ${id}`

      openBrowser(result.webui)

      return `
Success to open Confluence Page ${id}.
title: ${result.title}
link: ${result.webui}
    `
    },
  })
}
