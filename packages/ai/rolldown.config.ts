import { loadEnv } from '@nemo-cli/shared'
import { mergeConfig } from '../../rolldown.config'
import { dependencies } from './package.json'

loadEnv(import.meta, '.env')

export default mergeConfig({
  define: {
    'process.env.SLACK_BOT_TOKEN': JSON.stringify(process.env.SLACK_BOT_TOKEN ?? ''),
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY ?? ''),
    'process.env.GOOGLE_API_KEY': JSON.stringify(process.env.GOOGLE_API_KEY ?? ''),
    'process.env.CONFLUENCE_API_TOKEN': JSON.stringify(process.env.CONFLUENCE_API_TOKEN ?? ''),
    'process.env.CONFLUENCE_EMAIL': JSON.stringify(process.env.CONFLUENCE_EMAIL ?? ''),
    'process.env.SLACK_SIGNING_SECRET': JSON.stringify(process.env.SLACK_SIGNING_SECRET ?? ''),
    'process.env.SLACK_APP_TOKEN': JSON.stringify(process.env.SLACK_APP_TOKEN ?? ''),
  },
  external: Object.keys(dependencies),
})
