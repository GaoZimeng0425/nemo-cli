# nemo-cli 开发指南

> 生成日期：2025-12-21
> 扫描级别：快速扫描（Quick Scan）

---

## 🚀 快速开始

### 前置条件

| 软件 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | ^20.19.0 \|\| >=22.12.0 | 运行时 |
| pnpm | >=8.0 | 包管理器 |
| Git | >=2.0 | 版本控制 |

### 安装依赖

```bash
# 克隆仓库
git clone git@github.com:GaoZimeng0425/nemo-cli.git
cd nemo-cli

# 安装依赖（会自动检查pnpm）
pnpm install

# 构建所有包
pnpm build
```

### 全局链接CLI

```bash
# 链接 @nemo-cli/git（ng命令）
cd packages/git
pnpm link -g

# 验证安装
ng -h
```

---

## 🛠️ 开发命令

### 根目录命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 并行启动所有包的开发模式 |
| `pnpm build` | 并行构建所有包 |
| `pnpm check` | 并行运行所有包的类型检查 |
| `pnpm format` | 使用Biome格式化代码 |
| `pnpm coverage` | 运行测试并生成覆盖率报告 |
| `pnpm compile` | TypeScript类型检查（不输出） |
| `pnpm knip` | 检测未使用的代码/依赖 |

### 特定包命令

```bash
# 运行特定包的开发模式
pnpm run --filter=@nemo-cli/git dev

# 构建特定包
pnpm run --filter=@nemo-cli/git build

# 运行特定包的测试
pnpm run --filter=@nemo-cli/git test
```

### 特殊开发命令

```bash
# 启动邮件预览服务器
pnpm dev:email

# 启动Slack Bot
pnpm dev:slack
```

---

## 📁 项目结构

```
nemo-cli/
├── packages/           # 核心包
│   ├── git/           # ng命令
│   ├── ai/            # na命令 + MCP
│   ├── file/          # nf命令
│   ├── package/       # np命令
│   ├── shared/        # 共享工具
│   ├── ui/            # TUI组件
│   └── mail/          # 邮件服务
├── docs/              # 文档
├── dist/              # 构建输出（根）
├── package.json       # 根配置
├── pnpm-workspace.yaml # 工作区配置
└── tsconfig.json      # TS配置
```

---

## 🔧 添加新功能

### 1. 添加新CLI命令

以在 `@nemo-cli/git` 中添加 `status` 命令为例：

```typescript
// packages/git/src/commands/status.ts
import { program } from '@nemo-cli/shared'
import { Message } from '@nemo-cli/ui'

export const statusCommand = () => {
  program
    .command('status')
    .alias('st')
    .description('显示工作区状态')
    .action(async () => {
      // 实现逻辑
    })
}
```

```typescript
// packages/git/src/index.ts
import { statusCommand } from './commands/status'

// 注册命令
statusCommand()
```

### 2. 添加新共享工具

```typescript
// packages/shared/src/utils/my-util.ts
export const myUtil = () => {
  // 实现
}
```

```typescript
// packages/shared/src/index.ts
export * from './utils/my-util'
```

### 3. 添加新TUI组件

```tsx
// packages/ui/src/components/my-component.tsx
import { Box, Text } from 'ink'

interface MyComponentProps {
  title: string
}

export const MyComponent = ({ title }: MyComponentProps) => {
  return (
    <Box>
      <Text>{title}</Text>
    </Box>
  )
}
```

### 4. 添加新MCP工具

```typescript
// packages/ai/src/services/my-service/mcp.ts
import { FastMCP } from 'fastmcp'

export const registerMyTools = (server: FastMCP) => {
  server.addTool({
    name: 'my_tool',
    description: '我的工具描述',
    parameters: {
      // 参数定义
    },
    execute: async (params) => {
      // 实现逻辑
      return { result: 'success' }
    }
  })
}
```

---

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定包测试
pnpm run --filter=@nemo-cli/git test

# 生成覆盖率报告
pnpm coverage
```

### 测试文件位置

```
packages/*/
├── __tests__/           # 测试目录
│   └── *.test.ts       # 测试文件
└── src/
    └── **/__tests__/   # 就近测试（可选）
        └── *.test.ts
```

### 测试示例

```typescript
// packages/git/__tests__/utils.test.ts
import { describe, it, expect } from 'vitest'
import { myUtil } from '../src/utils'

