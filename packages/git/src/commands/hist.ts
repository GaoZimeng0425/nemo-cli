import type { Command } from '@nemo-cli/shared'
import { renderHistViewer } from '@nemo-cli/ui'

export const histCommand = (command: Command) => {
  command
    .command('hist')
    .alias('history')
    .description('Show git history with beautiful graph format')
    .option('-n, --number <count>', 'Limit number of commits to show')
    .action(async (options: { number?: string }) => {
      const maxCount = options.number ? Number.parseInt(options.number, 10) : undefined
      await renderHistViewer(maxCount)
    })

  return command
}
