---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments: ['docs/prd.md', 'docs/index.md', 'docs/architecture.md']
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2025-12-27'
project_name: 'nemo-cli'
user_name: 'BMad'
date: '2025-12-21'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
本次增强包含 30 个功能需求，覆盖 6 个核心领域：

1. **分支级 Stash 管理 (FR1-FR6)**: 实现分支上下文感知的 stash 自动管理，包括自动 stash/pop、消息格式规范、手动管理接口
2. **Pull 安全模式 (FR7-FR12)**: 自动检测未提交更改并执行 stash → pull → pop 序列，支持 merge/rebase 策略选择
3. **Push 安全模式 (FR13-FR18)**: 推送前自动检查远程状态，必要时执行 pull，支持 force push 选项
4. **Rebase 工作流优化 (FR19-FR22)**: 检测历史重写，引导用户完成 force push 操作
5. **配置与个性化 (FR23-FR26)**: 支持项目级/全局级配置存储
6. **错误处理与恢复 (FR27-FR30)**: 保证数据完整性，提供操作日志和恢复机制

**Non-Functional Requirements:**
- **性能**: 分支切换延迟 < 500ms，Stash 检索 < 100ms，命令启动 < 200ms
- **可靠性**: 原子性操作，零数据丢失，网络超时友好处理
- **兼容性**: Git 2.20+，Node.js ^20.19.0 || >=22.12.0，macOS/Linux/Windows(WSL)
- **可维护性**: 遵循现有 TypeScript 规范，与现有命令风格一致

**Scale & Complexity:**

- Primary domain: CLI Tool / Developer Tools
- Complexity level: Medium
- Estimated architectural components: 6-8 modules

### Technical Constraints & Dependencies

**必须遵循的现有技术栈:**
- TypeScript 5.9.3 + ESM only
- Commander.js (CLI 框架)
- @clack/prompts (交互式提示)
- Ink/React (TUI 组件)
- Rolldown (构建) + Biome (规范)

**核心包依赖:**
- @nemo-cli/shared: 共享工具库
- @nemo-cli/ui: TUI 组件库

### Cross-Cutting Concerns Identified

1. **状态持久化**: Stash 消息格式、配置存储、操作日志
2. **用户交互模式**: 静默自动化 vs 冲突介入 vs 确认操作
3. **错误恢复机制**: 原子性保证、回滚策略、恢复点
4. **向后兼容性**: 现有命令行为不变，新功能作为增强

### First Principles Analysis Insights

**关键架构发现：**

#### 1. 状态追踪的混合方案

**问题**: 仅依赖 Git stash 消息解析是脆弱的（用户可能手动修改消息）

**根本原则**: Git stash 是全局的，没有分支概念，需要外部机制建立映射

**架构建议**:
- **主要机制**: 外部索引文件 (`.git/ng-stash-index.json`) 维护分支→stash 映射
- **后备机制**: 消息解析作为验证和恢复手段
- **优势**: 不依赖单一机制，提高可靠性

#### 2. 操作序列的原子性模型

**问题**: stash → pull → pop 序列需要明确的阶段划分和失败处理

**根本原则**: Git 操作是命令式的，没有事务保证，需要在失败时能够回滚

**架构建议**:
```
操作 = 准备阶段（stash） + 执行阶段（pull/push） + 恢复阶段（pop）

每个阶段都有：
- 成功路径
- 失败处理
- 回滚机制
```

**关键决策**: pop 失败时，必须保留 stash 而不是删除，提示用户手动解决

#### 3. 性能要求的现实性

**问题**: 500ms 性能要求对网络操作不现实

**根本原则**: CLI 工具需要即时反馈，但网络操作（pull/push）可能超过 500ms

**架构建议**:
```
性能 SLA：
- 本地操作（stash, status, branch switch）：< 500ms
- 网络操作（pull, push）：显示进度，不设硬性上限
- 用户反馈：所有操作立即显示"进行中"状态
```

**架构影响**: 需要区分本地与网络操作，设定不同期望

#### 4. 配置存储的三层架构

**问题**: 项目级/全局级配置可能不足以满足所有场景

**根本原则**: 用户可能在不同项目需要不同策略，单次操作也可能需要临时覆盖

**架构建议**:
```
配置层次：
1. 全局默认（~/.ng/config.json）- 用户偏好
2. 项目级覆盖（.git/ng-config.json）- 项目特定规则
3. 命令级选项（CLI flags）- 单次操作临时覆盖

优先级：命令级 > 项目级 > 全局级
```

**架构影响**: 需要三层配置系统，而非两层

**架构风险识别：**

- **高风险**: 仅依赖消息解析可能导致状态丢失 → 需要外部索引作为主要机制
- **中风险**: 网络操作性能可能无法满足 500ms 要求 → 需要区分本地/网络操作期望
- **低风险**: 配置存储层次不足可能限制灵活性 → 需要三层配置架构

---

## Technical Foundation (Starter Evaluation)

### Project Type: Brownfield Extension

nemo-cli 是一个现有项目，不需要选择新的 starter template。
本节记录现有的技术基础和架构约束，并通过第一性原理分析验证其合理性。

### Existing Technology Stack

**Core Technologies:**

- Language: TypeScript 5.9.3 (ESM only)
- Runtime: Node.js ^20.19.0 || >=22.12.0
- Package Manager: pnpm workspaces

**CLI Framework:**

- Command Framework: Commander.js
- Interactive Prompts: @clack/prompts
- Terminal UI: Ink + React

**Build & Development:**

- Build Tool: Rolldown (Rust-based, fast builds)
- Type Declarations: rolldown-plugin-dts
- Linting/Formatting: Biome
- Testing: Vitest

**Monorepo Structure:**

- 7 packages: git, ai, file, package, shared, ui, mail
- Shared core: @nemo-cli/shared (utilities, commands, prompts)
- Shared UI: @nemo-cli/ui (TUI components)

### First Principles Validation

**Core Requirements Analysis:**

1. **Command Execution & User Input**
   - ✅ Commander.js: Mature, widely used, meets basic needs
   - ✅ @clack/prompts: Enhances UX significantly
   - **Validation**: Current choices are optimal for CLI tool requirements

2. **Git Interaction**
   - ✅ Subprocess execution: Only viable approach for external Git tool
   - **Validation**: No alternatives needed - this is the correct approach

3. **User Experience**
   - ✅ Ink + React: Declarative TUI, leverages React ecosystem
   - ⚠️ **Risk**: May be over-engineered for simple CLI operations
   - **Recommendation**: Use lightweight alternatives when possible, reserve Ink for complex UI

4. **Maintainability & Extensibility**
   - ✅ TypeScript: Critical for team projects, type safety
   - ✅ Monorepo: Enables independent package publishing
   - ⚠️ **Risk**: Adds complexity that may not be justified for current scale
   - **Recommendation**: Monitor complexity, consider consolidation if packages don't need independent versioning

5. **Performance**
   - ✅ Rolldown: Fast Rust-based builds
   - ⚠️ **Risk**: May be premature optimization - esbuild/tsup are mature and sufficient
   - **Recommendation**: Benchmark against esbuild, migrate if no significant advantage
   - ✅ ESM only: Modern standard, better tree-shaking
   - ⚠️ **Risk**: May limit dependency compatibility
   - **Recommendation**: Monitor ESM compatibility of dependencies

### Architectural Constraints for New Features

1. **Command Consistency**: New commands must use Commander.js + @clack/prompts
   - **Exception Process**: Architecture exceptions allowed with justification
2. **Shared Core Usage**: Leverage @nemo-cli/shared for common operations
   - **Exception**: When shared creates unnecessary coupling
3. **TUI Components**: Use @nemo-cli/ui for terminal UI components
   - **Exception**: Use lightweight alternatives for simple operations
4. **Layer Architecture**: Follow CLI Layer → Service Layer → Utility Layer pattern
5. **Code Style**: Adhere to Biome configuration and existing conventions

### Technology Decisions Already Made

