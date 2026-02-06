import { createHelpExample } from '@nemo-cli/shared'

export const HELP_MESSAGE = {
  main: createHelpExample('ng --version', 'ng --help', 'ng <command> [option]'),
  branch: createHelpExample('ng branch --version', 'ng branch --help', 'ng branch <command> [option]'),
  branchDelete: createHelpExample(
    'ng branch delete --version',
    'ng branch delete --help',
    'ng branch delete <command> [option]'
  ),
  branchClean: createHelpExample('ng branch clean --version', 'ng branch clean --help'),
  branchList: createHelpExample('ng branch list --version', 'ng branch list --help', 'ng branch list [option]'),
}
