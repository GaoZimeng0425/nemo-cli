---
stepsCompleted: ['step-01-init.md', 'step-02-discovery.md', 'step-02b-elicitation-complete', 'step-03-success.md', 'step-04-journeys.md', 'step-05-domain.md', 'step-06-innovation.md', 'step-07-project-type.md', 'step-08-scoping.md', 'step-09-functional.md', 'step-10-nonfunctional.md', 'step-11-polish.md']
status: 'complete'
inputDocuments:
  - packages/deps/README.md
  - packages/deps/package.json
  - packages/deps/src/core/types.ts
  - packages/deps/src/core/nextjs.ts
  - packages/deps/src/core/analyzer.ts
  - packages/deps/src/core/parser.ts
  - packages/deps/src/cli/index.ts
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 6
workflowType: 'prd'
lastStep: 0
project_name: '@nemo-cli/deps'
user_name: 'Gao'
date: '2026-02-04'
classification:
  projectType: 'cli_tool'
  domain: 'developer_tool'
  complexity: 'medium'
  projectContext: 'brownfield'
  productFocus: '代码审查场景的变更影响分析'
  keyDifferentiator: 'Next.js App Router 专用 + 反向依赖查询 + AI 扩展预留'
  technicalApproach: '两步工作流（生成 JSON → 查询）+ 邻接表结构'
partyModeInsights:
  - '产品定位：从依赖分析工具 → 变更影响分析器'
  - '核心场景：代码审查时快速了解修改影响范围'
  - '技术方案：先生成 JSON，再从 JSON 查询'
  - 'JSON 结构：邻接表 + reverseDeps + ai_analysis 预留'
  - '实现优先级：先基础版本，后续根据反馈添加 impactPaths'
elicitationInsights:
  - '问题本质：不是"依赖分析"而是"变更影响追踪"'
  - '新增功能：增量分析 (ndeps diff 命令)'
  - '技术决策：使用 JSON 存储，暂不考虑缓存'
  - '工作流集成：暂不考虑 CI/CD，保持 CLI 工具简洁'
  - '功能优先级：全量分析 → page 命令（核心） → query 命令（次要） → 增量分析'
architectureDecisions:
  - 'ADR-001: JSON 存储格式采用邻接表结构'
  - 'ADR-002: 组件树查询使用动态计算，不预计算'
  - 'ADR-003: 默认遍历全部深度，提供 --format 参数支持 Tree/JSON'
  - 'ADR-004: 使用 _extensions 字段预留扩展空间'
  - 'ADR-005: 产品定位以正向查询（页面→组件）为主，反向查询为辅'
---

# 产品需求文档 - 依赖分析系统

**Author:** Gao
**Date:** 2026-02-04
**Version:** 0.1.0

---

## Executive Summary

`@nemo-cli/deps` 是一个专门为 **Next.js 16 App Router** monorepo 项目设计的代码结构分析工具。该工具通过静态代码分析，从页面级别入口开始向下遍历，帮助开发者理解页面的组件构成，快速评估代码变更的影响范围。

**核心价值：**

- **页面组件树可视化**：从页面入口向下遍历，展示完整的组件层次结构
- **全量依赖分析**：一次性分析整个项目的依赖关系，生成完整的 JSON 依赖图谱
- **增量变更分析**：只分析变更的文件，快速生成变更影响报告
- **双向查询能力**：支持正向查询（页面→组件）和反向查询（组件→页面）
- **问题检测**：自动发现循环依赖、孤立模块等代码质量问题
- **AI 扩展预留**：JSON 结构预留字段，支持未来的 AI 代码分析功能

**产品定位：**

> "从页面出发，向下探索你的 Next.js 应用结构"

---

## Background and Context

### 问题背景

在 Next.js 16 App Router 模式的 monorepo 项目中，随着代码库增长，开发者面临以下挑战：

1. **依赖关系复杂**：页面组件、共享组件、工具函数之间的依赖关系难以直观理解
2. **性能优化困难**：不清楚哪些组件被多个页面依赖，影响代码分割策略
3. **重构风险高**：修改共享模块时，不清楚会影响哪些页面
4. **循环依赖难以发现**：模块间的循环依赖可能导致运行时错误

### 现有解决方案的不足

- **dependency-cruiser**：功能强大但配置复杂，输出格式不够直观
- **madge**：主要用于检测循环依赖，不支持 Next.js App Router 特定结构
- **其他工具**：大多不是专门为 Next.js 设计，无法识别页面/布局/路由等特殊文件

---

## Goals and Success Metrics

