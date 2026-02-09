# nemo-cli 项目文档索引

> 生成日期：2025-12-21
> 扫描模式：初始扫描（Initial Scan）
> 扫描级别：快速扫描（Quick Scan）

---

## 📦 项目概览

| 属性 | 值 |
|------|-----|
| **项目名称** | nemo-cli |
| **类型** | Monorepo（单仓多包） |
| **主要语言** | TypeScript |
| **运行时** | Node.js ^20.19.0 \|\| >=22.12.0 |
| **包管理器** | pnpm |
| **构建工具** | Rolldown |
| **代码检查** | Biome |
| **架构模式** | CLI工具集 + 共享核心库 |

---

## 🎯 快速参考

### 核心包

| 包 | CLI命令 | 描述 |
|----|---------|------|
| **@nemo-cli/git** | `ng` | Git操作辅助（commit、checkout、branch等） |
| **@nemo-cli/ai** | `na` | AI CLI + MCP服务器（Confluence、邮件、Slack） |
| **@nemo-cli/file** | `nf` | 文件AST操作 |
| **@nemo-cli/package** | `np` | pnpm工作区管理 |
| **@nemo-cli/shared** | - | 共享工具库（commander、prompts、git-handle等） |
| **@nemo-cli/ui** | - | React TUI组件库（Ink） |
| **@nemo-cli/mail** | - | 邮件服务（React Email） |

### 技术栈摘要

| 类别 | 技术 |
|------|------|
| 语言 | TypeScript 5.9.3 |
| 构建 | Rolldown + rolldown-plugin-dts |
| CLI框架 | Commander.js |
| TUI | Ink (React) |
| 提示 | @clack/prompts |
| AI | Vercel AI SDK (OpenAI/DeepSeek/Google) |
| 测试 | Vitest |
| 规范 | Commitlint + Husky + lint-staged |

---

## 📖 生成的文档

### 核心文档

- [**架构设计**](./architecture.md) - 系统架构、包职责、技术栈、数据流
- [**源码分析**](./source-tree-analysis.md) - 详细的源码结构和目录说明
- [**开发指南**](./development-guide.md) - 本地开发、构建、测试、发布说明

### 包专属文档

- [**@nemo-cli/git 文档**](./packages-git/index.md) - Git包详细文档（深度扫描）
  - [架构设计](./packages-git/architecture.md)
  - [命令参考](./packages-git/command-reference.md)
  - [开发指南](./packages-git/development-guide.md)
  - [源码分析](./packages-git/source-tree-analysis.md)
- [**@nemo-cli/ai 文档**](./packages-ai/index.md) - AI CLI + MCP服务器
- [**@nemo-cli/shared 文档**](./packages-shared/index.md) - 共享工具库
- [**@nemo-cli/ui 文档**](./packages-ui/index.md) - React TUI组件库
- [**@nemo-cli/file 文档**](./packages-file/index.md) - 文件AST操作CLI
- [**@nemo-cli/package 文档**](./packages-package/index.md) - pnpm工作区管理CLI
- [**@nemo-cli/mail 文档**](./packages-mail/index.md) - 邮件服务

---

## 📂 现有文档

| 文件 | 描述 |
|------|------|
| [README.md](../README.md) | 项目安装和使用说明 |
| [packages/git/README.md](../packages/git/README.md) | @nemo-cli/git 使用说明 |
| [packages/ai/README.md](../packages/ai/README.md) | MCP功能说明 |
| [packages/shared/README.md](../packages/shared/README.md) | 共享库使用示例 |

---

## ⚡ 快速开始

### 安装

```bash
# 克隆仓库
git clone git@github.com:GaoZimeng0425/nemo-cli.git
cd nemo-cli

# 安装依赖
pnpm install

# 构建
pnpm build

# 全局链接 ng 命令
cd packages/git && pnpm link -g
```

### 基本使用

```bash
# Git操作
ng commit          # 交互式提交
ng checkout        # 切换分支（自动stash）
ng branch list     # 交互式分支查看器（新功能）
ng branch clean    # 清理已合并分支
ng show            # 交互式提交查看器

# 包管理
np list            # 列出工作区包
np upgrade         # 升级依赖

# 文件操作
nf ast             # AST分析
```

---

## 🔧 开发

### 常用命令

```bash
pnpm dev          # 开发模式（所有包）
pnpm build        # 构建（所有包）
pnpm check        # 类型检查
pnpm format       # 格式化
pnpm test         # 测试
```

### 提交规范

```bash
# 使用交互式提交
ng commit

# 提交类型：feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert, wip, release
# Scope：git, shared, ai, ui, packages, mail
```

---

## 📊 包依赖关系

```
@nemo-cli/shared ←─────────────────────────────────────┐
       ↑                                               │
       │                                               │
@nemo-cli/ui ←── @nemo-cli/git                  @nemo-cli/ai
       ↑              ↑                                ↑
       │              └────────────────────────────────┤
       │                                               │
       └── @nemo-cli/file                              │
       └── @nemo-cli/package                           │
       └── @nemo-cli/mail ─────────────────────────────┘
```

---

## 🗂️ 文档状态

| 文档 | 状态 |
|------|------|
| 架构设计 | ✅ 已生成 |
| 源码分析 | ✅ 已生成 |
| 开发指南 | ✅ 已生成 |
| @nemo-cli/git 文档 | ✅ 已生成（深度扫描） |
| @nemo-cli/ai 文档 | ✅ 已生成 |
| @nemo-cli/shared 文档 | ✅ 已生成 |
| @nemo-cli/ui 文档 | ✅ 已生成 |
| @nemo-cli/file 文档 | ✅ 已生成 |
| @nemo-cli/package 文档 | ✅ 已生成 |
| @nemo-cli/mail 文档 | ✅ 已生成 |

---

## 🔗 相关资源

- [GitHub仓库](https://github.com/GaoZimeng0425/nemo-cli)
- [Commander.js](https://github.com/tj/commander.js)
- [Ink](https://github.com/vadimdemedes/ink)
- [Rolldown](https://rolldown.rs)
- [Biome](https://biomejs.dev)
- [Vercel AI SDK](https://sdk.vercel.ai)
- [FastMCP](https://github.com/jlowin/fastmcp)

---

## 📝 棕地PRD参考

在创建新功能的PRD时，请参考以下文档：

1. **了解现有架构**：[architecture.md](./architecture.md)
2. **了解代码结构**：[source-tree-analysis.md](./source-tree-analysis.md)
3. **开发规范**：[development-guide.md](./development-guide.md)
4. **现有命令**：[packages-git/command-reference.md](./packages-git/command-reference.md)

---

_此文档由 BMAD document-project 工作流自动生成_