| Decision | Choice | Rationale | First Principles Validation |
|----------|--------|-----------|------------------------------|
| TypeScript | Required | Type safety, maintainability | ✅ Validated - essential for team projects |
| ESM Only | Required | Modern module system | ✅ Validated - but monitor compatibility |
| Rolldown | Fixed | Performance, Rust-based | ⚠️ Validated - but consider esbuild alternative |
| Biome | Fixed | Unified lint + format | ✅ Validated - good choice |
| Commander.js | Fixed | CLI framework consistency | ✅ Validated - optimal for CLI tools |
| @clack/prompts | Fixed | Interactive prompt consistency | ✅ Validated - enhances UX |
| Ink/React | Fixed | TUI component model | ⚠️ Validated - but may be over-engineered |

**Key Insights from First Principles Analysis:**

1. **Over-Engineering Risk**: Some choices (Ink, Rolldown) may be more complex than necessary
   - **Mitigation**: Prefer lightweight alternatives when possible, monitor actual benefits

2. **Architecture Flexibility**: Strict constraints may limit innovation
   - **Mitigation**: Establish exception process for justified deviations

3. **Compatibility Monitoring**: ESM-only approach requires ongoing dependency compatibility checks
   - **Mitigation**: Maintain ESM compatibility checklist

**Note:** These decisions are already established and should not be changed without significant justification. However, first principles analysis reveals areas for monitoring and potential future optimization.

---

### Architecture Decision Records (ADR)

本节记录关键架构决策，通过多架构师评估确保决策有据可依。

#### ADR-001: TypeScript + ESM Only

**Status:** Accepted
**Context:** 需要类型安全和现代模块系统
**Decision:** 保持 TypeScript 5.9.3 + ESM only
**Consequences:**

- ✅ 类型安全，减少运行时错误
- ✅ 现代模块系统，更好的 tree-shaking
- ⚠️ 可能限制某些依赖的兼容性
- **Mitigation:** 建立 ESM 兼容性检查清单

**Architect Perspectives:**

- **保守派:** 建议考虑 CommonJS 兼容层
- **创新派:** 坚持 ESM only，推动依赖升级
- **实用派:** 保持现状，建立兼容性检查清单
- **团队派:** 保持 TypeScript + ESM，提供迁移指南

**Final Decision:** 保持 TypeScript + ESM only，建立兼容性监控机制

#### ADR-002: Commander.js as CLI Framework

**Status:** Accepted
**Context:** 需要成熟的 CLI 框架，团队已熟悉
**Decision:** 保持 Commander.js
**Consequences:**

- ✅ 成熟稳定，社区支持好
- ✅ 团队学习成本低
- ⚠️ API 相对传统
- **Alternatives Considered:** oclif, yargs（评估后认为迁移成本高，收益不明显）

**Architect Perspectives:**

- **保守派:** 保持 Commander.js，稳定可靠
- **创新派:** 可考虑 oclif（TypeScript 原生支持）
- **实用派:** 保持现状，除非有明确痛点
- **团队派:** 保持 Commander.js，建立使用规范

**Final Decision:** 保持 Commander.js，迁移成本高且收益不明显

#### ADR-003: Ink + React for TUI

**Status:** Accepted with Guidelines
**Context:** 需要声明式 TUI，团队熟悉 React
**Decision:** 保持 Ink + React，但建立使用指南
**Consequences:**

- ✅ 声明式 UI，易于维护
- ✅ 复用 React 技能
- ⚠️ 增加启动时间和依赖体积
- **Guidelines:** 简单操作使用 @clack/prompts，复杂 UI 使用 Ink

**Architect Perspectives:**

- **保守派:** 保持现状，新功能优先轻量方案
- **创新派:** 保持 Ink，充分利用 React 生态
- **实用派:** 按场景选择：简单用 @clack/prompts，复杂用 Ink
- **团队派:** 保持 Ink，建立组件库规范

**Final Decision:** 保持 Ink + React，但建立场景化使用指南

#### ADR-004: Rolldown as Build Tool

**Status:** Accepted with Monitoring
**Context:** 需要快速构建，已集成 Rolldown
**Decision:** 暂时保持 Rolldown，建立性能基准测试
**Consequences:**

- ✅ Rust 构建，性能潜力高
- ⚠️ 生态不如 esbuild 成熟
- **Monitoring:** 定期基准测试，如无显著优势考虑迁移到 esbuild

**Architect Perspectives:**

- **保守派:** 评估迁移到 esbuild（更成熟）
- **创新派:** 保持 Rolldown，持续关注性能
- **实用派:** 基准测试，如无显著优势则迁移到 esbuild
- **团队派:** 保持现状，但建立性能监控

**Final Decision:** 暂时保持 Rolldown，建立性能基准测试机制

#### ADR-005: Monorepo Architecture

**Status:** Accepted
**Context:** 需要独立发布多个包，共享代码
**Decision:** 保持 Monorepo 架构
**Consequences:**

- ✅ 独立发布灵活性
- ✅ 代码共享效率高
- ⚠️ 增加管理复杂度
- **Optimization:** 评估包合并可能性，保留必要的独立包

**Architect Perspectives:**

- **保守派:** 保持现状，但监控复杂度
- **创新派:** 保持并优化 Monorepo 结构
- **实用派:** 评估包合并可能性
- **团队派:** 保持 Monorepo，优化包结构

**Final Decision:** 保持 Monorepo 架构，优化包结构

### Architecture Exception Process

当有充分理由偏离标准架构时，遵循以下流程：

1. **Justification:** 明确说明为什么需要例外
2. **Impact Analysis:** 分析对现有系统的影响
3. **Review:** 架构评审（至少 2 位架构师同意）
4. **Documentation:** 记录例外决策和理由
5. **Monitoring:** 跟踪例外决策的长期影响

### Key Recommendations from Multi-Architect Review

1. **建立性能基准测试**（Rolldown vs esbuild）
2. **建立 ESM 兼容性检查清单**
3. **建立 TUI 使用指南**（简单场景用 @clack/prompts，复杂场景用 Ink）
4. **建立架构例外流程**（允许有充分理由的偏离）
5. **定期评估包结构**（考虑合并不必要的独立包）

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

1. ✅ **Git 操作架构** - 子进程执行（已确定）
2. ✅ **状态持久化架构** - JSON 文件（已确定）
3. ✅ **错误处理和恢复机制** - 操作状态机（已确定）

**Important Decisions (Shape Architecture):**

1. ✅ **交互模式架构** - 上下文检测 + 智能推断（已确定）
2. ✅ **日志和可观测性** - 结构化日志 + 操作历史（已确定）

**Deferred Decisions (Post-MVP):**

- 性能优化策略（缓存、并发等）
- 高级智能推断（机器学习用户习惯）
- 跨模块协同机制（Git + Package + File）

### Git Operation Architecture

**Decision:** 保持子进程执行作为主要方式

**Rationale:**

- 当前实现已使用 `tinyexec` 和 `zx`
- 简单直接，无需额外依赖
- 与 Git CLI 完全兼容
- 迁移成本低

**Implementation:**

- 主要使用 `tinyexec`（`x` 和 `xASync` 函数）
- 复杂场景使用 `zx`（模板字符串命令）
- 流式输出场景使用 `spawn`（如 `_handleGitPull`）

**Affects:**

- 所有 Git 操作命令
- 错误处理机制
- 性能优化策略

### State Persistence Architecture

**Decision:** 使用 JSON 文件作为状态持久化方案

**Rationale:**

- 简单直接，无需额外依赖
- 易读易调试
- 项目级数据存储在 `.git/` 目录下，与 Git 集成
- 单用户场景，并发写入风险低

**Implementation:**

- **Stash 索引**: `.git/ng-stash-index.json`
  - 格式: `{ branchName: { stashId: string, timestamp: number } }`
- **项目配置**: `.git/ng-config.json`
  - 格式: `{ pullStrategy: 'merge' | 'rebase', autoStash: boolean, ... }`
- **操作日志**: `.git/ng-logs/YYYY-MM-DD.json`
  - 格式: `{ timestamp: number, operation: string, status: string, details: object }`
- **全局配置**: 继续使用 `configstore`（已存在依赖）

**Affects:**

- Stash 管理功能
- 配置管理功能
- 操作日志功能

### Error Handling & Recovery Mechanism

**Decision:** 使用操作状态机模式

**Rationale:**

- 清晰的状态转换，便于追踪操作进度
- 失败时能精确定位到失败阶段
- 支持自动回滚到上一个稳定状态
- 便于日志记录和问题排查

