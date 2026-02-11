import { createCommand, readPackage } from '@nemo-cli/shared'
import { aiCommand, analyzeCommand, pageCommand } from './cli/index.js'

const pkg = readPackage(import.meta, '..')

export const init = () => {
  const command = createCommand('nd')
    .version(pkg.version)
    .description(`${pkg.name} - Analyze dependencies of Next.js App Router projects`)

  command.addCommand(analyzeCommand())
  command.addCommand(aiCommand())
  command.addCommand(pageCommand())

  return command
}

export const run = () => {
  const command = init()
  command.parse(process.argv)
}
