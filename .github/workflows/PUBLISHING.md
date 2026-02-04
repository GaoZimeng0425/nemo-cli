# NPM Publishing Workflow

This document describes the automated workflow for publishing nemo-cli packages to npm.

## Overview

The publishing workflow is fully automated via GitHub Actions and can be triggered in two ways:

1. **Tag-based publishing** - Push a version tag to trigger automatic publishing
2. **Manual publishing** - Use GitHub Actions UI to publish with custom parameters

---

## Prerequisites

### Required Secrets

Configure these secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

- `NPM_TOKEN` - npm automation token with publish permissions

**How to create npm token:**
1. Go to https://www.npmjs.com/settings/tokens
2. Click "Create New Token"
3. Select "Automation" granularity
4. Click "Create Token"
5. Copy the token and add to GitHub Secrets

---

## Method 1: Tag-Based Publishing (Recommended)

### Step 1: Update Version Numbers

Update version in all package.json files:

```bash
# Using the release script
pnpm release 0.1.3

# Or manually
pnpm --filter "@nemo-cli/*" exec -- pnpm version 0.1.3
```

### Step 2: Commit Changes

```bash
git add .
git commit -m "chore: bump version to 0.1.3"
```

### Step 3: Create and Push Tag

```bash
git tag v0.1.3
git push origin main --tags
```

### Step 4: Automatic Publishing

The GitHub Actions workflow will automatically:
1. ✅ Build all packages
2. ✅ Run tests
3. ✅ Update package versions
4. ✅ Publish to npm registry
5. ✅ Create GitHub release

---

## Method 2: Manual Publishing via GitHub Actions

### Step 1: Go to GitHub Actions

Navigate to: `https://github.com/GaoZimeng0425/nemo-cli/actions`

### Step 2: Select "Publish to npm" Workflow

Find the "Publish to npm" workflow and click "Run workflow"

### Step 3: Configure Publishing

Fill in the form:
- **Version**: `0.1.3` (or desired version)
- **Dry run**: ☐ unchecked (for actual publish)

### Step 4: Run Workflow

Click "Run workflow" button to start the publishing process

---

## Publishing Workflow Details

### Workflow Triggers

```yaml
on:
  push:
    tags:
      - 'v*.*.*'              # Triggered by version tags
  workflow_dispatch:           # Manual trigger
```

### Build Process

1. **Setup Environment**
   - Checkout code
   - Setup Node.js 22
   - Install pnpm
   - Cache dependencies

2. **Install & Build**
   - Install dependencies with frozen lockfile
   - Build all packages
   - Run tests (continue on error)
   - Type check (continue on error)

3. **Version Management**
   - Extract version from tag or input
   - Update package.json files
   - Configure npm authentication

4. **Publishing**
   - Publish @nemo-cli/shared
   - Publish @nemo-cli/ui
   - Publish @nemo-cli/git

5. **Post-Publish**
   - Create GitHub release
   - Notify on success/failure

---

## Package Publishing Order

Packages are published in dependency order:

1. **@nemo-cli/shared** - Core utilities (no dependencies)
2. **@nemo-cli/ui** - UI components (depends on shared)
3. **@nemo-cli/git** - Git commands (depends on shared + ui)

---

## Dry Run Testing

Test the publishing workflow without actually publishing:

### Via GitHub Actions UI

1. Go to Actions → "Publish to npm"
2. Click "Run workflow"
3. Check "Dry run" box
4. Click "Run workflow"

### Via Local Testing

```bash
# Test build locally
pnpm run build

# Test publish locally (dry-run)
pnpm --filter "@nemo-cli/git" exec -- npm publish --dry-run
```

---

## Version Bumping Strategy

### Semantic Versioning