**State Machine Design:**

```
idle → preparing → executing → recovering → completed
                              ↓
                           failed
```

**State Definitions:**

- `idle`: 初始状态，操作未开始
- `preparing`: 准备阶段（如 stash 操作）
- `executing`: 执行阶段（如 pull/push 操作）
- `recovering`: 恢复阶段（如 pop stash）
- `completed`: 操作成功完成
- `failed`: 操作失败

**Recovery Strategy:**

- 每个状态转换记录到操作日志
- 失败时根据当前状态自动回滚
- 关键操作（stash/pop）前创建恢复点
- 提供清晰的错误信息和恢复建议

**Affects:**

- 所有自动操作序列（stash → pull → pop）
- 错误处理逻辑
- 操作日志记录

### Interaction Pattern Architecture

**Decision:** 上下文检测 + 智能推断

**Rationale:**

- 自动检测 Git 状态，减少用户输入
- 根据上下文推断用户意图
- 减少交互步骤，提升用户体验

**Implementation:**

- **上下文检测**: 自动检测未提交更改、分支状态、远程状态等
- **智能推断**: 根据上下文推断用户意图（如自动 stash）
- **交互优化**: 减少不必要的确认步骤

**Affects:**

- 所有交互式命令
- 用户体验设计
- 命令参数解析

### Logging & Observability

**Decision:** 结构化日志 + 操作历史

**Rationale:**

- 结构化日志便于查询和分析
- 操作历史支持问题排查
- 按日期分片存储，便于管理

**Implementation:**

- **日志格式**: JSON 结构化日志
- **存储位置**: `.git/ng-logs/YYYY-MM-DD.json`
- **日志内容**: 操作类型、状态、时间戳、详细信息
- **查询接口**: 支持按日期、操作类型查询

**Affects:**

- 所有操作命令
- 错误追踪
- 问题排查

### Decision Impact Analysis

**Implementation Sequence:**

1. Git 操作架构（基础）
2. 状态持久化架构（支持 stash 索引）
3. 错误处理和恢复机制（保证可靠性）
4. 交互模式架构（提升用户体验）
5. 日志和可观测性（支持问题排查）

**Cross-Component Dependencies:**

- Git 操作架构 → 错误处理机制（需要统一的错误处理）
- 状态持久化 → 操作状态机（需要状态存储）
- 操作状态机 → 日志系统（需要记录状态转换）
- 交互模式 → 上下文检测（需要 Git 状态检测）

---

### Multi-Perspective Review & Enhancements

通过 Party Mode 多专家评估，以下增强建议已整合到架构决策中：

#### Enhancement 1: Unified Git Operation Abstraction Layer

**Proposed by:** Winston (Architect) + Amelia (Developer)

**Enhancement:**
在 `@nemo-cli/shared` 中建立统一的 Git 操作抽象层，封装子进程执行、错误处理和状态管理。

**Rationale:**

- 统一错误处理格式，便于状态机处理
- 减少代码重复，提高可维护性
- 便于性能优化和缓存策略

**Implementation:**

- 创建 `GitOperation` 类，封装所有 Git 命令执行
- 统一错误类型定义（`GitError`, `GitConflictError`, `GitNetworkError`）
- 支持操作状态追踪和日志记录

**Affects:**

- `packages/shared/src/utils/git-handle.ts`（需要重构）
- 所有 Git 操作命令（需要迁移到新抽象层）

#### Enhancement 2: Configuration Priority Implementation Details

**Proposed by:** Mary (Analyst)

**Enhancement:**
明确配置优先级的具体实现细节和配置合并逻辑。

**Rationale:**

- 确保配置优先级（项目级 > 全局级 > 默认值）正确实现
- 支持配置验证和类型安全

**Implementation:**

```typescript
// 配置合并逻辑
function mergeConfig(
  global: GlobalConfig,
  project: ProjectConfig,
  defaults: DefaultConfig
): MergedConfig {
  return { ...defaults, ...global, ...project }
}
```

**Configuration Schema:**

- 全局配置：`~/.nemo-cli/config.json`（使用 configstore）
- 项目配置：`.git/ng-config.json`（JSON 文件）
- 默认配置：代码中定义的类型安全默认值

**Affects:**

- 配置管理模块
- 所有使用配置的命令

#### Enhancement 3: Performance Testing Baseline

**Proposed by:** Mary (Analyst) + Amelia (Developer)

**Enhancement:**
建立性能测试基准，确保满足 NFR1（分支切换 < 500ms）等性能要求。

**Rationale:**

- 验证上下文检测性能是否满足要求
- 识别性能瓶颈，优化关键路径

**Test Scenarios:**

- 分支切换性能测试（包含 stash 操作）
- 上下文检测性能测试（git status, git branch 等）
- 日志写入性能测试（确保不影响主操作）

**Performance Targets:**

- 分支切换：< 500ms（包含 stash 操作）
- 上下文检测：< 100ms（缓存结果）
- 日志写入：< 50ms（异步写入）

**Affects:**

- 性能测试套件
- 性能监控机制

#### Enhancement 4: Atomicity Guarantee Mechanism

**Proposed by:** Winston (Architect) + Mary (Analyst)

**Enhancement:**
明确原子性保证机制的具体实现，确保满足 NFR9（原子性执行）。

**Rationale:**

- Git 操作没有事务保证，需要明确的原子性机制
- 确保操作失败时能正确回滚

**Implementation Strategy:**

- **恢复点机制**: 关键操作前创建恢复点（记录当前 Git 状态）
- **状态检查点**: 每个状态转换前验证前置条件
- **回滚策略**: 根据失败阶段执行相应的回滚操作

**Recovery Scenarios:**

- `preparing` 阶段失败：无需回滚（stash 未执行）
- `executing` 阶段失败：回滚到 preparing 状态（pop stash）
- `recovering` 阶段失败：保留 stash，提示用户手动解决

**Affects:**

- 操作状态机实现
- 错误处理逻辑
- 恢复机制

#### Enhancement 5: User Privacy & Log Cleanup

**Proposed by:** John (Product Manager)

**Enhancement:**
考虑用户隐私，提供日志清理命令，允许用户删除敏感信息。

**Rationale:**

- 操作日志可能包含敏感信息（分支名、文件路径等）
- 用户需要控制自己的数据

**Implementation:**

- 提供 `ng logs clean` 命令，支持按日期、操作类型清理
- 支持自动清理策略（如保留最近 30 天）
- 日志文件加密选项（可选功能）

**Affects:**

- 日志管理命令
- 用户隐私保护

#### Enhancement 6: Context Detection Caching

**Proposed by:** Amelia (Developer)

**Enhancement:**
缓存上下文检测结果，避免重复执行 Git 命令。

**Rationale:**

- 一次 `git status` 可以同时检测未提交更改和分支状态
- 减少 Git 命令执行次数，提升性能

**Implementation:**

- 创建 `GitContextCache` 类，缓存 Git 状态
- 缓存失效策略：操作完成后自动失效
- 支持手动刷新缓存

**Affects:**

- 上下文检测模块
- 性能优化

### Enhanced Implementation Recommendations

**Priority Order:**

1. **统一 Git 操作抽象层**（基础，影响所有 Git 操作）
2. **配置优先级实现**（支持配置管理功能）
3. **原子性保证机制**（保证可靠性）
4. **上下文检测缓存**（性能优化）
5. **性能测试基准**（验证和监控）
6. **日志清理功能**（用户隐私，Post-MVP）

**Integration Notes:**

- 所有增强建议都基于现有架构决策
- 不影响已确定的决策方向
- 提供具体的实现指导
- 支持 MVP 成功标准（90% 场景覆盖、95% 成功率、零数据丢失）

---

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**

8 个主要冲突点，AI 代理可能在这些方面做出不同选择：

1. 命令函数命名约定
2. 工具函数命名约定
3. 错误处理模式
4. 日志输出模式
5. 类型定义位置
6. 常量定义方式
7. 文件组织结构
8. 异步操作模式

### Naming Patterns

#### Command Function Naming

**Pattern:** `{command}Command`

**Rationale:**

- 与现有代码库保持一致
- 明确标识为命令注册函数
- 便于搜索和维护

**Examples:**

