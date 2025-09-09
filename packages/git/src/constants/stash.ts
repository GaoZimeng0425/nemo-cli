import { createHelpExample } from '@nemo-cli/shared'

export const HELP_MESSAGE = {
  main: createHelpExample(
    'ng stash',
    'ng stash save "work in progress"',
    'ng stash ls',
    'ng stash pop',
    'ng stash drop'
  ),
  save: createHelpExample('ng stash save "work in progress"'),
  list: createHelpExample('ng stash ls'),
  pop: createHelpExample('ng stash pop'),
  drop: createHelpExample('ng stash drop'),
}

export const ERROR_MESSAGE = {
  notRootWorkspace: "It's not workspace root directory, Please open this command in the workspace root directory",
}