describe('myUtil', () => {
  it('should work correctly', () => {
    expect(myUtil()).toBe(expected)
  })
})
```

---

## 📝 提交规范

### 提交类型

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug修复 |
| `docs` | 文档更新 |
| `style` | 代码格式 |
| `refactor` | 重构 |
| `perf` | 性能优化 |
| `test` | 测试 |
| `build` | 构建系统 |
| `ci` | CI配置 |
| `chore` | 杂项 |
| `revert` | 回滚 |
| `wip` | 进行中 |
| `release` | 发布 |

### Scope（可选）

- `git` - @nemo-cli/git
- `shared` - @nemo-cli/shared
- `ai` - @nemo-cli/ai
- `ui` - @nemo-cli/ui
- `packages` - 多包变更
- `mail` - @nemo-cli/mail

### 提交示例

```bash
# 使用ng commit进行交互式提交
ng commit

# 或手动提交
git commit -m "feat(git): 添加status命令"
git commit -m "fix: 修复分支切换问题"
git commit -m "docs: 更新README"
```

---

## 🔨 构建

### 构建工具

项目使用 **Rolldown**（Rust构建工具）进行构建：

```typescript
// rolldown.config.ts（基础配置）
import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'

export const config = {
  input: './src/index.ts',
  platform: 'node',
  output: [{ dir: 'dist', format: 'esm' }],
  plugins: [dts({ tsconfig: './tsconfig.build.json' })]
}
```

### 构建输出

```
packages/*/dist/
├── index.js      # ESM模块
├── index.d.ts    # 类型声明
└── *.js          # 其他模块
```

### 构建命令

```bash
# 构建所有包
pnpm build

# 监听模式
pnpm dev

# 单独构建
cd packages/git && pnpm build
```

---

## 🔍 代码检查

### Biome配置

项目使用 Biome 进行代码检查和格式化：

```bash
# 格式化
pnpm format

# 检查（各包单独运行）
pnpm check
```

### 主要规则

- 单引号
- 无分号（除ES5尾逗号外）
- 2空格缩进
- 120字符行宽
- 导入排序
- 属性排序

### Git Hooks

- **pre-commit**: lint-staged（仅检查暂存文件）
- **commit-msg**: commitlint（提交消息规范）

---

## 🌐 环境变量

### 本地开发

创建 `.env` 文件：

```bash
# Confluence（用于@nemo-cli/ai）
CONFLUENCE_URL=https://xxx.atlassian.net
CONFLUENCE_EMAIL=your-email@xxx.com
CONFLUENCE_TOKEN=your-api-token

# Google/Gmail（用于@nemo-cli/mail）
GOOGLE_APP_PASSWORD=your-app-password

# AI服务（用于@nemo-cli/ai）
OPENAI_API_KEY=sk-xxx
DEEPSEEK_API_KEY=xxx
GOOGLE_API_KEY=xxx

# Slack（用于@nemo-cli/ai）
SLACK_BOT_TOKEN=xoxb-xxx
SLACK_SIGNING_SECRET=xxx
```

---

## 📦 发布

### 语义化版本

项目配置了 `semantic-release` 进行自动化发布：

```bash
# 发布会自动：
# 1. 分析提交确定版本
# 2. 生成CHANGELOG
# 3. 更新package.json版本
# 4. 发布到npm
# 5. 创建Git tag
```

### 手动发布

```bash
# 预发布检查
pnpm build
pnpm check
pnpm test

# 发布单个包
cd packages/git
npm publish
```

---

## 🐛 调试

### VS Code配置

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug ng",
      "program": "${workspaceFolder}/packages/git/bin/index.mjs",
      "args": ["commit"],
      "console": "integratedTerminal"
    }
  ]
}
```

### 日志调试

```typescript
import { log } from '@nemo-cli/shared'

log.info('信息')
log.warn('警告')
log.error('错误')
```

---

## 📚 相关资源

- [Commander.js文档](https://github.com/tj/commander.js)
- [Ink文档](https://github.com/vadimdemedes/ink)
- [@clack/prompts文档](https://github.com/natemoo-re/clack)
- [Rolldown文档](https://rolldown.rs)
- [Biome文档](https://biomejs.dev)
- [pnpm Workspaces](https://pnpm.io/workspaces)
