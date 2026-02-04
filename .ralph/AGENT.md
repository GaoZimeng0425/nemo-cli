# Ralph Agent Configuration - nemo-cli

## Build Instructions

### Root Level Commands

```bash
# Build all packages in parallel
pnpm build

# Watch mode for all packages
pnpm dev

# Type check all packages
pnpm check

# Format code with Biome
pnpm format

# Run tests with coverage
pnpm coverage

# Type check (no output)
pnpm compile

# Detect unused code/dependencies
pnpm knip
```

### Package-Specific Commands

```bash
# Build a specific package
pnpm run --filter=@nemo-cli/git build
pnpm run --filter=@nemo-cli/shared build

# Run specific package in dev mode
pnpm run --filter=@nemo-cli/git dev

# Run tests for specific package
pnpm run --filter=@nemo-cli/git test

# Run type check for specific package
pnpm run --filter=@nemo-cli/git check
```

### Global Linking (for development)

```bash
# Link the ng command globally
cd packages/git && pnpm link -g

# Link the na command globally
cd packages/ai && pnpm link -g

# Link the np command globally
cd packages/package && pnpm link -g

# Link the nf command globally
cd packages/file && pnpm link -g

# Verify installation
ng -h
na -h
np -h
nf -h
```

## Test Instructions

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests with coverage
pnpm coverage

# Run tests for specific package
pnpm run --filter=@nemo-cli/git test

# Run specific test file
pnpm test -- stash-manager.test.ts
```

### Test File Locations

Tests should be placed in `__tests__/` directories:

```
packages/
├── git/
│   ├── __tests__/              # Package-level tests
│   │   ├── services/
│   │   │   └── stash-manager.test.ts
│   │   ├── utils/
│   │   └── commands/
│   └── src/
│       ├── commands/           # Co-located tests (optional)
│       │   └── __tests__/
│       │       └── commit.test.ts
```

### Test Writing Guidelines

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { StashManager } from '../src/services/stash-manager'

describe('StashManager', () => {
  let stashManager: StashManager

  beforeEach(() => {
    stashManager = new StashManager()
  })

  afterEach(() => {
    // Cleanup
  })

  it('should create branch stash with metadata', async () => {
    const result = await stashManager.createBranchStash('feature/test')
    expect(result.branchName).toBe('feature/test')
    expect(result.stashRef).toBeTruthy()
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})
```

## Run Instructions

### Development Mode

```bash
# Start all packages in watch mode
pnpm dev

# Start specific package in watch mode
pnpm run --filter=@nemo-cli/git dev
```

### Special Development Servers

```bash
# Start email preview server
pnpm dev:email

# Start Slack Bot
pnpm dev:slack
```

### Running CLI Commands

```bash
# Git commands (ng)
ng commit          # Interactive commit
ng checkout main   # Safe branch switch
ng pull            # Safe pull with auto-stash
ng push            # Safe push with pre-check
ng stash list      # List stashes
ng branch clean    # Clean merged branches

# AI commands (na)
na                 # Start AI CLI

# Package commands (np)
np list            # List packages
np upgrade         # Upgrade dependencies

# File commands (nf)
nf ast             # Analyze file AST
```

## Environment Setup

### Prerequisites

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | ^20.19.0 \|\| >=22.12.0 | Runtime |
| pnpm | >=8.0 | Package Manager |
| Git | >=2.0 | Version Control |

### Initial Setup

```bash
# Clone repository
git clone git@github.com:GaoZimeng0425/nemo-cli.git
cd nemo-cli

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Link CLI commands globally (optional)
cd packages/git && pnpm link -g
```

### Environment Variables

Create `.env` file in project root:

```bash
# Confluence (for @nemo-cli/ai)
CONFLUENCE_URL=https://xxx.atlassian.net
CONFLUENCE_EMAIL=your-email@xxx.com
CONFLUENCE_TOKEN=your-api-token

# Google/Gmail (for @nemo-cli/mail)
GOOGLE_APP_PASSWORD=your-app-password

# AI Services (for @nemo-cli/ai)
OPENAI_API_KEY=sk-xxx
DEEPSEEK_API_KEY=xxx
GOOGLE_API_KEY=xxx

# Slack (for @nemo-cli/ai)
SLACK_BOT_TOKEN=xoxb-xxx
SLACK_SIGNING_SECRET=xxx
```

## Code Quality

### Linting and Formatting

```bash
# Check all packages
pnpm check

# Format all code
pnpm format

# Check specific package
pnpm run --filter=@nemo-cli/git check
```

### Biome Configuration

The project uses Biome for linting and formatting:
- Single quotes
- No semicolons (except ES5 trailing commas)
- 2-space indentation
- 120 char line width
- Import sorting
- Property sorting

### Git Hooks

- **pre-commit**: lint-staged (checks staged files only)
- **commit-msg**: commitlint (enforces commit message format)

## Common Workflows

### Adding a New Command to Git Package

1. Create command file: `packages/git/src/commands/my-command.ts`
2. Register in `packages/git/src/index.ts`
3. Add tests in `packages/git/__tests__/commands/my-command.test.ts`
4. Build: `pnpm run --filter=@nemo-cli/git build`
5. Link and test: `cd packages/git && pnpm link -g && ng my-command`

### Adding a New Service

1. Create service file: `packages/git/src/services/my-service.ts`
2. Export from `packages/git/src/index.ts` if needed
3. Add tests in `packages/git/__tests__/services/my-service.test.ts`
4. Build and test

### Adding Shared Utilities

1. Create utility file: `packages/shared/src/utils/my-util.ts`
2. Export from `packages/shared/src/index.ts`
3. Add tests in `packages/shared/__tests__/utils/my-util.test.ts`
4. Build shared package: `pnpm run --filter=@nemo-cli/shared build`

## Troubleshooting

### Build Issues

```bash
# Clean all dist directories
pnpm clean

# Rebuild all packages
pnpm build

# Check for TypeScript errors
pnpm check
```

### Test Issues

```bash
# Run tests in verbose mode
pnpm test --verbose

# Run tests with coverage report
pnpm coverage

# Debug specific test
pnpm test -- my-test.test.ts --reporter=verbose
```

### Link Issues

```bash
# Unlink all global links
pnpm unlink -g

# Relink specific package
cd packages/git && pnpm link -g --force
```

## Notes

- **Monorepo Management:** All packages are managed through pnpm workspaces
- **Shared Dependencies:** Common dependencies are managed in root package.json
- **Build System:** Uses Rolldown (Rust-based bundler) for fast builds
- **Type Safety:** Full TypeScript coverage with strict mode enabled
- **Performance:** Target < 200ms cold start, < 100ms warm start
- **Testing:** Vitest for unit tests, coverage target > 80%

Update this file when:
- Build process changes
- New commands are added
- Environment setup requirements change
- New testing strategies are implemented