```typescript
// ✅ Correct
export function pullCommand(command: Command) { ... }
export function checkoutCommand(command: Command) { ... }
export function stashCommand(command: Command) { ... }

// ❌ Incorrect
export function pullHandler(command: Command) { ... }
export function registerPull(command: Command) { ... }
```

**Enforcement:**

- 所有命令注册函数必须使用 `{command}Command` 命名
- 命令名称使用 kebab-case（如 `pull`, `checkout`）

#### Utility Function Naming

**Pattern:** `handle{Action}` 或 `get{Resource}`

**Rationale:**

- `handle` 前缀用于操作类函数（有副作用）
- `get` 前缀用于查询类函数（无副作用）
- 语义清晰，便于理解函数意图

**Examples:**

```typescript
// ✅ Correct - 操作类函数
export const handleGitStash = async (branch: string) => { ... }
export const handleGitPull = async (branch: string, options: PullOptions) => { ... }
export const handleGitPop = async (stashName: string) => { ... }

// ✅ Correct - 查询类函数
export const getRemoteBranches = async (): Promise<{ branches: string[] }> => { ... }
export const getLocalBranches = async (): Promise<{ branches: string[]; currentBranch: string | undefined }> => { ... }
export const getCurrentBranch = async (): Promise<string | undefined> => { ... }

// ❌ Incorrect
export const gitStash = async (branch: string) => { ... }  // 缺少 handle 前缀
export const fetchBranches = async () => { ... }  // 应该用 get 前缀
```

**Enforcement:**

- 所有操作类函数使用 `handle` 前缀
- 所有查询类函数使用 `get` 前缀
- 函数名使用 camelCase

#### File Naming

**Pattern:** kebab-case

**Rationale:**

- 与现有代码库保持一致
- 跨平台兼容性好
- 符合 Node.js/TypeScript 社区惯例

**Examples:**

```
// ✅ Correct
packages/git/src/commands/pull.ts
packages/git/src/commands/checkout.ts
packages/git/src/utils/git-handle.ts

// ❌ Incorrect
packages/git/src/commands/Pull.ts
packages/git/src/commands/checkoutCommand.ts
```

**Enforcement:**

- 所有文件使用 kebab-case
- 命令文件直接使用命令名（如 `pull.ts`，不是 `pull-command.ts`）

#### Export Patterns

**Pattern:** Named exports only, no default exports

**Rationale:**

- 与现有代码库保持一致
- 更好的 tree-shaking
- 更明确的导入路径

**Examples:**

```typescript
// ✅ Correct
export function pullCommand(command: Command) { ... }
export const handleGitStash = async (branch: string) => { ... }
export type PullOptions = { rebase?: boolean }

// ❌ Incorrect
export default function pullCommand(command: Command) { ... }
export default { pullCommand, handleGitStash }
```

**Enforcement:**

- 禁止使用 `export default`
- 所有导出必须使用命名导出

### Error Handling Patterns

#### Command Execution Error Handling

**Pattern:** `xASync` 返回元组模式 `[Error, null] | [null, Output]`

**Rationale:**

- 统一错误处理格式，便于状态机处理
- 明确的错误类型，避免异常传播
- 与现有代码库保持一致

**Examples:**

```typescript
// ✅ Correct
const [error, result] = await xASync('git', ['pull', 'origin', branch])
if (error) {
  log.show(`Failed to pull: ${error.message}`, { type: 'error' })
  return
}
// 使用 result.stdout, result.stderr

// ❌ Incorrect
try {
  const result = await xASync('git', ['pull', 'origin', branch])
  // 处理结果
} catch (error) {
  // 错误处理
}
```

**Enforcement:**

- 所有 Git 命令执行必须使用 `xASync` 元组模式
- 禁止使用 try-catch 处理 `xASync` 返回的错误
- 错误处理必须检查元组第一个元素

#### Error Message Format

**Pattern:** 使用 `log.show()` 显示错误，格式统一

**Examples:**

```typescript
// ✅ Correct
if (error) {
  log.show(`Failed to pull from remote. Command exited with code ${error.message}.`, { type: 'error' })
  log.show(result.stderr, { type: 'error' })
  return
}

// ❌ Incorrect
if (error) {
  console.error('Error:', error)
  throw error
}
```

**Enforcement:**

- 所有错误信息使用 `log.show()` 显示
- 错误信息必须包含操作上下文和失败原因
- 禁止使用 `console.error` 或直接 `throw`

### Logging Patterns

#### Log Output Pattern

**Pattern:** 统一使用 `log.show()`，禁止 `console.log()`

**Rationale:**

- 统一的日志格式和输出控制
- 支持日志级别和类型
- 便于日志收集和分析

**Examples:**

```typescript
// ✅ Correct
log.show('Successfully pulled from remote.', { type: 'success' })
log.show('Pulling from remote (rebase mode)...', { type: 'step' })
log.show('Merge commit detected.', { type: 'info' })
log.error(error)  // 用于记录异常对象

// ❌ Incorrect
console.log('Successfully pulled from remote.')
console.error('Error occurred')
process.stdout.write('Pulling...')
```

**Log Types:**

- `'success'`: 成功操作
- `'error'`: 错误信息
- `'info'`: 信息提示
- `'step'`: 操作步骤
- `'warn'`: 警告信息

**Enforcement:**

- 生产代码禁止使用 `console.log()`, `console.error()` 等
- 所有用户可见输出使用 `log.show()`
- 调试代码可以使用 `console.log()`，但必须在提交前移除

### Type Definition Patterns

#### Type Definition Location

**Pattern:** 按复杂度决定位置

**Rationale:**

- 简单类型内联，减少文件跳转
- 复杂类型单独文件，提高可维护性
- 与现有代码库保持一致

**Examples:**

```typescript
// ✅ Correct - 简单类型内联
export function pullCommand(command: Command) {
  command.action(async (options: { rebase?: boolean; merge?: boolean }) => {
    // ...
  })
}

// ✅ Correct - 复杂类型单独定义
export type PullOptions = {
  rebase?: boolean
  merge?: boolean
  branch?: string
  remote?: string
}

export type BranchInfo = {
  isMerged: boolean
  branch: string
  lastCommit?: string
}

// ❌ Incorrect - 简单类型单独文件
// types/pull-options.ts
export type PullOptions = { rebase?: boolean }
```

**Guidelines:**

- **内联类型**: 2-3 个属性的简单对象类型、函数参数类型
- **单独文件**: 4+ 个属性的复杂类型、跨文件共享的类型、带泛型的类型

**Enforcement:**

- 类型定义位置由代码审查决定
- 跨文件共享的类型必须单独定义
- 类型文件命名：`types.ts` 或 `{feature}-types.ts`

### Constant Definition Patterns

#### Constant Definition Style

**Pattern:** 常量对象或枚举，根据使用场景选择

**Rationale:**

- 常量对象：适合键值对映射、帮助信息
- 枚举：适合有限选项、状态值

**Examples:**

```typescript
// ✅ Correct - 常量对象（帮助信息）
export const HELP_MESSAGE = {
  main: createHelpExample('ng stash', 'ng stash save "work in progress"'),
  save: createHelpExample('ng stash save "work in progress"'),
  list: createHelpExample('ng stash ls'),
}

// ✅ Correct - 枚举（命令选项）
enum StashCommand {
  POP = 'pop',
  LIST = 'list',
  SAVE = 'save',
  DROP = 'drop',
}

// ✅ Correct - 常量对象（错误信息）
export const ERROR_MESSAGE = {
  notRootWorkspace: "It's not workspace root directory...",
}

// ❌ Incorrect - 字符串字面量联合类型（应该用枚举）
type StashCommand = 'pop' | 'list' | 'save' | 'drop'
```

**Guidelines:**

- **常量对象**: 帮助信息、错误信息、配置映射
- **枚举**: 有限选项、状态值、命令类型
- **字符串字面量联合类型**: 仅用于类型约束，不用于运行时值

**Enforcement:**

- 运行时使用的有限选项使用枚举
- 信息类常量使用常量对象
- 类型定义使用字符串字面量联合类型

### File Structure Patterns

#### Command File Organization

**Pattern:** `packages/{module}/src/commands/{command}.ts`

**Rationale:**

- 每个命令一个文件，职责清晰
- 便于查找和维护
- 与现有代码库保持一致

