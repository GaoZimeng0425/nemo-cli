---
title: 'Next.js 依赖分析工具 - 核心功能实现'
slug: 'nextjs-dependency-analyzer-core'
created: '2026-02-05T10:30:00+08:00'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['TypeScript 5+', 'Node.js 20+/22+', 'CAC (Commander)', 'Acorn AST', 'Vitest', 'Rolldown']
files_to_modify: ['packages/deps/src/core/types.ts', 'packages/deps/src/output/json.ts', 'packages/deps/src/cli/index.ts']
files_to_create: ['packages/deps/src/cli/page.ts', 'packages/deps/src/output/json-page.ts']
code_patterns: ['Factory模式 (createXxx)', 'Class生成器 (XxxGenerator)', 'ESM导入 (.js扩展名)', '错误处理 (try-catch + exit(1))']
test_patterns: ['Vitest框架', '无现有测试文件', '需新建测试目录']
---

# Tech-Spec: Next.js 依赖分析工具 - 核心功能实现

**Created:** 2026-02-05

## Overview

### Problem Statement

现有 `packages/deps` 代码实现了基础的依赖分析功能，但存在以下问题：

1. **JSON 输出格式不符合需求**：现有格式是单一文件包含所有节点，不是按入口拆分
2. **缺少 page 命令**：无法从生成的 JSON 中查询特定页面的组件树
3. **输出结构不统一**：无法保证所有节点都有 `children` 字段，不便于递归处理

### Solution

重新设计并实现核心功能：
1. **按入口拆分 JSON 输出**：每个页面/路由生成独立的 JSON 文件
2. **实现 page 命令**：从 JSON 读取数据，查询并输出页面组件树（支持 tree/json 格式）
3. **统一递归结构**：所有节点包含 `children` 参数（叶子节点为空数组），便于递归查询子节点

### Scope

**In Scope:**
- 重新设计 `analyze` 命令的 JSON 输出格式（按入口拆分 + 统一 children 结构）
- 实现 `page` 命令（支持 --from, --format 参数）
- 更新相关类型定义
- 添加基本的单元测试

**Out of Scope:**
- `query` 命令（反向查询组件被哪些页面使用）
- `diff` 命令（增量变更分析）
- DOT 输出格式的修改
- CI/CD 集成
- AI 扩展功能

## Context for Development

### Codebase Patterns

1. **CLI 框架**：使用 Commander (通过 `@nemo-cli/shared` 的 `createCommand`)
2. **命令结构**：每个命令导出 `xxxCommand()` 函数，返回 `Command` 实例
3. **输出模块**：output 目录下按格式分离 (dot.ts, json.ts, tree.ts)，使用 Class 模式 (`XxxGenerator`)
4. **工厂模式**：`createXxx()` 函数用于创建实例
5. **ESM 导入**：所有 import 必须带 `.js` 扩展名
6. **错误处理**：try-catch + `exit(1)` 模式

### Files to Reference

| File | Purpose | Key Points |
| ---- | ------- | ----------|
| `packages/deps/src/core/types.ts` | 类型定义 | 需新增 `ComponentTreeNode`, `PageDependencyOutput`, `RouteType` |
| `packages/deps/src/output/json.ts` | 现有 JSON 输出 | 当前是单一文件，需改写为按入口拆分 |
| `packages/deps/src/output/tree.ts` | Tree 输出参考 | `buildTree()` 递归逻辑可复用 |
| `packages/deps/src/core/graph.ts` | 图构建 | `GraphBuilder` 类，已有 dependencies/dependents |
| `packages/deps/src/core/nextjs.ts` | 路由扫描 | `NextJsRouteScanner` 类，支持 page/layout/route/loading/error/not-found |
| `packages/deps/src/cli/index.ts` | CLI 命令 | `analyzeCommand()` 当前内联，需拆分 |
| `packages/shared/src/utils/command.ts` | 命令工具 | `createCommand()`, `exit()` |
| `packages/shared/src/utils/log.ts` | 日志工具 | `log.show()` 用于输出 |

