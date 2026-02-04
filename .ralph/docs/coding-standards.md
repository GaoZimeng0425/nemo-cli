# 开发规范与最佳实践

## 代码风格

### 命名规范

**文件命名**:
- 使用 `kebab-case.ts`
- 示例: `stash-manager.ts`, `pull-service.ts`, `conflict-handler.ts`

**函数命名**:
- 使用 `camelCase`，动词开头
- 工具函数: `handleXxx`, `getXxx`, `isXxx`, `hasXxx`
- 服务方法: `createXxx`, `findXxx`, `deleteXxx`
- 命令处理: `handleXxx`

**变量命名**:
- 使用 `camelCase`
- 示例: `branchName`, `stashRef`, `hasConflicts`

**常量命名**:
- 使用 `UPPER_SNAKE_CASE`
- 示例: `CONFIG_NAME`, `STASH_PREFIX`, `MAX_RETENTION`

**类型/接口命名**:
- 使用 `PascalCase`
- 示例: `StashMetadata`, `PullOptions`, `GitConfig`

### 文件组织

```
src/
├── commands/         # CLI 命令实现
│   ├── commit.ts
│   ├── checkout.ts
│   └── ...
├── services/         # 业务逻辑层
│   ├── stash-manager.ts
│   ├── pull-service.ts
│   └── ...
├── utils/            # 工具函数
│   ├── stash-utils.ts
│   ├── conflict-handler.ts
│   └── ...
├── config/           # 配置管理
│   ├── loader.ts
│   ├── validator.ts
│   └── defaults.ts
├── logging/          # 日志管理
│   ├── operation-logger.ts
│   └── history-manager.ts
└── index.ts          # 入口文件
```

**原则**:
- 每个文件一个主要职责
- 相关功能放在同一目录
- 避免循环依赖

## TypeScript 最佳实践

### 类型定义

```typescript
// ✅ 好的类型定义
interface StashMetadata {
  branchName: string
  stashRef: string
  timestamp: string
  createdAt: string
  message?: string
}

// ✅ 使用类型别名
type PullStrategy = 'merge' | 'rebase'

// ✅ 使用泛型
async function getLatest<T extends { timestamp: string }>(
  items: T[]
): Promise<T | null> {
  if (items.length === 0) return null
  return items.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0]
}

// ❌ 避免 any
function process(data: any): void { }

// ✅ 使用 unknown 或具体类型
function process(data: unknown): void {
  if (typeof data === 'string') {
    // ...
  }
}
```

### 异步处理

```typescript
// ✅ 使用 async/await
async function createStash(message: string): Promise<StashMetadata> {
  const stashRef = await handleGitStash(message)
  return {
    stashRef,
    timestamp: new Date().toISOString(),
    // ...
  }
}

// ✅ 错误处理
try {
  await createStash('message')
} catch (error) {
  if (error instanceof GitError) {
    // 处理 Git 错误
  } else {
    // 处理其他错误
  }
}

// ✅ Promise 并行执行
const [stashes, config] = await Promise.all([
  getStashList(),
  loadConfig()
])
```

### 参数验证

```typescript
// ✅ 使用参数对象
interface CheckoutOptions {
  branch: string
  autoStash?: boolean
  createNew?: boolean
}

async function checkout(options: CheckoutOptions): Promise<void> {
  const { branch, autoStash = true, createNew = false } = options
  // ...
}

// ❌ 避免过多参数
async function checkout(
  branch: string,
  autoStash: boolean,
  createNew: boolean,
  force: boolean
): Promise<void> {
  // ...
}
```

## 错误处理

### 错误分类

```typescript
// 自定义错误类型
class GitError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number,
    public readonly stdout: string,
    public readonly stderr: string
  ) {
    super(message)
    this.name = 'GitError'
  }
}

class ConflictError extends Error {
  constructor(
    message: string,
    public readonly conflictFiles: string[]
  ) {
    super(message)
    this.name = 'ConflictError'
  }
}
```

### 错误处理模式

```typescript
// ✅ 统一错误处理
async function safeOperation() {
  try {
    await riskyOperation()
    return { success: true }
  } catch (error) {
    if (error instanceof ConflictError) {
      return {
        success: false,
        error: 'Conflict detected',
        suggestion: 'Please resolve conflicts manually'
      }
    }
    return {
      success: false,
      error: 'Operation failed',
      suggestion: 'Check git status'
    }
  }
}

// ✅ 错误日志记录
try {
  await operation()
} catch (error) {
  await logFailure('checkout', 'stash', error as Error)
  throw error
}
```

## 日志记录

### 结构化日志

```typescript
interface LogEntry {
  timestamp: string
  level: 'verbose' | 'info' | 'warn' | 'error'
  message: string
  context?: Record<string, unknown>
  error?: string
}

// ✅ 结构化日志
await logOperation({
  timestamp: new Date().toISOString(),
  level: 'info',
  message: 'Stash created',
  context: {
    branch: 'feature/xxx',
    stashRef: 'stash@{0}'
  }
})

// ✅ 错误日志
await logOperation({
  timestamp: new Date().toISOString(),
  level: 'error',
  message: 'Failed to create stash',
  error: error.message,
  context: {
    branch: 'feature/xxx',
    command: 'git stash save'
  }
})
```

## 配置管理

### 配置接口

```typescript
interface GitConfig {
  pullStrategy: 'merge' | 'rebase'
  autoStash: boolean
  stashMessageTemplate: string
  defaultRemote: string
}

// ✅ 默认配置
export const DEFAULT_GIT_CONFIG: GitConfig = {
  pullStrategy: 'merge',
  autoStash: true,
  stashMessageTemplate: '[ng-auto] branch:{branch} timestamp:{timestamp}',
  defaultRemote: 'origin'
}
```