**Structure:**

```
packages/git/src/
  ├── commands/
  │   ├── pull.ts          # pullCommand
  │   ├── checkout.ts      # checkoutCommand
  │   ├── stash.ts         # stashCommand
  │   └── ...
  ├── constants/
  │   ├── index.ts
  │   └── stash.ts
  ├── utils.ts             # 共享工具函数
  └── index.ts             # 入口文件
```

**Enforcement:**

- 每个命令一个文件
- 命令文件直接使用命令名（kebab-case）
- 共享工具函数放在 `utils.ts` 或 `utils/{utility}.ts`

#### Utility File Organization

**Pattern:** 按模块和复杂度组织

**Examples:**

```
packages/shared/src/utils/
  ├── command.ts           # 命令执行工具
  ├── error.ts             # 错误处理工具
  ├── log.ts               # 日志工具
  ├── types.ts             # 类型工具
  └── git-handle/          # Git 相关工具（复杂）
      └── index.ts
```

**Enforcement:**

- 简单工具函数放在单个文件（如 `command.ts`）
- 复杂工具模块使用目录（如 `git-handle/`）
- 工具文件命名使用 kebab-case

### Async Operation Patterns

#### Async Function Naming

**Pattern:** 保持现有命名，不添加 `Async` 后缀

**Rationale:**

- TypeScript 中异步函数是标准模式
- 添加 `Async` 后缀冗余
- 与现有代码库保持一致

**Examples:**

```typescript
// ✅ Correct
export const handleGitStash = async (branch: string) => { ... }
export const getRemoteBranches = async (): Promise<{ branches: string[] }> => { ... }

// ❌ Incorrect
export const handleGitStashAsync = async (branch: string) => { ... }
export const getRemoteBranchesAsync = async (): Promise<{ branches: string[] }> => { ... }
```

**Enforcement:**

- 异步函数不添加 `Async` 后缀
- 返回类型明确使用 `Promise<T>`

#### Async Error Handling

**Pattern:** 统一使用 `xASync` 元组模式

**Examples:**

```typescript
// ✅ Correct
const [error, result] = await xASync('git', ['status', '--porcelain'])
if (error) {
  log.show('Failed to check git status.', { type: 'error' })
  return
}
const hasChanges = result.stdout.trim().length > 0

// ❌ Incorrect
try {
  const result = await x('git', ['status', '--porcelain'])
  const hasChanges = result.stdout.trim().length > 0
} catch (error) {
  log.show('Failed to check git status.', { type: 'error' })
}
```

**Enforcement:**

- 所有 Git 命令执行使用 `xASync`
- 错误处理使用元组解构模式
- 禁止在 `xASync` 外使用 try-catch

### Enforcement Guidelines

#### All AI Agents MUST

1. **遵循命名约定**
   - 命令函数：`{command}Command`
   - 工具函数：`handle{Action}` 或 `get{Resource}`
   - 文件命名：kebab-case

2. **统一错误处理**
   - 所有 Git 命令使用 `xASync` 元组模式
   - 错误信息使用 `log.show()` 显示
   - 禁止使用 `console.error` 或直接 `throw`

3. **统一日志输出**
   - 所有用户可见输出使用 `log.show()`
   - 禁止使用 `console.log()` 等原生方法
   - 日志类型明确（success/error/info/step/warn）

4. **遵循导出规范**
   - 仅使用命名导出，禁止默认导出
   - 导出必须明确类型

5. **遵循文件结构**
   - 每个命令一个文件
   - 工具函数按模块组织
   - 类型定义按复杂度决定位置

#### Pattern Verification

**Code Review Checklist:**

- [ ] 命令函数命名符合 `{command}Command` 模式
- [ ] 工具函数使用 `handle` 或 `get` 前缀
- [ ] 文件命名使用 kebab-case
- [ ] 仅使用命名导出
- [ ] Git 命令使用 `xASync` 元组模式
- [ ] 错误处理使用 `log.show()`
- [ ] 日志输出使用 `log.show()`，不使用 `console.log()`
- [ ] 类型定义位置合理（简单内联，复杂单独文件）
- [ ] 常量定义方式正确（对象 vs 枚举）

**Linting Rules:**

- Biome 配置已包含基本规则
- 代码审查时检查模式符合性
- 违反模式的代码必须修复后才能合并

#### Pattern Update Process

1. **识别模式冲突**: 发现新冲突点时，记录到架构决策文档
2. **讨论决策**: 通过架构评审确定新模式
3. **更新文档**: 更新实现模式章节
4. **通知团队**: 通知所有 AI 代理更新模式
5. **代码迁移**: 逐步迁移现有代码到新模式（如需要）

### Pattern Examples

#### Good Examples

**命令注册函数:**

```typescript
// packages/git/src/commands/pull.ts
import { type Command, createSelect, log } from '@nemo-cli/shared'
import { getRemoteOptions, handleGitPop, handleGitPull, handleGitStash } from '../utils'

export function pullCommand(command: Command) {
  command
    .command('pull')
    .alias('pl')
    .description('Pull git branch')
    .option('-r, --rebase', 'Use rebase mode instead of merge')
    .action(async (options: { rebase?: boolean; merge?: boolean }) => {
      const { options: branchOptions, currentBranch } = await getRemoteOptions()
      const selectedBranch = await createSelect({
        message: 'Select the branch to pull',
        options: branchOptions,
        initialValue: currentBranch,
      })

      const stashName = await handleGitStash()
      await handleGitPull(selectedBranch, { rebase: options.rebase ?? false })
      stashName && handleGitPop(stashName)
    })
}
```

**工具函数:**

```typescript
// packages/git/src/utils.ts
export const handleGitPull = async (branch: string, options: PullOptions) => {
  const { rebase = false } = options
  log.show(`Pulling from remote (${rebase ? 'rebase' : 'merge'} mode)...`, { type: 'step' })

  const args = rebase ? ['pull', '--rebase', 'origin', branch] : ['pull', 'origin', branch]
  const [error, result] = await xASync('git', args, {
    nodeOptions: { stdio: 'inherit' },
  })

  if (error) {
    log.show(`Failed to pull from remote. Command exited with code ${error.message}.`, { type: 'error' })
    return
  }

  log.show(`Successfully pulled from remote: ${colors.bgGreen(branch)}`, { type: 'success' })
}

export const getRemoteBranches = async (): Promise<{ branches: string[] }> => {
  const originBranches = await x('git', ['branch', '-r', '--sort=-committerdate'])
  const branches = originBranches.stdout
    .split('\n')
    .filter((line) => line.trim() && !line.includes('->'))
    .map((line) => line.trim().replace(/^origin\//, ''))
  return { branches }
}
```

#### Anti-Patterns

**❌ 错误的命令函数命名:**

```typescript
// ❌ 不应该使用这些命名
export function pullHandler(command: Command) { ... }
export function registerPull(command: Command) { ... }
export default function pull(command: Command) { ... }
```

**❌ 错误的错误处理:**

```typescript
// ❌ 不应该使用 try-catch 处理 xASync
try {
  const result = await xASync('git', ['pull', 'origin', branch])
  // 处理结果
} catch (error) {
  console.error('Error:', error)
  throw error
}

// ❌ 不应该使用 console.error
if (error) {
  console.error('Failed to pull:', error)
  process.exit(1)
}
```

**❌ 错误的日志输出:**

```typescript
// ❌ 不应该使用 console.log
console.log('Successfully pulled from remote.')
process.stdout.write('Pulling...\n')

// ❌ 不应该混用日志方法
log.show('Pulling...', { type: 'step' })
console.log('Debug info:', debugData)
```

**❌ 错误的导出方式:**

```typescript
// ❌ 不应该使用默认导出
export default function pullCommand(command: Command) { ... }
export default { pullCommand, handleGitStash }

// ❌ 不应该混用导出方式
export function pullCommand(command: Command) { ... }
export default pullCommand
```

---

**Pattern Summary:**

这些实现模式确保了多个 AI 代理能够编写兼容、一致的代码，避免命名冲突、结构混乱和格式不一致。所有代理必须严格遵循这些模式，以确保代码库的一致性和可维护性。

---

## Project Structure & Boundaries

### Requirements Mapping Analysis

**FR Category to Module Mapping:**

