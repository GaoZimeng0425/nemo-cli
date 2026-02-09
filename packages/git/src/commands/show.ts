import type { Command } from '@nemo-cli/shared'
import { renderCommitDetail, renderCommitViewer } from '@nemo-cli/ui'

export const showCommand = (command: Command) => {
  command
    .command('show [hash]')
    .description('Show commit details (interactive viewer)')
    .option('-n, --number <count>', 'Limit number of commits to show in selector')
    .action(async (hash: string | undefined, options: { number?: string }) => {
      if (hash) {
        // Direct mode: show commit detail directly
        await renderCommitDetail(hash)
      } else {
        // Interactive mode: show commit selector first
        const maxCount = options.number ? Number.parseInt(options.number, 10) : undefined

        // Show commit selector and wait for selection
        const selectedHash = await renderCommitViewer(maxCount)

        // After selection, show commit detail
        if (selectedHash) {
          await renderCommitDetail(selectedHash)
        }
      }
    })

  return command
}
