---
title: 'ND AI 依赖关系可视化工具'
slug: 'nd-ai-dependency-visualizer'
created: '2026-02-25'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - framework: 'Vite + React + TypeScript'
  - visualization: 'React Flow (节点图渲染)'
  - layout: 'ELK (层次布局算法)'
  - state: 'Zustand (轻量状态管理)'
  - styling: 'Tailwind CSS'
files_to_modify:
  - packages/deps/src/index.ts
  - packages/visualizer/package.json
  - packages/visualizer/vite.config.ts
  - packages/visualizer/tsconfig.json
  - packages/visualizer/tailwind.config.js
  - packages/visualizer/postcss.config.js
  - packages/visualizer/index.html
  - packages/visualizer/src/main.tsx
  - packages/visualizer/src/App.tsx
  - packages/deps/src/cli/visualize.ts
code_patterns:
  - 测试模式: Vitest单元测试、Playwright E2E测试
  - 构建模式: Vite构建、生产优化
  - 状态管理: Zustand中心化状态
  - 组件模式: React函数组件、自定义Hooks
  - 错误处理: ErrorBoundary、try-catch、用户友好消息
  - 性能优化: Web Worker、虚拟化、渐进式加载
  - Monorepo: pnpm workspace协议、workspace依赖
  - TypeScript: 严格模式、类型定义复用
test_patterns:
  - 单元测试: __tests__/unit/*.test.ts - Vitest
  - 集成测试: __tests__/integration/*.test.ts - Vitest
  - 失效模式测试: __tests__/failure-modes/*.test.ts - Vitest
  - E2E测试: __tests__/e2e/*.test.ts - Playwright
  - 性能测试: __tests__/performance/*.test.ts - Lighthouse/Performance API
---

# Tech-Spec: ND AI 依赖关系可视化工具

**Created:** 2026-02-25

## Overview

### Problem Statement

当前 `nd ai` 命令可以分析项目依赖并导出到 `deps.ai.json`,但用户只能通过查看JSON文件来理解依赖关系,这种方式不够直观。用户需要一个可视化的界面来:

1. 查看项目中所有文件/组件的依赖关系图
2. 快速识别循环依赖(SCC组)
3. 理解不同页面的组件树结构
4. 定位和搜索特定节点
5. 直接从可视化界面打开源码文件

### Solution

创建一个独立的Web应用,读取 `deps.ai.json` 文件并提供交互式依赖图可视化:

- 使用图形库渲染依赖关系网络图
- 提供交互式UI(拖拽、缩放、点击、搜索)
- 支持多视图切换(全局图、单页面视图、SCC循环视图)
- 集成文件打开功能(通过本地服务器协议)

### Scope

**In Scope:**
- 读取和解析 `deps.ai.json` 文件
- 交互式依赖图可视化(节点和边的网络图)
- 多路由/页面同时展示
- SCC循环依赖高亮显示
- 按scope过滤节点(app/workspace/external/other)
- 节点详情面板(文件路径、依赖列表、被依赖列表、所属页面)
- 搜索和定位节点功能
- 点击节点在默认编辑器中打开文件
- 导出可视化图为图片/PNG

**Out of Scope:**
- 实时重新分析项目依赖(由 `nd analyze` 命令负责)
- 编辑依赖关系(只读查看)
- 多项目对比分析
- 依赖关系优化建议
- 性能分析(如计算依赖深度)

## Context for Development

### Codebase Patterns

基于深入代码调查,发现以下关键模式和约定:

#### 1. Monorepo结构 (pnpm workspace)

**包组织**:
```
packages/
├── ai/           # AI服务集成
├── deps/         # 依赖分析CLI (@nemo-cli/deps)
├── file/         # 文件操作命令
├── git/          # Git命令
├── mail/         # 邮件服务
├── package/      # 包管理命令
├── shared/       # 共享工具库
├── ui/           # CLI React组件 (Ink)
└── visualizer/   # [新建] 依赖可视化Web应用
```

#### 2. 构建工具链

**现有包使用: Rolldown**
- Visualizer包例外: 使用Vite (Web应用需要HMR)

**测试框架**: Vitest
- 测试文件: `__tests__/*.test.ts`

**React模式**:
- `@nemo-cli/ui` 使用 **Ink** (CLI渲染)
- Visualizer使用 **React DOM** (浏览器渲染)

#### 3. 类型定义

**复用策略**: 从 `@nemo-cli/deps` 复用类型
- `AiOutput`, `AiNode`, `AiPage` 等
- 避免类型重复定义

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `packages/deps/src/output/ai.ts` | AI输出格式生成逻辑 |
| `packages/deps/src/core/types.ts` | 类型定义(AiOutput, AiNode, AiPage等) - **复用** |
| `packages/deps/src/cli/ai.ts` | AI命令CLI实现 |
| `packages/ui/src/components/route-viewer.tsx` | 路由选择器组件参考 (React模式) |
| `packages/deps/__tests__/json-page.test.ts` | 测试模式参考 |
| `packages/deps/rolldown.config.ts` | Rolldown配置参考 (Visualizer用Vite) |
| `packages/ui/package.json` | 包结构参考 |

### Technical Decisions & Architecture Decision Records (ADRs)

经过Party Mode多Agent协作讨论和Advanced Elicitation架构分析,确定以下技术决策:

---

#### ADR-001: 可视化库选择 - React Flow

**状态**: ✅ 已接受
**日期**: 2026-02-25
**决策者**: Winston (Architect), Amelia (Developer), John (PM)

**背景**: 需要选择节点图可视化库来展示依赖关系网络

**决策**: 使用React Flow而非Cytoscape.js

**理由**:
- ✅ 活跃维护(2024年持续更新)
- ✅ React原生设计,TypeScript完善
- ✅ 性能优秀,支持中型图(500-2000节点)
- ✅ 开发效率高,MVP可在1周内完成
- ✅ 内置缩放、平移、小地图等交互

**权衡和后果**:
- **正面**: 快速交付MVP,生态丰富,学习曲线低
- **负面**: 超大型项目(>2000节点)可能性能不足
- **缓解策略**:
  1. 实现节点聚合功能(折叠子树为超节点)
  2. 分层渲染策略(先入口节点,按需展开)
  3. 提供"简化模式"只显示关键路径

**替代方案**: 如果20%+用户反馈性能问题,考虑切换到Cytoscape.js

**淘汰方案**:
- ❌ react-cytoscapejs - 三年未更新,技术债务风险
- ❌ Cytoscape.js (直接使用) - API复杂,缺少React集成
- ❌ D3.js - 需要大量自定义代码,开发周期长

---

#### ADR-002: Visualizer作为独立Web应用

**状态**: ✅ 已接受
**日期**: 2026-02-25

**背景**: 需要决定Visualizer的架构位置和部署方式

**决策**: 创建独立的`packages/visualizer`包,通过`nd visualize` CLI命令启动

**理由**:
- ✅ 职责分离(CLI vs Web应用)
- ✅ 技术栈灵活(Visualizer用Vite,其他包用Rolldown)
- ✅ 可独立部署(静态HTML可托管)
- ✅ 统一用户体验(通过CLI命令启动)

**架构设计**:
```
packages/
├── deps/
│   └── src/cli/
│       └── visualize.ts    # 新增CLI命令
└── visualizer/              # 新增Web应用包
    ├── src/
    │   ├── main.tsx
    │   └── App.tsx
    ├── index.html
    └── vite.config.ts
```

**CLI集成方案**:
```typescript
// packages/deps/src/cli/visualize.ts
export function visualizeCommand() {
  return createCommand('visualize')
    .description('Launch dependency visualization web app')
    .option('-p, --port <number>', 'Port', '3000')
    .option('--open', 'Open browser')
    .action(async (options) => {
      // 启动Vite开发服务器
      const server = spawn('npm', ['run', 'dev'], {
        cwd: resolvePath(__dirname, '../../visualizer')
      });
      if (options.open) await open(`http://localhost:${port}`);
    });
}
```

**使用方式**:
```bash
# CLI启动
nd visualize --open

# 或独立开发
cd packages/visualizer && npm run dev
```

---

#### ADR-003: 类型定义复用策略

**状态**: ✅ 已接受
**日期**: 2026-02-25

**背景**: 需要决定类型定义的组织方式

**决策**: 从`@nemo-cli/deps`复用类型定义,而非独立复制

**理由**:
- ✅ 类型一致性(单一数据源)
- ✅ DRY原则(避免重复定义)
- ✅ 同步保证(deps更新时自动同步)

**实现方式**:
```typescript
// packages/visualizer/src/types/ai.ts
// 重新导出@nemo-cli/deps的类型
export type { AiOutput, AiNode, AiPage, AiSccGroup } from '@nemo-cli/deps';
```

**依赖管理**:
```json
// packages/visualizer/package.json
{
  "dependencies": {
    "@nemo-cli/deps": "workspace:*"
  }
}
```

**生产构建策略**:
- **开发环境**: 运行时依赖workspace包
- **生产构建**: 使用vite-plugin-inline-type将类型编译到产物,实现真正独立部署

**替代方案**: 独立定义类型(被否决,因为类型同步成本高于依赖耦合成本)

---

#### ADR-004: 分层性能优化策略

**状态**: ✅ 已接受
**日期**: 2026-02-25

**背景**: 需要确保在不同规模项目下的流畅体验

**决策**: 实施三层性能优化策略

**Layer 1: 数据层 - Web Worker解析**
```typescript
// worker.ts
self.onmessage = (e) => {
  const json = JSON.parse(e.data); // 解析deps.ai.json
  const graph = buildGraph(json);
  postMessage(graph);
};
```
- 目的: 避免阻塞UI线程
- 适用: 所有规模

**Layer 2: 渲染层 - 虚拟化**
```typescript
<ReactFlow
  nodes={visibleNodes}
  maxZoom={1.5}
  minZoom={0.1}
  fitView
>
  {/* React Flow内置虚拟化 */}
