import { Command } from 'commander'

export const createHelpExample = (...commands: string[]) => {
  const commandsString = commands.map((command) => `  $ ${command}`).join('\n')
  return `
Example:
${commandsString}
`
}

export const createCommand = (name: string) => {
  const command = new Command(name)
  command.allowExcessArguments()
  command.allowUnknownOption()

  return command
}
