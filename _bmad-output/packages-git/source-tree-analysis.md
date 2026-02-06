# @nemo-cli/git 源码结构分析

> 生成日期：2025-11-26

---

## 目录树

```
packages/git/
├── bin/
│   └── index.mjs              # [入口点] CLI 启动脚本
│
├── src/
│   ├── index.ts               # [主模块] 命令注册与初始化
│   ├── utils.ts               # [工具] Git 操作核心函数
│   │
│   ├── constants/
│   │   ├── index.ts           # 主帮助信息常量
│   │   └── stash.ts           # Stash 命令帮助信息
│   │
│   └── commands/
│       ├── branch.ts          # 分支管理 (delete, clean)
│       ├── checkout.ts        # 分支切换 (co)
│       ├── commit.ts          # 交互式提交
│       ├── commit-options.ts  # Commitlint 配置与选项
│       ├── diff.ts            # 差异查看 (di)
│       ├── list.ts            # 分支列表 (ls)
│       ├── merge.ts           # 分支合并 (mg)
│       ├── pull.ts            # 拉取 (pl)
│       ├── push.ts            # 推送 (ps)
│       └── stash.ts           # 暂存管理 (st)
│
├── dist/                      # 构建输出
│   ├── index.js               # 编译后的 JS
│   ├── index.d.ts             # 类型声明
│   └── *.map                  # Source maps
│
├── package.json               # 包配置
├── tsconfig.build.json        # TypeScript 构建配置
├── rolldown.config.ts         # Rolldown 构建配置
└── biome.json                 # Biome 格式化配置
```

---

## 文件详解

### bin/index.mjs

```javascript
#!/usr/bin/env node
import { run } from '../dist/index.js'
run()
```

- **作用**：CLI 入口点，由 `package.json` 的 `bin` 字段指定
- **Shebang**：`#!/usr/bin/env node` 使其可作为可执行文件运行
- **调用**：导入并执行 `dist/index.js` 的 `run()` 函数

---

### src/index.ts

**导出函数**：

- `pkg` - 包信息对象
- `init()` - 初始化 Commander 实例并注册所有命令
- `run()` - 执行 CLI（检查 Git 仓库 → 解析命令）

**命令注册顺序**：

```typescript
pullCommand(command)
listCommand(command)
pushCommand(command)
checkoutCommand(command)
branchCommand(command)
diffCommand(command)
mergeCommand(command)
stashCommand(command)
commitCommand(command)
```

**关键逻辑**：

```typescript
export const run = async () => {
  // 安全检查：确保在 Git 仓库中运行
  const isGitRepository = await checkGitRepository()
  if (!isGitRepository) {
    ErrorMessage({ text: 'Not a git repository' })
    exit(0)
  }

  const command = init()
  command.parse(process.argv)
}
```

---

### src/utils.ts

**核心工具函数**：

| 函数 | 功能 | 返回类型 |
|------|------|----------|
| `getRemoteBranches()` | 获取远程分支列表 | `Promise<{ branches: string[] }>` |
| `getLocalBranches()` | 获取本地分支列表 | `Promise<{ branches: string[], currentBranch: string }>` |
| `getRemoteOptions()` | 构建远程分支选择选项 | `Promise<{ options: Option[], currentBranch: string }>` |
| `getLocalOptions()` | 构建本地分支选择选项 | `Promise<{ options: Option[], currentBranch: string }>` |
| `getGitDiffFiles(branch)` | 获取与指定分支的差异文件 | `Promise<string[]>` |
| `handleGitPull(branch)` | 执行 git pull | `Promise<void>` |
| `handleGitStash(name?)` | 创建 stash | `Promise<string \| null>` |
| `handleGitStashCheck()` | 列出所有 stash | `Promise<string[]>` |
| `handleGitPop(branch)` | 恢复指定分支的 stash | `Promise<void>` |
| `isBranchMergedToMain(branches)` | 检查分支是否已合并 | `Promise<BranchInfo[]>` |
| `checkGitRepository()` | 检查是否在 Git 仓库中 | `Promise<boolean>` |
| `getRemoteMainBranch()` | 获取远程主分支名 | `Promise<string \| null>` |
| `guessLocalMainBranch()` | 猜测本地主分支名 | `Promise<string \| null>` |
| `getGitRoot()` | 获取 Git 根目录 | `Promise<string>` |
| `getBranchCommitTime(branch)` | 获取分支最后提交时间 | `Promise<number>` |

