import path from 'node:path'
import readline from 'node:readline'

import type { Command } from '@nemo-cli/shared'
import { colors, createCheckbox, createInput, exit, log, xASync } from '@nemo-cli/shared'

// Constants
const MAX_DIFF_LINES = 50 // Limit to prevent terminal overflow

/**
 * Commit data structure
 */
export interface Commit {
  hash: string
  author: string
  date: string
  message: string
  diff: string
}

/**
 * Registers the 'ng blame' command for viewing file commit history with interactive navigation
 * @param command - The commander Command instance
 * @returns The modified command instance
 */
export const blameCommand = (command: Command) => {
  command
    .command('blame [file]')
    .description('View file commit history with interactive navigation')
    .action(async (file?: string) => {
      if (!file) {
        log.show('Please specify a file path.', { type: 'error' })
        return
      }

      await handleBlame(file)
    })

  return command
}

// Cache for commits keyed by file path to avoid repeated git log calls
const commitCache = new Map<string, Array<Commit>>()

/**
 * Finalizes a commit object from partial data
 * @param currentCommit - Partial commit data
 * @param diffLines - Array of diff lines
 * @returns Complete Commit object or null if invalid
 */
const finalizeCommit = (currentCommit: Partial<Commit> | null, diffLines: string[]): Commit | null => {
  if (!currentCommit?.hash || !currentCommit.author || !currentCommit.message) {
    return null
  }
  return {
    hash: currentCommit.hash,
    author: currentCommit.author,
    date: currentCommit.date ?? '',
    message: currentCommit.message,
    diff: diffLines.join('\n'),
  }
}

const handleBlame = async (filePath: string) => {
  // F1: CRITICAL - Resolve and validate path is within current working directory
  const resolvedPath = path.resolve(filePath)
  const cwd = process.cwd()

  if (!resolvedPath.startsWith(cwd + path.sep) && resolvedPath !== cwd) {
    log.show('❌ Error: File path must be within current directory', { type: 'error' })
    return
  }

  // Check if file exists
  const [statError] = await xASync('test', ['-f', resolvedPath], { quiet: true })
  if (statError) {
    log.show(`❌ Error: File not found: ${filePath}`, { type: 'error' })
    return
  }

  // F3: HIGH - Use Map keyed by filePath for proper cache isolation
  if (!commitCache.has(resolvedPath)) {
    const prettyFormat = '%H%x00%an%x00%ad%x00%s'
    const [error, result] = await xASync('git', [
      'log',
      '--follow',
      '-p',
      `--pretty=format:${prettyFormat}`,
      '--',
      resolvedPath,
    ])

    if (error) {
      handleGitError(error, 'git log')
      return
    }

    commitCache.set(resolvedPath, parseCommitsFromLog(result.stdout))
  }

  const commits = commitCache.get(resolvedPath)!

  if (commits.length === 0) {
    log.show(`No git history found for ${filePath}`, { type: 'warn' })
    return
  }

  // Show welcome message
  log.show(colors.bold(`Found ${commits.length} commits for ${filePath}`))
  log.show(colors.dim('Use [n/p] to navigate, [j] to jump, [q] to quit'))

  await enterInteractiveBlameMode(resolvedPath, commits)
}

/**
 * Parses git log output into structured Commit objects
 * @param logOutput - Raw git log output with null separators
 * @returns Array of parsed Commit objects
 */
export const parseCommitsFromLog = (logOutput: string): Array<Commit> => {
  const commits: Array<Commit> = []

  // Git log -p output format:
  // <hash>\x00<author>\x00<date>\x00<message>
  // diff --git a/file b/file
  // ... (diff content)
  // <hash>\x00<author>\x00<date>\x00<message>
  // diff --git a/file b/file
  // ... (diff content)

  const lines = logOutput.split('\n')

  let currentCommit: Partial<Commit> | null = null
  let diffLines: string[] = []

  for (const line of lines) {
    // Check if this line is a commit header (contains null separators)
    if (line.includes('\x00')) {
      // F10: LOW - Extract duplicate commit push logic to finalizeCommit helper
      const finalized = finalizeCommit(currentCommit, diffLines)
      if (finalized) {
        commits.push(finalized)
      }

      // Parse new commit header
      const [hash, author, date, message] = line.split('\x00')

      // Only start a new commit if we have a valid hash
      if (hash && hash.length >= 8) {
        currentCommit = {
          hash: hash.substring(0, 8),
          author: author?.trim() ?? '',
          date: date?.trim() ?? '',
          message: message?.trim() ?? '',
        }
        diffLines = []
      }
    } else if (currentCommit) {
      // This is diff content for the current commit
      diffLines.push(line)
    }
  }

  // Don't forget the last commit
  const finalized = finalizeCommit(currentCommit, diffLines)
  if (finalized) {
    commits.push(finalized)
  }

  return commits
}

