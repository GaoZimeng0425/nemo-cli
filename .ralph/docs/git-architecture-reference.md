# Git 模块架构参考

## 服务层设计

### StashManager

**职责**: 分支级 Stash 管理

**位置**: `packages/git/src/services/stash-manager.ts`

**核心功能**:
```typescript
class StashManager {
  // 创建分支 stash 并记录元数据
  async createBranchStash(branchName: string, message?: string): Promise<StashMetadata>

  // 查找分支对应的 stash（优先返回最新的）
  async findBranchStash(branchName: string): Promise<StashMetadata | null>

  // 列出分支的所有 stash
  async listBranchStashes(branchName: string): Promise<StashMetadata[]>

  // 自动 pop 分支对应的 stash
  async autoPopBranchStash(branchName: string): Promise<boolean>

  // 删除分支的特定 stash
  async deleteBranchStash(branchName: string, stashRef: string): Promise<void>
}
```

**元数据存储**:
```typescript
interface StashMetadata {
  branchName: string
  stashRef: string        // e.g., "stash@{0}"
  timestamp: string       // ISO 8601
  createdAt: string       // ISO 8601
  message?: string
}
```

**存储位置**: `~/.nemoclirc/git/stash-mapping.json`

**Stash 消息格式**: `[ng-auto] branch:{branchName} timestamp:{iso8601}`

### PullService

**职责**: Pull 安全模式

**位置**: `packages/git/src/services/pull-service.ts`

**核心功能**:
```typescript
class PullService {
  // 安全 Pull（自动 stash → pull → pop）
  async safePull(branch: string, options?: PullOptions): Promise<void>

  // 检测未提交更改
  async hasUncommittedChanges(): Promise<boolean>

  // 处理 Pull 冲突
  async handlePullConflict(conflictFiles: string[]): Promise<void>
}
```

**Pull 选项**:
```typescript
interface PullOptions {
  strategy?: 'merge' | 'rebase'
  autoStash?: boolean
  rebaseTarget?: string
}
```

### PushService

**职责**: Push 安全模式

**位置**: `packages/git/src/services/push-service.ts`

**核心功能**:
```typescript
class PushService {
  // 安全 Push（push 前自动 pull）
  async safePush(branch: string, options?: PushOptions): Promise<void>

  // 检测远程更新
  async hasRemoteUpdates(branch: string): Promise<boolean>
}
```

**Push 选项**:
```typescript
interface PushOptions {
  force?: boolean
  pullBeforePush?: boolean
}
```

### RebaseService

**职责**: Rebase 工作流优化

**位置**: `packages/git/src/services/rebase-service.ts`

**核心功能**:
```typescript
class RebaseService {
  // 检测历史重写
  async detectHistoryRewrite(branch: string): Promise<boolean>

  // 安全 Force Push
  async safeForcePush(branch: string): Promise<void>

  // 显示差异预览
  async showDiffPreview(branch: string): Promise<void>
}
```

## 工具层设计

### stash-utils.ts

**位置**: `packages/git/src/utils/stash-utils.ts`

**核心函数**:
```typescript
// 执行 git stash 并返回 stash 引用
async function handleGitStash(message: string): Promise<string>

// 执行 git stash pop
async function handleGitStashPop(stashRef: string): Promise<void>

// 获取所有 stash 列表
async function getStashList(): Promise<StashInfo[]>

// 解析 stash 消息提取元数据
function parseStashMessage(message: string): StashMetadata | null
```

### conflict-handler.ts

**位置**: `packages/git/src/utils/conflict-handler.ts`

**核心函数**:
```typescript
// 检测 Git 工作区是否有冲突
async function hasConflicts(): Promise<boolean>

// 获取冲突文件列表
async function getConflictFiles(): Promise<string[]>

// 显示冲突解决建议
function showConflictResolution(files: string[]): void
```

### history-detector.ts

**位置**: `packages/git/src/utils/history-detector.ts`

**核心函数**:
```typescript
// 比较本地和远程分支的 commit 历史
async function compareBranchHistory(local: string, remote: string): Promise<{
  hasDiverged: boolean
  localOnly: number
  remoteOnly: number
}>

// 检测是否需要 force push
async function needsForcePush(branch: string): Promise<boolean>
```

## 配置层设计

### loader.ts

**位置**: `packages/git/src/config/loader.ts`

**核心函数**:
```typescript
// 加载配置（合并全局和项目级）
async function loadConfig(): Promise<GitConfig>

// 加载全局配置
async function loadGlobalConfig(): Promise<GitConfig>

// 加载项目级配置
async function loadProjectConfig(): Promise<GitConfig | null>

// 合并配置（优先级：项目 > 全局 > 默认）
function mergeConfig(...configs: Partial<GitConfig>[]): GitConfig
```