### 主要目标

1. **准确的依赖分析**：从 Next.js App Router 的每个页面入口开始，递归分析所有依赖
2. **按页面输出 JSON**：每个页面生成独立的 JSON 文件，便于后续处理
3. **支持两种生成模式**：一次性生成所有页面 JSON 或单个页面生成
4. **统一的递归结构**：所有节点包含 `children` 参数，叶子节点为空数组

### 成功标准

#### 用户成功

> "当我运行 `ndeps analyze` 时，我能立即得到每个页面的依赖树 JSON"

**具体成功时刻：**
- ✅ 命令执行完成，没有错误
- ✅ 输出目录中有每个页面的 JSON 文件
- ✅ 打开 JSON 能看到完整的组件树结构
- ✅ 可以用于后续的分析和查询

#### 功能成功

| 功能项 | 成功标准 |
|--------|----------|
| **路由扫描** | 能识别 100% 的 Next.js App Router 页面 |
| **依赖解析** | 能递归解析每个页面的所有依赖组件 |
| **JSON 输出** | 每个页面生成独立的、结构正确的 JSON |
| **统一结构** | 所有节点包含 `children` 参数，便于递归处理 |
| **大型项目** | 能处理 100+ 页面的项目 |
| **错误处理** | 遇到无法解析的文件时继续运行，不中断 |

#### 技术成功

| 指标 | 目标 |
|------|------|
| **覆盖率** | 100% 的页面入口被识别 |
| **准确性** | 95%+ 的依赖关系正确 |
| **性能** | 100 个页面的项目在 30 秒内完成 |
| **内存** | 内存占用 < 1GB |
| **稳定性** | 遇到错误文件时记录警告并继续 |

#### 可衡量的结果

- **100 个页面的项目**：分析完成时间 < 30 秒
- **准确率**：依赖关系识别准确率 > 95%
- **覆盖率**：100% 的 Next.js App Router 页面被正确识别
- **零崩溃**：处理大型项目时不因单个文件错误而中断
- **输出格式**：所有 JSON 文件结构一致，可直接递归处理

### 产品范围

#### MVP - 最小可行产品（第一阶段）

**必须实现：**
- [x] Next.js App Router 路由扫描
- [x] TypeScript/JavaScript 解析
- [x] 依赖图构建
- [x] 基础分析功能（循环依赖、叶子节点、孤立节点）
- [ ] **按页面生成独立 JSON 文件**
- [ ] **统一的 `children` 参数结构**
- [ ] Tree 格式输出（人类可读）
- [ ] 错误处理和警告

#### 增长功能（第二阶段）

- [ ] 增量分析（diff 命令）
- [ ] 反向依赖查询（query 命令）
- [ ] 配置文件支持 (`.ndepsrc.json`)
- [ ] 忽略规则（类似 `.gitignore`）

#### 愿景（第三阶段及以后）

- [ ] Web UI
- [ ] VS Code 扩展集成
- [ ] CI/CD 集成
- [ ] AI 代码分析
- [ ] 性能优化建议

---

## User Stories and Use Cases

### 主要用户场景

#### 场景 1：代码审查前的依赖检查

**用户故事**：作为开发者，我需要在代码审查前了解修改会影响哪些其他文件。

**用户操作**：
```bash
ndeps analyze . --route /dashboard --format tree
```

**期望输出**：显示 `/dashboard` 页面的完整依赖树

#### 场景 2：查看页面组件树（核心功能）

**用户故事**：作为开发者，我想要快速查看某个页面由哪些组件组成，了解页面的代码结构。

**用户操作：**
```bash
# Tree 格式（人类可读）
ndeps page /dashboard --from deps.json --format tree

# JSON 格式（程序处理）
ndeps page /dashboard --from deps.json --format json
```

**Tree 输出：**
```
📄 /app/dashboard/page.tsx
├── 📄 /components/DashboardLayout.tsx (depth: 1)
│   ├── 📄 /components/Header.tsx (depth: 2)
│   └── 📄 /components/Sidebar.tsx (depth: 2)
└── 📄 /components/ChartWidget.tsx (depth: 1)

Summary: 4 components, max depth: 2
```

**JSON 输出：**
```json
{
  "page": "/dashboard",
  "componentTree": [...]
}
```

---

#### 场景 2：全量依赖图谱生成（核心功能）

**用户故事**：作为开发者，我想生成整个项目的依赖图谱 JSON，用于后续查询和分析。

**用户操作：**
```bash
ndeps analyze . --output deps.json
```

