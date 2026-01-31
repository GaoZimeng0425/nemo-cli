# `@nemo-cli/git`

> Enhanced Git workflow CLI with interactive prompts, automatic stash handling, and conventional commits support.

## Installation

```bash
# Global installation (recommended)
npm install -g @nemo-cli/git

# Or using pnpm
pnpm add @nemo-cli/git --global
```

## Key Features

- **Interactive Prompts**: User-friendly interface for all git operations
- **Auto Stash/Pop**: Automatically stashes changes before checkout/merge/pull, then restores them
- **Conventional Commits**: Interactive commit wizard with type/scope selection from your commitlint config
- **Smart Branch Management**: Advanced branch operations with merge status and time filtering
- **Ticket Auto-Detection**: Automatically extracts ticket numbers from branch names for commit messages

## Usage

The CLI provides the `ng` command as an enhanced replacement for git operations.

### Getting Help

```bash
# Show main help
ng -h

# Show help for specific command
ng <command> -h
# Example:
ng commit -h
ng branch -h
```

---

## Commands

### Commit (`ng commit`)

Interactive commit workflow with conventional commits support.

```bash
ng commit
```

**Features:**
- ✅ Shows staged and unstaged files
- ✅ Interactive file selection for staging
- ✅ Runs `lint-staged` before committing (configurable)
- ✅ Reads commit type and scope from your `commitlint.config.*`
- ✅ Auto-detects ticket number from branch name
  - Supports: `feature/PRIME-1500`, `JIRA-123`, `123`, etc.
- ✅ Validates commit message (max 80 chars for title)
- ✅ Optional body/description
- ✅ Commit preview with colored output
- ✅ Optional push after commit

**Supported ticket formats:**
- `PRIME-1500`, `JIRA-123` (slash format)
- `PRIME_1500`, `JIRA_123` (underscore format)
- `1500` (number only)

---

### Pull (`ng pull` / `ng pl`)

Pull changes with automatic stash handling.

```bash
# Interactive mode (default)
ng pull

# Rebase mode
ng pull -r
ng pull --rebase

# Merge mode (default)
ng pull -m
ng pull --merge
```

**Features:**
- ✅ Select any remote branch to pull
- ✅ Auto stash before pull, pop after
- ✅ Choose between merge or rebase mode
- ✅ Defaults to pulling current branch

---

### Push (`ng push` / `ng ps`)

Push current branch to remote.

```bash
ng push
```

**Features:**
- ✅ Pushes current branch to remote
- ✅ Interactive confirmation

---

### Checkout (`ng checkout` / `ng co`)

Switch branches with automatic stash handling.

```bash
# Interactive branch selection (default: local)
ng checkout

# Local branches only
ng checkout -l

# Remote branches only
ng checkout -r

# Create and checkout new branch
ng checkout -b
ng checkout -b feature/my-branch
```

**Creating new branches:**

```bash
# Interactive creation with branch type prefix
ng co -b
# Prompts you to select:
# 1. Branch type: feature/PRIME-, feature/, bugfix/
# 2. Branch name (max 15 chars)

# Direct creation
ng co -b feature/PRIME-1500
```

**Features:**
- ✅ Auto stash before checkout, pop after
- ✅ Interactive branch selection
- ✅ Separate lists for local and remote branches
- ✅ Create new branch with prefix templates
- ✅ Branch name validation

---

### Branch Management (`ng branch`)

Advanced branch operations.

#### Delete Branches

```bash
# Delete local branches
ng branch delete

# Delete remote branches
ng branch delete -r
ng branch delete --remote
```

**Features:**
- ✅ Shows merge status: `(merged)` or `(not merged)`
- ✅ Displays last commit time
- ✅ Multi-select support
- ✅ Safety check for unmerged branches (requires confirmation)
- ✅ Excludes: `main`, `master`, `develop`

#### Clean Merged Branches

```bash
ng branch clean
```

**Features:**
- ✅ Only deletes branches merged to main/master/develop
- ✅ Time-based filtering:
  - All merged branches
  - Merged branches older than 1 month
  - Merged branches older than 3 months
  - Merged branches older than 1 year
- ✅ Shows list of branches before deletion
- ✅ Interactive confirmation

---

### List Branches (`ng list` / `ng ls`)

List branches with current branch indicator.

```bash
# List all branches (default)
ng list

# Local branches only
ng list -l
ng list --local

# Remote branches only
ng list -r
ng list --remote
```

**Features:**
- ✅ Shows branch counts
- ✅ Highlights current branch
- ✅ Separate sections for local and remote branches

---

### Merge Branches (`ng merge` / `ng mg`)

Merge branches with automatic stash handling.

```bash
# Interactive branch selection
ng merge

# Direct merge
ng merge feature/my-branch

# Merge local branch
ng merge -l

# Merge remote branch
ng merge -r
```