**内部函数**：

- `handleMergeCommit()` - 处理合并提交信息（支持编辑器自定义）
- `createStashName()` - 生成 stash 名称 `NEMO-CLI-STASH:{timestamp}`

---

### src/commands/branch.ts

**实现命令**：

- `ng branch clean` - 清理已合并分支
- `ng branch delete [-r]` - 删除分支

**关键逻辑**：

```typescript
// 排除保护分支
const excludeBranch = ['main', 'master', 'develop']

// 时间范围选项
const oneDay = 60 * 60 * 24 // 秒
const timeRangeOptions = [
  { label: 'all', value: 0 },
  { label: '1 month', value: oneDay * 30 },
  { label: '1 year', value: oneDay * 365 },
  { label: '3 months', value: oneDay * 90 },
]
```

**内部函数**：

- `handleDelete(branch, { isRemote })` - 执行分支删除
- `formatTime(time)` - 格式化时间戳
- `formatBranch(branch)` - 移除 `origin/` 前缀

---

### src/commands/checkout.ts

**实现命令**：

- `ng checkout [-l] [-r] [-b [name]]`
- `ng co` (别名)

**关键特性**：

```typescript
// 分支类型模板
const branchTypes = ['feature/PRIME-', 'feature/', 'bugfix/']

// 自动 Stash 与 Pop
const handleCheckout = async (branch, { isNew, isRemote }) => {
  const stashName = await handleGitStash(branch)  // 以分支名命名

  const process = x('git', args)
  // ... 执行 checkout

  stashName && handleGitPop(stashName)  // 恢复暂存
}
```

---

### src/commands/commit.ts

**实现命令**：

- `ng commit`

**导出**：

- `commitCommand(command)` - 命令注册函数
- `REGEX_*` - Ticket 提取正则表达式

**流程步骤**：

1. `getGitStatus()` - 获取文件状态
2. `createCheckbox()` - 选择暂存文件
3. `handleLint()` - 运行 lint-staged
4. `loadConfig()` - 加载 commitlint 配置
5. `createSelect()` - 选择 type 和 scope
6. `createInput()` - 输入 title 和 body
7. `getTicket()` - 自动提取 ticket
8. `handleCommit()` - 执行提交
9. `pushInteractive()` - 可选推送

---

### src/commands/commit-options.ts

**导出**：

- `commitOptions` - 完整的提交配置对象
- `commitlintConfig` - 默认 commitlint 配置
- `CommitlintConfigType` - 配置类型定义
- `mergeCommitTypeEnumOptions(options)` - 合并类型选项
- `mergeCommitScopeEnumOptions(options)` - 合并范围选项

**默认类型选项**：

```typescript
const commitTypeOptions = [
  { value: 'feat', label: 'feat', hint: 'A new feature', emoji: '🌟' },
  { value: 'fix', label: 'fix', hint: 'A bug fix', emoji: '🐛' },
  // ... 共 10 种类型
]
```

**默认范围选项**：

```typescript
const commitScopeOptions = [
  { value: 'app', label: 'app' },
  { value: 'shared', label: 'shared' },
  { value: 'server', label: 'server' },
  { value: 'tools', label: 'tools' },
  { value: '', label: 'none' },
]
```

---

### src/commands/diff.ts

**实现命令**：

- `ng diff [-l] [-r]`
- `ng di` (别名)

**差异对比逻辑**：

```typescript
const handleDiff = async (branch, { isLocal }) => {
  const currentBranch = await getCurrentBranch()

  // 选中当前分支 → 显示工作区差异
  // 选中其他分支 → 显示分支间差异
  const diffArgs = branch === currentBranch
    ? ['diff']
    : ['diff', `${branch}...${currentBranch}`]
}
```

---

### src/commands/branch.ts (list 子命令)

