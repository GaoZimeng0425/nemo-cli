import type { Command, PackageInfo } from '@nemo-cli/shared'
import { createCheckbox, createSpinner, getDiffFiles, getWorkspacePackages, log, sleep } from '@nemo-cli/shared'

import { astHandler } from './ast-handle'

export const astFilesCommand = (program: Command) => {
  program
    .command('ast')
    .option('-a, --all', 'all files', false)
    .option('--incremental', 'incremental', true)
    .option('-e, --exclude <dirs>', 'exclude directories (comma-separated)')
    .description('ast file which you choose')
    .action(async ({ all, incremental, exclude }: { all: boolean; incremental: boolean; exclude?: string }) => {
      const files: PackageInfo[] = []
      if (all) {
        const packages = await getWorkspacePackages()
        files.push(...packages)
      } else if (incremental) {
        const packages = await getDiffFiles()
        console.log('🚀 : astFilesCommand : packages:', packages)
        // files.push(...packages)
      }
      if (!files.length) {
        return log.show('file No file selected', { type: 'error' })
      }
      const cwd = process.cwd()

      const choices = await createCheckbox({
        message: 'Choose file you want to ast',
        options: files.map((item) => ({ label: item.name, value: item.path })),
      })

      if (!choices.length) {
        return log.show('file No file selected')
      }

      for (const file of choices) {
        const filePath = file.startsWith('/') ? file : `${cwd}/${file}`
        try {
          // // 解析排除目录列表
          const excludeDirs = exclude
            ?.split(',')
            .map((dir) => dir.trim())
            .filter((dir) => dir.length > 0)

          const spinner = createSpinner(`Analyzing ${filePath}...`)
          await sleep(300)
          const literals = await astHandler(filePath, { excludeDirs })
          spinner.stop(`Analyzing ${filePath} done`)
          await sleep(300)

          if (literals.length === 0) {
            spinner.stop('No Chinese literals found')
            return
          }
          spinner.stop('Analyzing done')

          for (const item of literals) {
            if (item.identifiers.length > 0) {
              log.show(`${item.filePath}:`, { type: 'success' })
              log.show(`${item.identifiers.join('\n')}`, { type: 'success' })
            }
          }
        } catch (e: any) {
          log.show(`Failed to process ${file}: ${e.message}`, { type: 'error' })
        }
      }
    })
}