### Current State Analysis

**现有 JSON 输出格式：**
```json
{
  "nodes": {
    "/app/page.tsx": {
      "id": "/app/page.tsx",
      "moduleSystem": "es6",
      "type": "page",
      "dependencies": ["/components/Header.tsx"],
      "dependents": [],
      "isEntryPoint": true
    }
  },
  "edges": [ {"from": "/app/page.tsx", "to": "/components/Header.tsx"} ],
  "stats": { "totalNodes": 2, ... }
}
```

**问题：**
1. 单一文件包含所有节点，不是按入口拆分
2. 缺少 `children` 字段（统一的递归结构）
3. 没有路由元数据（routeType, routePath）

### Technical Decisions (来自 Party Mode)

1. **输出结构**：一个入口一个 JSON，接受组件冗余
   ```
   output/
   ├── _.json                  # /app/page.tsx
   ├── _.layout.json           # /app/layout.tsx
   ├── dashboard.json          # /app/dashboard/page.tsx
   ├── dashboard.layout.json   # /app/dashboard/layout.tsx
   ├── dashboard.error.json    # /app/dashboard/error.tsx
   └── api/users.json          # /app/api/users/route.ts
   ```

2. **文件命名规则**：
   - 根路径 `/` → `_.json`
   - 普通路由 `/dashboard` → `dashboard.json`
   - 嵌套路由 `/api/users` → `api/users.json`（保持层级）
   - layout 文件 → 加 `.layout` 后缀
   - error/loading/not-found → 加对应后缀

3. **新 JSON Schema**：
   ```typescript
   {
     "route": "/dashboard",
     "routeType": "page",
     "entryFile": "/app/dashboard/page.tsx",
     "tree": ComponentTreeNode,  // 递归结构，叶子节点 children: []
     "stats": { "totalComponents": 5, "maxDepth": 3, ... },
     "_extensions": {}  // 预留
   }
   ```

4. **命令结构**：
   - `analyze` 命令：输出目录而非单一文件
   - 新增 `page` 命令：从 JSON 读取并格式化输出

## Implementation Plan

### Tasks

#### Task 1: 更新类型定义
- **File**: `packages/deps/src/core/types.ts`
- **Action**: 新增以下类型定义
  ```typescript
  // 路由类型枚举
  export type RouteType = 'page' | 'layout' | 'route' | 'error' | 'loading' | 'not-found'

  // 组件树节点（递归结构）
  export interface ComponentTreeNode {
    id: string              // 文件路径
    type: NodeType          // 'page' | 'component' | 'util' | ...
    path: string            // 相对项目根的路径
    children: ComponentTreeNode[]  // 递归结构，叶子节点为 []
    _extensions?: Record<string, any>  // 扩展字段
  }

  // 单页面依赖输出
  export interface PageDependencyOutput {
    route: string           // 路由路径 '/api/users'
    routeType: RouteType    // 'page' | 'layout' | 'route' | ...
    entryFile: string       // 入口文件路径
    tree: ComponentTreeNode // 组件树根节点
    stats: PageStats
    _extensions?: Record<string, any>
  }

  // 页面统计信息
  export interface PageStats {
    totalComponents: number
    maxDepth: number
    hasDynamicImports: boolean
    hasServerComponents: boolean
    generatedAt: string     // ISO timestamp
  }

  // analyze 命令的新选项
  export interface AnalyzeCliOptions extends CliOptions {
    output?: string         // 输出目录（而非单一文件）
    perEntry?: boolean      // 是否按入口拆分（默认 true）
  }

  // page 命令选项
  export interface PageCliOptions {
    from: string            // 输入 JSON 文件或目录
    format: 'tree' | 'json'
  }
  ```
- **Notes**: 在现有 types.ts 末尾添加，保持向后兼容

---

