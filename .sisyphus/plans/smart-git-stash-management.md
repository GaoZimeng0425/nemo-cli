# 智能Git Stash管理（持久化语义化命名和自动恢复）- 规划

**状态**: 最终修复中（基于 Momus 第三次审查反馈）

## 核心需求

用户希望在 `ng pull` 或其他需要 stash 的操作中，给 stash 一个有意义的名字，并持久化记录下来，在操作结束后可以自动 pop 出来。

## 策略决策（基于 Momus 三次审查反馈）

### 核心策略：扩展现有 stash-index.ts

**决策**: 复用并扩展现有的 `packages/git/src/utils/stash-index.ts`，而非创建新文件

**理由**:
- 现有代码已实现 `.git/ng-stash-index.json` 的完整读写逻辑
- 已有错误处理和验证机制
- 避免代码重复和维护负担

### 1. `.git` 路径策略（修复 Critical 错误）

**正确的路径返回**:
```typescript
// 在 getStashIndexPath() 中返回完整的文件路径
export async function getStashIndexPath(): Promise<string | null> {
  const gitRoot = await getGitRoot()
  if (!gitRoot) {
    return null
  }

  const STASH_INDEX_FILENAME = 'ng-stash-index.json'
  const indexPath = join(gitRoot, '.git', STASH_INDEX_FILENAME)
  return indexPath
}

// 对于 worktree 降级，返回不同的路径
// 注意：现有 writeStashIndex() 需要同步修改以支持降级路径
```

**修改现有函数**:
```typescript
// 修改 writeStashIndex() 支持降级路径
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

export async function writeStashIndex(index: StashIndex): Promise<void> {
  const indexPath = await getStashIndexPath()
  if (!indexPath) {
    throw new Error('Not in a Git repository. Cannot write stash index.')
  }

  // 获取文件所在的目录
  const dirPath = dirname(indexPath)

  // 确保目录存在（支持普通 repo 和 worktree 降级）
  await mkdir(dirPath, { recursive: true })

  // 写入文件
  await writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8')
}
```

**支持范围**:
- ✅ 普通 Git 仓库（`.git/ng-stash-index.json`）
- ⚠️ Git worktree（降级到项目根目录，但需要检测并修改 writeStashIndex）
- ❌ Bare repo（返回 null，跳过 index 功能）

### 2. 文件列表收集（修复事实性错误）

**正确的收集策略**:
```typescript
// 收集所有修改的文件（unstaged + staged），使用 Set 去重
const [unstagedError, unstagedResult] = await xASync('git', ['diff', '--name-only'])
const [stagedError, stagedResult] = await xASync('git', ['diff', '--cached', '--name-only'])

const unstagedFiles = unstagedError ? [] : unstagedResult.stdout.split('\n').filter(Boolean)
const stagedFiles = stagedError ? [] : stagedResult.stdout.split('\n').filter(Boolean)

// 去重（避免同一个文件在 unstaged 和 staged 都出现）
const allFiles = [...new Set([...unstagedFiles, ...stagedFiles])]

if (allFiles.length === 0) {
  return null  // 没有改动，不 stash
}
```

**不包含 untracked 文件**（与 git stash 默认行为一致）

### 3. Schema 统一（修复自相矛盾）

**扩展后的 StashMetadata 接口**:
```typescript
export interface StashMetadata {
  // 现有字段（保持向后兼容）
  /** Stash 引用，如 "stash@{0}" */
  stashRef: string
  /** ISO 8601 格式的时间戳 */
  timestamp: string
  /** ISO 8601 格式的创建时间 */
  createdAt: string
  /** Stash 消息（语义化命名） */
  message: string

  // 新增字段（可选，向后兼容）
  /** 内部唯一 ID（用于精确查找） */
  internalId?: string
  /** 操作类型 */
  operation?: 'pull' | 'checkout' | 'merge' | 'manual'
  /** Stash 时的当前分支 */
  currentBranch?: string
  /** 操作的目标分支（pull/merge 使用） */
  targetBranch?: string
  /** 修改的文件列表 */
  files?: string[]
  /** Stash 状态 */
  status?: 'active' | 'popped' | 'dropped' | 'not_found'
  /** Pop/drop 失败时的错误信息 */
  error?: string
  /** Stash 对应的 commit hash（稳定标识） */
  commitHash?: string
}
```