**实现命令**：

- `ng branch list [-l] [-r] [-a]`
- `ng branch ls` (别名)

**输出格式**：

- 本地分支：绿色背景标题
- 远程分支：黄色背景标题
- 当前分支：添加 `(current)` 标记

---

### src/commands/merge.ts

**实现命令**：

- `ng merge [branch] [-l] [-r] [-b <branch>]`
- `ng mg` (别名)

**特性**：

- 支持直接指定分支名
- 交互式选择本地/远程分支
- 自动 Stash/Pop
- 使用 `stdio: 'inherit'` 支持交互式合并

---

### src/commands/pull.ts

**实现命令**：

- `ng pull`
- `ng pl` (别名)

**流程**：

```typescript
1. getRemoteOptions()      // 获取远程分支
2. createSelect()          // 选择分支（默认当前分支）
3. handleGitStash()        // 自动暂存
4. handleGitPull()         // 执行 pull
5. handleGitPop()          // 恢复暂存
```

---

### src/commands/push.ts

**实现命令**：

- `ng push`
- `ng ps` (别名)

**导出**：

- `pushCommand(command)` - 命令注册函数
- `pushInteractive()` - 交互式推送（供 commit 调用）

---

### src/commands/stash.ts

**实现命令**：

- `ng stash save [message]` / `ng st s`
- `ng stash list` / `ng st ls`
- `ng stash pop` / `ng st p`
- `ng stash drop` / `ng st d`

**高阶函数模式**：

```typescript
const handleCheck = (callback) => async () => {
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

### src/constants/index.ts

```typescript
export const HELP_MESSAGE = {
  main: createHelpExample('ng --version', 'ng --help', 'ng <command> [option]'),
  branch: createHelpExample('ng branch --version', 'ng branch --help', 'ng branch <command> [option]'),
  branchDelete: createHelpExample('ng branch delete --version', 'ng branch delete --help', 'ng branch delete <command> [option]'),
  branchClean: createHelpExample('ng branch clean --version', 'ng branch clean --help'),
}
```

---

### src/constants/stash.ts

```typescript
export const HELP_MESSAGE = {
  main: createHelpExample('ng stash', 'ng stash save "work in progress"', 'ng stash ls', 'ng stash pop', 'ng stash drop'),
  save: createHelpExample('ng stash save "work in progress"'),
  list: createHelpExample('ng stash ls'),
  pop: createHelpExample('ng stash pop'),
  drop: createHelpExample('ng stash drop'),
}

export const ERROR_MESSAGE = {
  notRootWorkspace: "It's not workspace root directory, Please open this command in the workspace root directory",
}
```

---

## 依赖导入分析

### 从 @nemo-cli/shared 导入

| 模块 | 用途 |
|------|------|
| `createCommand` | Commander.js 命令创建 |
| `createSelect`, `createInput`, `createConfirm`, `createCheckbox`, `createSearch` | 交互式提示 |
| `createOptions` | 构建选项数组 |
| `createSpinner` | 加载动画 |
| `createNote` | 显示注释框 |
| `x`, `xASync` | 执行 shell 命令 |
| `getCurrentBranch`, `getGitStatus`, `addFiles` | Git 操作 |
| `colors` | 终端颜色（chalk） |
| `log` | 日志输出 |
| `exit` | 退出进程 |
| `intro`, `outro` | CLI 开始/结束提示 |
| `loadConfig` | 配置文件加载（unconfig） |
| `readPackage` | 读取 package.json |
| `isEmpty`, `isString` | 类型检查 |
| `handleError` | 错误处理 |

### 从 @nemo-cli/ui 导入

| 组件 | 用途 |
|------|------|
| `ErrorMessage` | 错误消息显示 |
| `Message` | 普通消息显示 |
| `BigText` | 大字体 ASCII 艺术 |

### Node.js 内置模块

| 模块 | 用途 |
|------|------|
| `node:child_process` | spawn 进程（合并提交编辑器） |
| `node:fs` | 文件操作（临时文件） |
| `node:os` | 获取临时目录 |
| `node:path` | 路径操作 |