1. **分支级 Stash 管理 (FR1-FR6)** → `packages/git/src/services/stash-manager/`
   - Stash 索引管理
   - 分支上下文追踪
   - 自动 stash/pop 逻辑

2. **Pull/Push 安全模式 (FR7-FR18)** → `packages/git/src/services/safe-operations/`
   - 安全 pull 服务
   - 安全 push 服务
   - 冲突检测与处理

3. **Rebase 工作流优化 (FR19-FR22)** → `packages/git/src/services/rebase-handler/`
   - Rebase 检测
   - Force push 引导

4. **配置与个性化 (FR23-FR26)** → `packages/git/src/services/config-manager/`
   - 配置加载与合并
   - 配置验证

5. **错误处理与恢复 (FR27-FR30)** → `packages/git/src/services/operation-state-machine/`
   - 操作状态机
   - 恢复点管理
   - 回滚机制

6. **日志与可观测性** → `packages/git/src/services/logger/`
   - 结构化日志
   - 操作历史

### Complete Project Directory Structure

```
nemo-cli/
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.json
├── tsconfig.build.json
├── biome.json
├── commitlint.config.mjs
├── vitest.config.ts
├── rolldown.config.ts
├── knip.json
├── sea-config.json
├── .gitignore
├── .env.example
│
├── packages/
│   ├── git/                                    # @nemo-cli/git (ng命令)
│   │   ├── package.json
│   │   ├── tsconfig.build.json
│   │   ├── rolldown.config.ts
│   │   ├── biome.json
│   │   ├── README.md
│   │   ├── bin/
│   │   │   └── index.mjs                      # CLI入口点
│   │   ├── src/
│   │   │   ├── index.ts                       # 命令注册入口
│   │   │   ├── commands/                      # 命令实现
│   │   │   │   ├── branch.ts                  # 分支管理命令
│   │   │   │   ├── checkout.ts                # 分支切换命令（增强：自动stash/pop）
│   │   │   │   ├── commit.ts                  # 提交命令
│   │   │   │   ├── commit-options.ts          # Commitlint配置
│   │   │   │   ├── diff.ts                    # 差异查看命令
│   │   │   │   ├── list.ts                    # 分支列表命令
│   │   │   │   ├── merge.ts                   # 合并命令
│   │   │   │   ├── pull.ts                    # 拉取命令（增强：安全模式）
│   │   │   │   ├── push.ts                    # 推送命令（增强：安全模式）
│   │   │   │   ├── stash.ts                   # 暂存命令（增强：分支级管理）
│   │   │   │   ├── config.ts                  # 配置管理命令（新增：FR43-FR46）
│   │   │   │   ├── logs.ts                    # 日志查看命令（新增：FR29）
│   │   │   │   └── rebase.ts                  # Rebase命令（新增：FR19-FR22）
│   │   │   ├── services/                      # 服务层（新增）
│   │   │   │   ├── stash-manager/             # Stash管理服务
│   │   │   │   │   ├── index.ts               # Stash索引管理
│   │   │   │   │   ├── branch-stash.ts        # 分支级stash逻辑
│   │   │   │   │   ├── stash-index.ts         # 索引文件操作
│   │   │   │   │   └── types.ts               # Stash相关类型
│   │   │   │   ├── safe-operations/           # 安全操作服务
│   │   │   │   │   ├── index.ts               # 安全操作入口
│   │   │   │   │   ├── safe-pull.ts           # 安全pull实现
│   │   │   │   │   ├── safe-push.ts           # 安全push实现
│   │   │   │   │   ├── conflict-handler.ts     # 冲突处理
│   │   │   │   │   └── types.ts               # 操作选项类型
│   │   │   │   ├── rebase-handler/            # Rebase处理服务
│   │   │   │   │   ├── index.ts               # Rebase检测与处理
│   │   │   │   │   ├── history-check.ts       # 历史重写检测
│   │   │   │   │   └── force-push-guide.ts   # Force push引导
│   │   │   │   ├── config-manager/            # 配置管理服务
│   │   │   │   │   ├── index.ts               # 配置加载与合并
│   │   │   │   │   ├── project-config.ts      # 项目级配置
│   │   │   │   │   ├── global-config.ts       # 全局配置
│   │   │   │   │   ├── config-validator.ts     # 配置验证
│   │   │   │   │   └── types.ts                # 配置类型定义
│   │   │   │   ├── operation-state-machine/   # 操作状态机
│   │   │   │   │   ├── index.ts               # 状态机核心
│   │   │   │   │   ├── states.ts              # 状态定义
│   │   │   │   │   ├── transitions.ts         # 状态转换
│   │   │   │   │   ├── recovery.ts            # 恢复机制
│   │   │   │   │   └── types.ts                # 状态机类型
│   │   │   │   └── logger/                    # 日志服务
│   │   │   │       ├── index.ts               # 日志核心
│   │   │   │       ├── file-logger.ts         # 文件日志写入
│   │   │   │       ├── log-formatter.ts       # 日志格式化
│   │   │   │       └── types.ts                # 日志类型
│   │   │   ├── utils/                         # 工具函数（重构）
│   │   │   │   ├── git-operations.ts          # Git操作封装（统一抽象层）
│   │   │   │   ├── context-detection.ts        # 上下文检测（增强：缓存）
│   │   │   │   ├── stash-utils.ts             # Stash工具函数
│   │   │   │   ├── branch-utils.ts            # 分支工具函数
│   │   │   │   └── error-handler.ts           # 错误处理工具
│   │   │   ├── constants/                     # 常量定义
│   │   │   │   ├── index.ts                   # 帮助信息常量
│   │   │   │   └── stash.ts                   # Stash相关常量
│   │   │   └── types/                          # 类型定义（新增）
│   │   │       ├── config.ts                  # 配置类型
│   │   │       ├── stash.ts                   # Stash类型
│   │   │       ├── operations.ts              # 操作类型
│   │   │       └── state-machine.ts            # 状态机类型
│   │   ├── dist/                              # 构建输出
│   │   └── __tests__/                         # 测试文件
│   │       ├── commands/
│   │       ├── services/
│   │       └── utils/
│   │
│   ├── shared/                                # @nemo-cli/shared
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── utils/
│   │   │   │   ├── git-handle/                # Git操作封装（增强：统一抽象层）
│   │   │   │   │   ├── index.ts                # Git操作统一接口
│   │   │   │   │   ├── git-operation.ts        # GitOperation类（新增）
│   │   │   │   │   ├── error-types.ts          # 错误类型定义（新增）
│   │   │   │   │   └── context-cache.ts        # 上下文缓存（新增）
│   │   │   │   └── ...                         # 其他工具
│   │   │   └── types/
│   │   └── dist/
│   │
│   ├── ai/                                    # @nemo-cli/ai
│   ├── file/                                  # @nemo-cli/file
│   ├── package/                               # @nemo-cli/package
│   ├── ui/                                    # @nemo-cli/ui
│   └── mail/                                  # @nemo-cli/mail
│
├── docs/
│   ├── architecture.md                        # 现有架构文档
│   ├── architecture-decisions.md              # 架构决策文档（当前文档）
│   ├── prd.md                                 # 产品需求文档
│   ├── development-guide.md
│   └── planning-artifacts/                    # 规划产物目录
│
└── .git/                                     # Git仓库目录（运行时生成）
    ├── ng-stash-index.json                    # Stash索引文件（新增）
    ├── ng-config.json                         # 项目配置（新增）
    └── ng-logs/                               # 操作日志目录（新增）
        └── YYYY-MM-DD.json                    # 按日期分片的日志文件
```

### Architectural Boundaries

**API Boundaries:**

- **Command Layer Boundary** (`packages/git/src/commands/`)
  - Input: CLI arguments and options
  - Output: User-visible messages and operation results
  - Responsibility: Argument parsing, user interaction, command orchestration

- **Service Layer Boundary** (`packages/git/src/services/`)
  - Input: Business logic parameters
  - Output: Operation results and state
  - Responsibility: Business logic implementation, state management, error handling

- **Utility Layer Boundary** (`packages/git/src/utils/` and `@nemo-cli/shared`)
  - Input: Generic operation parameters
  - Output: Generic operation results
  - Responsibility: Git operation encapsulation, context detection, utility functions

**Component Boundaries:**

