const createHelpExample = (...commands: string[]) => {
  const commandsString = commands.map((command) => `  $ ${command}`).join('\n')
  return `
Example:
${commandsString}
`
}
export const HELP_MESSAGE = {
  install: `
Example:
  $ n pnpm install commander inquirer
  $ n pnpm install typescript rollup vitest --dev --exact
    `,
  pnpm: `
Example:
  $ n pnpm --version
  $ n pnpm --help
  $ n pnpm <command> [options]
  `,
  clean: createHelpExample('n pnpm clean [dirname]'),
  up: createHelpExample('n pnpm up')
}

export const ERROR_MESSAGE = {
  notRootWorkspace:
    "It's not workspace root directory, Please open this command in the workspace root directory"
}
