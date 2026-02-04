# nemo-cli 架构文档

**Author:** BMad
**Date:** 2025-12-27
**Version:** 2.0

---

## Executive Summary

本架构文档定义了 nemo-cli 整体工具集的技术架构和实现模式。nemo-cli 是一个 Monorepo 架构的 CLI 工具集，包含多个独立但统一的命令包（git、ai、file、package），通过共享核心库（@nemo-cli/shared、@nemo-cli/ui）实现统一的交互体验和基础能力。

**文档结构说明：**

- **整体架构**：涵盖所有包的架构概览、依赖关系和共享模式
- **Git 模块详细架构**：本次 PRD 聚焦 Git 模块智能化深化，因此提供详细的架构决策和实现模式
- **其他模块架构**：提供各模块的架构概览，详细架构将在后续 PRD 中定义

通过分支级 Stash 管理、Pull/Push 安全模式、Rebase 工作流优化等核心功能，实现"让命令行操作像思考一样自然"的产品愿景。

---

## Decision Summary

| Category | Decision | Version | Affects FR Categories | Rationale |
| -------- | -------- | ------- | -------------------- | --------- |
| 数据管理 | Stash 元数据存储机制 | N/A | FR1-FR6 | 可靠性、可扩展性、与现有架构一致 |
| 操作流程 | 同步执行序列 + 关键操作检查点 | N/A | FR7-FR18 | 简单可靠、用户可控、与现有实现一致 |
| Git 工作流 | 基于 git log 比较的历史重写检测 | N/A | FR19-FR22 | 准确性、标准方法、安全性 |
| 可观测性 | 结构化日志 + 操作历史 | N/A | FR27-FR30 | 完整性、可查询性、与现有架构一致 |
| 配置管理 | 多层级配置加载器 | N/A | FR23-FR26 | 满足 PRD 要求、灵活性、可扩展性 |
| 用户体验 | 增强 Commander.js 帮助 + 上下文建议 | N/A | FR31-FR34 | 利用现有框架、易于维护、可扩展 |
| 错误处理 | 统一错误处理模式 | N/A | 所有功能 | 一致性、可维护性、用户体验 |
| 日志记录 | 结构化日志 + 操作历史 | N/A | 所有功能 | 可追溯性、可调试性、符合 NFR22 |
| 日期/时间 | ISO 8601 格式 + 本地时区 | N/A | 所有涉及时间的功能 | 标准化、可读性、国际化支持 |
| 测试策略 | 单元测试 + 集成测试 | N/A | 所有功能 | 质量保证、符合 NFR17、可维护性 |
| 用户交互 | 统一交互模式（@clack/prompts） | N/A | 所有交互式命令 | 一致性、用户体验、符合 FR47-FR50 |

---

## Overall Architecture

### 包概览

nemo-cli 采用 Monorepo 架构，包含以下核心包：

| 包 | CLI 命令 | 职责 | 状态 |
|----|---------|------|------|
| **@nemo-cli/git** | `ng` | Git 操作辅助（commit、checkout、branch 等） | 已实现，本次 PRD 聚焦智能化深化 |
| **@nemo-cli/ai** | `na` | AI CLI + MCP 服务器（Confluence、邮件、Slack） | 已实现，后续 PRD 将深化智能化 |
| **@nemo-cli/file** | `nf` | 文件 AST 操作 | 已实现，后续 PRD 将深化智能化 |
| **@nemo-cli/package** | `np` | pnpm 工作区管理 | 已实现，后续 PRD 将深化智能化 |
| **@nemo-cli/shared** | - | 共享工具库（commander、prompts、git-handle 等） | 基础设施，所有包的基础依赖 |
| **@nemo-cli/ui** | - | React TUI 组件库（Ink） | 基础设施，提供统一的终端 UI 组件 |
| **@nemo-cli/mail** | - | 邮件服务（React Email） | 基础设施，被 ai 包使用 |

### 包依赖关系

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

**依赖说明：**

- 所有 CLI 包（git、ai、file、package）依赖 `@nemo-cli/shared` 和 `@nemo-cli/ui`
- `@nemo-cli/shared` 提供：命令执行、交互提示、Git 操作、文件操作、配置管理、日志等基础能力
- `@nemo-cli/ui` 提供：BigText、Message、List、ProcessMessage 等终端 UI 组件
- `@nemo-cli/ai` 使用 `@nemo-cli/mail` 提供邮件发送功能