#### Task 2: 创建按入口拆分的 JSON 生成器
- **File**: `packages/deps/src/output/json-page.ts` (新建)
- **Action**: 创建 `PageJsonGenerator` 类
  ```typescript
  export class PageJsonGenerator {
    constructor(
      private graph: DependencyGraph,
      private routes: Map<string, NextJsRouteMetadata>,
      private options: { pretty?: boolean }
    ) {}

    // 生成所有页面的 JSON，写入指定目录，返回生成的文件路径列表
    async generateToDirectory(outputDir: string): Promise<string[]> {
      const files: string[] = []
      for (const [filePath, routeMeta] of this.routes) {
        const output = this.generateForEntry(filePath)
        const relativePath = this.routeToFilePath(routeMeta.routePath, routeMeta.routeType)
        const fullPath = join(outputDir, relativePath)
        await mkdir(dirname(fullPath), { recursive: true })
        await writeFile(fullPath, JSON.stringify(output, null, this.options.pretty ? 2 : 0))
        files.push(fullPath)
      }
      return files
    }

    // 为单个入口生成 JSON
    generateForEntry(entryFile: string): PageDependencyOutput {
      const routeMeta = this.routes.get(entryFile)
      const tree = this.buildTree(entryFile, new Set())
      return {
        route: routeMeta?.routePath || '/',
        routeType: routeMeta?.routeType || 'page',
        entryFile,
        tree,
        stats: this.calculateStats(tree)
      }
    }

    // 构建组件树（递归，使用 visited 防止循环）
    private buildTree(nodeId: string, visited: Set<string>): ComponentTreeNode {
      if (visited.has(nodeId)) {
        // 循环依赖，返回最小节点
        return { id: nodeId, type: 'component', path: nodeId, children: [] }
      }
      visited.add(nodeId)

      const node = this.graph.nodes.get(nodeId)
      const children: ComponentTreeNode[] = []

      for (const depId of node?.dependencies || []) {
        const childNode = this.buildTree(depId, new Set(visited))
        children.push(childNode)
      }

      return {
        id: nodeId,
        type: node?.type || 'unknown',
        path: nodeId,
        children
      }
    }

    // 路由路径转文件路径
    private routeToFilePath(route: string, routeType: RouteType): string {
      // '/' -> '_'
      // '/dashboard' -> 'dashboard'
      // '/api/users' -> 'api/users'
      // layout -> 加 '.layout' 后缀
      let base = route === '/' ? '_' : route.slice(1)
      if (routeType !== 'page') {
        base += `.${routeType}`
      }
      return `${base}.json`
    }

    private calculateStats(tree: ComponentTreeNode): PageStats {
      let totalComponents = 0
      let maxDepth = 0

      const traverse = (node: ComponentTreeNode, depth: number) => {
        totalComponents++
        maxDepth = Math.max(maxDepth, depth)
        for (const child of node.children) {
          traverse(child, depth + 1)
        }
      }

      traverse(tree, 0)

      return {
        totalComponents,
        maxDepth,
        hasDynamicImports: false,
        hasServerComponents: false,
        generatedAt: new Date().toISOString()
      }
    }
  }

  export function createPageJsonGenerator(...)
  export function generatePageJsonOutput(...)
  ```
- **Notes**: 参考 `json.ts` 的 `JsonGenerator` 类结构

---

#### Task 3: 拆分 analyze 命令到独立文件
- **File**: `packages/deps/src/cli/analyze.ts` (新建)
- **Action**:
  1. 将 `cli/index.ts` 中的 `analyzeCommand()` 函数移动到新文件
  2. 重构 `analyzeDependencies()` 函数以支持新的输出模式
  3. 添加 `--per-entry` 选项（默认 true）
  4. 当 `--output` 指定目录时，调用 `PageJsonGenerator`
  5. 保持向后兼容：`--format json` 且无 `--output` 时输出到 stdout
- **Notes**: 确保所有 import 路径带 `.js` 扩展名

---

