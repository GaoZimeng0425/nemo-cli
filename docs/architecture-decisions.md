---
stepsCompleted: [1, 2]
inputDocuments: ['docs/prd.md', 'docs/index.md', 'docs/architecture.md']
workflowType: 'architecture'
lastStep: 2
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