### 共享架构模式

所有 CLI 包遵循统一的架构模式：

**1. 命令层（Commands）**

- 位置：`src/commands/`
- 职责：CLI 命令注册和用户交互
- 模式：使用 Commander.js 注册命令，使用 @clack/prompts 进行交互

**2. 服务层（Services）**（可选，复杂功能需要）

- 位置：`src/services/`
- 职责：业务逻辑封装
- 模式：封装复杂操作，提供清晰的 API

**3. 工具层（Utils）**

- 位置：`src/utils/`
- 职责：工具函数和操作封装
- 模式：可复用的工具函数，封装底层操作

**4. 配置层（Config）**（可选）

- 位置：`src/config/`
- 职责：配置管理和加载
- 模式：使用 Configstore 或项目级配置文件

**5. 日志层（Logging）**（可选）

- 位置：`src/logging/`
- 职责：操作日志记录
- 模式：结构化日志，记录到 Configstore

### 各包架构概览

#### @nemo-cli/git（详细架构见下文）

**职责：** Git 操作辅助，简化日常 Git 工作流

**核心功能：**

- 交互式提交（commit）
- 安全分支切换（checkout，自动 stash/pop）
- 分支管理（branch clean、delete）
- Pull/Push 安全模式（本次 PRD 新增）
- Rebase 工作流优化（本次 PRD 新增）

**架构特点：**

- 服务层模式：StashManager、PullService、PushService、RebaseService
- 配置管理：多层级配置（全局/项目级）
- 操作日志：结构化日志记录

#### @nemo-cli/ai

**职责：** AI CLI + MCP 服务器，集成外部服务

**核心功能：**

- MCP 服务器（Model Control Protocol）
- Confluence 集成
- 邮件发送（使用 @nemo-cli/mail）
- Slack Bot 集成
- Swagger API 解析

**架构特点：**

- MCP 协议：使用 fastmcp 框架
- 服务集成：每个外部服务独立模块
- 配置：环境变量配置（API keys、tokens）

#### @nemo-cli/file

**职责：** 文件 AST 操作

**核心功能：**

- AST 分析和转换
- 文件清理
- 路由生成
- 文件删除和列表

**架构特点：**

- AST 操作：使用 TypeScript/JavaScript AST 解析
- 文件操作：封装文件系统操作

#### @nemo-cli/package

**职责：** pnpm 工作区管理

**核心功能：**

- 依赖添加/移除
- 依赖升级
- 依赖清理
- 工作区包列表

**架构特点：**

- pnpm 集成：封装 pnpm 命令
- 工作区感知：理解 pnpm workspace 结构

#### @nemo-cli/shared

**职责：** 共享工具库，所有 CLI 包的基础依赖

**核心模块：**

- `command`：命令执行（exec、spawn）
- `prompts`：交互式提示（confirm、select、input）
- `git-handle`：Git 操作封装
- `file`：文件操作
- `config`：配置管理
- `spinner`：加载动画
- `log`：日志输出

**架构特点：**

- 工具函数库：无状态、可复用
- 框架封装：封装 Commander.js、@clack/prompts 等

#### @nemo-cli/ui

**职责：** React TUI 组件库

**核心组件：**

- `BigText`：大字体文本显示（figlet）
- `Message`：消息提示（成功/错误/警告）
- `List`：列表显示
- `ProcessMessage`：进度消息
- `Provider`：Context 提供者
- `StashList`：Stash 列表组件（NEW）
- `StatusViewer`：交互式状态查看器（NEW）

**架构特点：**

- React Ink：基于 Ink 构建
- 组件化：可复用的终端 UI 组件
- 交互式：支持键盘导航和面板切换

---

## Project Structure