Follow [semver](https://semver.org/) guidelines:

- **MAJOR** (0.1.2 → 1.0.0): Breaking changes
- **MINOR** (0.1.2 → 0.2.0): New features, backward compatible
- **PATCH** (0.1.2 → 0.1.3): Bug fixes, backward compatible

### Automated Version Bump

The `release` script handles version bumping:

```bash
# Bump patch version
pnpm release 0.1.3

# Bump minor version
pnpm release 0.2.0

# Bump major version
pnpm release 1.0.0
```

---

## Verification After Publishing

### Check npm Registry

```bash
# Check published version
npm view @nemo-cli/git@0.1.3
npm view @nemo-cli/ui@0.1.3
npm view @nemo-cli/shared@0.1.3

# Or visit
# https://www.npmjs.com/package/@nemo-cli/git
# https://www.npmjs.com/package/@nemo-cli/ui
# https://www.npmjs.com/package/@nemo-cli/shared
```

### Test Installation

```bash
# Install globally
npm install -g @nemo-cli/git

# Test command
ng --version
ng hist -n 5
ng config init
```

---

## Rollback Procedure

If something goes wrong with a published version:

### Step 1: Deprecate Package (Recommended)

```bash
# Deprecate the published version
npm deprecate @nemo-cli/git@0.1.3 "Critical bug, please use 0.1.4"
npm deprecate @nemo-cli/ui@0.1.3 "Critical bug, please use 0.1.4"
npm deprecate @nemo-cli/shared@0.1.3 "Critical bug, please use 0.1.4"
```

### Step 2: Publish Fix

```bash
# Fix the issue
# Bump version
pnpm release 0.1.4

# Commit and tag
git add .
git commit -m "fix: critical bug in config command"
git tag v0.1.4
git push origin main --tags
```

### Step 3: Unpublish (Last Resort)

⚠️ **WARNING:** Unpublishing is generally discouraged and can break existing installations.

```bash
# Only use for critical security issues within 72 hours
npm unpublish @nemo-cli/git@0.1.3
```

---

## Troubleshooting

### Issue: "401 Unauthorized"

**Cause:** Invalid or missing NPM_TOKEN

**Solution:**
1. Verify NPM_TOKEN is set in GitHub Secrets
2. Check token has publish permissions
3. Regenerate token if expired

### Issue: "403 Forbidden"

**Cause:** Package name already taken or permission denied

**Solution:**
1. Verify you own the package on npm
2. Check npm organization settings
3. Ensure package name is scoped correctly (@nemo-cli/*)

### Issue: "E402 Wrong registry"

**Cause:** Publishing to wrong registry

**Solution:**
1. Check `.npmrc` configuration in workflow
2. Verify registry URL is `https://registry.npmjs.org/`
3. Ensure package.json has correct `publishConfig`

### Issue: Build Failures

**Cause:** Tests or type checking failing

**Solution:**
1. Run `pnpm run check` locally to identify errors
2. Run `pnpm run test` locally to ensure tests pass
3. Fix all issues before publishing

---

## CI/CD Pipeline Flow

```
┌─────────────────┐
│  Push Tag /     │
│ Manual Trigger  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Setup & Build │
│  - Install deps │
│  - Build pkgs   │
│  - Run tests    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Version Bump   │
│  - Extract ver  │
│  - Update pkgs  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Publish to npm │
│  - shared       │
│  - ui           │
│  - git          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Create Release │
│  - GitHub rel   │
│  - Notify user  │
└─────────────────┘
```

---

## Best Practices

1. **Always test locally first**
   ```bash
   pnpm run build
   pnpm run check
   pnpm run test
   ```

2. **Use semantic versioning**
   - Follow semver for version numbers
   - Update CHANGELOG.md with changes
   - Document breaking changes

3. **Test in dry-run mode**
   - Use workflow's dry-run option first
   - Verify package contents before actual publish

4. **Monitor publish workflow**
   - Watch GitHub Actions logs
   - Check for errors or warnings
   - Verify packages on npm after publish

5. **Keep dependencies updated**
   - Regular security updates
   - Test with latest Node.js versions
   - Maintain compatibility

---

## Related Documentation

- [npm Publishing Guide](https://docs.npm.com/cli/v9/commands/npm-publish)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)
- [Release Script](../scripts/release.ts)
