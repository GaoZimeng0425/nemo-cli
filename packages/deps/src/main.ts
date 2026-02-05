import { createCommand, readPackage } from '@nemo-cli/shared'
import { analyzeCommand } from './cli/index.js'

const pkg = readPackage(import.meta, '..')

export const init = () => {
  const command = createCommand('ndeps')
    .version(pkg.version)
    .description(`${pkg.name} - Analyze dependencies of Next.js App Router projects`)

  command.addCommand(analyzeCommand())

  return command
}

export const run = () => {
  const command = init()
  command.parse(process.argv)
}
