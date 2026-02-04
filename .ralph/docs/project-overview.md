# nemo-cli 项目上下文

## 项目愿景

**让命令行操作像思考一样自然**

nemo-cli 通过智能推断和自动编排，消除命令行操作的认知负担。开发者只需表达意图，工具自动处理执行细节。

## 核心价值

1. **零记忆负担** - 命令设计符合直觉，无需查阅文档
2. **智能推断** - 自动检测上下文并推断用户意图
3. **自动编排** - 复杂操作序列自动执行
4. **一致性体验** - 所有命令遵循统一的设计模式
5. **价值链协同** - 共享核心形成"1+1>2"的协同效应

## 技术架构

### Monorepo 结构

```
packages/
├── git/          # ng - Git 操作辅助
├── ai/           # na - AI CLI + MCP
├── file/         # nf - 文件 AST 操作
├── package/      # np - pnpm 工作区管理
├── shared/       # 共享工具库
├── ui/           # React TUI 组件
└── mail/         # 邮件服务
```

### 技术栈

- **语言**: TypeScript ^5.9.3
- **运行时**: Node.js ^20.19.0 || >=22.12.0
- **包管理**: pnpm (Monorepo)
- **构建**: Rolldown
- **CLI**: Commander.js
- **交互**: @clack/prompts
- **TUI**: Ink
- **测试**: Vitest

## 当前状态

### 已实现功能

**Git 模块 (ng)**:
- `ng commit` - 交互式智能提交
- `ng checkout/co` - 安全分支切换（自动 stash/pop）
- `ng pull/pl` - 智能拉取
- `ng push/ps` - 交互式推送
- `ng branch clean/delete` - 分支管理
- `ng stash save/list/pop/drop` - Stash 管理
- `ng list/ls` - 分支列表
- `ng diff/di` - 差异查看
- `ng merge/mg` - 分支合并

**AI 模块 (na)**:
- MCP 服务器
- Confluence 集成
- 邮件发送
- Slack Bot

**Package 模块 (np)**:
- `np list/upgrade` - 包管理基础

**File 模块 (nf)**:
- `nf ast` - AST 分析

### 待实现功能（MVP）

**Git 模块智能化深化**:
1. 分支级别 Stash 管理（自动匹配）
2. Pull 安全模式（自动 stash → pull → pop）
3. Push 安全模式（自动 pull 预检查）
4. Rebase 工作流优化（历史重写检测）
5. 统一的帮助系统
6. 基础错误处理和恢复

## 设计原则

### 命令设计

- 命令命名：`{prefix} {action} [options]`
- 前缀：ng (git), na (ai), np (package), nf (file)
- 交互式优先，减少参数记忆
- 自动推断用户意图

### 架构模式

所有 CLI 包遵循统一架构：

```
src/
├── commands/    # 命令实现
├── services/    # 业务逻辑（可选）
├── utils/       # 工具函数
├── config/      # 配置管理（可选）
└── logging/     # 日志管理（可选）
```

### 一致性规则

**文件命名**: `kebab-case.ts`
**函数命名**: `camelCase`，动词开头
**变量命名**: `camelCase`
**常量命名**: `UPPER_SNAKE_CASE`
**类型命名**: `PascalCase`

## 性能目标

| 操作 | 目标 |
|------|------|
| 分支切换 | < 500ms |
| 命令启动（冷） | < 200ms |
| 命令启动（热） | < 100ms |
| Stash 检索 | < 100ms |

## 成功标准

### 用户成功

- 90% 以上日常操作无需查阅文档
- 命令执行成功率 > 95%
- 首次使用到成功操作 < 5 分钟

### 技术成功

- 代码覆盖率 > 80%
- 圈复杂度 < 10
- 操作成功率 > 99%
- 数据完整性 100%

### 团队采用

- 1 个月内 50% 团队使用
- 3 个月内 80% 团队使用
- 成为团队标准工作流

## 参考文档

- PRD: `/_bmad-output/prd.md`
- 架构: `/_bmad-output/architecture.md`
- 开发指南: `/_bmad-output/development-guide.md`
- 修复计划: `.ralph/fix_plan.md`
