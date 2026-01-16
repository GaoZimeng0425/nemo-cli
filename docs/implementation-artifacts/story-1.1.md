# Story 1.1: 实现 Stash 元数据存储机制

Status: completed

## Story

As a developer,
I want the system to store stash metadata in a structured format,
So that the system can reliably track which stash belongs to which branch and automatically manage them.

## Acceptance Criteria

**Given** I am in a Git repository
**When** the system needs to store stash metadata for a branch
**Then** it creates or updates `.git/ng-stash-index.json` file with the stash information
**And** the metadata includes: branch name, stash reference (stash@{n}), timestamp (ISO 8601 format), and stash message
**And** the file structure follows the format: `{ "branchName": [{ "stashRef": "stash@{0}", "timestamp": "2025-12-21T10:00:00.000Z", "createdAt": "2025-12-21T10:00:00.000Z", "message": "[ng-auto] branch:feature/xxx timestamp:2025-12-21T10:00:00" }] }`
**And** the system handles file read/write errors gracefully with clear error messages

**References:** FR2 (stash message format), Architecture requirement: Stash 元数据存储机制

## Tasks / Subtasks

- [x] Task 1: 创建 Stash 元数据存储工具模块 (AC: 所有)
  - [x] Subtask 1.1: 定义 StashMetadata 类型接口
  - [x] Subtask 1.2: 定义 StashIndex 数据结构类型
  - [x] Subtask 1.3: 实现读取 `.git/ng-stash-index.json` 的函数
  - [x] Subtask 1.4: 实现写入 `.git/ng-stash-index.json` 的函数
  - [x] Subtask 1.5: 实现错误处理（文件不存在、读写错误等）
  - [x] Subtask 1.6: 编写单元测试

## Dev Notes

### 技术规范

- **存储位置**: `.git/ng-stash-index.json` (项目级，在 Git 仓库根目录的 `.git` 目录下)
- **数据格式**: JSON
- **时间格式**: ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- **错误处理**: 使用 try-catch，提供清晰的错误消息

### 数据结构

```typescript
interface StashMetadata {
  stashRef: string        // 如 "stash@{0}"
  timestamp: string       // ISO 8601 格式
  createdAt: string       // ISO 8601 格式
  message: string         // stash 消息
}

interface StashIndex {
  [branchName: string]: StashMetadata[]
}
```

### 文件位置

- 实现文件: `packages/git/src/utils/stash-index.ts`
- 测试文件: `packages/git/__tests__/utils/stash-index.test.ts`

### 实现要求

1. 使用 Node.js `fs/promises` 进行文件操作
2. 使用 `path` 模块构建文件路径
3. 确保 `.git` 目录存在（在 Git 仓库中）
4. 文件不存在时创建新文件
5. 文件格式错误时提供清晰的错误消息
6. 读写操作使用异步方式

### 参考

- [Source: docs/architecture.md#分支级 Stash 管理与自动匹配]
- [Source: docs/planning-artifacts/epics.md#Story 1.1]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

### Completion Notes List

1. **实现完成**: 已实现完整的 Stash 元数据存储机制
   - 定义了 `StashMetadata` 和 `StashIndex` 类型接口
   - 实现了 `readStashIndex()` 和 `writeStashIndex()` 核心函数
   - 实现了 `addStashMetadata()`, `getBranchStashes()`, `removeStashMetadata()` 辅助函数
   - 实现了完整的错误处理（文件不存在、JSON 解析错误、数据结构验证等）
   - 编写了全面的单元测试，覆盖所有功能和边界情况

2. **技术实现细节**:
   - 使用 Node.js `fs/promises` 进行异步文件操作
   - 使用 `getGitRoot()` 获取 Git 仓库根目录
   - 文件存储在 `.git/ng-stash-index.json`（项目级存储）
   - JSON 格式化为 2 空格缩进，便于阅读
   - 所有错误都有清晰的错误消息

3. **测试覆盖**:
   - 测试文件不存在时的处理
   - 测试读取和写入有效数据
   - 测试处理损坏的 JSON 文件
   - 测试处理无效的数据结构
   - 测试添加、获取、删除 stash 元数据
   - 测试不在 Git 仓库中的错误处理

4. **符合验收标准**:
   - ✅ 创建或更新 `.git/ng-stash-index.json` 文件
   - ✅ 元数据包含分支名、stash 引用、时间戳（ISO 8601）、stash 消息
   - ✅ 文件结构符合指定格式
   - ✅ 优雅处理文件读写错误，提供清晰的错误消息

### File List

- `packages/git/src/utils/stash-index.ts` - Stash 元数据存储工具模块实现
- `packages/git/__tests__/utils/stash-index.test.ts` - 单元测试文件
