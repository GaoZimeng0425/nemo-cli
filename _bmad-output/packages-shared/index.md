# @nemo-cli/shared 模块文档

> 生成日期：2025-12-21
> 模块版本：0.0.6
> 扫描级别：快速扫描

---

## 📦 模块概览

| 属性 | 值 |
|------|-----|
| **包名** | `@nemo-cli/shared` |
| **描述** | CLI 共享工具库 |
| **类型** | 工具库 |
| **语言** | TypeScript (ESM) |

---

## 📂 目录结构

```
packages/shared/
├── src/
│   ├── index.ts               # 主入口，导出所有工具
│   ├── constants.ts           # 共享常量
│   └── utils/
│       ├── browser.ts         # 浏览器操作
│       ├── color.ts           # 颜色处理
│       ├── command.ts         # 命令执行
│       ├── common.ts          # 通用工具
│       ├── config.ts          # 配置管理
│       ├── dynamic-command-examples.ts  # 动态命令示例
│       ├── env.ts             # 环境变量
│       ├── error.ts           # 错误处理
│       ├── file.ts            # 文件操作
│       ├── format.ts          # 格式化
│       ├── git-handle/
│       │   └── index.ts       # Git操作封装
│       ├── log.ts             # 日志
│       ├── npminfo.ts         # NPM信息
│       ├── packageJson.ts     # package.json操作
│       ├── pathname.ts        # 路径处理
│       ├── promise.ts         # Promise工具
│       ├── prompts.ts         # 交互式提示
│       ├── spinner.ts         # 加载动画
│       ├── types.ts           # 类型定义
│       └── workspace.ts       # 工作区操作
├── types/
│   ├── execa.d.ts
│   ├── tinyexec.d.ts
│   └── zx.d.ts
├── dist/
├── package.json
└── rolldown.config.ts
```

---

## 🎯 导出模块

### 命令执行 (`command.ts`)

```typescript
import { createCommand, exec, spawn } from '@nemo-cli/shared'

// 创建CLI命令
const program = createCommand('mycli')

// 执行命令
await exec('git status')
```

### 交互式提示 (`prompts.ts`)

```typescript
import { confirm, select, input, multiselect } from '@nemo-cli/shared'

const answer = await confirm({ message: '确认继续？' })
const choice = await select({
  message: '选择一个选项',
  options: [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ]
})
```

### Git操作 (`git-handle/`)

```typescript
import { gitStatus, gitBranch, gitCommit } from '@nemo-cli/shared'

const status = await gitStatus()
const branches = await gitBranch()
```

### 文件操作 (`file.ts`)

```typescript
import { readPackage, readFile, writeFile } from '@nemo-cli/shared'

const pkg = readPackage(import.meta, '..')
```

### 日志 (`log.ts`)

```typescript
import { log } from '@nemo-cli/shared'

log.info('信息')
log.warn('警告')
log.error('错误')
log.success('成功')
```

### 加载动画 (`spinner.ts`)

```typescript
import { spinner } from '@nemo-cli/shared'

const s = spinner()
s.start('加载中...')
// ... 操作
s.stop('完成！')
```

### 颜色 (`color.ts`)

```typescript
import { chalk } from '@nemo-cli/shared'

console.log(chalk.green('成功'))
console.log(chalk.red('错误'))
```

---

## 🛠️ 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| commander | ^14.0.2 | CLI框架 |
| @clack/prompts | 1.0.0-alpha.4 | 交互式提示 |
| @inquirer/prompts | ^8.1.0 | 备选提示库 |
| chalk | ^5.6.2 | 终端颜色 |
| execa | ^9.6.1 | 进程执行 |
| fs-extra | ^11.3.3 | 文件操作增强 |
| ora | ^9.0.0 | 加载动画 |
| glob | ^13.0.0 | 文件匹配 |
| winston | ^3.19.0 | 日志框架 |
| yaml | ^2.8.2 | YAML解析 |
| zx | 8.8.5 | Shell脚本 |
| configstore | ^7.1.0 | 配置存储 |
| fuse.js | ^7.1.0 | 模糊搜索 |
| match-sorter | ^8.2.0 | 智能排序 |

---

## 📖 使用方式

```typescript
import {
  // 命令
  createCommand,
  exec,

  // 提示
  confirm,
  select,
  input,

  // Git
  gitStatus,
  gitBranch,

  // 文件
  readPackage,
  readFile,

  // 日志
  log,

  // 动画
  spinner,

  // 颜色
  chalk,

  // 工具
  openBrowser,
  formatDate,
} from '@nemo-cli/shared'
```

---

## 📖 依赖关系

| 依赖包 | 类型 | 说明 |
|--------|------|------|
| @nemo-cli/ui | workspace | TUI组件（用于某些输出） |

**被依赖于：**
- @nemo-cli/git
- @nemo-cli/ai
- @nemo-cli/file
- @nemo-cli/package
- @nemo-cli/mail

---

## 🔗 相关资源

- [Commander.js](https://github.com/tj/commander.js)
- [@clack/prompts](https://github.com/natemoo-re/clack)
- [execa](https://github.com/sindresorhus/execa)
- [chalk](https://github.com/chalk/chalk)
- [ora](https://github.com/sindresorhus/ora)
