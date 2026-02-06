import { mergeConfig } from '../../rolldown.config'
import { dependencies } from './package.json'

export default mergeConfig({
  external: [
    ...Object.keys(dependencies),
    '@nemo-cli/shared',
    '@nemo-cli/ui',
    'react',
    'react-reconciler',
    'ink',
    '@inkjs/ui',
    'typescript',
  ],
})