```
nemo-cli/
├── packages/
│   ├── git/                          # @nemo-cli/git (ng 命令)
│   │   ├── src/
│   │   │   ├── commands/            # 命令实现
│   │   │   │   ├── branch.ts        # 分支管理
│   │   │   │   ├── checkout.ts      # 分支切换（需增强：分支级 stash）
│   │   │   │   ├── commit.ts        # 提交
│   │   │   │   ├── diff.ts          # 差异查看
│   │   │   │   ├── list.ts          # 分支列表
│   │   │   │   ├── merge.ts         # 合并
│   │   │   │   ├── pull.ts          # 拉取（需增强：安全模式）
│   │   │   │   ├── push.ts          # 推送（需增强：安全模式）
│   │   │   │   ├── stash.ts         # 暂存管理（需增强：分支级管理）
│   │   │   │   └── status.ts        # 状态查看器 (NEW)
│   │   │   ├── services/            # 新增：服务层
│   │   │   │   ├── stash-manager.ts # 分支级 Stash 管理服务
│   │   │   │   ├── pull-service.ts  # Pull 安全模式服务
│   │   │   │   ├── push-service.ts  # Push 安全模式服务
│   │   │   │   └── rebase-service.ts # Rebase 工作流服务
│   │   │   ├── utils/               # 工具函数（重构）
│   │   │   │   ├── git-operations.ts # Git 操作封装
│   │   │   │   ├── stash-utils.ts   # Stash 工具函数
│   │   │   │   ├── conflict-handler.ts # 冲突处理
│   │   │   │   └── history-detector.ts # 历史重写检测
│   │   │   ├── config/              # 新增：配置管理
│   │   │   │   ├── loader.ts        # 配置加载器
│   │   │   │   ├── validator.ts     # 配置验证
│   │   │   │   └── defaults.ts      # 默认配置
│   │   │   ├── logging/             # 新增：日志管理
│   │   │   │   ├── operation-logger.ts # 操作日志记录
│   │   │   │   └── history-manager.ts # 操作历史管理
│   │   │   ├── constants/           # 常量定义
│   │   │   │   ├── index.ts
│   │   │   │   └── stash.ts
│   │   │   └── index.ts             # 入口文件
│   │   ├── __tests__/               # 测试文件
│   │   │   ├── services/
│   │   │   ├── utils/
│   │   │   └── commands/
│   │   ├── bin/
│   │   │   └── index.mjs            # CLI 入口
│   │   ├── package.json
│   │   ├── rolldown.config.ts
│   │   └── tsconfig.build.json
│   │
│   ├── ai/                           # @nemo-cli/ai (na 命令)
│   │   ├── src/
│   │   │   ├── commands/            # CLI 命令
│   │   │   ├── services/            # MCP 服务（Confluence、Mail、Slack、Swagger）
│   │   │   └── index.ts             # MCP 服务器入口
│   │   └── ...
│   │
│   ├── file/                         # @nemo-cli/file (nf 命令)
│   │   ├── src/
│   │   │   ├── commands/            # CLI 命令（ast、clean、create-routes 等）
│   │   │   └── utils/               # AST 操作工具
│   │   └── ...
│   │
│   ├── package/                      # @nemo-cli/package (np 命令)
│   │   ├── src/
│   │   │   ├── commands/            # CLI 命令（add、remove、upgrade、list 等）
│   │   │   └── utils/               # pnpm 操作封装
│   │   └── ...
│   │
│   ├── shared/                       # @nemo-cli/shared
│   │   ├── src/
│   │   │   ├── utils/
│   │   │   │   ├── command.ts       # 命令执行（exec、spawn）
│   │   │   │   ├── prompts.ts       # 交互式提示
│   │   │   │   ├── git-handle.ts    # Git 操作封装
│   │   │   │   ├── file.ts          # 文件操作
│   │   │   │   ├── config.ts        # 配置管理（需增强：多层级支持）
│   │   │   │   ├── log.ts           # 日志工具（需增强：结构化日志）
│   │   │   │   └── time.ts          # 新增：时间工具
│   │   │   └── ...
│   │   └── ...
│   │
│   ├── ui/                           # @nemo-cli/ui
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── big-text.tsx     # 大字体文本
│   │   │   │   ├── message.tsx      # 消息提示
│   │   │   │   ├── list.tsx         # 列表显示
│   │   │   │   ├── process-message.tsx # 进度消息
│   │   │   │   ├── stash-list.tsx   # Stash 列表组件 (NEW)
│   │   │   │   └── status-viewer.tsx # 交互式状态查看器 (NEW)
│   │   │   └── ...
│   │   └── ...
│   │
│   └── mail/                         # @nemo-cli/mail
│       ├── src/
│       │   ├── send.ts              # 邮件发送
│       │   └── templates/           # 邮件模板（release.tsx、data.tsx）
│       └── ...
│
├── docs/                             # 文档目录
│   ├── architecture.md               # 架构文档（本文档）
│   ├── prd.md                        # 产品需求文档
│   └── ...
│
└── ...                               # 根目录配置文件
```

## FR Category to Architecture Mapping

