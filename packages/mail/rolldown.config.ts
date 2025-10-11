import { loadEnv } from '@nemo-cli/shared'
import { mergeConfig } from '../../rolldown.config'
import { dependencies } from './package.json'

loadEnv(import.meta, '.env')

export default mergeConfig({
  define: {
    'process.env.GOOGLE_AUTH_PASS': JSON.stringify(process.env.GOOGLE_AUTH_PASS),
    'process.env.GOOGLE_AUTH_USER': JSON.stringify(process.env.GOOGLE_AUTH_USER),
  },
  external: Object.keys(dependencies),
})