**期望输出：** 生成完整的依赖图谱 JSON 文件，包含所有节点和正向/反向依赖关系。

---

#### 场景 3：增量变更影响分析

**用户故事**：作为开发者，我在提交代码前想快速了解我的修改会影响哪些页面和组件。

**用户操作：**
```bash
ndeps diff --against main --output diff.json
```

**期望输出：**
```json
{
  "changedFiles": ["/components/Button.tsx"],
  "impactedPages": [
    {
      "page": "/dashboard",
      "impactPaths": [["/components/Form.tsx", "/app/dashboard/page.tsx"]]
    }
  ]
}
```

---

#### 场景 4：反向依赖查询（次要功能）

**用户故事**：作为开发者，我修改了一个共享组件，想快速知道哪些页面会受到影响。

**用户操作：**
```bash
ndeps query Button.tsx --from deps.json
```

**期望输出：**
```json
{
  "file": "/components/Button.tsx",
  "usedBy": [
    {
      "file": "/components/Form.tsx",
      "usedByPages": ["/dashboard", "/settings"]
    }
  ]
}
```

---

#### 场景 5：查找未使用的组件

**用户故事**：作为开发者，我想找出项目中没有被任何页面引用的组件，以便清理代码。

**用户操作**：
```bash
ndeps analyze . --orphans
```

**期望输出**：列出所有孤立模块（没有依赖者且非入口点的模块）

#### 场景 3：可视化项目依赖结构

**用户故事**：作为技术负责人，我需要生成项目依赖关系的可视化图表，用于团队讨论。

**用户操作**：
```bash
ndeps analyze . --format dot --output deps.dot
dot -Tsvg deps.dot -o deps.svg
```

**期望输出**：生成 SVG 格式的依赖关系图

#### 场景 4：检测循环依赖

**用户故事**：作为开发者，我想知道项目中是否存在循环依赖，以避免潜在的运行时错误。

**用户操作**：
```bash
ndeps analyze . --cycles
```

**期望输出**：检测并报告所有循环依赖路径

#### 场景 5：优化代码分割策略

**用户故事**：作为前端工程师，我想了解哪些组件被多个页面共享，以优化代码分割。

**用户操作**：
```bash
ndeps analyze . --format json --output deps.json
```

**期望输出**：包含完整依赖统计的 JSON 数据，可用于进一步分析

---

## Functional Requirements

### 核心功能 (FR-01 至 FR-08)

#### FR-01: Next.js App Router 路由检测

**描述**：自动检测并扫描 Next.js 项目的 `app` 目录，识别所有页面、布局、路由等文件。

**验收标准**：
- 能够识别 `page.tsx`, `layout.tsx`, `route.ts` 等特殊文件
- 支持动态路由（如 `[slug]`, `[...slug]`）
- 支持路由组（如 `(group)`）
- 正确处理嵌套路由结构

#### FR-02: 静态代码解析

**描述**：解析 TypeScript/JavaScript 源代码，提取所有 import/require 依赖。

**验收标准**：
- 支持 ES6 import (`import { x } from 'y'`)
- 支持 CommonJS require (`const x = require('y')`)
- 支持动态 import (`import('y')`)
- 支持重导出 (`export { x } from 'y'`)
- 支持 TypeScript 和 JSX 语法

#### FR-03: 依赖图构建

**描述**：从页面入口开始，递归构建完整的依赖关系图。

**验收标准**：
- 正确处理相对路径导入
- 正确处理绝对路径导入
- 可选择是否包含外部依赖（node_modules）
- 支持最大深度限制
- 避免循环导致的无限递归

#### FR-04: 问题检测

**描述**：分析依赖图，检测常见问题。

**验收标准**：
- 检测循环依赖并报告完整路径
- 识别叶子节点（无依赖的模块）
- 识别孤立节点（无依赖者的模块）
- 计算依赖深度统计

#### FR-05: 多种输出格式

**描述**：支持多种输出格式以适应不同使用场景。

**验收标准**：
- **Tree 格式**：树状结构，易于阅读
- **JSON 格式**：结构化数据，便于程序处理
- **DOT 格式**：Graphviz 格式，可生成可视化图表

#### FR-06: CLI 接口

**描述**：提供简洁易用的命令行接口。

**验收标准**：
- `analyze` 命令执行全量分析
- `page` 命令查询页面组件树（核心）
- `query` 命令执行反向依赖查询（次要）
- `diff` 命令执行增量分析
- 支持可选参数控制输出格式、深度等
- 提供清晰的错误信息
- 支持 verbose 模式显示详细进度