**Features:**
- ✅ Auto stash before merge, pop after
- ✅ Interactive branch selection with search
- ✅ Supports both local and remote branches
- ✅ Interactive confirmation for remote branches
- ✅ Direct argument support for quick merges

---

### Stash Operations (`ng stash` / `ng st`)

Advanced stash management.

#### Save Changes

```bash
# Save with default message
ng stash save

# Save with custom message
ng stash save "work in progress"
```

#### List Stashes

```bash
ng stash list
ng stash ls
ng stash l
```

**Features:**
- ✅ Shows all stash entries
- ✅ Displays changed files for each stash
- ✅ File count per stash

#### Pop Stashes

```bash
ng stash pop
```

**Features:**
- ✅ Multi-select support
- ✅ Pop multiple stashes at once

#### Drop Stashes

```bash
ng stash drop
```

**Features:**
- ✅ Multi-select support
- ✅ Drop specific stashes

#### Clear All Stashes

```bash
ng stash clear
```

#### Stash History

View persistent stash history with metadata.

```bash
# View last 10 records
ng stash history
ng stash his          # Alias
ng stash h            # Short alias

# Options
ng stash history --all          # Show all records
ng stash history --active       # Active stashes only (unused)
ng stash history --clean        # Clean records older than 30 days
ng stash history --clean 60     # Clean records older than 60 days
```

**Features:**
- ✅ **Semantic Naming**: Uses format `{operation}:{branch}@{timestamp}` (e.g., `pull:feature/test@2025-01-27-18-30-00`)
- ✅ **Persistent Tracking**: Maintains history even after stashes are popped or dropped
- ✅ **File Metadata**: Includes list of files changed in each stash
- ✅ **Status Tracking**: Tracks if stash is `active`, `popped`, or `dropped`
- ✅ **Auto Cleanup**: Keeps history manageable with configurable cleanup

**Display Format Example:**
```
📚 Stash History (3 records)

━━━ 📦 pull:feature/test@2025-01-27-18-30-00 ━━━
    Operation: pull
    Status: active
    Branch: feature/test
    Time: 2025-01-27, 18:30:00
    Files (2):
      • src/utils.ts
      • src/index.ts
```

---

## Configuration

### Commitlint Integration

The commit command reads your `commitlint.config.*` file to provide type and scope options:

```javascript
// commitlint.config.js
module.exports = {
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor',
      'perf', 'test', 'build', 'ci', 'chore', 'revert'
    ]],
    'scope-enum': [2, 'always', [
      'git', 'shared', 'ai', 'ui', 'packages', 'mail'
    ]]
  }
}
```

### Lint-staged Integration

The commit command automatically runs `lint-staged` before committing if it's available in your project.

---

## Example Workflows

### Daily Development Flow

```bash
# 1. Start working on a new feature
ng co -b
# Select: feature/PRIME-
# Enter: 1500
# Creates: feature/PRIME-1500

# 2. Make changes...

# 3. Commit with interactive wizard
ng commit
# Select files to stage
# Choose type: feat
# Choose scope: git
# Enter title: add new command
# Enter description (optional)
# Preview and confirm
# Optionally push

# 4. Pull latest changes
ng pull
# Select branch: main
# Choose mode: rebase
# Auto stash/pop handled

# 5. Push your work
ng push
```

### Switching Contexts Safely

```bash
# Working on feature A, need to switch to feature B
ng checkout
# Auto stashes your current changes
# Select: feature/PRIME-1500 (feature B)
# Changes are popped automatically after checkout
```

### Cleaning Up Old Branches

```bash
# Delete specific old branches
ng branch delete
# Select branches to delete
# See merge status and last commit time
# Confirm deletion

# Or clean all merged branches older than 1 month
ng branch clean
# Select: 1 month
# Review list
# Confirm deletion
```

---

## Comparison: Git vs `ng`

| Operation | Git Command | `ng` Command |
|-----------|--------------|---------------|
| Commit | `git commit` | `ng commit` (interactive with lint) |
| Pull | `git pull` | `ng pull` (auto stash + mode selection) |
| Push | `git push` | `ng push` (interactive) |
| Checkout | `git checkout` | `ng checkout` (auto stash + interactive) |
| Branch delete | `git branch -D` | `ng branch delete` (merge status check) |
| List branches | `git branch` | `ng list` (enhanced display) |
| Merge | `git merge` | `ng merge` (auto stash + searchable) |
| Stash | `git stash` | `ng stash` (enhanced management) |

---

## Requirements

- Node.js `^20.19.0` or `>=22.12.0`
- Git installed and available in PATH

## License

ISC © [gaozimeng](https://github.com/GaoZimeng0425)
