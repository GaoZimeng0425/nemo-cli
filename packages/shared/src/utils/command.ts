import { Command } from 'commander'
import { type Options, x as tinyexec } from 'tinyexec'

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

export const x = (command: string, args?: string[], options?: Partial<Options>) => tinyexec(command, args, options)

export type { Command }