**说明：** 本次 PRD 聚焦 Git 模块智能化深化，以下映射主要针对 Git 模块。其他模块（ai、file、package）的详细架构将在后续 PRD 中定义。

### Git 模块（@nemo-cli/git）

| FR Category | 功能需求 | 架构组件 | 位置 |
| ---------- | ------- | -------- | ---- |
| 分支级 Stash 管理 | FR1-FR6 | StashManager 服务 | `packages/git/src/services/stash-manager.ts` |
| Pull 安全模式 | FR7-FR12 | PullService 服务 | `packages/git/src/services/pull-service.ts` |
| Push 安全模式 | FR13-FR18 | PushService 服务 | `packages/git/src/services/push-service.ts` |
| Rebase 工作流优化 | FR19-FR22 | RebaseService 服务 | `packages/git/src/services/rebase-service.ts` |
| 配置与个性化 | FR23-FR26 | ConfigLoader | `packages/git/src/config/loader.ts` |
| 错误处理与恢复 | FR27-FR30 | OperationLogger | `packages/git/src/logging/operation-logger.ts` |
| 帮助与引导系统 | FR31-FR34 | 增强 Commander.js 帮助 | `packages/git/src/commands/*.ts` |

### 其他模块架构概览

**@nemo-cli/ai：**

- MCP 服务器架构：使用 fastmcp 框架
- 服务模块化：每个外部服务（Confluence、Mail、Slack、Swagger）独立模块
- 配置：环境变量配置（API keys、tokens）

**@nemo-cli/file：**

- AST 操作：使用 TypeScript/JavaScript AST 解析
- 文件操作：封装文件系统操作

**@nemo-cli/package：**

- pnpm 集成：封装 pnpm 命令
- 工作区感知：理解 pnpm workspace 结构

---

## Technology Stack Details

### Core Technologies

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **语言** | TypeScript | ^5.9.3 | 类型安全 |
| **运行时** | Node.js | ^20.19.0 \|\| >=22.12.0 | ESM 支持 |
| **包管理** | pnpm | latest | Monorepo 管理 |
| **构建** | Rolldown | 1.0.0-beta.52 | 快速构建 |
| **类型** | rolldown-plugin-dts | ^0.18.1 | .d.ts 生成 |

### CLI 框架

| 技术 | 版本 | 用途 |
|------|------|------|
| Commander.js | ^12.0.0 | 命令行框架 |
| @clack/prompts | ^0.8.0 | 交互式提示 |
| Ink | ^4.4.0 | React 终端渲染 |
| chalk | ^5.3.0 | 终端样式 |
| ora | ^8.1.1 | 加载动画 |
| figlet | ^1.7.0 | ASCII 艺术字 |

### 配置与存储

| 技术 | 版本 | 用途 |
|------|------|------|
| Configstore | ^6.0.0 | 配置存储 |
| dotenv | ^16.4.0 | 环境变量 |

### 开发工具

| 技术 | 版本 | 用途 |
|------|------|------|
| Biome | latest | Lint + Format |
| Vitest | latest | 单元测试 |
| Husky | latest | Git Hooks |
| Commitlint | latest | 提交规范 |
| lint-staged | latest | 暂存检查 |

### Integration Points

**命令层 → 服务层：**

- 命令调用服务层函数执行具体操作
- 示例：`checkout.ts` → `stash-manager.ts`

**服务层 → 工具层：**

- 服务层使用工具函数执行 Git 操作
- 示例：`stash-manager.ts` → `stash-utils.ts`

**服务层 → 配置层：**

- 服务层从配置层读取配置
- 示例：`pull-service.ts` → `config/loader.ts`

**服务层 → 日志层：**

- 服务层记录操作日志
- 示例：所有服务 → `operation-logger.ts`

**共享库集成：**

- 所有包使用 `@nemo-cli/shared` 提供的工具函数
- 示例：`packages/git` → `@nemo-cli/shared`

---

## Novel Pattern Designs

### 分支级 Stash 管理与自动匹配

**模式名称：** 分支级 Stash 管理与自动匹配

**目的：** 解决分支切换时的 stash 管理问题，实现自动 stash/pop，无需用户记忆命令序列。

**核心挑战：**

1. Stash 与分支的关联存储
2. Stash 的自动匹配算法
3. 冲突处理（pop 时冲突）

**组件：**