</ReactFlow>
```
- 目的: 只渲染可见区域
- 适用: 中大型项目

**Layer 3: 布局层 - 渐进式加载**
```typescript
// 先布局入口节点
const initialNodes = await layoutEntryNodes();
setNodes(initialNodes);

// 按需展开子树
const expandNode = async (nodeId) => {
  const childNodes = await layoutChildNodes(nodeId);
  setNodes(prev => [...prev, ...childNodes]);
};
```
- 目的: 减少初始渲染压力
- 适用: 大型项目

**性能目标**:
| 项目规模 | 节点数 | 目标时间 | 策略 |
|---------|-------|---------|------|
| 小型 | <100 | <1秒 | 即时渲染 |
| 中型 | 100-1000 | <3秒 | Web Worker |
| 大型 | 1000-5000 | <5秒 | + 虚拟化 |
| 超大型 | >5000 | <5秒 | + 聚合模式 |

**监控指标**:
- 首次渲染时间(First Contentful Paint)
- 交互响应时间(Input Delay)
- 内存使用(Memory Usage)

---

#### ADR-005: 状态管理选择 - Zustand

**状态**: ✅ 已接受
**日期**: 2026-02-25

**背景**: 需要选择适合应用规模的状态管理方案

**决策**: 使用Zustand而非Redux Toolkit

**对比分析**:
| 方案 | 复杂度 | 学习曲线 | 包体积 | 适用规模 |
|------|--------|----------|--------|----------|
| React useState | 低 | 无 | 0 | 小型 |
| Zustand | 中 | 低 | 3KB | 中型 ✓ |
| Jotai | 低 | 低 | 3KB | 中型 |
| Redux Toolkit | 高 | 中 | 12KB | 大型 |

**理由**:
- ✅ 应用复杂度适中(不需要Redux的重量级)
- ✅ API简洁,学习曲线低
- ✅ TypeScript友好
- ✅ 包体积小(3KB vs Redux 12KB)
- ✅ 内置DevTools支持

**状态结构设计**:
```typescript
interface GraphStore {
  // 数据状态
  aiOutput: AiOutput | null;
  nodes: Node[];
  edges: Edge[];

  // UI状态
  selectedNodeId: string | null;
  filteredScopes: Scope[];
  selectedPage: string | null;
  searchQuery: string;

  // 操作
  loadAiOutput: (file: File) => Promise<void>;
  filterByScope: (scopes: Scope[]) => void;
  selectNode: (nodeId: string) => void;
  searchNodes: (query: string) => void;

