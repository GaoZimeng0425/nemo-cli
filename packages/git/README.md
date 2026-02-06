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
- **Interactive Commit Navigator**: Enhanced `ng blame` for browsing file history with full diff support
- **Visual History Viewer**: Beautiful `ng hist` command with interactive graph display and keyboard navigation

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
ng blame -h
ng hist -h
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

### Interactive Commit Navigator (`ng blame`)

Browse file commit history with full diff support and interactive navigation.

```bash
# View commit history for a file
ng blame <file-path>

# Example
ng blame src/commands/blame.ts
ng blame packages/git/src/commands/blame.ts
```

**Features:**
- ✅ **Full Diff Display**: Shows complete diff for each commit (not just commit messages)
- ✅ **Interactive Navigation**: Browse through commits with keyboard shortcuts
- ✅ **Smart Caching**: Fetches git history once, then navigates instantly
- ✅ **Binary File Support**: Detects and handles binary files gracefully
- ✅ **Large Diff Protection**: Limits display to 50 lines to prevent terminal overflow
- ✅ **Follow File Renames**: Uses `--follow` to track history across renames

**Interactive Controls:**

| Key | Action | Description |
|-----|--------|-------------|
| `n` | Next commit | Move forward in time (to newer commits) |
| `p` | Previous commit | Move backward in time (to older commits) |
| `j` | Jump | Jump to a specific commit by number |
| `q` | Quit | Exit the navigator |

**Display Information:**

Each commit shows:
- 📝 Commit number (e.g., `Commit 3/10`)
- 🔖 Short commit hash (8 characters, colored)
- 👤 Author name (colored)
- 📅 Commit date (dimmed)
- 💬 Commit message
- 📄 Full diff with git standard formatting (red for deletions, green for additions)

**Special Handling:**

- **Binary Files**: Shows "📄 Binary file - diff not available" instead of binary content
- **Large Diffs**: Displays first 50 lines with truncation notice
  ```
  (Showing first 50 lines of 123)
  ... (truncated)
  ```
- **Empty History**: Warns if file has no git history
- **Missing Files**: Clear error if file doesn't exist

**Example Output:**

```
Found 10 commits for src/commands/blame.ts
Use [n/p] to navigate, [j] to jump, [q] to quit

📝 Commit 1/10
abc123de - John Doe - Mon Feb 2 12:00:00 2026
feat(git): add interactive commit navigator

--- Diff ---
diff --git a/src/commands/blame.ts b/src/commands/blame.ts
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/src/commands/blame.ts
@@ -0,0 +1,315 @@
+import path from 'node:path'
+import readline from 'node:readline'
...

--- Actions ---
[n] Next commit [p] Previous commit [j] Jump [q] Quit
```

**Use Cases:**

- 📖 **Code Review**: Understand how a file evolved over time
- 🐛 **Bug Investigation**: Find when a specific line was changed
- 📚 **Learning**: Study the development history of a feature
- 🔍 **Audit**: Review all changes made to a critical file

---

### Git History Viewer (`ng hist` / `ng history`)

Display git history with an interactive, scrollable graph view.

```bash
# Show full git history
ng hist

# Limit number of commits
ng hist -n 20
ng hist --number 50

# Using alias
ng history
ng history -n 10
```

**Features:**
- ✅ **Beautiful Graph Format**: Visualizes branch structure with commit tree
- ✅ **Interactive Navigation**: Scroll through history with keyboard or mouse
- ✅ **Optimized Display**: Automatically adjusts to terminal size
- ✅ **Status Bar**: Shows current position and available shortcuts
- ✅ **Color-Coded Output**:
  - Cyan: Commit hash
  - Green: Commit date
  - Magenta: Author name
  - Yellow: Branch references

**Interactive Controls:**

| Key | Action | Description |
|-----|--------|-------------|
| `↑` / `k` | Scroll up | Move up through commits |
| `↓` / `j` | Scroll down | Move down through commits |
| `gg` | Jump to top | Go to the oldest commit |
| `G` | Jump to bottom | Go to the newest commit (Shift+G) |
| `Page Up` | Page up | Scroll up one page |
| `Page Down` | Page down | Scroll down one page |
| `q` / `Enter` | Quit | Exit the viewer |

**Display Information:**

Each commit shows:
- 🔖 Short commit hash (cyan, bold)
- 📅 Commit date and time (green)
- 👤 Author name (magenta)
- 🌿 Branch and tag references (yellow)
- 💬 Commit message

**Status Bar:**

```
↑↓/jk: Scroll | gg/G: Top/Bottom | PgUp/PgDn | q: Quit | Lines 1-42/150
```