- `StashManager`：核心服务类，管理分支级 stash
- `stash-mapping.json`：元数据存储（全局：`~/.nemoclirc/git/stash-mapping.json`）
- `stash-utils.ts`：Git 操作封装

**注意：** Stash 元数据存储在全局配置目录，因为 stash 是 Git 仓库级别的操作，不依赖特定项目配置。

**数据流：**

**创建 Stash 流程：**

```
用户切换分支 (ng checkout feature/xxx)
    ↓
StashManager.createBranchStash('feature/xxx')
    ├── 检测未提交更改
    ├── 执行 git stash save "[ng-auto] branch:feature/xxx timestamp:2025-12-21T10:00:00"
    ├── 获取 stashRef (stash@{0})
    ├── 创建元数据对象
    └── 存储到全局配置：~/.nemoclirc/git/stash-mapping.json
```

**自动 Pop 流程：**

```
用户切换回分支 (ng checkout feature/xxx)
    ↓
StashManager.findBranchStash('feature/xxx')
    ├── 从配置加载 stash-mapping.json
    ├── 查找 'feature/xxx' 的 stash 列表
    └── 返回最新的 stash（按 timestamp 排序）
    ↓
StashManager.autoPopBranchStash('feature/xxx')
    ├── 执行 git stash pop stash@{0}
    ├── 检测冲突
    ├── 如果冲突：显示冲突文件列表，提示用户解决，保留 stash
    ├── 如果成功：从元数据中删除该 stash，更新配置
    └── 记录操作日志
```

**存储格式：**

```json
{
  "feature/xxx": [
    {
      "stashRef": "stash@{0}",
      "timestamp": "2025-12-21T10:00:00.000Z",
      "createdAt": "2025-12-21T10:00:00.000Z",
      "message": "[ng-auto] branch:feature/xxx timestamp:2025-12-21T10:00:00"
    }
  ]
}
```

**冲突处理：**

- 检测冲突：执行 `git stash pop` 后检测冲突
- 显示冲突文件列表
- 提示用户解决冲突
- 保留 stash（不删除元数据）

**边缘情况：**

- 同一分支多个 Stash：优先 pop 最新的（按 timestamp）
- Stash 已被手动删除：检测 stash 是否存在，不存在则从元数据删除
- 分支重命名：不自动迁移，用户需手动处理（可选迁移工具）

**实现指南：**

1. 使用 Configstore 存储元数据
2. 使用 ISO 8601 时间戳
3. 冲突时保留 stash，提示用户
4. 所有操作记录日志

**影响的功能：**

- FR1-FR6：分支级 Stash 管理
- FR7-FR12：Pull 安全模式（使用 stash）
- FR13-FR18：Push 安全模式（使用 stash）

---

## Implementation Patterns

这些模式确保所有 AI 代理实现的一致性：

### 1. 命名模式（Naming Patterns）

**文件命名：**

- 命令文件：`kebab-case.ts`（如 `stash-manager.ts`、`pull-service.ts`）
- 工具文件：`kebab-case.ts`（如 `stash-utils.ts`、`conflict-handler.ts`）
- 测试文件：`*.test.ts`（与源文件同名，位于 `__tests__/`）

**函数命名：**

- 服务方法：`camelCase`（如 `createBranchStash`、`findBranchStash`）
- 工具函数：`camelCase`，动词开头（如 `handleGitStash`、`detectConflict`）
- 命令处理函数：`handleXxx`（如 `handleCheckout`、`handlePull`）

**变量命名：**

- 常量：`UPPER_SNAKE_CASE`（如 `CONFIG_NAME`、`STASH_PREFIX`）
- 变量：`camelCase`（如 `branchName`、`stashRef`）
- 类型/接口：`PascalCase`（如 `StashMetadata`、`PullOptions`）

### 2. 结构模式（Structure Patterns）

**目录组织：**

- 命令：`src/commands/`（每个命令一个文件）
- 服务：`src/services/`（每个服务一个文件）
- 工具：`src/utils/`（按功能分组）
- 配置：`src/config/`（配置相关文件）
- 日志：`src/logging/`（日志相关文件）
- 测试：`__tests__/`（镜像源文件结构）

**文件组织：**

- 每个文件一个主要职责
- 相关功能放在同一目录
- 避免循环依赖

### 3. 格式模式（Format Patterns）

**Stash 消息格式：**

- 格式：`[ng-auto] branch:{branchName} timestamp:{iso8601}`
- 示例：`[ng-auto] branch:feature/xxx timestamp:2025-12-21T10:00:00.000Z`