**向后兼容**: 新字段都是可选（`?`），不影响现有代码

**函数接口统一**:
```typescript
// handleGitStash 扩展
export interface StashResult {
  metadata: StashMetadata  // 完整的元数据对象
  stashName: string        // 实际的 stash 名称（用于向后兼容）
}

export async function handleGitStash(
  branch?: string,
  operation?: 'pull' | 'checkout' | 'merge' | 'manual'
): Promise<StashResult | null>

// handleGitPop 支持两种输入
export async function handleGitPop(
  stashOrBranch: string | StashMetadata
): Promise<void>
// 输入可以是：
// 1. 字符串（向后兼容）：模糊查找
// 2. StashMetadata（新增）：精确查找（按 internalId 或 commitHash）
```

### 4. 精确 Pop 定位算法（实现稳定定位）

**使用 commit hash 作为稳定标识**:
```typescript
// 在创建 stash 时获取 commit hash
const [_, commitResult] = await xASync('git', ['rev-parse', 'HEAD'])
const commitHash = commitResult.stdout.trim()

// 保存到 metadata
const metadata: StashMetadata = {
  // ...其他字段
  commitHash,  // 稳定标识
}

// Pop 时的定位算法
export async function handleGitPop(
  stashOrBranch: string | StashMetadata
): Promise<void> {
  if (typeof stashOrBranch === 'string') {
    // 向后兼容：模糊查找（现有逻辑）
    // ...现有代码
  } else {
    // 精确查找：使用 commitHash
    const metadata = stashOrBranch as StashMetadata

    // 方法 1：使用 commitHash 直接 pop
    if (metadata.commitHash) {
      // 尝试通过 commit hash pop（更精确）
      const popCommand = ['stash', 'pop', `--index=${metadata.stashRef.replace('stash@', '')}`]

      // 如果 commit hash 不匹配（已被手动 pop/drop），使用 stashRef
      // ...逻辑
    } else {
      // 降级到使用 stashRef
      // ...现有逻辑
    }
  }
}
```

**注意**: `--index` 参数需要验证 git 版本支持，如果不支持则降级到 stashRef

### 5. 并发写入策略（补齐实现细节）

**策略**: 读-改-写原子更新（Read-Modify-Write pattern）

**实现步骤**:
```typescript
export async function addStashMetadataWithDetails(
  branchName: string,
  metadata: StashMetadata
): Promise<void> {
  // 步骤 1：读取现有 index
  const index = await readStashIndex()

  // 步骤 2：修改内存中的 index
  if (!index[branchName]) {
    index[branchName] = []
  }
  index[branchName].push(metadata)

  // 步骤 3：写入临时文件
  const indexPath = await getStashIndexPath()!
  const tmpPath = `${indexPath}.tmp.${Date.now()}`
  await writeFile(tmpPath, JSON.stringify(index, null, 2), 'utf-8')

  // 步骤 4：原子的重命名操作
  try {
    await rename(tmpPath, indexPath)
  } catch (renameError) {
    // 步骤 5：重命名失败，重试最多 3 次
    const err = renameError as NodeJS.ErrnoException
    if (err.code === 'EACCES' || err.code === 'EBUSY' || err.code === 'ENOENT') {
      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 100)) // 等待 100ms
        try {
          await rename(tmpPath, indexPath)
          return  // 成功
        } catch {
          if (i === 2) {
            throw new Error(`Failed to write stash index after 3 retries: ${err.message}`)
          }
        }
      }
    } else {
      throw err
    }
  }
}
```

### 6. 命名规则（统一格式）

**格式**: `{operation}:{branch}@{formattedTime}`

**分支名规则**:
- **pull**: 使用 `currentBranch`（stash 时的本地分支）
  - 示例：`pull:feature/PRIME-1500@2025-01-26-18-30-00`

- **checkout**: 使用 `currentBranch`（切换前的分支）
  - 示例：`checkout:feature/A@2025-01-26-18-30-00`

- **merge**: 使用 `currentBranch`（合并的目标分支）
  - 示例：`merge:main@2025-01-26-18-30-00`

