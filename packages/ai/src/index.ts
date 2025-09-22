import { FastMCP } from 'fastmcp'

import { addConfluenceMCP } from './services/confluence/mcp'
import { addMailMCP } from './services/mails/mcp'

const server = new FastMCP({
  name: 'Prime Workflow',
  version: '0.0.1',
})

addConfluenceMCP(server)
addMailMCP(server)

server.start({
  transportType: 'stdio',
})