const showCommit = (commit: Commit, index: number, total: number) => {
  // Clear screen before showing commit
  log.clearScreen()

  // Show commit header
  log.show(`📝 Commit ${index}/${total}`)
  log.show(`${colors.cyan(commit.hash)} - ${colors.yellow(commit.author)} - ${colors.dim(commit.date)}`)
  log.show(`${commit.message}`)
  log.show(colors.bold('--- Diff ---'))

  // Check if binary file
  const isBinary = commit.diff.includes('Binary files differ')
  if (isBinary) {
    log.show('📄 Binary file - diff not available')
    log.show(commit.diff)
  } else {
    // F9: LOW - Extract magic number to constant
    const diffLines = commit.diff.split('\n')
    if (diffLines.length > MAX_DIFF_LINES) {
      log.show(colors.dim(`(Showing first ${MAX_DIFF_LINES} lines of ${diffLines.length})`))
      log.show(diffLines.slice(0, MAX_DIFF_LINES).join('\n'))
      log.show(colors.dim('\n... (truncated)'))
    } else {
      log.show(commit.diff)
    }
  }

  // Show navigation hints
  log.show(colors.bold('\n--- Actions ---'))
  log.show('[n] Next commit [p] Previous commit [j] Jump [q] Quit')
}

const enterInteractiveBlameMode = async (filePath: string, commits: Array<Commit>) => {
  if (commits.length === 0) {
    log.show('No commits to display', { type: 'warn' })
    return
  }

  let currentIndex = 0

  while (true) {
    // Show current commit
    const currentCommit = commits[currentIndex]
    if (!currentCommit) break // Should never happen, but TypeScript needs it

    await showCommit(currentCommit, currentIndex + 1, commits.length)

    // F4: HIGH - Add error handling for createCheckbox
    let input: string[] | undefined
    try {
      input = await createCheckbox({
        message: 'Enter action:',
        options: [
          {
            label: currentIndex < commits.length - 1 ? 'Next commit' : 'Next commit (already at latest)',
            value: 'n',
          },
          {
            label: currentIndex > 0 ? 'Previous commit' : 'Previous commit (already at earliest)',
            value: 'p',
          },
          { label: 'Jump to commit', value: 'j' },
          { label: 'Quit', value: 'q' },
        ],
      })
    } catch (error) {
      log.show('Error reading input. Exiting...', { type: 'error' })
      return
    }

    // F5: MEDIUM - Add safety check for empty input to prevent infinite loop
    if (!input || input.length === 0) {
      log.show('No input received. Exiting...', { type: 'warn' })
      break
    }

    // Handle action
    if (input[0] === 'q') {
      exit(0)
    }

    if (input[0] === 'n' && currentIndex < commits.length - 1) {
      currentIndex++
    } else if (input[0] === 'p' && currentIndex > 0) {
      currentIndex--
    } else if (input[0] === 'j') {
      // Jump to specific commit
      log.show(`\nEnter commit number (1-${commits.length}):`)
      const jumpInput = await readUserInput()
      const jumpNum = Number.parseInt(jumpInput, 10)

      if (!isNaN(jumpNum) && jumpNum >= 1 && jumpNum <= commits.length) {
        currentIndex = jumpNum - 1
      } else {
        log.show(`Invalid number. Please enter 1-${commits.length}`, { type: 'error' })
        // Brief pause to show error
        await new Promise((resolve) => setTimeout(resolve, 1500))
      }
    }
  }
}

// F2: CRITICAL - Add proper cleanup on SIGINT to prevent resource leak
const readUserInput = (): Promise<string> => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    const cleanup = () => {
      rl.close()
      rl.removeAllListeners()
    }

    rl.on('SIGINT', () => {
      cleanup()
      exit(0)
    })

    rl.question('', (answer) => {
      cleanup()
      resolve(answer.trim())
    })
  })
}

const handleGitError = (error: Error, context: string) => {
  const errorMessage = error.message || String(error)

  if (errorMessage.includes('not a git repository')) {
    log.show('❌ Error: Not in a git repository', { type: 'error' })
    return
  }

  if (errorMessage.includes('does not exist') || errorMessage.includes('no such file')) {
    log.show('❌ Error: File not found', { type: 'error' })
    return
  }

  log.show(`❌ Error: ${errorMessage}`, { type: 'error' })
}