**日志格式：**

- 格式：`{ timestamp, level, message, context?, error? }`
- 示例：

```typescript
{
  timestamp: '2025-12-21T10:00:00.000Z',
  level: 'info',
  message: 'Stash created',
  context: { branch: 'feature/xxx', stashRef: 'stash@{0}' }
}
```

**配置格式：**

- 格式：JSON
- 示例：

```json
{
  "git": {
    "pullStrategy": "merge",
    "autoStash": true,
    "stashMessageTemplate": "[ng-auto] branch:{branch} timestamp:{timestamp}"
  }
}
```

**错误消息格式：**

- 格式：`{ type: 'error' | 'warn' | 'info', message: string, suggestion?: string }`
- 示例：

```typescript
log.show('Failed to stash changes', {
  type: 'error',
  suggestion: 'Please check your git repository status'
})
```

### 4. 通信模式（Communication Patterns）

**命令层 → 服务层：**

- 方式：直接函数调用
- 示例：

```typescript
import { StashManager } from '../services/stash-manager'
const stashManager = new StashManager()
await stashManager.createBranchStash(branchName)
```

**服务层 → 工具层：**

- 方式：直接函数调用
- 示例：

```typescript
import { handleGitStash } from '../utils/stash-utils'
const stashRef = await handleGitStash(message)
```

**服务层 → 配置层：**

- 方式：通过配置加载器
- 示例：

```typescript
import { loadConfig } from '../config/loader'
const config = await loadConfig('git')
```

**服务层 → 日志层：**

- 方式：通过操作日志记录器
- 示例：

```typescript
import { logOperation } from '../logging/operation-logger'
await logOperation({
  command: 'checkout',
  operation: 'stash',
  status: 'success'
})
```

### 5. 生命周期模式（Lifecycle Patterns）

**加载状态处理：**

- 模式：使用 `createSpinner` 显示加载状态
- 示例：

```typescript
const spinner = createSpinner('Pulling from remote...')
try {
  await handleGitPull(branch)
  spinner.stop('Successfully pulled')
} catch (error) {
  spinner.stop('Pull failed')
  throw error
}
```

**错误恢复：**

- 模式：try-catch + 恢复建议
- 示例：

```typescript
try {
  await stashManager.autoPopBranchStash(branchName)
} catch (error) {
  if (error instanceof ConflictError) {
    log.show('Conflict detected. Please resolve manually.', { type: 'warn' })
    log.show('Run: ng stash pop', { type: 'info' })
  } else {
    log.error(error)
    log.show('Operation failed. Please check the logs.', { type: 'error' })
  }
}
```

**重试逻辑：**

- 模式：关键操作支持重试（如网络操作）
- 示例：

```typescript
const maxRetries = 3
for (let i = 0; i < maxRetries; i++) {
  try {
    await handleGitPull(branch)
    break
  } catch (error) {
    if (i === maxRetries - 1) throw error
    await sleep(1000 * (i + 1)) // 指数退避
  }
}
```

### 6. 位置模式（Location Patterns）

**配置文件位置：**

**全局配置（用户级别）：**

- 配置根目录：`~/.nemoclirc/`
- Git 配置：`~/.nemoclirc/git/config.json`
- Stash 元数据：`~/.nemoclirc/git/stash-mapping.json`
- 操作历史：`~/.nemoclirc/git/operation-history.json`

**项目级配置（项目级别）：**

- 配置根目录：`.nemo-cli/`（项目根目录下）
- Git 配置：`.nemo-cli/git.json`
- 其他包配置：`.nemo-cli/{package-name}.json`（如 `ai.json`、`file.json` 等）

**配置优先级：** 项目级配置 > 全局配置 > 默认值

**命令注册位置：**

- 所有命令在 `src/index.ts` 中注册
- 命令实现在 `src/commands/` 目录

**测试文件位置：**

- 单元测试：`__tests__/` 目录，镜像源文件结构
- 集成测试：`__tests__/integration/` 目录

### 7. 一致性模式（Consistency Patterns）

**日期格式：**

- 存储格式：ISO 8601（`YYYY-MM-DDTHH:mm:ss.sssZ`）
- 显示格式：相对时间（如 "2 分钟前"）
- 实现：使用 `@nemo-cli/shared` 的时间工具

**日志格式：**

