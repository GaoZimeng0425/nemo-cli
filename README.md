# nemo-cli

[![npm version](https://img.shields.io/npm/v/@nemo-cli/git.svg)](https://www.npmjs.com/package/@nemo-cli/git)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

> A powerful CLI toolkit for developers, including Git workflow, file operations, package management, and AI integration.

## Features

- **Git Operations** (`ng`) - Enhanced Git workflow with interactive prompts
- **File Operations** (`nf`) - File management utilities with AST support
- **Package Management** (`np`) - Simplified pnpm workspace operations
- **AI Integration** (`na`) - AI-powered CLI with MCP protocol support

## Requirements

- Node.js `^20.19.0` or `>=22.12.0`
- pnpm (recommended)

## Installation

```bash
# Git CLI
npm install -g @nemo-cli/git

# File CLI
npm install -g @nemo-cli/file

# Package CLI
npm install -g @nemo-cli/package

# AI CLI
npm install -g @nemo-cli/ai
```

Or install all at once:

```bash
npm install -g @nemo-cli/git @nemo-cli/file @nemo-cli/package @nemo-cli/ai
```

## Usage

### Git Operations (`ng`)

```bash
# Show help
ng -h
ng <command> -h

# Interactive commit with conventional commits
ng commit

# Pull with auto stash/pop
ng pull       # or: ng pl
ng pull -r    # rebase mode

# Push current branch
ng push       # or: ng ps

# Checkout branch with auto stash/pop
ng checkout   # or: ng co
ng co -l      # local branches
ng co -r      # remote branches

# Create new branch
ng co -b                    # interactive
ng co -b feature/my-branch  # direct

# Branch management
ng branch delete      # delete local branches
ng branch delete -r   # delete remote branches
ng branch clean       # clean merged branches

# List branches
ng list       # or: ng ls
ng ls -l      # local only
ng ls -r      # remote only

# Merge branches
ng merge      # or: ng mg

# Stash operations
ng stash
ng stash history  # Persistent history with metadata

# View diff
ng diff
```

### File Operations (`nf`)

```bash
# Delete files
nf delete [...filenames]

# Clean project
nf clean

# List directory contents
nf list [...dirnames]
```

### Package Management (`np`)

```bash
# Add dependencies
np add [...packages]
np add -D -E              # devDependencies, exact version
np add [...packages] -S   # save to dependencies

# Remove dependencies
np remove

# Upgrade dependencies
np upgrade
```

### AI Integration (`na`)

```bash
# Start AI CLI
na
```

#### MCP Server Setup

1. Build the project: `pnpm build`
2. Add to your MCP client config:

```json
{
  "Prime Workflow": {
    "command": "node",
    "args": ["/path/to/nemo-cli/packages/ai/dist/index.js"]
  }
}
```

#### Available MCP Features

- Open Confluence documents
- Send deployment emails
- Create deployment tickets

## Development

```bash
# Clone repository
git clone https://github.com/GaoZimeng0425/nemo-cli.git
cd nemo-cli

# Install dependencies
pnpm install

# Start development
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Code quality check
pnpm check
```

## Packages

| Package | Command | Description |
|---------|---------|-------------|
| [@nemo-cli/git](https://www.npmjs.com/package/@nemo-cli/git) | `ng` | Git workflow enhancement |
| [@nemo-cli/file](https://www.npmjs.com/package/@nemo-cli/file) | `nf` | File operations |
| [@nemo-cli/package](https://www.npmjs.com/package/@nemo-cli/package) | `np` | pnpm workspace helper |
| [@nemo-cli/ai](https://www.npmjs.com/package/@nemo-cli/ai) | `na` | AI-powered CLI |
| [@nemo-cli/mail](https://www.npmjs.com/package/@nemo-cli/mail) | - | Email utilities |
| [@nemo-cli/shared](https://www.npmjs.com/package/@nemo-cli/shared) | - | Shared utilities |
| [@nemo-cli/ui](https://www.npmjs.com/package/@nemo-cli/ui) | - | Terminal UI components |

## License

ISC © [gaozimeng](https://github.com/GaoZimeng0425)
