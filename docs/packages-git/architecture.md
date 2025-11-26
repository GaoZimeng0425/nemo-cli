# @nemo-cli/git 架构设计文档

> 生成日期：2025-11-26
> 版本：0.0.1

---

## 1. 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                         bin/index.mjs                        │
│                      (CLI 入口 - shebang)                     │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                        src/index.ts                          │
│                   (命令注册 & 初始化检查)                      │
├─────────────────────────────────────────────────────────────┤
│  init()  → 创建 Commander 实例，注册所有子命令                 │
│  run()   → 检查 git 仓库，解析命令行参数                       │
└─────────────────────────────────────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                              ▼
┌───────────────────────┐        ┌───────────────────────────┐
│    src/commands/       │        │      src/utils.ts          │
│   (命令实现模块)        │        │    (Git 操作工具函数)       │
├───────────────────────┤        ├───────────────────────────┤
│ • branch.ts           │        │ • getLocalBranches()      │
│ • checkout.ts         │───────▶│ • getRemoteBranches()     │
│ • commit.ts           │        │ • handleGitPull()         │
│ • diff.ts             │        │ • handleGitStash()        │
│ • list.ts             │        │ • handleGitPop()          │
│ • merge.ts            │        │ • isBranchMergedToMain()  │
│ • pull.ts             │        │ • checkGitRepository()    │
│ • push.ts             │        │ • ...                     │
│ • stash.ts            │        └───────────────────────────┘
└───────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                     外部依赖                                  │
├─────────────────────────────────────────────────────────────┤
│  @nemo-cli/shared                 @nemo-cli/ui              │
│  ├── createCommand (Commander)    ├── ErrorMessage          │
│  ├── createSelect, createInput    ├── Message               │
│  ├── createConfirm, createCheckbox├── BigText               │
│  ├── x(), xASync() (执行命令)      └───────────────────────  │
│  ├── getCurrentBranch()                                     │
│  ├── colors (chalk)                                         │
│  ├── log, createSpinner                                     │
│  └── loadConfig (unconfig)                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 设计模式

### 2.1 命令模式 (Command Pattern)

每个 Git 操作封装为独立的命令模块，遵循统一接口：

```typescript
// 命令注册模式
export function xxxCommand(command: Command) {
  command
    .command('xxx')          // 命令名
    .alias('xx')             // 别名
    .description('...')      // 描述
    .option('-x, --xxx')     // 选项
    .action(async (options) => {
      // 命令实现
    })
}
```

### 2.2 工厂模式 (Factory Pattern)

`src/index.ts` 的 `init()` 函数作为命令工厂，统一创建和注册所有子命令：

```typescript
export const init = () => {
  const command = createCommand('ng')
    .version(pkg.version)
    .description(`${pkg.name} CLI helper for git`)

  // 注册所有子命令
  pullCommand(command)
  listCommand(command)
  pushCommand(command)
  checkoutCommand(command)
  branchCommand(command)
  diffCommand(command)
  mergeCommand(command)
  stashCommand(command)
  commitCommand(command)

  return command
}
```

### 2.3 高阶函数模式 (Higher-Order Function)

`stash.ts` 中使用高阶函数封装通用的检查逻辑：

```typescript
const handleCheck = (callback: (stashes: string[]) => Promise<void>) => async () => {
  const stashes = await handleGitStashCheck()
  if (stashes.length === 0) {
    log.show('No stash found.', { type: 'error' })
    return
  }
  return callback(stashes)
}

const handlePop = handleCheck(async (stashes) => { /* ... */ })
const handleList = handleCheck(async (stashes) => { /* ... */ })
const handleDrop = handleCheck(async (stashes) => { /* ... */ })
```

---

## 3. 数据流

### 3.1 Commit 流程

```
用户执行 ng commit
        │
        ▼
┌───────────────────┐
│ 1. 获取 Git 状态    │  getGitStatus() → { staged, unstaged }
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 2. 选择暂存文件    │  createCheckbox() → 选择 unstaged 文件
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 3. 执行 lint-staged│  xASync('lint-staged')
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 4. 加载 commitlint │  loadConfig() → 读取 commitlint.config
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 5. 选择提交类型    │  createSelect() → feat/fix/docs/...
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 6. 选择提交范围    │  createSelect() → app/shared/server/...
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 7. 输入提交标题    │  createInput() → 限制 80 字符
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 8. 输入详细描述    │  createInput() → 可选
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 9. 自动提取 Ticket │  getTicket() → 从分支名正则匹配
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 10. 预览 & 确认   │  createNote() + createConfirm()
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 11. 执行提交      │  xASync('git', ['commit', '-m', message])
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ 12. 可选推送      │  pushInteractive()
└───────────────────┘
```

### 3.2 Checkout 流程（带自动 Stash）

```
用户执行 ng checkout
        │
        ▼
┌───────────────────────┐
│ 解析选项              │  -l (local) / -r (remote) / -b (new)
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ 获取分支列表          │  getLocalOptions() / getRemoteOptions()
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ 用户选择目标分支      │  createSelect() / createSearch()
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ 自动 Stash 当前更改   │  handleGitStash(branchName)
│ (以分支名命名)        │
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ 执行 git checkout     │  x('git', ['checkout', branch])
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ 查找并恢复 Stash      │  handleGitPop(stashName)
│ (如果之前有 stash)    │
└───────────────────────┘
```