- **Stash Manager Service** (`services/stash-manager/`)
  - Responsibility: Branch-level stash index management, automatic stash/pop
  - Dependencies: Git operation utilities, config manager service
  - Output: Stash index file (`.git/ng-stash-index.json`)

- **Safe Operations Service** (`services/safe-operations/`)
  - Responsibility: Safe pull/push sequences, conflict detection
  - Dependencies: Operation state machine, stash manager service
  - Output: Operation logs

- **Operation State Machine** (`services/operation-state-machine/`)
  - Responsibility: Operation state tracking, failure recovery
  - Dependencies: Logger service
  - Output: State transition records

- **Config Manager Service** (`services/config-manager/`)
  - Responsibility: Config loading, merging, validation
  - Dependencies: File system operations
  - Output: Merged configuration object

**Data Boundaries:**

- **Project-Level Data Storage** (`.git/` directory)
  - `ng-stash-index.json`: Stash index (branch → stash mapping)
  - `ng-config.json`: Project-level configuration
  - `ng-logs/`: Operation logs (date-sharded)

- **Global Data Storage** (`~/.nemo-cli/config.json`)
  - User global configuration (using configstore)

- **Runtime Data**
  - Context cache (in-memory, invalidated after operations)
  - Operation state (in-memory, valid during operations)

### Requirements to Structure Mapping

**Functional Requirements Mapping:**

| FR Category | Primary Files/Directories | Description |
|-------------|---------------------------|-------------|
| FR1-FR6 (Branch-level Stash) | `services/stash-manager/` | Stash index management, automatic stash/pop |
| FR7-FR12 (Safe Pull Mode) | `services/safe-operations/safe-pull.ts` | Automatic stash→pull→pop sequence |
| FR13-FR18 (Safe Push Mode) | `services/safe-operations/safe-push.ts` | Automatic pull check before push |
| FR19-FR22 (Rebase Optimization) | `services/rebase-handler/` | History rewrite detection, force push guidance |
| FR23-FR26 (Config Management) | `services/config-manager/` | Three-layer configuration system |
| FR27-FR30 (Error Handling) | `services/operation-state-machine/` | State machine, recovery mechanism |
| FR28-FR29 (Logging) | `services/logger/` | Structured logging, operation history |
| FR43-FR46 (Config Commands) | `commands/config.ts` | Config view/modify commands |
| FR29 (Log Viewing) | `commands/logs.ts` | Log query command |

**Cross-Cutting Concerns Mapping:**

- **State Persistence**
  - Implementation: `services/stash-manager/stash-index.ts`
  - Storage: `.git/ng-stash-index.json`

- **Configuration Management**
  - Implementation: `services/config-manager/`
  - Storage: `.git/ng-config.json` (project-level) + `~/.nemo-cli/config.json` (global)

- **Error Recovery**
  - Implementation: `services/operation-state-machine/recovery.ts`
  - Logging: `.git/ng-logs/YYYY-MM-DD.json`

- **Context Detection**
  - Implementation: `utils/context-detection.ts` + `@nemo-cli/shared/utils/git-handle/context-cache.ts`
  - Cache: In-memory cache (invalidated after operations)

### Integration Points

**Internal Communication:**

- **Command → Service**
  - Command layer calls service layer interfaces
  - Type-safe parameter passing

- **Service → Utility**
  - Service layer uses utility layer for Git operations
  - Unified execution through `GitOperation` class

- **Service → Service**
  - Stash manager service called by safe operations service
  - All services log operations through logger service

**External Integrations:**

- **Git CLI**
  - Execution via subprocess (`tinyexec`/`zx`)
  - Unified error handling interface

- **File System**
  - Configuration and log file I/O
  - Using `fs-extra` (via `@nemo-cli/shared`)

- **User Interaction**
  - Interactive prompts via `@clack/prompts`
  - Complex UI via `@nemo-cli/ui`

**Data Flow:**

```
User Input (CLI)
    ↓
Command Layer (commands/) - Argument parsing, user interaction
    ↓
Service Layer (services/) - Business logic, state management
    ↓
Utility Layer (utils/ + @nemo-cli/shared) - Git operations, context detection
    ↓
Git CLI / File System
    ↓
State Persistence (.git/ng-*.json)
    ↓
Logging (.git/ng-logs/)
```

### File Organization Patterns

**Configuration Files:**

- Root directory: Project-level config (`package.json`, `tsconfig.json`, `biome.json`)
- Package directory: Package-level config (`packages/*/package.json`, `rolldown.config.ts`)
- Runtime: `.git/ng-config.json` (project-level), `~/.nemo-cli/config.json` (global)

**Source Code Organization:**

- `commands/`: Command implementations (one command per file)
- `services/`: Service layer (organized by feature module)
- `utils/`: Utility functions (organized by functionality)
- `types/`: Type definitions (organized by module)
- `constants/`: Constant definitions

**Test Organization:**

- `__tests__/`: Test files (mirroring source structure)
- Unit tests: Corresponding to source files
- Integration tests: `__tests__/integration/`

**Build Output:**

- `dist/`: Build artifacts (each package independent)
- Type declarations: `.d.ts` files (via rolldown-plugin-dts)

### Development Workflow Integration

**Development Server Structure:**

- `pnpm dev`: Parallel watch mode for all packages
- Hot reload: Rolldown watch mode auto-rebuilds

**Build Process Structure:**

- `pnpm build`: Parallel build for all packages
- Type checking: `tsc --incremental --noEmit`
- Code checking: Biome lint + format

**Deployment Structure:**

- Each package independently published to npm
- Build artifacts in `dist/` directory
- Only `dist/` and necessary config files published

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**

- ✅ All technology choices work together: TypeScript 5.9.3 + ESM only, Commander.js + @clack/prompts, Rolldown build, Biome linting
- ✅ All versions compatible: Node.js ^20.19.0 || >=22.12.0, all dependency versions clearly specified
- ✅ Patterns align with technology choices: Implementation patterns support architectural decisions (naming conventions, error handling, logging)
- ✅ No contradictory decisions: All decisions support each other

**Pattern Consistency:**

- ✅ Implementation patterns support architectural decisions: Naming conventions (`{command}Command`, `handle{Action}`, `get{Resource}`) align with architecture
- ✅ Naming conventions consistent: Command, utility function, and file naming follow unified patterns
- ✅ Structure patterns align with technology stack: Monorepo structure supports independent publishing, service layer separation is clear
- ✅ Communication patterns coherent: Command → Service → Utility layer communication is clear, data flow is well-defined

**Structure Alignment:**

- ✅ Project structure supports all architectural decisions: New service layer directories support state machine, config management decisions
- ✅ Boundaries properly defined: API, component, and data boundaries are clearly specified
- ✅ Structure enables chosen patterns: Directory organization supports naming conventions and file organization patterns
- ✅ Integration points properly structured: Internal communication, external integrations, and data flow are clearly defined

### Requirements Coverage Validation ✅

**Functional Requirements Coverage:**

| FR Category | Architectural Support | Implementation Location |
|-------------|----------------------|------------------------|
| FR1-FR6 (Branch-level Stash) | ✅ Fully Supported | `services/stash-manager/` + `.git/ng-stash-index.json` |
| FR7-FR12 (Safe Pull Mode) | ✅ Fully Supported | `services/safe-operations/safe-pull.ts` + state machine |
| FR13-FR18 (Safe Push Mode) | ✅ Fully Supported | `services/safe-operations/safe-push.ts` + state machine |
| FR19-FR22 (Rebase Optimization) | ✅ Fully Supported | `services/rebase-handler/` |
| FR23-FR26 (Config Management) | ✅ Fully Supported | `services/config-manager/` + three-layer config system |
| FR27-FR30 (Error Handling) | ✅ Fully Supported | `services/operation-state-machine/` |
| FR28-FR29 (Logging) | ✅ Fully Supported | `services/logger/` + `.git/ng-logs/` |
| FR31-FR34 (Help System) | ✅ Fully Supported | Existing command structure + `constants/` |
| FR35-FR38 (Output Format) | ✅ Fully Supported | `@nemo-cli/ui` + `log.show()` |
| FR39-FR42 (Shell Integration) | ⚠️ Partially Supported | Needs new `commands/completion.ts` |
| FR43-FR46 (Config Commands) | ✅ Fully Supported | `commands/config.ts` |
| FR47-FR50 (Interactive Experience) | ✅ Fully Supported | `@clack/prompts` + existing patterns |