  // 计算状态
  getFilteredNodes: () => Node[];
  getSCCNodes: () => Node[];
  getNodeById: (id: string) => Node | undefined;
}
```

**替代方案**: Jotai(原子化状态,但Zustand更符合中心化状态管理需求)

---

#### ADR-006: 布局算法选择 - ELK

**状态**: ✅ 已接受
**日期**: 2026-02-25

**决策**: 使用ELK (Eclipse Layout Kernel)作为默认布局算法

**理由**:
- ✅ 专为图设计,支持层次布局(适合依赖树结构)
- ✅ 性能优秀,支持大型图
- ✅ JavaScript版本: `elkjs`
- ✅ 预留扩展点支持其他算法(D3-force等)

**架构设计** - 策略模式:
```typescript
interface LayoutStrategy {
  name: string;
  apply(nodes: Node[], edges: Edge[]): Promise<LayoutResult>;
}

class ElkLayoutStrategy implements LayoutStrategy {
  async apply(nodes, edges) {
    const elk = new ELK();
    const graph = transformToElkGraph(nodes, edges);
    const layouted = await elk.layout(graph, {
      algorithm: 'layered'
    });
    return transformToReactFlow(layouted);
  }
}

// 备选方案
class D3ForceLayoutStrategy implements LayoutStrategy {
  apply(nodes, edges) {
    // D3 force simulation
  }
}
```

**配置选项**:
```typescript
const layoutOptions = {
  'elk.layered': {
    'elk.direction': 'DOWN',
    'elk.spacing.nodeNode': '50',
    'elk.layered.spacing.nodeNodeBetweenLayers': '100'
  }
};
```

**选择理由**:
- ✅ 开发效率高,热更新快速
- ✅ 构建产物优化,支持静态部署
- ✅ TypeScript类型安全
- ✅ 生态系统成熟

**文件结构**:
```
packages/visualizer/
├── src/
│   ├── App.tsx              # 主应用入口
│   ├── components/
│   │   ├── GraphView.tsx    # React Flow图组件
│   │   ├── DependencyNode.tsx  # 自定义节点
│   │   ├── ControlPanel.tsx # 过滤器、搜索
│   │   ├── NodeDetails.tsx  # 节点详情面板
│   │   └── PageSelector.tsx # 页面选择器
│   ├── lib/
│   │   ├── parser.ts        # deps.ai.json解析
│   │   ├── graph-builder.ts # 构建React Flow图数据
│   │   └── layout.ts        # 布局策略
│   ├── store/
│   │   └── useGraphStore.ts # Zustand状态管理
│   └── main.tsx
├── package.json
└── vite.config.ts
```

#### 4. 文打开机制: **VS Code protocol**

**实现方案**:
```typescript
const openInVSCode = (filePath: string, appRoot: string) => {
  const absolutePath = filePath.startsWith('/')
    ? filePath
    : `${appRoot}/${filePath}`;
  const protocol = `vscode://file/${absolutePath}`;
  window.open(protocol, '_blank');
};
```

**扩展性**: 支持其他编辑器
- WebStorm: `webstorm://open?file={path}`
- Cursor: `cursor://file/{path}`
- Sublime: `subl://open?url=file://{path}`

#### 5. 状态管理: **Zustand**

**选择理由**:
- ✅ 轻量级(适合这个规模的应用)
- ✅ API简洁,学习曲线低
- ✅ 支持DevTools
- ✅ TypeScript友好

**状态结构**:
```typescript
interface GraphStore {
  // 数据
  aiOutput: AiOutput | null;
  nodes: Node[];
  edges: Edge[];

  // UI状态
  selectedNode: Node | null;
  filteredScopes: Scope[];
  selectedPage: string | null;
  searchQuery: string;

  // 操作
  loadAiOutput: (file: File) => Promise<void>;
  filterByScope: (scopes: Scope[]) => void;
  selectNode: (node: Node) => void;
  searchNodes: (query: string) => void;
}
```

#### 6. 性能优化策略

**多层优化**:
1. **Web Worker** - JSON解析放在Worker线程
2. **渐进式加载** - 先加载页面入口节点,再按需展开
3. **虚拟化渲染** - React Flow内置优化
4. **分层渲染** - 小型项目即时,中大型1-5秒带进度条

**节点限制**:
- 小型: <100节点 - 即时渲染
- 中型: 100-1000节点 - 1-2秒
- 大型: 1000-5000节点 - 3-5秒
- 超大型: >5000节点 - 聚合视图或分页

#### 7. 自定义节点设计