- 所有操作使用 `logOperation` 记录
- 所有错误使用 `log.show` 或 `log.error` 显示
- 所有成功消息使用 `log.show` 显示

**交互模式：**

- 所有交互使用 `@clack/prompts`
- 所有长时间操作使用 `createSpinner`
- 所有确认使用 `createConfirm`

**Git 操作：**

- 所有 Git 操作通过 `x` 或 `xASync` 执行
- 所有 Git 操作检查错误并处理
- 所有 Git 操作记录日志

---

## Consistency Rules

### Naming Conventions

- **文件命名：** `kebab-case.ts`
- **函数命名：** `camelCase`，动词开头
- **变量命名：** `camelCase`
- **常量命名：** `UPPER_SNAKE_CASE`
- **类型/接口命名：** `PascalCase`

### Code Organization

- **目录结构：** `commands/`、`services/`、`utils/`、`config/`、`logging/`
- **文件职责：** 每个文件一个主要职责
- **依赖关系：** 避免循环依赖

### Error Handling

- **错误分类：** 用户错误、系统错误、Git 错误
- **错误格式：** `{ type, message, suggestion?, details? }`
- **错误恢复：** 提供明确的恢复建议和操作步骤

### Logging Strategy

- **日志级别：** `verbose`、`info`、`warn`、`error`
- **日志格式：** `{ timestamp, level, message, context?, error? }`
- **存储位置：** `~/.nemoclirc/git/operation-history.json`
- **日志保留：** 最近 100 条操作（可配置）

---

## Data Architecture

### 数据模型

**StashMetadata：**

```typescript
interface StashMetadata {
  branchName: string
  stashRef: string
  timestamp: string
  createdAt: string
  message?: string
}
```

**OperationLog：**

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

**GitConfig：**

```typescript
interface GitConfig {
  pullStrategy: 'merge' | 'rebase'
  autoStash: boolean
  stashMessageTemplate: string
}
```

### 数据存储

**全局存储（用户级别）：**

- **Stash 元数据：** `~/.nemoclirc/git/stash-mapping.json`（Configstore）
- **操作历史：** `~/.nemoclirc/git/operation-history.json`（Configstore）
- **全局配置：** `~/.nemoclirc/git/config.json`（Configstore）

**项目级存储（项目级别）：**

- **项目配置：** `.nemo-cli/git.json`（JSON 文件）
- **其他包配置：** `.nemo-cli/{package-name}.json`

**配置优先级：** 项目级配置 > 全局配置 > 默认值

---

## API Contracts

### StashManager API

```typescript
class StashManager {
  // 为分支创建 stash 并记录元数据
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

### PullService API

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

### PushService API

```typescript
class PushService {
  // 安全 Push（push 前自动 pull）
  async safePush(branch: string, options?: PushOptions): Promise<void>

  // 检测远程更新
  async hasRemoteUpdates(branch: string): Promise<boolean>
}
```

### RebaseService API

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

---

## Security Architecture

### 安全考虑

| 方面 | 措施 |
|------|------|
| **敏感信息** | 使用环境变量，不提交 .env |
| **配置存储** | 使用 Configstore，存储在用户目录 |
| **Git 操作** | 所有危险操作（force push）需要用户确认 |
| **数据完整性** | 操作失败时保留用户数据，提供恢复建议 |

---

## Performance Considerations

### 性能目标

| 操作 | 目标 | 说明 |
|------|------|------|
| 分支切换 | < 500ms | 包含 stash 操作（NFR1） |
| 命令启动 | < 200ms | 冷启动（NFR4） |
| 命令启动 | < 100ms | 热启动（NFR4） |
| Stash 检索 | < 100ms | Stash 匹配操作（NFR5） |

### 性能优化策略

- **缓存分支列表：** 单次命令执行内复用分支列表结果
- **按需加载配置：** 仅在需要时加载配置
- **并行操作：** 使用 `Promise.all` 并行执行独立操作
- **流式处理：** 使用 `for await...of` 流式处理长时间运行的命令

---

## Deployment Architecture

### 部署方式

nemo-cli 是 CLI 工具，通过 npm/pnpm 发布和安装：

```bash
# 全局安装
pnpm add -g @nemo-cli/git