#### Task 4: 创建 page 命令
- **File**: `packages/deps/src/cli/page.ts` (新建)
- **Action**:
  ```typescript
  export function pageCommand() {
    return createCommand('page')
      .description('Query page component tree from generated JSON')
      .argument('<route>', 'Route path (e.g., /dashboard)')
      .option('-f, --from <path>', 'Input JSON file or directory', './deps-output')
      .option('--format <format>', 'Output format (tree, json)', 'tree')
      .action(async (route: string, options: PageCliOptions) => {
        await handlePageCommand(route, options)
      })
  }

  async function handlePageCommand(route: string, options: PageCliOptions) {
    // 1. 确定输入路径
    const inputPath = resolvePath(options.from)
    const stat = await stat(inputPath).catch(() => null)

    if (!stat) {
      console.error(`Error: Path "${inputPath}" does not exist.`)
      exit(1)
    }

    // 2. 如果是目录，查找对应的 JSON 文件
    let jsonPath: string
    if (stat.isDirectory()) {
      // 路由路径转文件名
      const fileName = route === '/' ? '_' : route.slice(1)
      jsonPath = resolvePath(inputPath, `${fileName}.json`)
    } else {
      jsonPath = inputPath
    }

    // 3. 读取并解析 JSON
    const content = await readFile(jsonPath, 'utf-8')
    const data: PageDependencyOutput = JSON.parse(content)

    // 4. 根据格式输出
    if (options.format === 'json') {
      console.log(JSON.stringify(data.tree, null, 2))
    } else {
      // tree 格式：复用 tree.ts 的逻辑
      const treeOutput = formatTree(data.tree)
      console.log(treeOutput)
    }
  }

  function formatTree(node: ComponentTreeNode, depth = 0): string {
    const prefix = '  '.repeat(depth)
    const marker = depth === 0 ? '📄 ' : '├── '
    const lines = [`${prefix}${marker}${node.id}`]

    for (const child of node.children) {
      lines.push(formatTree(child, depth + 1))
    }

    return lines.filter(Boolean).join('\n')
  }
  ```
- **Notes**: 复用 `tree.ts` 的格式化逻辑，需要添加错误处理（JSON 解析失败、文件不存在）

---

#### Task 5: 更新 CLI 入口
- **File**: `packages/deps/src/cli/index.ts`
- **Action**:
  1. 导入新的 `analyzeCommand` 从 `./analyze.js`（同目录）
  2. 导入新的 `pageCommand` 从 `./page.js`（同目录）
  3. 注册两个命令到 CLI program
  4. 移除内联的 `analyzeCommand()` 和相关函数
- **Notes**: 确保导出路径正确（`.js` 扩展名），注意文件在 `cli/` 子目录中

---

#### Task 6: 创建测试文件
- **File**: `packages/deps/src/output/json-page.test.ts` (新建)
- **Action**: 创建基础单元测试
  ```typescript
  import { describe, it, expect } from 'vitest'
  import { createPageJsonGenerator } from './json-page.js'

  describe('PageJsonGenerator', () => {
    it('should generate correct file path for root route', () => {
      // test '/'
    })

    it('should generate correct file path for nested route', () => {
      // test '/api/users'
    })

    it('should append suffix for layout files', () => {
      // test layout suffix
    })

    it('should build component tree with children', () => {
      // test tree structure
    })

    it('should handle leaf nodes with empty children array', () => {
      // test leaf nodes
    })
  })
  ```
- **Notes**: 无需 mock，使用简单的测试数据

---

### Acceptance Criteria