**时间格式**: `YYYY-MM-DD-HH-mm-ss`（使用短横线替代冒号）

**内部 ID 格式**: `{timestamp}_{operation}_{encodedBranch}`
- 示例：`1737932000000_pull_feature_PRIME-1500`
- 编码策略：将 `/` 和特殊字符替换为 `_`（避免文件系统问题）

### 7. 现有命令代码状态核实

**Pull 命令**（现有代码）:
```typescript
// packages/git/src/commands/pull.ts
const stashName = await handleGitStash()
try {
  await handleGitPull(selectedBranch, { rebase: useRebase })
} catch (error) {
  log.error('Pull failed:', error)
} finally {
  // 已经有 finally 块，无需修改
  stashName && handleGitPop(stashName)
}
```

**Checkout 命令**（现有代码）:
```typescript
// packages/git/src/commands/checkout.ts
const stashName = await handleGitStash(branch)
await handleCheckout(branch, { isNew: false, isRemote: false })
// 最后调用 handleGitPop，已经在 try-catch-finally 结构中
await handleGitPop(stashName)
```

**Merge 命令**（需要修改）:
```typescript
// packages/git/src/commands/merge.ts
// 当前问题：if (error) return 导致失败时不 pop
// 修改为 finally 块
const stashName = await handleGitStash()
try {
  await x('git', ['merge', branch])
} catch (error) {
  log.error('Merge failed:', error)
  // 不 return，让 finally 执行
} finally {
  // 无论成功失败都 pop
  stashName && handleGitPop(stashName)
}
```

### 8. History 查询子命令（使用现有 UI API）

**命令**: `ng stash history` 或 `ng stash his`

**参数**:
- `--all`: 显示所有记录（不限数量）
- `--active`: 仅显示未使用的记录
- `--clean`: 清理旧记录并显示清理数量

**实现**（使用现有的 UI 组件）:
```typescript
// packages/git/src/commands/stash.ts
import { colors, log, createCheckbox, Message } from '@nemo-cli/shared'
import {
  getAllStashes,
  cleanOldStashes
} from '../utils/stash-index'

const historyCmd = stashCmd.command('history').alias('his')
historyCmd.option('--all', 'Show all records')
historyCmd.option('--active', 'Show only active records')
historyCmd.option('--clean [days]', 'Clean old records', { default: '30' })
historyCmd.action(async (options) => {
  if (options.clean) {
    const days = parseInt(options.clean, 10)
    const count = await cleanOldStashes(days)
    Message({ text: `Cleaned ${count} old stash records (${days} days)` })
    return
  }

  const stashes = await getAllStashes(options.active ? 'active' : undefined)
  const displayList = options.all ? stashes : stashes.slice(0, 10)

  // 按时间倒序
  displayList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  if (displayList.length === 0) {
    log.show('No stash records found.', { type: 'info' })
    return
  }

  for (let i = 0; i < displayList.length; i++) {
    const stash = displayList[i]
    const statusEmoji = stash.status === 'active' ? '📦' : '✅'
    const statusText = stash.status === 'active' ? 'Active' : 'Used'

    log.show(`${statusEmoji} ${i + 1}. ${stash.message}`)
    log.show(`   Status: ${statusText}`)
    log.show(`   Files: ${stash.files?.join(', ') || '(none)'}`)
    if (stash.error) {
      log.show(`   Error: ${stash.error}`, { type: 'warn' })
    }
    log.show('')
  }
})
```

## 范围定义

**范围内**:
- ✅ 扩展 `packages/git/src/utils/stash-index.ts`
  - 扩展 `StashMetadata` 接口（添加新字段，保持向后兼容）
  - 修改 `getStashIndexPath()` 返回完整文件路径
  - 修改 `writeStashIndex()` 支持降级路径和创建父目录
  - 新增 `addStashMetadataWithDetails` 函数（包含并发安全）
  - 新增 `updateStashStatus` 函数
  - 新增 `cleanOldStashes` 函数
  - 新增 `getAllStashes` 函数
  - 新增 `findStashByInternalId` 函数

