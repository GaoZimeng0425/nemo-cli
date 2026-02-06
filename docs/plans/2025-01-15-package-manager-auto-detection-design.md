# Package Manager Auto-Detection & Adapter Design

**Date:** 2025-01-15
**Status:** Design
**Author:** Brainstorming Session

## Overview

Enhance `@nemo-cli/package` to automatically detect and adapt to different package managers (npm, pnpm, yarn, bun, deno) instead of being hardcoded to pnpm only.

## Architecture

Three-layer architecture:

**Detection Layer**:
- `PackageManagerDetector` class scans project characteristics
- Detection priority: lock file analysis → package.json packageManager field → user interaction
- Cache detection results to avoid repeated scans

**Adapter Layer**:
- `PackageManagerAdapter` interface defines unified command generation API
- Implement specific adapters for each package manager (npm, pnpm, yarn, bun, deno)
- Translate abstract operations (add, remove, upgrade) to package-manager-specific commands

**Execution Layer**:
- Existing commands (add, remove, upgrade) use adapters to invoke correct package manager
- Maintain current CLI parameters and user experience

This ensures backward compatibility while providing flexible package manager support.

## Core Components

### 1. PackageManagerDetector

```typescript
class PackageManagerDetector {
  async detect(cwd: string): Promise<PackageManager>

  private detectByLockFile(cwd: string): PackageManager | null
  private detectByPackageJson(cwd: string): PackageManager | null
  private async promptUser(): Promise<PackageManager>
}
```

**Lock file detection:**
- `package-lock.json` → npm
- `pnpm-lock.yaml` → pnpm
- `yarn.lock` → yarn
- `bun.lockb` → bun
- `deno.json` / `deno.jsonc` → deno

### 2. PackageManagerAdapter Interface

```typescript
interface PackageManagerAdapter {
  name: PackageManager
  readonly supportsWorkspaces: boolean

  buildAddCommand(packages: string[], options: AddOptions): string[]
  buildRemoveCommand(packages: string[]): string[]
  buildUpgradeCommand(packages: string[]): string[]
}
```

Each package manager implements this interface, translating unified requests to specific command syntax.

## Data Flow

### Detection Flow (First Use)

1. User executes `np add <package>`
2. System calls `PackageManagerDetector.detect()`
3. Scan for lock files:
   - Found `pnpm-lock.yaml` → return `pnpm`
   - Found `package-lock.json` → return `npm`
   - No lock file → continue
4. Read `package.json` `packageManager` field
5. If undetected → launch interactive selector
6. Cache result to `.nemo/config.json`

### Command Execution Flow (add command example)

1. Parse command arguments: `np add react -D -E`
2. Get corresponding adapter: `pmAdapter.getAdapter('pnpm')`
3. Call adapter to generate command:
   ```typescript
   pmAdapter.buildAddCommand(['react'], {
     saveDev: true,
     exact: true
   })
   // Returns: ['add', 'react', '--save-dev', '--save-exact']
   ```
4. Execute generated command: `pnpm add react --save-dev --save-exact`
5. Handle output and errors

### Configuration Cache Structure

```json
{
  "packageManager": "pnpm",
  "detectedAt": "2025-01-15T10:30:00Z",
  "detectionMethod": "lock-file"
}
```

## Error Handling

### Detection Failures

**Non-project directory**: User runs command outside a project
- Detection: No `package.json` found
- Action: Display clear error, instruct to run from project root

**Mixed lock files**: Project has multiple lock files
- Detection: Select by priority (pnpm > yarn > npm > bun)
- Action: Show warning about detected multiple package managers

**Package manager not installed**: Detected pnpm but not installed
- Detection: `pnpm --version` fails
- Action:
  - Fallback to installed package manager
  - Prompt user to install target package manager
  - Provide one-click install command

### Command Execution Failures

**Network error**: Package download fails
- Retry mechanism: Default retry 1 time
- Fallback: Try using registry mirror

**Dependency conflicts**: Peer dependencies or version conflicts
- Capture pnpm/npm error output
- Use `@nemo-cli/ui` for formatted error display
- Provide solution suggestions (`--force` or `--legacy-peer-deps`)

**Cache invalidation**:
- Detection results cached for 7 days
- Auto-clear cache when lock files update
- Provide `np detect --refresh` command for forced re-detection

## Testing Strategy

### Unit Tests

1. **Detector tests**:
   - Mock file system, test various lock file combinations
   - Test cache read/write
   - Test interactive selector logic

2. **Adapter tests**:
   - Verify command generation for each package manager
   - Test parameter mapping (-D → --save-dev)
   - Validate workspace filter syntax differences

### Integration Tests

1. **Temporary project tests**:
   - Create test projects with different lock files
   - Execute `np add` and verify correct package manager invocation
   - Check installation results

2. **Real scenario tests**:
   - Test workspace support in monorepo
   - Test package manager switching scenarios
   - Verify error handling and fallback mechanisms

### Test Case Example

```typescript
describe('PackageManagerDetector', () => {
  it('should detect pnpm from lock file', async () => {
    const detector = new PackageManagerDetector()
    const pm = await detector.detect('/tmp/pnpm-project')
    expect(pm).toBe('pnpm')
  })

  it('should fallback to user prompt', async () => {
    // Test interactive selection when no lock file
  })
})
```

### Manual Testing Checklist

- [ ] Run `np add` in pure npm project
- [ ] Run `np add` in pure pnpm project
- [ ] Test priority in mixed lock file project
- [ ] Test package manager not installed prompt
- [ ] Test workspace filter functionality

## Implementation Considerations

### Package Manager Specifics

**npm**:
- Uses `install` instead of `add` (map to npm install)
- Workspace: `--workspace=<name>`
- Flags: `--save-dev`, `--save-exact`

**pnpm**:
- Uses `add` command
- Workspace: `--filter=<name>` or `-w` for root
- Flags: `--save-dev`, `--save-exact`, `--save-peer`

**yarn**:
- Uses `add` command (v1) or `npm add` (berry/v2+)
- Workspace: `-W` for root, workspace focus for specific
- Flags: `--dev`, `--exact`, `--peer`

**bun**:
- Uses `add` command
- Workspace: `--workspace=<name>`
- Flags: `--development`, `--exact`

**deno**:
- Completely different model (URL-based imports)
- May need special handling or limited support

### Files to Modify

**New files**:
- `packages/shared/src/package-manager/detector.ts`
- `packages/shared/src/package-manager/adapters/index.ts`
- `packages/shared/src/package-manager/adapters/npm.ts`
- `packages/shared/src/package-manager/adapters/pnpm.ts`
- `packages/shared/src/package-manager/adapters/yarn.ts`
- `packages/shared/src/package-manager/adapters/bun.ts`
- `packages/shared/src/package-manager/adapters/deno.ts`
- `packages/shared/src/package-manager/types.ts`

**Modified files**:
- `packages/package/src/commands/add.ts` - Use adapter instead of hardcoded pnpm
- `packages/package/src/commands/remove.ts` - Use adapter
- `packages/package/src/commands/upgrade.ts` - Use adapter
- `packages/shared/src/index.ts` - Export new PM utilities

## Success Criteria

- [ ] Automatically detects package manager from lock files
- [ ] Falls back to interactive selection when undetectable
- [ ] Correctly translates commands for npm, pnpm, yarn, bun
- [ ] Maintains backward compatibility with pnpm-only workflows
- [ ] Provides clear error messages for edge cases
- [ ] 80%+ test coverage
- [ ] Works in monorepo environments with workspace filtering