**视觉编码**:
- **颜色** = scope
  - app: 蓝色 (#3B82F6)
  - workspace: 绿色 (#10B981)
  - external: 灰色 (#6B7280)
- **边框** = type
  - page: 粗边框
  - layout: 双线边框
  - component: 普通边框
- **角标** = SCC循环成员
  - 红色小圆点 + 脉冲动画
- **徽章** = 被依赖数量

**信息层级**:
- 默认: 文件名 + 依赖数量徽章
- Hover: scope + 依赖/被依赖统计
- 选中: 侧边栏显示完整详情

## Implementation Plan

### Phase 1: 项目初始化和基础设施 (Day 1-3)

**说明**: 预估时间已增加20%缓冲,实际可能根据开发者经验浮动

- [ ] **Task 1.1**: 创建Visualizer包结构
  - File: `packages/visualizer/package.json`
  - Action: 初始化package.json,配置依赖和脚本
  - Notes: 参考`packages/deps/package.json`结构,使用workspace协议版本

- [ ] **Task 1.2**: 配置Vite构建系统
  - File: `packages/visualizer/vite.config.ts`
  - Action: 配置Vite、React插件、TypeScript
  - Notes: 参考Vite官方文档配置React项目

- [ ] **Task 1.3**: 配置TypeScript
  - File: `packages/visualizer/tsconfig.json`
  - Action: 配置TS编译选项、路径别名
  - Notes: 复用根目录的TS配置作为基础,确保与workspace兼容

- [ ] **Task 1.4**: 配置Tailwind CSS
  - Files: `packages/visualizer/tailwind.config.js`, `packages/visualizer/postcss.config.js`
  - Action: 初始化Tailwind配置,添加自定义主题
  - Notes: 配置scope颜色(app蓝色,workspace绿色,external灰色),考虑色盲友好

- [ ] **Task 1.5**: 创建HTML入口
  - File: `packages/visualizer/index.html`
  - Action: 创建React应用入口HTML
  - Notes: 添加文件选择器输入元素,支持拖拽上传

- [ ] **Task 1.6**: 创建React应用入口
  - Files: `packages/visualizer/src/main.tsx`, `packages/visualizer/src/App.tsx`
  - Action: 初始化React应用根组件
  - Notes: 使用StrictMode包裹,添加ErrorBoundary

- [ ] **Task 1.7**: 配置开发环境文档
  - File: `packages/visualizer/DEVELOPMENT.md`
  - Action: 编写开发环境设置指南
  - Notes: 包含Node版本要求(>=20.19.0 || >=22.12.0)、pnpm安装、环境变量配置

### Phase 2: 类型定义和数据解析 (Day 2-3)

- [ ] **Task 2.1**: 创建类型定义模块
  - File: `packages/visualizer/src/types/ai.ts`
  - Action: 从`@nemo-cli/deps`重新导出类型定义
  - Notes: 添加React Flow相关的Node和Edge类型扩展

- [ ] **Task 2.2**: 实现JSON解析器
  - File: `packages/visualizer/src/lib/parser.ts`
  - Action: 创建`parseAiOutput()`函数,使用Zod验证schema
  - Notes: 实现失效模式预防(文件大小检查、版本兼容性检查)

- [ ] **Task 2.3**: 实现Web Worker解析
  - File: `packages/visualizer/src/lib/parser.worker.ts`
  - Action: 将JSON解析移到Worker线程
  - Notes: 实现主线程与Worker通信接口

- [ ] **Task 2.4**: 编写解析器单元测试
  - File: `packages/visualizer/__tests__/unit/parser.test.ts`
  - Action: 测试有效/无效JSON、版本检查、文件大小限制
  - Notes: 覆盖所有失效模式

### Phase 3: 状态管理 (Day 3)

- [ ] **Task 3.1**: 创建Zustand Store
  - File: `packages/visualizer/src/store/useGraphStore.ts`
  - Action: 实现GraphStore接口和数据操作方法
  - Notes: 参考ADR-005的状态结构设计

- [ ] **Task 3.2**: 实现数据加载逻辑
  - File: `packages/visualizer/src/store/useGraphStore.ts` - `loadAiOutput()`方法
  - Action: 实现文件读取、解析、图构建流程
  - Notes: 使用Web Worker,显示加载进度

- [ ] **Task 3.3**: 实现过滤和搜索逻辑
  - File: `packages/visualizer/src/store/useGraphStore.ts` - `filterByScope()`, `searchNodes()`
  - Action: 实现scope过滤和字符串搜索
  - Notes: 安全封装正则搜索,防止死循环

- [ ] **Task 3.4**: 编写Store单元测试
  - File: `packages/visualizer/__tests__/unit/store.test.ts`
  - Action: 测试状态更新、计算状态、过滤逻辑
  - Notes: 使用Zustand的测试模式

### Phase 4: 布局算法 (Day 4)

- [ ] **Task 4.1**: 实现布局策略接口
  - File: `packages/visualizer/src/lib/layout/types.ts`
  - Action: 定义LayoutStrategy接口
  - Notes: 参考ADR-006的架构设计

- [ ] **Task 4.2**: 实现ELK布局策略
  - File: `packages/visualizer/src/lib/layout/elk-strategy.ts`
  - Action: 实现ElkLayoutStrategy类
  - Notes: 配置层次布局选项(方向DOWN,间距50-100px)

- [ ] **Task 4.3**: 实现图数据转换器
  - File: `packages/visualizer/src/lib/graph-builder.ts`
  - Action: 创建`buildReactFlowGraph()`函数
  - Notes: 转换AiOutput → React Flow nodes/edges

- [ ] **Task 4.4**: 编写布局算法测试
  - File: `packages/visualizer/__tests__/unit/layout.test.ts`
  - Action: 测试ELK布局、超时保护、降级策略
  - Notes: 模拟特殊图结构(全连接、循环依赖)

### Phase 5: React Flow可视化组件 (Day 5-7)

- [ ] **Task 5.1**: 创建GraphView组件
  - File: `packages/visualizer/src/components/GraphView.tsx`
  - Action: 封装React Flow基础组件
  - Notes: 配置maxZoom、minZoom、fitView、MiniMap

- [ ] **Task 5.2**: 实现自定义节点组件
  - File: `packages/visualizer/src/components/DependencyNode.tsx`
  - Action: 创建自定义节点,显示图标、标签、徽章
  - Notes: 实现scope颜色、SCC脉冲动画、Hover效果

- [ ] **Task 5.3**: 实现控制面板组件
  - File: `packages/visualizer/src/components/ControlPanel.tsx`
  - Action: 创建过滤器、搜索框、布局选择器
  - Notes: 连接到Zustand Store的过滤/搜索方法

- [ ] **Task 5.4**: 实现节点详情面板
  - File: `packages/visualizer/src/components/NodeDetails.tsx`
  - Action: 显示选中节点的完整信息
  - Notes: 文件路径、依赖列表、被依赖列表、SCC信息

- [ ] **Task 5.5**: 实现页面选择器组件
  - File: `packages/visualizer/src/components/PageSelector.tsx`
  - Action: 创建多选下拉框选择要显示的页面
  - Notes: 连接到Store的selectedPage状态

- [ ] **Task 5.6**: 实现文件打开功能
  - File: `packages/visualizer/src/lib/file-opener.ts`
  - Action: 实现`openFileInEditor()`函数
  - Notes: VS Code协议验证、路径验证、剪贴板降级

- [ ] **Task 5.7**: 编写组件集成测试
  - File: `packages/visualizer/__tests__/integration/graph-rendering.test.ts`
  - Action: 测试完整渲染流程、交互、失效模式
  - Notes: 使用Testing Library和React Flow测试工具

### Phase 6: CLI命令集成 (Day 8-10)

**说明**: CLI命令需要完整的错误处理和用户友好体验

- [ ] **Task 6.1**: 创建visualize CLI命令
  - File: `packages/deps/src/cli/visualize.ts`
  - Action: 实现`visualizeCommand()`,启动Vite服务器,添加完整错误处理
  - Notes:
    - 检查visualizer包是否存在
    - 检查端口是否可用
    - spawn失败时提供友好错误消息
    - 参考`packages/deps/src/cli/ai.ts`的命令结构

- [ ] **Task 6.2**: 注册CLI命令
  - File: `packages/deps/src/index.ts`
  - Action: 导出visualize命令
  - Notes: 确保命令可通过`nd visualize`调用,添加命令别名

- [ ] **Task 6.3**: 配置开发服务器
  - File: `packages/visualizer/vite.config.ts`
  - Action: 配置开发服务器选项(端口、CORS、自动打开)
  - Notes:
    - 默认端口3000,支持--port选项
    - 配置CORS允许本地文件访问
    - 添加HMR配置

- [ ] **Task 6.4**: 编写CLI命令测试
  - File: `packages/deps/__tests__/visualize.test.ts`
  - Action: 测试CLI命令的启动、端口冲突、错误处理
  - Notes: 覆盖AC 10的验收标准

### Phase 7: 性能优化和失效模式处理 (Day 10-13)

**说明**: 性能优化是关键阶段,需要充分测试和调优

- [ ] **Task 7.1**: 实现性能监控
  - File: `packages/visualizer/src/lib/performance-monitor.ts`
  - Action: 监控FPS、内存、渲染时间
  - Notes:
    - 使用Performance API测量FCP和Input Delay
    - 低于阈值时自动切换低质量模式
    - 记录性能指标用于验证AC 11-15

- [ ] **Task 7.2**: 实现节点限制和聚合
  - File: `packages/visualizer/src/lib/aggregator.ts`
  - Action: 实现`aggregateNodes()`函数
  - Notes: 节点数>5000时自动聚合,满足AC 9

- [ ] **Task 7.3**: 实现渐进式加载
  - File: `packages/visualizer/src/lib/progressive-loader.ts`
  - Action: 实现按需展开子树功能
  - Notes:
    - MVP阶段不启用此功能
    - 作为性能优化选项在Phase 7实现
    - 确保不影响AC 2(点击显示完整信息)

- [ ] **Task 7.4**: 实现错误边界和降级
  - File: `packages/visualizer/src/components/ErrorBoundary.tsx`
  - Action: 捕获渲染错误,显示友好错误信息
  - Notes: 实现所有FMA识别的失效模式的恢复策略

- [ ] **Task 7.5**: 编写失效模式测试
  - Files: `packages/visualizer/__tests__/failure-modes/*.test.ts`
  - Action: 测试所有17种失效模式
  - Notes: 参考FMA分析文档,覆盖AC 16-20

- [ ] **Task 7.6**: 编写性能基准测试
  - File: `packages/visualizer/__tests__/performance/benchmark.test.ts`
  - Action: 创建性能基准测试脚本
  - Notes:
    - 使用Lighthouse或Performance API测量
    - 定义基准环境(Mac M1, Chrome最新版, 16GB内存)
    - 测试不同规模项目的渲染时间

### Phase 8: 文档和收尾 (Day 9-10)

- [ ] **Task 8.1**: 编写README
  - File: `packages/visualizer/README.md`
  - Action: 编写使用说明、架构设计、ADR文档
  - Notes: 包含截图和快速开始指南

- [ ] **Task 8.2**: 编写ADR文档
  - File: `packages/visualizer/docs/adr.md`
  - Action: 记录6个ADR的完整文档
  - Notes: 包含背景、决策、理由、后果

- [ ] **Task 8.3**: 编写失效模式文档
  - File: `packages/visualizer/docs/failure-modes.md`
  - Action: 记录所有失效模式和恢复策略
  - Notes: 包含风险矩阵和监控指标

- [ ] **Task 8.4**: 端到端测试
  - File: `packages/visualizer/__tests__/e2e/complete-workflow.test.ts`
  - Action: 测试完整用户流程
  - Notes: 从文件选择到节点点击到文件打开

### Acceptance Criteria

#### 功能验收标准

- [ ] **AC 1**: Given 用户已运行`nd analyze`生成`deps.ai.json`, when 用户通过文件选择器加载文件, then 可视化界面在3秒内显示依赖关系图

- [ ] **AC 2**: Given 依赖关系图已加载, when 用户点击任意节点, then 右侧详情面板显示节点的完整信息(文件路径、依赖列表、被依赖列表、所属页面)

- [ ] **AC 3**: Given 依赖关系图已加载, when 存在循环依赖(SCC组), then 循环节点用红色脉冲动画高亮显示

- [ ] **AC 4**: Given 依赖关系图已加载, when 用户使用scope过滤器(如只选app), then 图中只显示符合scope的节点和边

- [ ] **AC 5**: Given 依赖关系图已加载, when 用户在搜索框输入文件名(如"Button"), then 匹配的节点高亮,其他节点半透明

- [ ] **AC 6**: Given 用户选中一个节点, when 用户双击节点, then 系统使用VS Code协议打开对应文件

- [ ] **AC 7**: Given VS Code未安装或协议被拦截, when 用户双击节点, then 文件路径被复制到剪贴板,并显示手动打开提示

- [ ] **AC 8**: Given 项目包含多个页面路由, when 用户使用页面选择器选择特定页面, then 图中只显示该页面及其依赖节点

- [ ] **AC 9**: Given 节点数超过5000的超大型项目, when 文件加载, then 系统自动启用聚合模式,在5秒内完成渲染

- [ ] **AC 10**: Given 用户使用`nd visualize --open`命令, then 系统启动本地服务器并自动打开浏览器

#### 性能验收标准

- [ ] **AC 11**: Given 小型项目(<100节点), when 加载文件, then 首次渲染时间<1秒

- [ ] **AC 12**: Given 中型项目(100-1000节点), when 加载文件, then 首次渲染时间<3秒

- [ ] **AC 13**: Given 大型项目(1000-5000节点), when 加载文件, then 首次渲染时间<5秒

- [ ] **AC 14**: Given 图已渲染, when 用户缩放、平移、拖拽节点, then 交互响应时间<500ms

- [ ] **AC 15**: Given 性能退化(FPS<30), when 系统检测到, then 自动切换到低质量模式(禁用动画、阴影、边标签)

#### 错误处理验收标准

- [ ] **AC 16**: Given 用户选择无效的JSON文件, when 系统尝试解析, then 显示"文件格式错误"提示,并提供重新生成文件的命令

- [ ] **AC 17**: Given 用户选择不存在的文件, when 系统尝试加载, then 显示"文件未找到"提示,并建议运行`nd analyze`

- [ ] **AC 18**: Given deps.ai.json版本过旧, when 系统检测到, then 显示"版本不兼容"提示,并建议更新visualizer或重新生成文件

- [ ] **AC 19**: Given 布局算法计算超过10秒, when 系统检测超时, then 切换到简单网格布局,并显示"布局超时"提示

- [ ] **AC 20**: Given Web Worker不可用, when 系统检测到, then 降级到主线程解析,并显示加载中提示

#### 浏览器兼容性验收标准

- [ ] **AC 21**: Given 用户使用Chrome/Edge最新版, when 访问visualizer, then 所有功能正常工作

- [ ] **AC 22**: Given 用户使用Firefox/Safari最新版, when 访问visualizer, then 核心功能正常(可能有样式差异)

- [ ] **AC 23**: Given 用户使用IE或不支持的浏览器, when 访问visualizer, then 显示"浏览器不支持"提示,并建议升级浏览器

- [ ] **AC 24**: Given 用户使用移动设备, when 访问visualizer, then 显示"移动设备性能受限"提示,并提供简化模式选项

## Additional Context

### Dependencies

**核心依赖**:
```json
{
  "dependencies": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "reactflow": "^11.11.0",
    "elkjs": "^0.9.3",
    "zustand": "^5.0.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@types/react": "^19.2.13",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "playwright": "^1.40.0"
  }
}
```

**版本说明**:
- React使用catalog版本(^19.2.4)以保持workspace一致性
- 添加Zod用于运行时schema验证
- 添加Playwright用于E2E测试
- 版本锁定策略: 开发期间使用`^`允许minor更新,生产构建前锁定精确版本

**类型定义复用**:
- `@nemo-cli/deps` - AiOutput, AiNode, AiPage等类型
- 或独立复制类型定义(避免包依赖)

### Testing Strategy

**测试框架**: Vitest

**测试覆盖目标**: 80%+

**测试结构**:
```
packages/visualizer/__tests__/
├── unit/
│   ├── parser.test.ts           # JSON解析测试
│   ├── graph-builder.test.ts    # 图构建测试
│   ├── layout.test.ts           # 布局算法测试
│   └── store.test.ts            # 状态管理测试
├── integration/
│   ├── file-loading.test.ts     # 文件加载集成测试
│   └── graph-rendering.test.ts  # 图渲染集成测试
└── failure-modes/
    ├── json-parser.test.ts      # JSON失效模式测试
    ├── react-flow.test.ts       # React Flow失效模式测试
    ├── file-opener.test.ts      # 文件打开失效模式测试
    └── browser-compat.test.ts   # 浏览器兼容性测试
```

**关键测试场景**:

1. **JSON解析测试**:
```typescript
describe('AiOutput Parser', () => {
  it('should parse valid deps.ai.json');
  it('should handle file not found');
  it('should validate invalid JSON');
  it('should check version compatibility');
  it('should reject oversized files (>50MB)');
});
```

2. **失效模式测试** (基于FMA分析):
```typescript
describe('Failure Mode: JSON Parser', () => {
  it('should handle file not found gracefully');
  it('should validate and reject invalid JSON');
  it('should detect version mismatch');
  it('should warn on oversized files');
});

describe('Failure Mode: React Flow', () => {
  it('should prevent OOM with node limit');
  it('should timeout layout calculation');
  it('should degrade on low performance');
  it('should fallback when Worker fails');
});

describe('Failure Mode: File Opener', () => {
  it('should detect missing VS Code');
  it('should validate file paths');
  it('should handle blocked protocols');
  it('should fallback to clipboard copy');
});
```

3. **性能测试**:
```typescript
describe('Performance Targets', () => {
  it('should render small projects (<100 nodes) in <1s');
  it('should render medium projects (100-1000) in <3s');
  it('should render large projects (1000-5000) in <5s');
});
```

**测试环境说明**:
- 硬件: Mac M1 / 16GB RAM (或同等性能Windows/Linux机器)
- 浏览器: Chrome最新版(测试时版本)
- 测量工具: Performance API + Lighthouse
- 网络条件: 本地文件系统(无网络延迟)

### Risk Management & Failure Mode Analysis

基于系统性失效模式分析(FMA),识别关键风险和缓解策略:

#### 关键失效模式矩阵

| 组件 | 失效模式 | 影响 | 概率 | 预防策略 | 恢复策略 |
|------|---------|------|------|---------|---------|
| **JSON解析** | 文件不存在 | 高 | 中 | 文件验证 | 友好错误提示 |
| **JSON解析** | 格式错误 | 高 | 低 | Schema验证 | 回退到示例数据 |
| **JSON解析** | 版本不兼容 | 中 | 低 | 版本检查 | 提示更新 |
| **JSON解析** | 超大文件 | 中 | 低 | 大小限制 | 聚合模式 |
| **React Flow** | 内存溢出 | 高 | 中 | 节点数限制 | 自动聚合 |
| **React Flow** | 布局死循环 | 高 | 低 | 超时保护 | 网格布局回退 |
| **React Flow** | Worker失败 | 中 | 低 | 特性检测 | 主线程降级 |
| **React Flow** | 性能退化 | 中 | 中 | 性能监控 | 低质量模式 |
| **文件打开** | VS Code未安装 | 低 | 高 | 编辑器检测 | 选择器+复制路径 |
| **文件打开** | 路径错误 | 中 | 低 | 路径验证 | 手动查找 |
| **文件打开** | 协议拦截 | 低 | 中 | 拦截检测 | 剪贴板降级 |
| **搜索过滤** | 正则死循环 | 高 | 低 | 安全封装 | 字符串匹配 |
| **搜索过滤** | 结果为空 | 低 | 高 | 实时计数 | 空状态提示 |
| **浏览器** | 特性不支持 | 高 | 低 | 特性检测 | 升级提示 |
| **浏览器** | 移动性能 | 中 | 中 | UA检测 | 简化模式 |

#### 风险等级定义

**🔴 关键风险** (高影响 + 高概率):
- JSON文件不存在
- React Flow内存溢出
- 搜索正则死循环

**🟡 重要风险** (高影响 + 中概率):
- React Flow性能退化
- JSON解析失败

**🟢 可接受风险** (低影响 + 高概率):
- 搜索结果为空
- VS Code未安装

#### 错误处理策略

**1. 预防性检查**:
```typescript
// 文件加载前验证
const validateFile = (file: File) => {
  if (file.size > 50 * 1024 * 1024) {
    throw new Error('File too large (>50MB)');
  }
};
```

**2. 降级策略**:
```typescript
// 自动降级到低质量模式
if (performance.fps < 30) {
  enableLowQualityMode();
}
```

**3. 用户友好的错误消息**:
```typescript
const errorMessages = {
  'File not found': '请先运行 nd analyze 生成依赖数据',
  'Invalid JSON': '依赖文件格式错误,请重新生成',
  'Layout timeout': '布局计算超时,已切换到简化模式',
  'OOM': '项目过大,已启用聚合视图'
};
```

#### 监控指标

**性能监控**:
- 首次渲染时间 (FCP)
- 交互响应时间 (Input Delay)
- 内存使用 (Memory Usage)
- FPS (Frames Per Second)

**错误监控**:
- JSON解析失败率
- 布局超时次数
- 文件打开失败率
- 浏览器兼容性问题

**触发阈值**:
- 如果20%+用户反馈性能问题 → 考虑切换到Cytoscape.js (ADR-001)
- 如果内存溢出率>5% → 降低节点数限制或强制聚合模式
- 如果文件打开失败率>10% → 优化编辑器检测逻辑

### Notes

**Party Mode讨论总结**:
- Winston (Architect): 技术架构决策,强调性能和可扩展性
- Amelia (Developer Agent): 实现路径和代码结构
- Sally (UX Designer): 节点设计和交互流程
- John (Product Manager): MVP功能优先级

**Advanced Elicitation增强**:
- ADR-001到ADR-006: 6个完整的架构决策记录
- FMA分析: 识别6大组件的17种失效模式
- 风险管理矩阵: 关键/重要/可接受三级风险分类
- 错误处理策略: 预防、降级、用户友好提示
- 监控指标: 性能和错误追踪

**关键技术决策**:
- ✅ React Flow替代react-cytoscapejs(三年未更新)
- ✅ ELK布局算法,预留D3-force扩展
- ✅ Vite + React + TypeScript开发栈
- ✅ Zustand轻量状态管理

**MVP功能优先级**:
- P0: 基础图渲染、SCC高亮、节点详情、页面筛选
- P1: 搜索定位、scope过滤、VS Code打开、布局切换
- P2: 导出PNG、主题切换、节点折叠

**性能目标**:
- 小型(<100节点): 即时渲染
- 中型(100-1000): 1-2秒
- 大型(1000-5000): 3-5秒

**风险监控**:
- 20%用户性能问题 → 触发ADR-001替代方案
- 5%内存溢出率 → 强制聚合模式
- 10%文件打开失败 → 优化编辑器检测

---

## 后续优化方向 (Out of Scope)

### 1. AI辅助分析

**功能描述**: 使用AI分析依赖关系,提供智能建议

**可能实现**:
- 识别反模式(循环依赖、深层嵌套、过度耦合)
- 生成重构建议和优先级
- 自动检测技术债务
- 预测变更影响范围

**复杂度**: 高,需要集成AI服务

### 2. 时间旅行

**功能描述**: 记录和对比依赖关系的历史变化

**可能实现**:
- Git集成,自动追踪历史版本
- 可视化依赖关系的演进动画
- 对比两个版本的差异
- 回溯到任意历史快照

**复杂度**: 中,需要Git集成和时间序列数据存储

### 3. 协作功能

**功能描述**: 团队协作评审和分享依赖关系

**可能实现**:
- 导出交互式HTML分享链接
- 在图中添加注释和讨论
- 生成依赖报告PDF
- 团队实时协作评审

**复杂度**: 中,需要后端服务支持

### 4. 高级可视化

**功能描述**: 更丰富的可视化形式

**可能实现**:
- 3D图布局和导航
- 虚拟现实(VR)查看
- 依赖关系动画回放
- 热力图显示热点代码

**复杂度**: 高,需要3D渲染引擎

### 5. 性能分析

**功能描述**: 深度分析依赖关系对性能的影响

**可能实现**:
- 计算依赖深度
- 识别性能瓶颈路径
- 分析包体积影响
- 生成性能优化建议

**复杂度**: 中,需要额外的性能数据收集

---

## 已知限制

1. **浏览器内存限制**
   - 超大型项目(>10000节点)可能无法在浏览器中完整渲染
   - 缓解: 提供聚合模式或桌面应用版本

2. **文件打开协议**
   - 依赖特定编辑器协议(VS Code)
   - 其他编辑器需要手动配置或复制路径
   - 缓解: 支持更多编辑器协议检测

3. **实时同步**
   - 不支持实时重新分析项目依赖
   - 需要手动运行`nd analyze`重新生成文件
   - 缓解: 提供watch模式自动重新生成(未来功能)

4. **离线使用**
   - 需要浏览器支持Web Workers和现代JavaScript特性
   - 旧浏览器(IE11)不支持
   - 缓解: 显示升级浏览器提示

5. **隐私和安全**
   - 依赖数据可能包含敏感的项目结构信息
   - 不适合在公共环境分享
   - 缓解: 提供数据脱敏功能(未来功能)

---

## Development Setup Guide

### Prerequisites

**必需软件**:
- Node.js: `^20.19.0 || >=22.12.0`
- pnpm: `^8.0.0` (包管理器)
- Git (用于workspace协议解析)

**可选工具**:
- VS Code (推荐IDE)
- Chrome/Edge (开发调试)

### 安装步骤

1. **克隆仓库并安装依赖**:
```bash
git clone <repository-url>
cd nemo-cli
pnpm install
```

2. **验证Visualizer包**:
```bash
# 检查包是否已创建
ls packages/visualizer

# 如果需要创建,运行:
mkdir -p packages/visualizer
```

3. **启动开发服务器**:
```bash
# 方式1: 通过CLI命令(推荐)
nd visualize --open

# 方式2: 直接启动
cd packages/visualizer
pnpm run dev
```

4. **生成测试数据**:
```bash
# 在你的Next.js项目中运行
cd /path/to/nextjs-project
nd analyze --format ai
```

5. **加载测试数据**:
```bash
# 在Visualizer界面中拖拽或选择生成的ai-docs/deps.ai.json文件
```

### 环境变量配置

**开发环境** (可选):
```env
# Vite开发服务器配置
VITE_PORT=3000
VITE_OPEN=true

# 性能调试
VITE_DEBUG_PERFORMANCE=false
```

### 故障排除

**问题**: "Cannot resolve @nemo-cli/deps"
**解决**: 确保在workspace根目录运行`pnpm install`

**问题**: "Port 3000 is already in use"
**解决**: 使用`nd visualize --port 3001`指定其他端口

**问题**: "Cannot find deps.ai.json"
**解决**: 先运行`nd analyze`生成依赖数据

---

## Deployment Guide

### 构建生产版本

```bash
cd packages/visualizer
pnpm run build
```

构建产物位于: `packages/visualizer/dist/`

### 部署到静态托管

**推荐平台**:

1. **Vercel** (推荐)
   - 零配置部署
   - 自动HTTPS
   - 全球CDN

2. **Netlify**
   - 拖拽部署
   - 表单处理支持

3. **GitHub Pages**
   - 免费托管
   - 适合开源项目

**部署步骤** (以Vercel为例):
```bash
# 安装Vercel CLI
npm i -g vercel

# 部署
cd packages/visualizer
vercel --prod
```

### CORS配置

如果Visualizer从不同域名访问,需要配置CORS:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    origin: 'https://your-domain.com',
    methods: ['GET', 'POST'],
    credentials: true
  }
});
```

### 版本管理

**语义化版本**:
- Major版本: 破坏性变更(如数据格式不兼容)
- Minor版本: 新功能向后兼容
- Patch版本: Bug修复

**发布检查清单**:
- [ ] 所有测试通过
- [ ] 性能基准达标
- [ ] 文档已更新
- [ ] CHANGELOG已更新

---

## Security Considerations

### 安全风险和缓解

**1. JSON解析安全**
- **风险**: 用户提供的恶意JSON可能包含XSS payload
- **缓解**: 使用Zod进行schema验证,不使用innerHTML直接渲染用户输入
- **实现**: Task 2.2的Zod验证

**2. 文件路径注入**
- **风险**: 文件打开功能可能被滥用打开任意文件
- **缓解**: 验证文件路径必须在`appRoot`范围内
- **实现**: Task 5.6的路径验证逻辑

**3. 依赖供应链安全**
- **风险**: npm包可能被劫持
- **缓解**: 使用pnpm的strict protocol和checksum验证
- **配置**: `.npmrc`设置`strict-peer-dependencies=false`

### 数据隐私

**注意事项**:
- `deps.ai.json`包含项目结构信息,可能敏感
- 不应在公共环境分享可视化结果
- 考虑添加数据脱敏功能(未来)

**最佳实践**:
- 仅在本地开发环境使用
- 不上传`deps.ai.json`到公共仓库
- 生产环境部署需要访问控制

---

## Observability Strategy

### 日志和调试

**开发环境**:
- 使用`console.log()`进行调试
- React DevTools Profiler监控性能
- Zustand DevTools追踪状态变化

**生产环境**:
- 移除所有`console.log()`
- 考虑集成错误追踪服务(Sentry, LogRocket)
- 收集匿名性能指标

### 错误追踪

**集成Sentry** (可选):
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  beforeSend(event, hint) {
    // 过滤敏感信息
    if (event.request?.url) {
      event.request.url = event.request.url.replace(/\/[^/]*\//g, '/[redacted]/');
    }
    return event;
  }
});
```