- ✅ 修改 `packages/git/src/utils.ts`
  - 修改 `handleGitStash` 函数签名（添加 `operation` 参数）
  - 添加文件列表收集逻辑（unstaged + staged，去重）
  - 获取 commit hash 作为稳定标识
  - 调用 `addStashMetadataWithDetails` 保存完整元数据
  - 返回 `StashResult` 对象
  - 修改 `handleGitPop` 支持输入类型（字符串或 StashMetadata）
  - 使用 commit hash 或 stashRef 进行精确 pop

- ✅ 修改 `packages/git/src/commands/merge.ts`
  - 修复 bug：将 `if (error) return` 改为 `try/catch/finally` 块
  - 确保失败时也 pop stash

- ✅ 修改 `packages/git/src/commands/stash.ts`
  - 添加 `history` 子命令
  - 使用现有 UI API（colors, log, Message）
  - 支持参数：`--all`, `--active`, `--clean`

- ✅ 编写/扩展测试
  - `packages/git/__tests__/utils/stash-index.test.ts` 添加新功能测试
  - 测试并发写入安全性
  - 测试文件列表收集（unstaged + staged）
  - 测试状态更新和清理逻辑

- ✅ 更新文档
  - README.md 添加 history 功能说明
  - 补充示例

**范围外**:
- ❌ 修改 stash 命令的现有用户界面（save/list/pop/drop 保持不变）
- ❌ 将 stash 历史记录到数据库（仅文件系统存储）
- ❌ 跨仓库共享 stash 历史（每个仓库独立）
- ❌ 完整支持 Git worktree（有限支持：降级到项目根目录）
- ❌ 支持 Bare repo（跳过 index 功能）

## 验收标准（Acceptance Criteria）

### 场景 1: 无改动时的 pull
**前置条件**: 工作区无改动
**操作**: 运行 `ng pull`
**预期结果**:
- `git diff --name-only` 和 `git diff --cached --name-only` 都返回空
- `handleGitStash` 返回 `null`
- history 文件无新增记录
- pull 正常执行
- 显示提示："No file changes to stash"

### 场景 2: 有改动且 pull 成功（unstaged 文件）
**前置条件**: 工作区有未提交的 unstaged 改动（修改了 `src/utils.ts`）
**操作**: 运行 `ng pull`，选择分支 `main`，选择 `merge` 模式
**预期结果**:
- `git diff --name-only` 返回 `['src/utils.ts']`
- `git diff --cached --name-only` 返回 `[]`
- 文件列表为 `['src/utils.ts']`（Set 去重）
- 创建 stash，命名为 `pull:currentBranch@{时间}`
- history 文件新增记录：
  - `operation: 'pull'`
  - `currentBranch: '当前分支名'`
  - `targetBranch: 'main'`
  - `files: ['src/utils.ts']`
  - `status: 'active'`
  - `commitHash`: stash 对应的 commit hash
- pull 执行成功
- 自动 pop stash（精确查找 `internalId` 或 `commitHash`）
- history 文件更新该记录的 `status: 'popped'`
- 工作区恢复到原始状态（`src/utils.ts` 的改动保留）

### 场景 3: 有改动且 pull 成功（staged + unstaged 文件）
**前置条件**: 工作区有 staged 和 unstaged 改动
**操作**: 运行 `ng pull`
**预期结果**:
- `git diff --name-only` 返回 unstaged 文件列表
- `git diff --cached --name-only` 返回 staged 文件列表
- 文件列表合并后使用 Set 去重
- 创建 stash，包含所有改动
- pull 执行成功
- 自动 pop stash
- 工作区恢复到原始状态（所有改动保留）

### 场景 4: 有改动且 pull 失败（冲突）
**前置条件**: 工作区有未提交改动，远程有冲突
**操作**: 运行 `ng pull`，选择分支 `main`
**预期结果**:
- 创建 stash，命名正确
- history 文件新增记录（`status: 'active'`）
- pull 失败（冲突）
- **关键**：仍然执行 pop stash（finally 块确保）
- history 文件更新该记录的 `status: 'popped'`
- 显示错误："Pull failed due to conflicts. Changes have been restored from stash."
- 工作区恢复到原始状态