**Layout Optimization:**

- Automatically calculates optimal view height based on terminal size
- Reserves space for UI elements (borders, status bar)
- Ensures minimum of 10 lines for content display
- Removes unnecessary margins for maximum content visibility

**Use Cases:**

- 📊 **Project Overview**: Quickly see commit history and branch structure
- 🔍 **Context Browsing**: Understand recent changes before switching branches
- 📝 **Review History**: Check recent commits before pulling or pushing
- 🎯 **Navigation**: Find specific commits in the history

**Example Output:**

```
┌─────────────────────────────────────────────────────────────────┐
│* abc123de 2026-02-06 14:54:23 [GaoZimeng] (HEAD -> main)      │
││  refactor(git): main increase hist viewer height line        │
│* 1a40997 2026-02-06 14:52:15 [GaoZimeng]                      │
││  feat(git): fetch remote branches before pull                │
│* a3be508 2026-02-06 14:51:23 [GaoZimeng]                      │
││  refactor(git): change branch selection from search to select│
│* 172403f 2026-02-06 14:50:12 [GaoZimeng]                      │
││  feat(git): enhance merge command with commit customization  │
├─────────────────────────────────────────────────────────────────┤
│ ↑↓/jk: Scroll | gg/G: Top/Bottom | PgUp/PgDn | q: Quit | Lines │
│  1-10/150                                                        │
└─────────────────────────────────────────────────────────────────┘
```

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

### Investigating File History

```bash
# Understand how a file evolved over time
ng blame src/utils/date.ts

# Interactive navigation:
# - Press 'n' to see next commit
# - Press 'p' to go back to previous commit
# - Press 'j' to jump to commit 5/10
# - Press 'q' when done reviewing

# Each commit shows:
# - Full commit hash, author, date, message
# - Complete diff (what changed)
# - Current position (e.g., "Commit 3/10")
```

**Real-world scenarios:**

- 🐛 **Bug Investigation**: Find when a bug was introduced
  ```bash
  ng blame src/auth/login.ts
  # Press 'n' repeatedly to review changes chronologically
  # Look for the commit that broke the functionality
  ```

- 📖 **Code Review**: Understand the evolution of a complex function
  ```bash
  ng blame src/api/handlers.ts
  # Navigate through commits to see how the logic developed
  ```

- 🔍 **Audit Trail**: Review all changes to a security-critical file
  ```bash
  ng blame src/config/security.ts
  # Use 'j' to jump to specific commits of interest
  ```

---

### Browsing Project History

```bash
# View full git history with beautiful graph
ng hist

# View last 20 commits
ng hist -n 20

# Interactive navigation:
# - Use ↑/↓ or j/k to scroll through commits
# - Press 'gg' to jump to oldest commit
# - Press 'G' (Shift+G) to jump to newest commit
# - Use Page Up/Down to scroll by pages
# - Press 'q' or Enter to exit

# Features:
# - Color-coded output (hash, date, author, branches)
# - Visual commit graph showing branch structure
# - Status bar showing current position
# - Automatically adjusts to terminal size
```

**Real-world scenarios:**

- 📊 **Before Pulling**: Check what's been committed recently
  ```bash
  ng hist -n 10
  # Review recent commits before doing `ng pull`
  ```

- 🎯 **Finding Commits**: Locate a specific commit in history
  ```bash
  ng hist
  # Press 'gg' to go to oldest commit
  # Use ↓/j to scroll forward to find what you need
  # Note the commit hash (e.g., abc123de)
  ```

- 🌿 **Branch Overview**: Understand branch structure and merges
  ```bash
  ng hist -n 50
  # See how branches diverged and merged
  # Identify branch points and merge commits
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
| Blame | `git blame` (line-by-line) | `ng blame` (full commit history with diff) |
| Log/History | `git log` (static output) | `ng hist` (interactive graph viewer) |

**Key Difference - `ng blame` vs `git blame`:**

| Feature | `git blame` | `ng blame` |
|---------|-------------|------------|
| Shows | Line-by-line annotations | Full commit history with diffs |
| Navigation | Scroll through file | Interactive commit navigation (n/p/j/q) |
| Diff View | No (use separately) | Yes, included for each commit |
| File Renames | Limited | Full support with `--follow` |
| Best For | Finding who changed a line | Understanding file evolution |

---

## Requirements

- Node.js `^20.19.0` or `>=22.12.0`
- Git installed and available in PATH

## License

ISC © [gaozimeng](https://github.com/GaoZimeng0425)
