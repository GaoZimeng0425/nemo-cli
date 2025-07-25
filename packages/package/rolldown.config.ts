import { mergeConfig } from '../../rolldown.config'
import { dependencies } from './package.json'

export default mergeConfig({
  external: Object.keys(dependencies),
})