- [ ] **AC-01**: Given 已执行 `ndeps analyze <project> --output ./deps-output`, when 检查输出目录, then 应为每个入口生成独立的 JSON 文件
- [ ] **AC-02**: Given 根路径页面, when 生成 JSON, then 文件名为 `_.json`
- [ ] **AC-03**: Given 嵌套路由 `/api/users`, when 生成 JSON, then 文件路径为 `api/users.json`（保持层级）
- [ ] **AC-04**: Given layout 文件, when 生成 JSON, then 文件名包含 `.layout` 后缀
- [ ] **AC-05**: Given 生成的 JSON 文件, when 读取并解析, then 包含 `route`, `routeType`, `entryFile`, `tree`, `stats` 字段
- [ ] **AC-06**: Given `tree` 字段, when 检查其结构, then 所有节点都有 `children` 数组（叶子节点为空数组）
- [ ] **AC-07**: Given 执行 `ndeps page /dashboard --from ./deps-output`, when 命令完成, then 输出该页面的组件树（tree 格式）
- [ ] **AC-08**: Given 执行 `ndeps page /dashboard --from ./deps-output --format json`, when 命令完成, then 输出 JSON 格式的组件树
- [ ] **AC-09**: Given 输入 JSON 文件不存在, when 执行 page 命令, then 显示清晰错误信息并退出
- [ ] **AC-10**: Given 组件有循环依赖, when 生成组件树, then 正确处理避免无限递归
- [ ] **AC-11**: Given `stats` 字段, when 检查其内容, then `totalComponents` 和 `maxDepth` 计算正确
- [ ] **AC-12**: Given page 命令从目录读取, when 目录存在但目标 JSON 不存在, then 显示错误信息
- [ ] **AC-13**: Given JSON 文件格式错误, when page 命令读取, then 显示解析错误并退出
- [ ] **AC-14**: Given 嵌套路由的 JSON, when 生成, then 正确创建嵌套目录（如 `api/` 目录）

## Additional Context

### Dependencies

**外部依赖（现有）：**
- `commander`: CLI 框架（通过 @nemo-cli/shared）
- `acorn`: AST 解析
- `acorn-jsx`: JSX 支持
- `acorn-walk`: AST 遍历

**内部依赖：**
- `@nemo-cli/shared`: `createCommand()`, `exit()`, `log.show()`
- 现有模块：`parser.ts`, `analyzer.ts`, `graph.ts`, `nextjs.ts`

**无新增外部依赖**

---

### Testing Strategy

**单元测试：**
- 测试文件：`packages/deps/src/output/json-page.test.ts`
- 测试框架：Vitest（已配置）
- 覆盖目标：
  - 文件路径生成逻辑（路由路径 → 文件路径）
  - 组件树构建逻辑（递归结构）
  - 边界情况（循环依赖、叶子节点）

**集成测试（手动）：**
```bash
# 1. 构建
cd packages/deps && pnpm build

# 2. 分析测试项目
ndeps analyze ./test-project --output ./test-output

# 3. 验证输出结构
ls -la ./test-output/
cat ./test-output/dashboard.json | jq .

# 4. 测试 page 命令
ndeps page /dashboard --from ./test-output
ndeps page /dashboard --from ./test-output --format json
```

**测试数据准备：**
- 创建简单的 Next.js 测试项目（2-3 个页面）
- 包含：共享组件、嵌套组件、动态导入

---

### Notes

**高风险项（Pre-mortem）：**
1. **循环依赖处理**: 组件树构建时必须正确处理循环，否则无限递归
   - 缓解: 使用 `visited` Set 跟踪已访问节点
2. **文件路径冲突**: 不同路由类型可能生成相同文件名
   - 缓解: 使用后缀区分（`.layout.json`, `.error.json`）
3. **大文件性能**: 大型项目可能有数千个组件
   - 缓解: 当前方案接受冗余，后续可优化为共享引用

**已知限制：**
- JSON 文件会包含重复的组件数据（接受冗余）
- 不支持增量更新（需重新生成所有文件）
- 不支持反向查询（query 命令，后续版本）

**后续考虑（Out of Scope）：**
- `query` 命令：反向查询组件被哪些页面使用
- `diff` 命令：增量变更分析
- 性能优化：共享组件去重（使用引用）
- AI 扩展：`_extensions` 字段用于智能分析

**参考文档：**
- PRD: `_bmad-output/planning-artifacts/prd-dependency-analysis.md`
- Party Mode 决策记录已整合到本规格