**Non-Functional Requirements Coverage:**

| NFR | Architectural Support | Implementation Strategy |
|-----|----------------------|------------------------|
| NFR1 (Branch switch < 500ms) | ✅ Supported | Context caching + local operation optimization |
| NFR2 (AI operations < 2s) | ✅ Supported | Network operations no hard limit, show progress |
| NFR3 (Package operations < 1s) | ✅ Supported | Existing implementation |
| NFR4 (Startup < 200ms) | ✅ Supported | ESM + Rolldown fast builds |
| NFR5 (Stash retrieval < 100ms) | ✅ Supported | Index file + in-memory cache |
| NFR6-NFR11 (Reliability) | ✅ Supported | State machine + atomicity guarantee + recovery mechanism |
| NFR12-NFR15 (Compatibility) | ✅ Supported | Clear version requirements |
| NFR16-NFR21 (Maintainability) | ✅ Supported | TypeScript + pattern standards + testing |
| NFR22-NFR24 (Observability) | ✅ Supported | Structured logging + operation history |

**Coverage Summary:**

- Functional Requirements: 49 out of 50 FRs fully supported, 1 partially supported (Shell integration needs new command)
- Non-Functional Requirements: All 24 NFRs supported
- Overall Coverage: 98% fully supported, 2% partially supported

### Implementation Readiness Validation ✅

**Decision Completeness:**

- ✅ All critical decisions documented with versions: Technology stack versions clearly specified
- ✅ Implementation patterns comprehensive enough: 8 conflict points have defined patterns
- ✅ Consistency rules clear and enforceable: Naming, error handling, logging output rules are explicit
- ✅ Examples provided for all major patterns: Command functions, utility functions, error handling examples are complete

**Structure Completeness:**

- ✅ Project structure complete and specific: All new service directories and files are defined
- ✅ All files and directories defined: Complete structure from root config to runtime files
- ✅ Integration points clearly specified: Internal communication, external integrations, data flow are clear
- ✅ Component boundaries well-defined: Service layer, utility layer boundaries are clear

**Pattern Completeness:**

- ✅ All potential conflict points addressed: 8 conflict points all have explicit patterns
- ✅ Naming conventions comprehensive: Command, utility, file, export patterns are complete
- ✅ Communication patterns fully specified: Command → Service → Utility layer communication is clear
- ✅ Process patterns complete: Error handling, logging, async operation patterns are complete

### Gap Analysis Results

**Critical Gaps:**

- ✅ None - No gaps that block implementation

**Important Gaps:**

1. **Shell Completion Command Implementation (FR39-FR42)**
   - Need: `commands/completion.ts` command implementation
   - Priority: Medium (doesn't affect core functionality)
   - Recommendation: Can be implemented post-MVP

2. **Performance Benchmark Testing**
   - Need: Establish performance test suite to validate NFR1-NFR5
   - Priority: Medium (validates architectural decisions)
   - Recommendation: Establish during implementation

**Nice-to-Have Gaps:**

1. **Log Cleanup Functionality (User Privacy)**
   - Need: Cleanup subcommand in `commands/logs.ts`
   - Priority: Low (Post-MVP)
   - Recommendation: Implement in future version

2. **Advanced Intelligent Inference**
   - Need: Machine learning user habits (already marked as Post-MVP)
   - Priority: Low
   - Recommendation: Future enhancement

### Validation Issues Addressed

**Issues Identified:**

1. **Shell Completion Feature Needs New Command**
   - Status: Identified, doesn't affect core functionality
   - Recommendation: Implement post-MVP

2. **Performance Benchmark Testing Needs Establishment**
   - Status: Identified, architecture supports performance requirements
   - Recommendation: Establish during implementation

**No Immediate Action Required:**

- All critical architectural decisions are complete
- All core functional requirements have architectural support
- Implementation patterns are detailed enough

### Architecture Completeness Checklist

**✅ Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High (based on validation results)

**Key Strengths:**

1. Complete and consistent architectural decisions
2. High requirements coverage (98%)
3. Detailed and executable implementation patterns
4. Complete and specific project structure
5. Mature and compatible technology stack

**Areas for Future Enhancement:**

1. Shell completion functionality (FR39-FR42)
2. Performance benchmark test suite
3. Log cleanup functionality (user privacy)
4. Advanced intelligent inference (Post-MVP)

### Implementation Handoff

**AI Agent Guidelines:**

- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions

**First Implementation Priority:**

1. Unified Git Operation Abstraction Layer (`@nemo-cli/shared/utils/git-handle/git-operation.ts`)
2. State Persistence Architecture (`services/stash-manager/stash-index.ts`)
3. Operation State Machine (`services/operation-state-machine/`)
4. Config Manager Service (`services/config-manager/`)
5. Safe Operations Service (`services/safe-operations/`)

---

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2025-12-27
**Document Location:** docs/architecture-decisions.md

### Final Architecture Deliverables

**📋 Complete Architecture Document**

- All architectural decisions documented with specific versions
- Implementation patterns ensuring AI agent consistency
- Complete project structure with all files and directories
- Requirements to architecture mapping
- Validation confirming coherence and completeness

**🏗️ Implementation Ready Foundation**

- 5+ architectural decisions made (Git operations, state persistence, error handling, interaction patterns, logging)
- 8 implementation patterns defined (naming, error handling, logging, types, constants, structure, async operations)
- 6+ architectural components specified (stash manager, safe operations, rebase handler, config manager, state machine, logger)
- 50 functional requirements fully supported (98% coverage)

**📚 AI Agent Implementation Guide**

- Technology stack with verified versions (TypeScript 5.9.3, Node.js ^20.19.0 || >=22.12.0)
- Consistency rules that prevent implementation conflicts
- Project structure with clear boundaries
- Integration patterns and communication standards

### Implementation Handoff

**For AI Agents:**
This architecture document is your complete guide for implementing nemo-cli. Follow all decisions, patterns, and structures exactly as documented.

**First Implementation Priority:**

1. Unified Git Operation Abstraction Layer (`@nemo-cli/shared/utils/git-handle/git-operation.ts`)
2. State Persistence Architecture (`services/stash-manager/stash-index.ts`)
3. Operation State Machine (`services/operation-state-machine/`)
4. Config Manager Service (`services/config-manager/`)
5. Safe Operations Service (`services/safe-operations/`)

**Development Sequence:**

1. Initialize new service layer structure in `packages/git/src/services/`
2. Set up development environment per architecture (TypeScript, Rolldown, Biome)
3. Implement core architectural foundations (Git operation abstraction, state persistence)
4. Build features following established patterns (stash manager, safe operations, etc.)
5. Maintain consistency with documented rules (naming, error handling, logging)

### Quality Assurance Checklist

**✅ Architecture Coherence**

- [x] All decisions work together without conflicts
- [x] Technology choices are compatible
- [x] Patterns support the architectural decisions
- [x] Structure aligns with all choices

**✅ Requirements Coverage**

- [x] All functional requirements are supported (98% fully, 2% partially)
- [x] All non-functional requirements are addressed
- [x] Cross-cutting concerns are handled
- [x] Integration points are defined

**✅ Implementation Readiness**

- [x] Decisions are specific and actionable
- [x] Patterns prevent agent conflicts
- [x] Structure is complete and unambiguous
- [x] Examples are provided for clarity

### Project Success Factors

**🎯 Clear Decision Framework**
Every technology choice was made collaboratively with clear rationale, ensuring all stakeholders understand the architectural direction.

**🔧 Consistency Guarantee**
Implementation patterns and rules ensure that multiple AI agents will produce compatible, consistent code that works together seamlessly.

**📋 Complete Coverage**
All project requirements are architecturally supported, with clear mapping from business needs to technical implementation.

**🏗️ Solid Foundation**
The chosen technology stack and architectural patterns provide a production-ready foundation following current best practices.

---

**Architecture Status:** READY FOR IMPLEMENTATION ✅

**Next Phase:** Begin implementation using the architectural decisions and patterns documented herein.

**Document Maintenance:** Update this architecture when major technical decisions are made during implementation.