# 或本地安装
pnpm add -D @nemo-cli/git
```

### 配置文件位置

**全局配置（用户级别）：**

- 配置根目录：`~/.nemoclirc/`
- Git 配置：`~/.nemoclirc/git/config.json`
- Stash 元数据：`~/.nemoclirc/git/stash-mapping.json`
- 操作历史：`~/.nemoclirc/git/operation-history.json`

**项目级配置（项目级别）：**

- 配置根目录：`.nemo-cli/`（项目根目录下）
- Git 配置：`.nemo-cli/git.json`
- 其他包配置：`.nemo-cli/{package-name}.json`（如 `ai.json`、`file.json` 等）

**配置优先级：** 项目级配置 > 全局配置 > 默认值

---

## Development Environment

### Prerequisites

| 软件 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | ^20.19.0 \|\| >=22.12.0 | 运行时 |
| pnpm | >=8.0 | 包管理器 |
| Git | >=2.20 | 版本控制 |

### Setup Commands

```bash
# 克隆仓库
git clone git@github.com:GaoZimeng0425/nemo-cli.git
cd nemo-cli

# 安装依赖
pnpm install

# 构建所有包
pnpm build

# 全局链接 ng 命令
cd packages/git && pnpm link -g

# 验证安装
ng -h
```

---

## Architecture Decision Records (ADRs)

### ADR-001: Stash 元数据存储机制

**状态：** 已决定
**日期：** 2025-12-27
**决策：** 使用 Configstore 存储 Stash 元数据，而非仅依赖 Git 消息解析

**理由：**

1. 更可靠：不依赖 Git 消息格式解析
2. 支持复杂场景：同一分支多个 stash、冲突处理
3. 可扩展：未来可支持更多元数据
4. 与现有架构一致：使用 Configstore

**影响：**

- FR1-FR6：分支级 Stash 管理
- 需要实现 StashManager 服务
- 需要定义 StashMetadata 接口

---

### ADR-002: 同步执行序列 + 关键操作检查点

**状态：** 已决定
**日期：** 2025-12-27
**决策：** Pull/Push 安全模式采用同步执行序列，而非事务性执行

**理由：**

1. 符合 CLI 工具特性：操作可见，用户可控
2. 实现简单：降低出错概率
3. 关键操作检查点：在关键步骤前检查状态，失败时提供恢复建议
4. 与现有实现一致：当前 pull 已采用类似模式

**影响：**

- FR7-FR18：Pull/Push 安全模式
- 需要实现 PullService 和 PushService
- 需要实现冲突处理逻辑

---

### ADR-003: 基于 git log 比较的历史重写检测

**状态：** 已决定
**日期：** 2025-12-27
**决策：** Rebase 工作流优化使用 git log 比较检测历史重写

**理由：**

1. 准确性：直接比较 commit hash，可靠
2. 标准方法：Git 推荐的做法
3. 支持复杂场景：处理各种 rebase 情况

**影响：**

- FR19-FR22：Rebase 工作流优化
- 需要实现 RebaseService
- 需要实现 HistoryDetector 工具

---

### ADR-004: 结构化日志 + 操作历史

**状态：** 已决定
**日期：** 2025-12-27
**决策：** 使用结构化日志和操作历史，而非简单日志文件

**理由：**

1. 结构化：便于查询和分析
2. 与现有架构一致：使用 Configstore
3. 可扩展：未来可支持日志分析

**影响：**

- FR27-FR30：错误处理与恢复
- 需要实现 OperationLogger
- 需要定义 OperationLog 接口

---

### ADR-005: 多层级配置加载器

**状态：** 已决定
**日期：** 2025-12-27
**决策：** 实现多层级配置加载器，支持全局和项目级配置

**理由：**

1. 满足 PRD 要求：支持多层级配置
2. 灵活性：项目可自定义配置
3. 可扩展：基于 Configstore 扩展

**影响：**

- FR23-FR26：配置与个性化
- 需要实现 ConfigLoader
- 需要定义配置合并策略

---

### ADR-006: 增强 Commander.js 帮助 + 上下文建议

**状态：** 已决定
**日期：** 2025-12-27
**决策：** 扩展 Commander.js 帮助系统，添加上下文感知的命令建议

**理由：**

1. 利用现有框架：Commander.js 已有帮助系统
2. 易于维护：基于标准框架扩展
3. 可扩展：未来可添加更多功能

**影响：**

- FR31-FR34：帮助与引导系统
- 需要扩展 Commander.js 帮助
- 需要实现上下文检测逻辑

---

_Generated by BMAD Decision Architecture Workflow v1.0_
_Date: 2025-12-27_
_For: BMad_