#### FR-07: 页面组件树查询（核心功能，新增）

**描述**：从 JSON 依赖图中查询指定页面的完整组件树，支持动态计算。

**验收标准**：
- 支持 `page` 命令查询页面组件
- 默认遍历全部深度（完整的组件树）
- 支持两种输出格式：Tree（人类可读）和 JSON（程序处理）
- Tree 格式使用缩进显示组件层次
- JSON 格式返回结构化的组件树数据
- 显示统计信息（组件数量、最大深度等）

**命令格式：**
```bash
ndeps page <route> --from <json-file> [--format tree|json]
```

**实现要点：**
- 从 JSON 的 `nodes` 中读取页面的 `forwardDeps`
- 递归遍历所有依赖项，构建组件树
- 使用深度优先遍历（DFS）算法
- 记录每个组件的深度信息
- 检测和报告循环依赖

---

#### FR-08: 增量变更分析

**描述**：分析代码变更的影响范围，只处理变更的文件及其依赖链。

**验收标准**：
- 使用 `git diff` 检测变更文件
- 支持与指定分支/commit 比较（`--against` 参数）
- 计算变更文件的逆向依赖传播
- 生成变更影响报告（JSON 格式）
- 显示受影响的页面列表
- 显示完整的影响路径

**实现要点**：
- 利用已有的 `reverseDeps` 数据快速查找影响
- 不需要重新解析未变更的文件
- 可以基于已有的 `deps.json` 进行增量计算

---

#### FR-09: 节点类型自动识别（Party Mode 建议新增）

**描述**：系统能够自动识别文件/节点的类型。

**验收标准**：
- 可以识别页面类型（page）
- 可以识别布局类型（layout）
- 可以识别路由处理器类型（route）
- 可以识别组件类型（component）
- 可以识别工具函数类型（util）
- 可以识别外部依赖类型（external）

#### FR-10: 基于路径的类型推断（Party Mode 建议新增）

**描述**：系统能够根据文件路径推断节点类型。

**验收标准**：
- `app/` 目录下的 `page.tsx` 识别为页面
- `app/` 目录下的 `layout.tsx` 识别为布局
- `app/` 目录下的 `route.ts` 识别为路由处理器
- `components/` 目录下的文件识别为组件
- `lib/` 或 `utils/` 目录下的文件识别为工具函数

#### FR-11: 基于扩展名的类型推断（Party Mode 建议新增）

**描述**：系统能够根据文件扩展名判断是否为路由文件。

**验收标准**：
- 支持 `.tsx` 和 `.jsx` 扩展名
- 支持 `.ts` 和 `.js` 扩展名
- 识别特殊的 Next.js 文件命名（如 `page.tsx`, `layout.tsx`, `route.ts`）
- 支持 TypeScript 和 JavaScript 混合项目

---

## Non-Functional Requirements

### 性能要求 (NFR-01)

- 分析 100 个页面的项目耗时 < 5 秒
- 内存使用 < 500MB（对于中等规模项目）
- 支持并行处理多个文件

### 可靠性要求 (NFR-02)

- 解析错误不应导致整个分析失败
- 遇到无法解析的文件时，应记录警告并继续
- 处理大型项目时不应崩溃

### 可维护性要求 (NFR-03)

- 代码结构清晰，模块职责单一
- 完整的 TypeScript 类型定义
- 单元测试覆盖率 > 80%

### 兼容性要求 (NFR-04)

- 支持 Node.js 20+ 和 22+
- 支持 Next.js 16 App Router 模式
- 支持 TypeScript 和 JavaScript 项目
- 支持 pnpm monorepo 结构

---

## Technical Approach

### 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                        CLI Layer                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Command Parser & Options Validation             │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Analysis Orchestration                │
│  ┌──────────┐  ┌────────────┐  ┌────────────────────┐  │
│  │  Route   │  │   Parser   │  │   Graph Builder    │  │
│  │ Scanner  │──▶│            │──▶│                    │  │
│  └──────────┘  └────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                      Analysis Engine                     │
│  ┌────────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │  Cycle    │  │  Leaf/   │  │  Topological       │  │
│  │ Detection │  │  Orphan  │  │  Sort              │  │
│  └────────────┘  └──────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     Output Formatting                    │
│  ┌────────┐  ┌────────┐  ┌──────────────────────────┐  │
│  │  Tree  │  │  JSON  │  │  DOT                     │  │
│  └────────┘  └────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 技术选型

