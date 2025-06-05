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
  $ ng list
  $ ng push
    `,
  main: `
Example:
  $ ng --version
  $ ng --help
  $ ng <command> [options]
  `,
  list: createHelpExample('ng ls'), // Example for the interactive list command
  push: createHelpExample('ng p'), // Example for the interactive push command
}

export const ERROR_MESSAGE = {
  notRootWorkspace: "It's not workspace root directory, Please open this command in the workspace root directory",
}