---

## 4. 关键技术实现

### 4.1 Git 命令执行

使用两种执行方式：

```typescript
// 1. 流式输出 (用于需要实时显示的命令)
const process: Result = x('git', ['push', 'origin', branch])
for await (const line of process) {
  spinner.message(line)
}

// 2. 异步等待 (用于需要获取结果的命令)
const [error, result] = await xASync('git', ['branch', '-r'])
```

### 4.2 Ticket 自动提取

从分支名自动提取 JIRA/Ticket 号：

```typescript
export const REGEX_SLASH_TAG = new RegExp(/\/(\w+-\d+)/)      // feature/PRIME-1500
export const REGEX_START_TAG = new RegExp(/^(\w+-\d+)/)       // PRIME-1500-feature
export const REGEX_START_UND = new RegExp(/^([A-Z]+-[[a-zA-Z\]\d]+)_/)  // PRIME-ABC_feature
export const REGEX_SLASH_UND = new RegExp(/\/([A-Z]+-[[a-zA-Z\]\d]+)_/)
export const REGEX_SLASH_NUM = new RegExp(/\/(\d+)/)          // feature/1500
export const REGEX_START_NUM = new RegExp(/^(\d+)/)           // 1500-feature

const getTicket = async () => {
  const branch = await getCurrentBranch()
  const chain = [REGEX_START_UND, REGEX_SLASH_UND, REGEX_SLASH_TAG, REGEX_SLASH_NUM, REGEX_START_TAG, REGEX_START_NUM]
  for (const regex of chain) {
    const match = branch.match(regex)
    if (match) return match[1]
  }
  return branch
}
```

### 4.3 分支合并检测

检查分支是否已合并到主分支：

```typescript
export const isBranchMergedToMain = async (branches: string[]): Promise<BranchInfo[]> => {
  // 1. 获取最新远程信息
  await xASync('git', ['fetch', 'origin', '--prune'])

  // 2. 获取远程主分支名
  const remoteMainBranch = await getRemoteMainBranch()

  // 3. 检查每个分支是否有未合并的提交
  return Promise.all(
    branches.map(async (branch) => {
      const [error, result] = await xASync('git', ['log', `${remoteMainBranch}..${branch}`])
      return { branch, isMerged: !result?.stdout.trim() }
    })
  )
}
```

### 4.4 合并提交信息处理

支持 Pull 时自定义合并提交信息：

```typescript
const handleMergeCommit = async () => {
  const shouldCustomize = await createConfirm({
    message: 'Do you want to customize the merge commit message?',
  })

  if (!shouldCustomize) {
    await xASync('git', ['commit', '--no-edit'])
    return
  }

  // 创建临时文件，打开编辑器
  const tempFile = join(tmpdir(), `merge-commit-${Date.now()}.txt`)
  const editor = process.env.EDITOR || process.env.VISUAL || 'vim'

  const editProcess = spawn(editor, [tempFile], {
    stdio: 'inherit',
    shell: true,
  })

  // 等待编辑完成后使用编辑后的消息提交
}
```

---

## 5. 依赖关系图

```
@nemo-cli/git
    │
    ├── @nemo-cli/shared (workspace:*)
    │   ├── commander          # CLI 框架
    │   ├── @clack/prompts     # 交互式提示
    │   ├── @inquirer/prompts  # 交互式提示（备用）
    │   ├── chalk              # 终端着色
    │   ├── execa / tinyexec   # 命令执行
    │   ├── unconfig           # 配置加载
    │   └── ora                # Spinner
    │
    └── @nemo-cli/ui (workspace:*)
        ├── ink                # React TUI
        ├── cfonts             # ASCII 艺术字
        └── figlet             # ASCII 艺术字
```

---

## 6. 扩展点

### 6.1 添加新命令

1. 在 `src/commands/` 创建新文件 `new-command.ts`
2. 实现命令函数：

```typescript
export function newCommand(command: Command) {
  command
    .command('new')
    .alias('n')
    .description('New command description')
    .action(async () => {
      // 实现逻辑
    })
}
```

3. 在 `src/index.ts` 中导入并注册：

```typescript
import { newCommand } from './commands/new-command'
// ...
newCommand(command)
```

### 6.2 自定义 Commit 配置

支持通过 `commitlint.config.{js,ts,cjs,mjs,json}` 自定义：

- `type-enum`: 提交类型列表
- `scope-enum`: 提交范围列表

---

## 7. 性能考虑

1. **并行分支信息获取**：`isBranchMergedToMain` 使用 `Promise.all` 并行检查多个分支
2. **流式命令输出**：使用 `for await...of` 流式处理长时间运行的命令
3. **按需加载配置**：仅在 commit 命令时加载 commitlint 配置
4. **缓存分支列表**：单次命令执行内复用分支列表结果

---

## 8. 错误处理

```typescript
// 入口检查
export const run = async () => {
  const isGitRepository = await checkGitRepository()
  if (!isGitRepository) {
    ErrorMessage({ text: 'Not a git repository' })
    exit(0)
  }
  // ...
}

// 命令执行错误
const [error, result] = await xASync('git', ['...'])
if (error) {
  log.show(`Failed to execute. ${error.message}`, { type: 'error' })
  return
}
```