| 组件 | 技术选择 | 理由 |
|------|---------|------|
| CLI 框架 | `@nemo-cli/shared` (CAC) | 与 nemo-cli 生态一致 |
| TypeScript 解析 | `typescript` compiler API | 准确支持 TS/JSX |
| JavaScript 解析 | `acorn` + `acorn-walk` | 轻量级，性能好 |
| 图算法 | 自实现 | 针对特定需求优化 |
| 输出格式 | 自定义格式化器 | 灵活控制输出 |

---

## Open Questions and Decisions Needed

### 需要确认的问题

1. **是否需要支持非 Next.js 项目？** ✅ 已决定：暂不支持
   - 当前设计专注于 Next.js App Router
   - 保持专注，不扩展到其他框架

2. **是否需要增量分析支持？** ✅ 已决定：需要
   - 将在第二阶段实现 `ndeps diff` 命令
   - 使用 `git diff` 检测变更文件
   - 基于已有的 `deps.json` 进行增量计算

3. **是否需要缓存机制？** ✅ 已决定：不需要
   - 使用 JSON 文件存储
   - 保持简单，后续有需求再优化

4. **是否需要 Web UI？** ⏳ 待定
   - 当前专注于 CLI 工具
   - 根据用户反馈再决定

5. **输出格式是否需要支持 HTML？** ⏳ 待定
   - 当前支持 Tree/JSON/DOT 格式
   - 根据用户反馈再决定

---

## Dependencies and Integration

### 依赖的 nemo-cli 包

- `@nemo-cli/shared` - CLI 基础设施（createCommand, exit 等）

### 外部依赖

- `typescript` - TypeScript 解析
- `acorn` - JavaScript AST 解析
- `acorn-jsx` - JSX 支持
- `acorn-walk` - AST 遍历

### 与 nemo-cli 的集成

`@nemo-cli/deps` 作为独立的 npm 包发布，可通过以下方式使用：

```bash
# 全局安装
pnpm add @nemo-cli/deps --global

# 在项目中使用
pnpm add @nemo-cli/deps --dev
```

---

## Roadmap and Phasing

### 第一阶段：核心功能（当前进行中）

**已实现：**
- [x] 类型定义
- [x] Next.js 路由扫描
- [x] TypeScript/JavaScript 解析
- [x] 依赖图构建
- [x] 基础分析功能
- [x] Tree/JSON/DOT 输出格式
- [x] CLI 接口（analyze 命令）

**待完成：**
- [ ] **增强 JSON 输出**（添加 reverseDeps 字段）
- [ ] **page 命令**（查询页面组件树，核心功能）
  - [ ] Tree 格式输出
  - [ ] JSON 格式输出
  - [ ] 统计信息
- [ ] **query 命令**（反向查询，次要功能）

### 第二阶段：增量分析（下一优先级）

- [ ] **增量分析功能**（diff 命令）
  - [ ] Git 变更检测
  - [ ] 变更影响计算
  - [ ] 增量报告生成
- [ ] 配置文件支持 (`.ndepsrc.json`)
- [ ] 忽略规则（类似 `.gitignore`）
- [ ] 更丰富的统计信息

### 第三阶段：扩展功能

- [ ] HTML 交互式报告
- [ ] VS Code 扩展集成
- [ ] Web UI（待定）
- [ ] CI/CD 集成（待定）
- [ ] AI 代码分析（预留）

---

## Appendix

### 现有实现状态

当前 `packages/deps` 已完成以下实现：

| 模块 | 文件 | 状态 |
|------|------|------|
| 类型定义 | `src/core/types.ts` | ✅ 已实现 |
| 路由扫描 | `src/core/nextjs.ts` | ✅ 已实现 |
| 代码解析 | `src/core/parser.ts` | ✅ 已实现 |
| 依赖分析 | `src/core/analyzer.ts` | ✅ 已实现 |
| 图构建 | `src/core/graph.ts` | ✅ 已实现 |
| CLI 命令 | `src/cli/index.ts` | ✅ 已实现 |
| Tree 输出 | `src/output/tree.ts` | ✅ 已实现 |
| JSON 输出 | `src/output/json.ts` | ✅ 已实现 |
| DOT 输出 | `src/output/dot.ts` | ✅ 已实现 |

### 待完成工作

1. **测试覆盖**
   - 单元测试
   - 集成测试
   - 边界情况测试

2. **文档完善**
   - API 文档
   - 使用示例
   - 最佳实践指南

3. **错误处理**
   - 更友好的错误信息
   - 恢复机制
   - 日志记录

4. **性能优化**
   - 并行处理
   - 缓存机制
   - 内存优化
