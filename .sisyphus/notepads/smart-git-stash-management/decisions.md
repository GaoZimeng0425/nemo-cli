# Architectural Decisions

## Schema Design
- Extend `StashMetadata` interface with optional fields (backward compatible)
- New fields: operation, currentBranch, targetBranch, files, status, error, commitHash

## Naming Convention
- Format: `{operation}:{branch}@{YYYY-MM-DD-HH-mm-ss}`
- Internal ID: `{timestamp}_{operation}_{encodedBranch}`

## Error Handling
- Merge command bug fix: Replace `if (error) return` with try/catch/finally
- Ensure stash pop happens even on operation failure