### 场景 5: merge 失败路径（修复现有 bug）
**前置条件**: 工作区有改动
**操作**: 运行 `ng merge branchA`，merge 失败
**当前代码问题**: `if (error) return` 导致失败时不 pop
**预期结果**:
- 创建 stash
- merge 执行并失败
- **关键**：执行 finally 中的 pop stash（修复 bug）
- history 文件记录该 stash 为 `popped'`
- 显示错误和恢复提示
- 工作区恢复到原始状态

### 场景 6: stash pop 精确查找
**前置条件**: stash 包含在 history 中，使用 commit hash 作为精确标识
**操作**: pop stash
**预期结果**:
- 使用 commit hash 或 internalId 进行精确查找
- 即使 stash ref 变化，也能找到正确的 stash
- history 文件更新该记录的 `status: 'popped'`

### 场景 7: 30 天清理
**前置条件**: history 文件有多条记录，其中包含 31 天前的 `popped` 记录
**操作**: 运行 `ng pull`（触发自动清理）或 `ng stash history --clean`
**预期结果**:
- 31 天前的 `popped` 记录被删除
- 30 天内的 `popped` 记录保留
- `active` 记录不受影响
- 显示清理详情："Cleaned 3 old stash records (30 days)"
- history 文件结构正确（删除空分支键）

### 场景 8: history 查询
**前置条件**: history 文件有多条记录
**操作**: 运行 `ng stash history`
**预期结果**:
- 显示最近 10 条记录（默认）
- 按时间倒序排列
- 显示操作类型、分支名、时间、状态、文件列表
- `--all` 参数显示所有记录
- `--active` 参数仅显示 `active` 记录

### 场景 9: 并发写入测试
**前置条件**: 同时运行两个 `ng pull` 实例
**操作**: 并发执行
**预期结果**:
- history 文件不被破坏
- 两条记录都正确写入
- 文件结构完整

### 场景 10: 降级场景测试
**前置条件**: 在 worktree 仓库运行 `ng pull`
**操作**: 执行命令
**预期结果**:
- history 文件保存到项目根目录的 `.nemo-cli/ng-stash-index.json`
- `writeStashIndex()` 创建正确的父目录
- 功能正常工作

## 实施任务顺序

1. **扩展 stash-index.ts 模块**
   - 扩展 `StashMetadata` 接口（添加新字段，保持向后兼容）
   - 修改 `getStashIndexPath()` 返回完整文件路径
   - 修改 `writeStashIndex()` 支持降级路径和创建父目录
   - 新增 `addStashMetadataWithDetails` 函数（包含并发安全）
   - 新增 `updateStashStatus` 函数
   - 新增 `cleanOldStashes` 函数
   - 新增 `getAllStashes` 函数
   - 新增 `findStashByInternalId` 函数

2. **修改 handleGitStash 函数**
   - 添加 `operation` 参数
   - 添加文件列表收集逻辑（`git diff --name-only` + `git diff --cached --name-only`，Set 去重）
   - 获取 commit hash 作为稳定标识
   - 生成语义化 stash 名称
   - 调用 `addStashMetadataWithDetails` 保存完整元数据
   - 返回 `StashResult` 对象

3. **修改 handleGitPop 函数**
   - 支持输入类型：`string`（向后兼容）或 `StashMetadata`（精确查找）
   - 使用 commit hash 或 stashRef 进行精确定位
   - Pop 后调用 `updateStashStatus` 更新状态
   - Pop 失败时记录错误信息到 `error` 字段

4. **修复 merge 命令的 bug**
   - 将 `if (error) return` 改为 `try/catch/finally` 块
   - 确保失败时也 pop

5. **添加 history 查询子命令**
   - 在 `stash.ts` 中实现 `history` 命令
   - 使用现有 UI API（colors, log, Message）
   - 支持 `--all`, `--active`, `--clean` 参数

6. **扩展测试**
   - 添加文件列表收集测试（unstaged + staged，去重）
   - 添加状态更新测试
   - 添加清理逻辑测试
   - 添加并发写入测试

7. **更新文档**
   - README.md 添加 history 功能说明
   - 补充示例

## 下一步选择

**选择 [C] 开始执行**
运行 `/start-work` 让 Sisyphus 开始实现

所有关键问题已修复，规划已达到可执行状态。
