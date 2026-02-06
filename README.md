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

#### Top-Level Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `ng pull` | `ng pl` | Pull git branch with auto stash/pop |
| `ng push` | `ng ps` | Push current branch to remote |
| `ng checkout` | `ng co` | Checkout a branch with auto stash/pop |
| `ng diff` | `ng di` | Show differences between branches |
| `ng merge` | `ng mg` | Merge branches |
| `ng blame` | - | View file commit history with interactive navigation |
| `ng commit` | - | Interactive commit with conventional commits |
| `ng status` | `ng s` | Show working tree status (interactive viewer) |
| `ng hist` | `ng history` | Show git history with beautiful graph format |
| `ng config` | - | Interactive git configuration manager |

#### Branch Management (`ng branch`)

| Command | Alias | Description |
|---------|-------|-------------|
| `ng branch clean` | - | Clean merged branches |
| `ng branch delete` | - | Delete local/remote branches |
| `ng branch list` | `ng branch ls` | List all branches |

#### Stash Management (`ng stash`)

| Command | Alias | Description |
|---------|-------|-------------|
| `ng stash save` | `ng stash s` | Save current changes to stash |
| `ng stash list` | `ng stash ls` | List all stashes |
| `ng stash pop` | `ng stash p` | Pop the most recent stash |
| `ng stash drop` | `ng stash d` | Drop/clear stashes |
| `ng stash clear` | `ng stash c` | Clear all stashes |
| `ng stash history` | `ng stash his` | View stash history from persistent index |

#### Common Usage Examples

```bash
# Show help
ng -h
ng <command> -h

# Pull with rebase mode
ng pull -r

# Create and checkout new branch
ng co -b feature/my-branch

# Delete branches
ng branch delete      # delete local branches
ng branch delete -r   # delete remote branches

# List branches
ng branch list        # all branches
ng branch ls -l       # local only
ng branch ls -r       # remote only

# View file history
ng blame <file-path>

# Git history viewer
ng hist -n 20  # limit to 20 commits
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

### Release

```bash
# Interactive release with package selection
pnpm release

# Bump patch version
pnpm release patch

# Bump minor version
pnpm release minor

# Bump major version
pnpm release major

# Dry run (no changes)
pnpm release --dry-run
```

**Features:**
- 📦 **Package Selection** - Choose specific packages to release (default: all)
- 🔗 **Dependency Auto-Include** - Automatically includes workspace dependencies
- ✅ **Version Validation** - Warns if selected packages have inconsistent versions
- 🚀 **Smart Version Bump** - Only updates root version when releasing all packages

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
