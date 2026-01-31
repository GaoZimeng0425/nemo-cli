# Known Issues & Gotchas

## Critical Fixes from Momus Reviews
1. `getStashIndexPath()` must return FILE path, not directory path
2. `writeStashIndex()` needs `mkdir -p` for parent directory (worktree fallback)
3. File collection needs both unstaged AND staged changes
4. Concurrent writes need atomic rename pattern

## Testing Requirements
- Verify unstaged + staged file collection with Set deduplication
- Test concurrent write safety
- Test worktree fallback path
- Verify merge command bug fix (finally block executes)

## Fixed: Line 232 Option Configuration
- **Issue**: `.option('--clean [days]', ..., { default: false })` had incorrect syntax
- **Root Cause**: Third parameter should be `defaultValue` string|boolean, not an options object
- **Fix**: Removed `{ default: false }` - let commander.js handle default behavior for optional flags
- **Verification**:
  - Build passed ✓
  - `ng stash history` shows history without clean mode ✓
  - `ng stash history --clean` shows "Cleaned X old stash records (30 days)" ✓
