# @nemo-cli/git 开发指南

> 生成日期：2025-11-26

---

## 1. 开发环境要求

| 工具 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | `^20.19.0 \|\| >=22.12.0` | 运行时 |
| pnpm | 最新版 | 包管理器 |
| Git | 最新版 | 版本控制 |

---

## 2. 项目设置

### 2.1 克隆仓库

```bash
git clone git@bitbucket.org:antalphadev/prime-cli.git
cd nemo-cli
```

### 2.2 安装依赖

```bash
# 从 monorepo 根目录安装所有依赖
pnpm i -r
```

### 2.3 构建项目

```bash
# 构建所有包
pnpm build

# 或仅构建 git 包
cd packages/git
pnpm build
```

### 2.4 本地链接

```bash
# 在 packages/git 目录下
cd packages/git
pnpm link -g

# 验证安装
ng --version
```

---

## 3. 开发工作流

### 3.1 开发模式

```bash
# 从 monorepo 根目录启动所有包的 watch 模式
pnpm dev

# 或仅启动 git 包的 watch 模式
cd packages/git
pnpm dev
```

开发模式使用 `rolldown --watch` 自动重新构建。

### 3.2 目录结构

```
packages/git/
├── src/
│   ├── index.ts           # 入口点 - 修改命令注册
│   ├── utils.ts           # 工具函数 - 添加新的 Git 操作
│   ├── constants/         # 常量 - 添加帮助信息
│   └── commands/          # 命令 - 添加/修改命令
├── bin/
│   └── index.mjs          # CLI 入口 - 通常不需要修改
└── dist/                  # 构建输出 - 不要手动修改
```

### 3.3 添加新命令

1. **创建命令文件**

```typescript
// src/commands/new-command.ts
import type { Command } from '@nemo-cli/shared'
import { log, createSelect } from '@nemo-cli/shared'

export function newCommand(command: Command) {
  command
    .command('new')
    .alias('n')
    .description('New command description')
    .option('-o, --option <value>', 'Option description')
    .action(async (options: { option?: string }) => {
      // 实现逻辑
      log.show('New command executed!', { type: 'success' })
    })
}
```

2. **注册命令**

```typescript
// src/index.ts
import { newCommand } from './commands/new-command'

export const init = () => {
  const command = createCommand('ng')
    // ...

  // 添加新命令注册
  newCommand(command)

  return command
}
```

3. **添加帮助信息**（可选）

```typescript
// src/constants/index.ts
export const HELP_MESSAGE = {
  // ...
  new: createHelpExample('ng new --option value'),
}
```

### 3.4 使用工具函数

```typescript
import {
  // 交互式提示
  createSelect,      // 单选
  createCheckbox,    // 多选
  createInput,       // 文本输入
  createConfirm,     // 确认
  createSearch,      // 搜索选择

  // 命令执行
  x,                 // 流式执行（用于实时输出）
  xASync,            // 异步执行（用于获取结果）

  // Git 操作
  getCurrentBranch,  // 获取当前分支
  getGitStatus,      // 获取 Git 状态
  addFiles,          // 暂存文件

  // 输出
  log,               // 日志
  createSpinner,     // 加载动画
  createNote,        // 注释框
  colors,            // 终端颜色

  // 工具
  exit,              // 退出进程
  isEmpty,           // 检查空对象
} from '@nemo-cli/shared'
```

### 3.5 执行 Git 命令

```typescript
// 方式 1: 流式输出（推荐用于长时间运行的命令）
const process: Result = x('git', ['push', 'origin', 'main'])
for await (const line of process) {
  console.log(line)
}
const { exitCode, stderr } = await process

// 方式 2: 异步等待（推荐用于需要获取结果的命令）
const [error, result] = await xASync('git', ['branch', '-r'])
if (error) {
  log.show('Command failed', { type: 'error' })
  return
}
console.log(result.stdout)

// 方式 3: 交互式命令（需要用户输入）
await xASync('git', ['merge', branch], {
  nodeOptions: {
    stdio: 'inherit',
  },
})
```

---

## 4. 代码规范

### 4.1 格式化

项目使用 Biome 进行代码格式化：

```bash
# 从 monorepo 根目录
pnpm format

# 或在 git 包目录
pnpm check
```

### 4.2 类型检查

```bash
# 从 monorepo 根目录
pnpm compile

# 或在 git 包目录
pnpm check
```

### 4.3 Commit 规范

使用 Conventional Commits 格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

推荐使用 `ng commit` 命令来创建符合规范的提交。

**类型**：

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档
- `refactor`: 重构
- `test`: 测试
- `chore`: 杂项

**范围**：

- `app`, `shared`, `server`, `tools`

---

## 5. 测试

### 5.1 运行测试

```bash
# 从 monorepo 根目录
pnpm test

# 或在 git 包目录
pnpm test
```

### 5.2 覆盖率

```bash
pnpm coverage
```

### 5.3 手动测试

```bash
# 确保已链接
cd packages/git
pnpm link -g

# 测试命令
ng --help
ng commit
ng checkout -b test-branch
ng branch delete
```

---

## 6. 构建

### 6.1 开发构建

```bash
pnpm dev    # watch 模式
```

### 6.2 生产构建

```bash
pnpm build
```

### 6.3 构建配置

```typescript
// rolldown.config.ts
import { defineConfig } from 'rolldown'

export default defineConfig({
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    format: 'esm',
    sourcemap: true,
  },
  // ...
})
```

### 6.4 TypeScript 配置

```json
// tsconfig.build.json
{
  "extends": "../../tsconfig.build.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@nemo-cli/shared/*": ["../packages/shared/src/*"]
    },
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src", "../global.d.ts"]
}
```

---

## 7. 发布

### 7.1 预发布检查

```bash
# 构建
pnpm build

# 类型检查
pnpm check

# 测试
pnpm test
```

### 7.2 版本更新

在 `package.json` 中更新版本号。

### 7.3 发布

```bash
pnpm publish
```

---

## 8. 调试

### 8.1 使用 console.log

```typescript
console.log('🚀 : variableName:', variableName)
```

### 8.2 使用 log 工具

```typescript
import { log } from '@nemo-cli/shared'

log.show('Debug message', { type: 'info' })
log.error(error)
```

### 8.3 检查 Git 命令输出

```typescript
const [error, result] = await xASync('git', ['status'])
console.log('stdout:', result?.stdout)
console.log('stderr:', result?.stderr)
console.log('error:', error)
```

---

## 9. 常见问题

### Q: 命令找不到 `ng`

确保已正确链接：

```bash
cd packages/git
pnpm build
pnpm link -g
```

### Q: 修改后没有生效

确保：

1. 开发模式正在运行 (`pnpm dev`)
2. 或手动重新构建 (`pnpm build`)

### Q: TypeScript 类型错误

1. 检查导入路径
2. 运行 `pnpm check` 查看详细错误
3. 确保 `@nemo-cli/shared` 已正确构建

### Q: Git 命令执行失败

1. 确保在 Git 仓库中运行
2. 检查 Git 是否已安装
3. 查看错误输出：

```typescript
const [error, result] = await xASync('git', ['...'])
if (error) {
  console.error('Error:', error.message)
}
```

---

## 10. 相关资源

- [Commander.js 文档](https://github.com/tj/commander.js)
- [@clack/prompts 文档](https://github.com/natemoo-re/clack)
- [Rolldown 文档](https://rolldown.rs/)
- [Biome 文档](https://biomejs.dev/)
- [Conventional Commits](https://www.conventionalcommits.org/)
