import { ConfluenceClient } from 'confluence.js'

import { loadEnv } from '@nemo-cli/shared'

loadEnv(import.meta, '..', '..', '..', '.env')

export const HOST = 'https://antalpha.atlassian.net'
export const HOST_WIKI = `${HOST}/wiki`

const token = process.env.CONFLUENCE_API_TOKEN
const email = process.env.CONFLUENCE_EMAIL

if (!token || !email) {
  throw new Error('CONFLUENCE_API_TOKEN OR CONFLUENCE_EMAIL is not set')
}

export const client = new ConfluenceClient({
  host: HOST,
  authentication: {
    basic: {
      email,
      // Create one: https://id.atlassian.com/manage-profile/security/api-tokens
      apiToken: token,
    },
  },
})