### 配置加载

```typescript
// ✅ 配置合并
function mergeConfig(
  defaults: GitConfig,
  global: Partial<GitConfig>,
  project: Partial<GitConfig>
): GitConfig {
  return {
    ...defaults,
    ...global,
    ...project
  }
}

// ✅ 配置验证
function validateConfig(config: unknown): config is GitConfig {
  if (typeof config !== 'object' || config === null) {
    return false
  }

  const c = config as Record<string, unknown>
  return (
    typeof c.pullStrategy === 'string' &&
    ['merge', 'rebase'].includes(c.pullStrategy) &&
    typeof c.autoStash === 'boolean' &&
    typeof c.stashMessageTemplate === 'string' &&
    typeof c.defaultRemote === 'string'
  )
}
```

## 测试规范

### 测试结构

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { StashManager } from '../stash-manager'

describe('StashManager', () => {
  let stashManager: StashManager

  beforeEach(() => {
    stashManager = new StashManager()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createBranchStash', () => {
    it('should create stash with correct metadata', async () => {
      const result = await stashManager.createBranchStash('feature/test')

      expect(result.branchName).toBe('feature/test')
      expect(result.stashRef).toMatch(/^stash@\{0\}$/)
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('should handle git errors gracefully', async () => {
      vi.mocked(handleGitStash).mockRejectedValue(new Error('Git error'))

      await expect(
        stashManager.createBranchStash('feature/test')
      ).rejects.toThrow('Failed to create stash')
    })
  })
})
```

### 测试覆盖

- 单元测试覆盖率 > 80%
- 所有服务层方法必须有测试
- 所有关键工具函数必须有测试
- 边界情况和错误处理必须有测试

## Git 操作规范

### Git 命令执行

```typescript
// ✅ 使用共享工具函数
import { execGit } from '@nemo-cli/shared'

const result = await execGit(['status', '--porcelain'])

// ✅ 检查错误
if (result.exitCode !== 0) {
  throw new GitError(
    'Git command failed',
    result.exitCode,
    result.stdout,
    result.stderr
  )
}
```

### Git 状态检测

```typescript
// ✅ 检测未提交更改
async function hasUncommittedChanges(): Promise<boolean> {
  const result = await execGit(['status', '--porcelain'])
  return result.stdout.trim().length > 0
}

// ✅ 检测冲突
async function hasConflicts(): Promise<boolean> {
  const result = await execGit(['diff', '--name-only', '--diff-filter=U'])
  return result.stdout.trim().length > 0
}
```

## 性能优化

### 缓存策略

```typescript
// ✅ 简单缓存
class BranchCache {
  private cache: Map<string, Branch[]> = new Map()
  private ttl: number = 5000 // 5 seconds

  async getBranches(refresh = false): Promise<Branch[]> {
    const key = 'all'
    const cached = this.cache.get(key)

    if (!refresh && cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data
    }

    const branches = await fetchBranches()
    this.cache.set(key, { data: branches, timestamp: Date.now() })
    return branches
  }
}
```

### 并行执行

```typescript
// ✅ Promise.all 并行执行
const [stashes, branches, config] = await Promise.all([
  getStashList(),
  getBranchList(),
  loadConfig()
])

// ✅ Promise.allSettled（部分失败不影响其他）
const results = await Promise.allSettled([
  operation1(),
  operation2(),
  operation3()
])
```

## 文档规范

### 代码注释

```typescript
/**
 * 分支级 Stash 管理服务
 *
 * 提供自动化的 stash 创建、查找和 pop 功能，
 * 支持分支上下文记忆和自动匹配。
 *
 * @example
 * ```typescript
 * const manager = new StashManager()
 * await manager.createBranchStash('feature/test')
 * ```
 */
export class StashManager {
  /**
   * 创建分支 stash 并记录元数据
   *
   * @param branchName - 分支名称
   * @param message - 可选的自定义消息
   * @returns Stash 元数据
   * @throws {GitError} Git 命令执行失败
   */
  async createBranchStash(
    branchName: string,
    message?: string
  ): Promise<StashMetadata> {
    // ...
  }
}
```

## 安全规范

### 敏感信息处理

```typescript
// ❌ 不要在日志中记录敏感信息
console.log('Token:', apiToken)

// ✅ 使用环境变量
const apiToken = process.env.API_TOKEN
if (!apiToken) {
  throw new Error('API_TOKEN not configured')
}
```

### 危险操作确认

```typescript
// ✅ Force push 需要用户确认
async function safeForcePush(branch: string): Promise<void> {
  const confirmed = await confirm({
    message: 'Warning: This will rewrite history on remote',
    default: false
  })

  if (!confirmed) {
    return
  }

  await execGit(['push', '--force-with-lease', 'origin', branch])
}
```

## 数据完整性

### 原子操作

```typescript
// ✅ 确保操作原子性
async function atomicStashAndCheckout(branch: string): Promise<void> {
  let stashRef: string | null = null

  try {
    stashRef = await createStash()
    await checkoutBranch(branch)
  } catch (error) {
    // 回滚：如果 checkout 失败，pop stash
    if (stashRef) {
      await popStash(stashRef)
    }
    throw error
  }
}
```

### 数据备份

```typescript
// ✅ 关键操作前创建恢复点
async function safeOperation(): Promise<void> {
  const backup = await createBackup()

  try {
    await riskyOperation()
  } catch (error) {
    await restoreFromBackup(backup)
    throw error
  }
}
```

---

遵循这些规范可以确保代码质量、可维护性和团队协作效率。
