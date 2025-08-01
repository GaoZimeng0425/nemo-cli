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
  $ np install commander @inquirer/prompts
  $ np install typescript unbuild vitest --dev --exact
    `,
  main: `
Example:
  $ np --version
  $ np --help
  $ np <command> [options]
  `,
  clean: createHelpExample('np clean [dirname]'),
  up: createHelpExample('np up'), // Example for the refactored interactive upgrade command
  remove: createHelpExample('np remove'), // Example for the interactive remove command
  list: createHelpExample('np list'), // Example for the interactive list command
  add: createHelpExample('np add', 'np add -p my-package dep1 dep2'),
}

export const ERROR_MESSAGE = {
  notRootWorkspace: "It's not workspace root directory, Please open this command in the workspace root directory",
}