### 性能监控

**关键指标**:
- 首次内容绘制(FCP)
- 最大内容绘制(LCP)
- 首次输入延迟(FID)
- 累积布局偏移(CLS)

**监控工具**:
- Lighthouse CI
- Chrome DevTools Performance
- 自定义Performance API监控

---

## Internationalization & Accessibility

### 国际化(i18n)

**当前状态**: MVP仅支持中文错误消息

**已知限制**:
- 错误消息全部为中文
- 未规划i18n支持

**未来改进** (P2):
- 提取所有用户可见文本
- 使用i18n框架(react-i18next)
- 支持英文切换

### 可访问性(a11y)

**当前实现**:
- 键盘导航: React Flow基础支持
- 语义化HTML: 使用正确的HTML标签

**已知限制**:
- 未测试屏幕阅读器兼容性
- 颜色对比度未验证
- SCC红色脉冲对色盲用户可能无法识别

**改进建议** (P2):
- 添加ARIA标签
- 支持键盘快捷键列表
- 色盲友好配色方案
- WCAG 2.1 AA级别合规

---

## Metadata Update

**files_to_modify**:
- `packages/deps/src/index.ts` - 添加visualize命令导出
- `packages/visualizer/package.json` - 创建新包
- `packages/visualizer/vite.config.ts` - 配置构建
- `packages/visualizer/tsconfig.json` - 配置TypeScript
- `packages/visualizer/tailwind.config.js` - 配置样式
- `packages/visualizer/postcss.config.js` - 配置PostCSS
- `packages/visualizer/index.html` - HTML入口
- `packages/visualizer/src/main.tsx` - React入口
- `packages/visualizer/src/App.tsx` - 主应用
- `packages/deps/src/cli/visualize.ts` - CLI命令

**code_patterns**:
- **测试模式**: Vitest单元测试、Playwright E2E测试
- **构建模式**: Vite构建、生产优化
- **状态管理**: Zustand中心化状态
- **组件模式**: React函数组件、自定义Hooks
- **错误处理**: ErrorBoundary、try-catch、用户友好消息
- **性能优化**: Web Worker、虚拟化、渐进式加载
- **Monorepo**: pnpm workspace协议、workspace依赖
- **TypeScript**: 严格模式、类型定义复用

**test_patterns**:
- **单元测试**: `__tests__/unit/*.test.ts` - Vitest
- **集成测试**: `__tests__/integration/*.test.ts` - Vitest
- **失效模式测试**: `__tests__/failure-modes/*.test.ts` - Vitest
- **E2E测试**: `__tests__/e2e/*.test.ts` - Playwright
- **性能测试**: `__tests__/performance/*.test.ts` - Lighthouse/Performance API