**配置接口**:
```typescript
interface GitConfig {
  pullStrategy: 'merge' | 'rebase'
  autoStash: boolean
  stashMessageTemplate: string
  defaultRemote: string
}
```

### validator.ts

**位置**: `packages/git/src/config/validator.ts`

**核心函数**:
```typescript
// 验证配置
function validateConfig(config: unknown): config is GitConfig

// 获取默认配置
function getDefaultConfig(): GitConfig
```

### defaults.ts

**位置**: `packages/git/src/config/defaults.ts`

**默认配置**:
```typescript
export const DEFAULT_GIT_CONFIG: GitConfig = {
  pullStrategy: 'merge',
  autoStash: true,
  stashMessageTemplate: '[ng-auto] branch:{branch} timestamp:{timestamp}',
  defaultRemote: 'origin'
}
```

## 日志层设计

### operation-logger.ts

**位置**: `packages/git/src/logging/operation-logger.ts`

**核心函数**:
```typescript
// 记录操作日志
async function logOperation(operation: OperationLog): Promise<void>

// 记录成功操作
async function logSuccess(command: string, operation: string, details?: Record<string, unknown>): Promise<void>

// 记录失败操作
async function logFailure(command: string, operation: string, error: Error, details?: Record<string, unknown>): Promise<void>

// 获取最近的操作日志
async function getRecentOperations(limit: number): Promise<OperationLog[]>
```

**日志接口**:
```typescript
interface OperationLog {
  timestamp: string
  command: string
  operation: string
  status: 'success' | 'failed' | 'cancelled'
  details?: Record<string, unknown>
  error?: string
}
```

### history-manager.ts

**位置**: `packages/git/src/logging/history-manager.ts`

**核心函数**:
```typescript
// 添加操作到历史
async function addToHistory(operation: OperationLog): Promise<void>

// 获取操作历史
async function getHistory(filters?: HistoryFilters): Promise<OperationLog[]>

// 清理旧日志（保留最近 N 条）
async function cleanupOldLogs(keepCount: number): Promise<void>
```

**历史过滤器**:
```typescript
interface HistoryFilters {
  command?: string
  status?: 'success' | 'failed' | 'cancelled'
  startDate?: Date
  endDate?: Date
  limit?: number
}
```

## 集成示例

### 在 checkout 命令中使用 StashManager

```typescript
// packages/git/src/commands/checkout.ts
import { StashManager } from '../services/stash-manager'
import { hasUncommittedChanges } from '../utils/stash-utils'

export const checkoutCommand = () => {
  program
    .command('checkout [branch]')
    .alias('co')
    .description('安全切换分支（自动 stash/pop）')
    .action(async (branch) => {
      const stashManager = new StashManager()
      const currentBranch = await getCurrentBranch()

      // 检测未提交更改
      if (await hasUncommittedChanges()) {
        // 自动 stash
        await stashManager.createBranchStash(currentBranch)
      }

      // 切换分支
      await execGit(['checkout', branch])

      // 自动 pop（如果有对应的 stash）
      const stash = await stashManager.findBranchStash(branch)
      if (stash) {
        await stashManager.autoPopBranchStash(branch)
      }
    })
}
```

### 在 pull 命令中使用 PullService

```typescript
// packages/git/src/commands/pull.ts
import { PullService } from '../services/pull-service'

export const pullCommand = () => {
  program
    .command('pull')
    .alias('pl')
    .description('安全拉取（自动 stash → pull → pop）')
    .action(async () => {
      const pullService = new PullService()

      // 执行安全 pull
      await pullService.safePull(await getCurrentBranch(), {
        strategy: 'merge',
        autoStash: true
      })
    })
}
```

## 数据流示例

### 自动 Stash/Pop 流程

```
用户执行: ng checkout feature/xxx
    ↓
检测未提交更改
    ↓
StashManager.createBranchStash('current-branch')
    ├── 执行: git stash save "[ng-auto] branch:current-branch timestamp:2025-12-21T10:00:00"
    ├── 获取: stash@{0}
    └── 保存元数据到: ~/.nemoclirc/git/stash-mapping.json
    ↓
执行: git checkout feature/xxx
    ↓
StashManager.findBranchStash('feature/xxx')
    ├── 从配置加载 stash-mapping.json
    ├── 查找 feature/xxx 的 stash
    └── 返回最新的 stash（按 timestamp）
    ↓
如果有 stash，执行 pop
    ├── 执行: git stash pop stash@{0}
    ├── 检测冲突
    ├── 如果冲突：显示冲突文件列表，保留 stash
    └── 如果成功：从元数据删除该 stash
```

## 配置存储位置

**全局配置**: `~/.nemoclirc/git/config.json`
**Stash 元数据**: `~/.nemoclirc/git/stash-mapping.json`
**操作历史**: `~/.nemoclirc/git/operation-history.json`

**项目级配置**: `.nemo-cli/git.json`

**配置优先级**: 项目级 > 全局 > 默认值
