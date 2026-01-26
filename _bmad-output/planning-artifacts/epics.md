---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - docs/prd.md
  - docs/architecture.md
  - docs/architecture-decisions.md
---

# nemo-cli - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for nemo-cli, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: 用户切换分支时，系统自动检测未提交更改并执行 stash
FR2: 系统在 stash 消息中记录来源分支名称，格式如 `[ng-auto] branch:feature/xxx timestamp:2025-12-21T10:00:00`
FR3: 用户切换回某分支时，系统自动识别该分支的 stash 并 pop
FR4: 用户可以查看所有分支级别的 stash 列表（按分支分组显示）
FR5: 用户可以手动删除特定分支的 stash
FR6: 系统在自动 pop 时如遇冲突，提示用户手动解决并保留 stash
FR7: 用户执行 pull 时，系统自动检测工作区是否有未提交更改
FR8: 如有未提交更改，系统自动执行 stash → pull → pop 序列
FR9: 用户可以选择 pull 策略：merge（默认）、rebase
FR10: Rebase 模式下，系统提示用户选择 rebase 目标分支（默认远程同名分支）
FR11: Pull 完成后，系统自动尝试 pop stash
FR12: 如 pop 时有冲突，系统显示冲突文件列表并提示解决方式
FR13: 用户执行 push 时，系统先检查远程是否有新提交
FR14: 如远程有新提交，系统自动执行 pull（使用用户配置的策略）
FR15: Pull 成功且无冲突后，系统自动执行 push
FR16: 如 pull 有冲突，系统提示用户解决冲突后重新 push
FR17: 用户可以使用 force push 选项跳过 pull 检查（用于 rebase 后场景）
FR18: Force push 前系统显示警告并要求确认
FR19: Rebase 完成后，系统检测本地分支与远程分支的差异
FR20: 如检测到历史重写（rebase 导致），系统提示用户需要 force push
FR21: 系统提供选项：force push / 查看差异 / 取消操作
FR22: 用户选择 force push 时，系统执行 `git push --force-with-lease`
FR23: 用户可以配置默认的 pull 策略（merge/rebase）
FR24: 用户可以配置是否启用自动 stash 功能
FR25: 用户可以配置 stash 消息的格式模板
FR26: 配置存储在项目级别或全局级别（用户选择）
FR27: 系统在任何自动操作失败时保留用户数据完整性
FR28: 系统提供操作日志，记录自动执行的 Git 命令
FR29: 用户可以查看最近的自动操作历史
FR30: 系统在关键操作前创建恢复点（可选功能）
FR31: 所有命令支持 `--help` 选项，提供上下文相关的操作提醒
FR32: 帮助信息清晰、简洁，覆盖 95% 的使用场景
FR33: 系统根据当前上下文提供相关命令建议
FR34: 用户可以通过帮助系统了解命令用法，无需查阅外部文档
FR35: 系统支持多种输出格式：默认文本格式、JSON 格式（通过 `--json`）、表格格式、静默模式（通过 `--quiet`）
FR36: 所有命令的输出遵循统一的格式规范
FR37: 错误信息格式统一，包含清晰的错误描述和恢复建议
FR38: 成功/失败状态通过颜色和图标清晰标识
FR39: 系统支持 Bash 和 Zsh 的自动补全功能
FR40: 用户可以通过命令生成并安装补全脚本
FR41: 补全功能支持命令、子命令、选项和参数的自动补全
FR42: 补全功能根据当前 Git 状态提供上下文感知的补全（如分支名、文件名）
FR43: 用户可以在全局级别和项目级别配置工具行为
FR44: 用户可以通过命令行查看和修改配置
FR45: 配置变更立即生效，无需重启
FR46: 系统支持配置优先级：项目级别 > 全局级别 > 默认值
FR47: 所有命令采用交互式设计，通过对话式提示引导用户完成操作
FR48: 系统自动检测上下文并推断用户意图，减少交互步骤
FR49: 用户可以通过键盘导航（方向键、Tab、Enter）完成交互
FR50: 用户可以在任何时候取消操作（Ctrl+C）并安全退出

### NonFunctional Requirements

NFR1: Git 操作性能：分支切换 < 500ms（包含 stash 操作）
NFR2: AI 操作性能：命令响应 < 2s（包含网络延迟）
NFR3: Package 操作性能：依赖分析 < 1s
NFR4: 通用性能：冷启动 < 200ms，热启动 < 100ms
NFR5: Stash 检索和匹配操作在 100ms 内完成
NFR6: 操作成功率：> 99%（排除用户输入错误）
NFR7: 错误恢复率：自动恢复 > 90%
NFR8: 数据完整性：零数据丢失（100%）
NFR9: 自动 stash 操作必须原子性执行，失败时回滚到操作前状态
NFR10: 任何情况下不得丢失用户的未提交更改
NFR11: 网络操作（pull/push）超时时提供清晰的错误信息和恢复建议
NFR12: 支持 Git 2.20+ 版本
NFR13: 支持 Node.js ^20.19.0 || >=22.12.0
NFR14: 兼容 macOS、Linux、Windows（通过 WSL）
NFR15: 与现有 ng 命令完全向后兼容（100% 兼容）
NFR16: 代码质量：遵循 TypeScript 最佳实践，通过所有 lint 检查
NFR17: 代码覆盖率：单元测试覆盖率 > 80%
NFR18: 代码复杂度：新功能代码的圈复杂度 < 10
NFR19: 文档覆盖率：API 文档覆盖率 100%
NFR20: 可扩展性：新功能添加时间 < 2 天（基于现有架构）
NFR21: 新命令与现有命令风格一致（Commander.js + @clack/prompts）
NFR22: 操作日志覆盖率：100%（所有操作都有日志记录）
NFR23: 错误追踪：所有错误可追溯，便于问题排查
NFR24: 用户可以查看最近的自动操作历史

### Additional Requirements

- **Stash 元数据存储机制**：使用 Configstore 存储 Stash 元数据（`.git/ng-stash-index.json`），而非仅依赖 Git 消息解析，确保可靠性和可扩展性
- **操作序列执行模式**：Pull/Push 安全模式采用同步执行序列（stash → pull → pop），而非事务性执行，在关键步骤前检查状态，失败时提供恢复建议
- **历史重写检测**：Rebase 工作流优化使用 git log 比较检测历史重写，直接比较 commit hash，确保准确性
- **结构化日志**：使用结构化日志和操作历史（`.git/ng-logs/YYYY-MM-DD.json`），而非简单日志文件，便于查询和分析
- **多层级配置**：实现三层配置系统（命令级 > 项目级 > 全局级），支持全局默认（`~/.nemo-cli/config.json`）、项目级覆盖（`.git/ng-config.json`）、命令级选项（CLI flags）
- **操作状态机**：使用操作状态机模式（idle → preparing → executing → recovering → completed/failed），清晰的状态转换，便于追踪操作进度和失败回滚
- **统一 Git 操作抽象层**：在 `@nemo-cli/shared` 中建立统一的 Git 操作抽象层，封装子进程执行、错误处理和状态管理，统一错误类型定义（GitError, GitConflictError, GitNetworkError）
- **上下文检测缓存**：缓存上下文检测结果，避免重复执行 Git 命令，提升性能
- **原子性保证机制**：关键操作前创建恢复点，每个状态转换前验证前置条件，根据失败阶段执行相应的回滚操作
- **性能基准测试**：建立性能测试基准，验证 NFR1-NFR5 等性能要求
- **日期/时间格式**：使用 ISO 8601 格式（`YYYY-MM-DDTHH:mm:ss.sssZ`）存储，显示时使用相对时间（如 "2 分钟前"）
- **技术栈约束**：必须遵循 TypeScript 5.9.3 + ESM only、Commander.js、@clack/prompts、Ink/React、Rolldown、Biome 等技术栈
- **实现模式约束**：遵循命名模式（`{command}Command`、`handle{Action}`、`get{Resource}`）、错误处理模式（`xASync` 元组模式）、日志输出模式（统一使用 `log.show()`）、文件组织模式等

### FR Coverage Map

FR1: Epic 1 - 用户切换分支时自动检测未提交更改并执行 stash
FR2: Epic 1 - 系统在 stash 消息中记录来源分支名称和时间戳
FR3: Epic 1 - 用户切换回分支时自动识别并 pop 对应的 stash
FR4: Epic 1 - 用户可以查看所有分支级别的 stash 列表（按分支分组显示）
FR5: Epic 1 - 用户可以手动删除特定分支的 stash
FR6: Epic 1 - 系统在自动 pop 时如遇冲突，提示用户手动解决并保留 stash
FR7: Epic 2 - 用户执行 pull 时，系统自动检测工作区是否有未提交更改
FR8: Epic 2 - 如有未提交更改，系统自动执行 stash → pull → pop 序列
FR9: Epic 2 - 用户可以选择 pull 策略：merge（默认）、rebase
FR10: Epic 2 - Rebase 模式下，系统提示用户选择 rebase 目标分支（默认远程同名分支）
FR11: Epic 2 - Pull 完成后，系统自动尝试 pop stash
FR12: Epic 2 - 如 pop 时有冲突，系统显示冲突文件列表并提示解决方式
FR13: Epic 2 - 用户执行 push 时，系统先检查远程是否有新提交
FR14: Epic 2 - 如远程有新提交，系统自动执行 pull（使用用户配置的策略）
FR15: Epic 2 - Pull 成功且无冲突后，系统自动执行 push
FR16: Epic 2 - 如 pull 有冲突，系统提示用户解决冲突后重新 push
FR17: Epic 2 - 用户可以使用 force push 选项跳过 pull 检查（用于 rebase 后场景）
FR18: Epic 2 - Force push 前系统显示警告并要求确认
FR19: Epic 3 - Rebase 完成后，系统检测本地分支与远程分支的差异
FR20: Epic 3 - 如检测到历史重写（rebase 导致），系统提示用户需要 force push
FR21: Epic 3 - 系统提供选项：force push / 查看差异 / 取消操作
FR22: Epic 3 - 用户选择 force push 时，系统执行 `git push --force-with-lease`
FR23: Epic 4 - 用户可以配置默认的 pull 策略（merge/rebase）
FR24: Epic 4 - 用户可以配置是否启用自动 stash 功能
FR25: Epic 4 - 用户可以配置 stash 消息的格式模板
FR26: Epic 4 - 配置存储在项目级别或全局级别（用户选择）
FR27: Epic 5 - 系统在任何自动操作失败时保留用户数据完整性
FR28: Epic 5 - 系统提供操作日志，记录自动执行的 Git 命令
FR29: Epic 5 - 用户可以查看最近的自动操作历史
FR30: Epic 5 - 系统在关键操作前创建恢复点（可选功能）
FR31: Epic 6 - 所有命令支持 `--help` 选项，提供上下文相关的操作提醒
FR32: Epic 6 - 帮助信息清晰、简洁，覆盖 95% 的使用场景
FR33: Epic 6 - 系统根据当前上下文提供相关命令建议
FR34: Epic 6 - 用户可以通过帮助系统了解命令用法，无需查阅外部文档
FR35: Epic 6 - 系统支持多种输出格式：默认文本格式、JSON 格式（通过 `--json`）、表格格式、静默模式（通过 `--quiet`）
FR36: Epic 6 - 所有命令的输出遵循统一的格式规范
FR37: Epic 6 - 错误信息格式统一，包含清晰的错误描述和恢复建议
FR38: Epic 6 - 成功/失败状态通过颜色和图标清晰标识
FR39: Epic 6 - 系统支持 Bash 和 Zsh 的自动补全功能
FR40: Epic 6 - 用户可以通过命令生成并安装补全脚本
FR41: Epic 6 - 补全功能支持命令、子命令、选项和参数的自动补全
FR42: Epic 6 - 补全功能根据当前 Git 状态提供上下文感知的补全（如分支名、文件名）
FR43: Epic 4 - 用户可以在全局级别和项目级别配置工具行为
FR44: Epic 4 - 用户可以通过命令行查看和修改配置
FR45: Epic 4 - 配置变更立即生效，无需重启
FR46: Epic 4 - 系统支持配置优先级：项目级别 > 全局级别 > 默认值
FR47: Epic 6 - 所有命令采用交互式设计，通过对话式提示引导用户完成操作
FR48: Epic 6 - 系统自动检测上下文并推断用户意图，减少交互步骤
FR49: Epic 6 - 用户可以通过键盘导航（方向键、Tab、Enter）完成交互
FR50: Epic 6 - 用户可以在任何时候取消操作（Ctrl+C）并安全退出

## Epic List

### Epic 1: 智能分支切换体验

用户可以在切换分支时自动管理未提交的更改，无需手动执行 stash/pop 操作。系统自动检测未提交更改，在切换分支时自动 stash，并在切换回原分支时自动 pop，实现分支级别的上下文管理。

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6

**用户价值：** 消除分支切换时的认知负担，无需记忆 stash 命令序列，自动保护未提交的工作，提升开发效率。

**技术要点：**

- 实现分支级 Stash 管理服务（StashManager）
- 使用 `.git/ng-stash-index.json` 存储 Stash 元数据
- 支持冲突检测和手动解决流程
- 实现 Stash 消息格式规范（`[ng-auto] branch:xxx timestamp:xxx`）

### Epic 2: 安全的代码同步体验

用户可以安全地拉取和推送代码，系统自动处理未提交更改、远程更新和冲突情况。Pull 操作自动检测并保护未提交更改，Push 操作自动检查远程状态并同步，确保代码同步过程的安全性和可靠性。

**FRs covered:** FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18

**用户价值：** 消除代码同步时的数据丢失风险，自动处理常见冲突场景，减少手动操作步骤，提升代码同步的可靠性。

**技术要点：**

- 实现 Pull 安全模式服务（PullService）
- 实现 Push 安全模式服务（PushService）
- 支持 merge/rebase 策略选择
- 实现冲突检测和处理机制
- 集成分支级 Stash 管理（依赖 Epic 1）

### Epic 3: 智能 Rebase 工作流

用户可以安全地使用 rebase，系统自动检测历史重写并引导用户完成 force push 操作。Rebase 完成后自动检测本地与远程分支的差异，提供安全的 force push 选项和差异预览。

**FRs covered:** FR19, FR20, FR21, FR22

**用户价值：** 简化 rebase 工作流，自动检测需要 force push 的场景，提供安全的推送选项，避免因忘记 force push 导致的困惑。

**技术要点：**

- 实现 Rebase 工作流服务（RebaseService）
- 基于 git log 比较的历史重写检测
- 实现 `git push --force-with-lease` 安全推送
- 提供差异预览和操作选项

### Epic 4: 个性化配置管理

用户可以按个人和项目需求配置工具行为，支持全局级别、项目级别和命令级别的配置。配置包括 pull 策略、自动 stash 开关、stash 消息模板等，支持通过命令行查看和修改配置。

**FRs covered:** FR23, FR24, FR25, FR26, FR43, FR44, FR45, FR46

**用户价值：** 满足不同用户和项目的个性化需求，提供灵活的配置选项，支持团队标准化和个性化平衡。

**技术要点：**

- 实现三层配置系统（命令级 > 项目级 > 全局级）
- 实现配置加载器（ConfigLoader）
- 实现配置验证和合并逻辑
- 实现配置查看和修改命令（`ng config`）

### Epic 5: 操作可观测性与数据安全

用户可以查看操作历史，系统保证数据完整性并提供错误恢复机制。所有操作都有日志记录，用户可以查看最近的自动操作历史，关键操作前创建恢复点，确保数据安全。

**FRs covered:** FR27, FR28, FR29, FR30

**用户价值：** 提供操作可追溯性，确保数据完整性，支持问题排查和错误恢复，提升用户对工具的信任度。

**技术要点：**

- 实现操作日志服务（OperationLogger）
- 实现操作历史管理（HistoryManager）
- 实现结构化日志存储（`.git/ng-logs/YYYY-MM-DD.json`）
- 实现恢复点机制和回滚策略
- 实现操作状态机（支持状态追踪和恢复）

### Epic 6: 帮助系统与 Shell 集成

用户可以通过帮助系统了解命令用法，无需查阅外部文档，并获得 Shell 自动补全支持。所有命令支持 `--help`，提供上下文相关的操作提醒，支持多种输出格式，实现 Bash 和 Zsh 的自动补全。

**FRs covered:** FR31, FR32, FR33, FR34, FR35, FR36, FR37, FR38, FR39, FR40, FR41, FR42, FR47, FR48, FR49, FR50

**用户价值：** 降低学习成本，提供零文档依赖的体验，提升命令使用效率，支持脚本化和自动化场景。

**技术要点：**

- 增强 Commander.js 帮助系统
- 实现上下文感知的命令建议
- 实现多种输出格式支持（JSON、表格、静默模式）
- 实现 Bash 和 Zsh 自动补全生成和安装
- 实现上下文感知的补全（分支名、文件名等）

---

## Epic 1: 智能分支切换体验

用户可以在切换分支时自动管理未提交的更改，无需手动执行 stash/pop 操作。系统自动检测未提交更改，在切换分支时自动 stash，并在切换回原分支时自动 pop，实现分支级别的上下文管理。

### Story 1.1: 实现 Stash 元数据存储机制

As a developer,
I want the system to store stash metadata in a structured format,
So that the system can reliably track which stash belongs to which branch and automatically manage them.

**Acceptance Criteria:**

**Given** I am in a Git repository
**When** the system needs to store stash metadata for a branch
**Then** it creates or updates `.git/ng-stash-index.json` file with the stash information
**And** the metadata includes: branch name, stash reference (stash@{n}), timestamp (ISO 8601 format), and stash message
**And** the file structure follows the format: `{ "branchName": [{ "stashRef": "stash@{0}", "timestamp": "2025-12-21T10:00:00.000Z", "createdAt": "2025-12-21T10:00:00.000Z", "message": "[ng-auto] branch:feature/xxx timestamp:2025-12-21T10:00:00" }] }`
**And** the system handles file read/write errors gracefully with clear error messages

**References:** FR2 (stash message format), Architecture requirement: Stash 元数据存储机制

### Story 1.2: 实现自动 Stash 创建功能

As a developer,
I want the system to automatically create a stash when I switch branches with uncommitted changes,
So that my work is preserved without manual intervention.

**Acceptance Criteria:**

**Given** I have uncommitted changes in my working directory
**When** I switch to another branch using `ng checkout <branch-name>`
**Then** the system automatically detects uncommitted changes
**And** the system creates a stash with the message format: `[ng-auto] branch:<source-branch> timestamp:<ISO8601>`
**And** the system stores the stash metadata in `.git/ng-stash-index.json` with the source branch name
**And** the system displays a clear message indicating the stash was created
**And** if stash creation fails, the system preserves the working directory state and displays an error message

**References:** FR1 (automatic stash on branch switch), FR2 (stash message format)

### Story 1.3: 实现自动 Stash Pop 功能

As a developer,
I want the system to automatically restore my stashed changes when I switch back to a branch,
So that I can continue working where I left off without remembering to manually pop the stash.

**Acceptance Criteria:**

**Given** I have a stash associated with a branch in the stash index
**When** I switch back to that branch using `ng checkout <branch-name>`
**Then** the system automatically finds the stash associated with that branch (preferring the most recent one)
**And** the system executes `git stash pop` for the found stash
**And** if pop succeeds, the system removes the stash metadata from the index file
**And** if pop encounters conflicts, the system displays a list of conflicted files
**And** the system retains the stash in the index (does not delete metadata) when conflicts occur
**And** the system provides clear instructions on how to resolve conflicts
**And** if no stash is found for the branch, the system proceeds with checkout without error

**References:** FR3 (automatic pop on branch switch), FR6 (conflict handling)

### Story 1.4: 实现 Stash 列表查看功能

As a developer,
I want to view all branch-level stashes grouped by branch,
So that I can see what work I have stashed and manage them if needed.

**Acceptance Criteria:**

**Given** I have multiple stashes associated with different branches
**When** I run `ng stash list` or `ng stash ls`
**Then** the system displays all stashes grouped by branch name
**And** each stash entry shows: branch name, stash reference, timestamp, and stash message
**And** stashes are sorted by timestamp (most recent first) within each branch group
**And** the output format is clear and readable (table or formatted list)
**And** if no stashes exist, the system displays an appropriate message
**And** the system validates that the stash still exists in Git (removes from index if manually deleted)

**References:** FR4 (view branch-level stash list)

### Story 1.5: 实现手动删除 Stash 功能

As a developer,
I want to manually delete a specific branch's stash,
So that I can clean up stashes I no longer need.

**Acceptance Criteria:**

**Given** I have stashes associated with branches
**When** I run `ng stash drop <branch-name>` or select a stash to delete from the list
**Then** the system displays the stash(es) for that branch and asks for confirmation
**And** if I confirm, the system executes `git stash drop` for the selected stash
**And** the system removes the stash metadata from `.git/ng-stash-index.json`
**And** if the stash deletion fails, the system displays an error message and preserves the metadata
**And** the system provides feedback on successful deletion

**References:** FR5 (manual stash deletion)

### Story 1.6: 集成自动 Stash/Pop 到 checkout 命令

As a developer,
I want the automatic stash/pop functionality to be seamlessly integrated into the checkout command,
So that I can use `ng checkout` naturally without thinking about stash management.

**Acceptance Criteria:**

**Given** I am using the `ng checkout` command
**When** I switch to a different branch with uncommitted changes
**Then** the system automatically creates a stash (as per Story 1.2) before switching
**And** the checkout proceeds normally after stash creation
**When** I switch back to a branch that has an associated stash
**Then** the system automatically pops the stash (as per Story 1.3) after checkout completes
**And** the checkout command maintains all existing functionality (branch selection, remote branch tracking, etc.)
**And** the system handles edge cases: no changes, no stash exists, stash conflicts, etc.
**And** all operations are logged for observability (Epic 5 integration)
**And** the system maintains backward compatibility with existing checkout behavior

**References:** FR1, FR3 (integration with checkout), NFR15 (backward compatibility)

---

## Epic 2: 安全的代码同步体验

用户可以安全地拉取和推送代码，系统自动处理未提交更改、远程更新和冲突情况。Pull 操作自动检测并保护未提交更改，Push 操作自动检查远程状态并同步，确保代码同步过程的安全性和可靠性。

### Story 2.1: 实现 Pull 安全模式基础功能

As a developer,
I want the system to automatically protect my uncommitted changes when I pull from remote,
So that I don't lose my work and can safely sync with remote changes.

**Acceptance Criteria:**

**Given** I have uncommitted changes in my working directory
**When** I run `ng pull` or `ng pull <branch-name>`
**Then** the system automatically detects uncommitted changes
**And** the system creates a stash using the branch-level stash management (Epic 1)
**And** the system executes `git pull` from the remote branch
**And** after pull completes successfully, the system automatically pops the stash
**And** if no uncommitted changes exist, the system proceeds directly with pull
**And** the system displays clear progress messages for each step (stash → pull → pop)
**And** if any step fails, the system preserves data integrity and provides recovery instructions

**References:** FR7 (detect uncommitted changes on pull), FR8 (automatic stash → pull → pop sequence), FR27 (data integrity)

### Story 2.2: 实现 Pull 策略选择（merge/rebase）

As a developer,
I want to choose between merge and rebase strategies when pulling,
So that I can maintain my preferred Git workflow.

**Acceptance Criteria:**

**Given** I am pulling from remote
**When** I run `ng pull` with default settings
**Then** the system uses merge strategy (default)
**When** I run `ng pull --rebase` or have configured rebase as default
**Then** the system uses rebase strategy
**And** in rebase mode, the system prompts me to select the rebase target branch (defaulting to remote branch with same name)
**And** the system executes `git pull --rebase origin <target-branch>`
**And** the system respects my configuration settings (project-level or global-level)
**And** the system maintains the stash → pull → pop sequence regardless of strategy
**And** command-line options override configuration settings

**References:** FR9 (pull strategy selection), FR10 (rebase target branch selection), FR23 (pull strategy configuration)

### Story 2.3: 实现 Pull 冲突处理

As a developer,
I want the system to clearly show me conflicts when they occur during stash pop after pull,
So that I can resolve them and continue working.

**Acceptance Criteria:**

**Given** I have pulled from remote and the system is attempting to pop my stash
**When** the stash pop encounters conflicts
**Then** the system detects the conflicts
**And** the system displays a clear list of conflicted files
**And** the system provides instructions on how to resolve conflicts
**And** the system retains the stash (does not delete it from Git or index)
**And** the system displays the stash reference so I can manually resolve later
**And** the system shows a message like: "Conflicts detected. Resolve conflicts and run 'ng stash pop' when ready."
**And** if no conflicts occur, the stash is automatically removed as normal

**References:** FR12 (conflict file list and resolution guidance), FR6 (retain stash on conflict)

### Story 2.4: 实现 Push 前远程检查

As a developer,
I want the system to check if remote has new commits before I push,
So that I don't push outdated code and avoid conflicts.

**Acceptance Criteria:**

**Given** I am about to push my local commits
**When** I run `ng push` or `ng push <branch-name>`
**Then** the system checks if the remote branch has new commits
**And** the system displays whether remote is ahead, behind, or in sync
**And** if remote has new commits, the system informs me and suggests pulling first
**And** the system shows the commit count difference (e.g., "Remote is 3 commits ahead")
**And** the check is performed efficiently (meets performance requirements)
**And** if remote check fails (network error), the system displays a clear error message

**References:** FR13 (check remote for new commits before push)

### Story 2.5: 实现 Push 安全模式

As a developer,
I want the system to automatically pull and merge remote changes before pushing,
So that my push always succeeds and I don't create merge conflicts.

**Acceptance Criteria:**

**Given** I am pushing and remote has new commits
**When** I run `ng push` and the system detects remote updates
**Then** the system automatically executes pull using my configured strategy (merge/rebase)
**And** the system handles uncommitted changes by stashing (as per Story 2.1)
**And** if pull succeeds without conflicts, the system automatically executes push
**And** if pull encounters conflicts, the system displays conflict information
**And** the system prompts me to resolve conflicts and retry push
**And** the system does not attempt push if conflicts exist
**And** the system displays clear status messages throughout the process
**And** if remote has no new commits, the system proceeds directly with push

**References:** FR14 (auto pull on remote updates), FR15 (auto push after successful pull), FR16 (conflict handling on push)

### Story 2.6: 实现 Force Push 选项

As a developer,
I want to force push when needed (e.g., after rebase) with safety checks,
So that I can update remote history safely without accidentally overwriting others' work.

**Acceptance Criteria:**

**Given** I need to force push (e.g., after rebase)
**When** I run `ng push --force` or `ng push -f`
**Then** the system displays a clear warning about force push implications
**And** the system requires explicit confirmation before proceeding
**And** the system executes `git push --force-with-lease` (safer than `--force`)
**And** the system skips the remote check and pull when force push is used
**And** the system displays a success message after force push completes
**And** if force push fails (e.g., remote was updated), the system shows a clear error message
**And** the system provides guidance on when force push is appropriate

**References:** FR17 (force push option), FR18 (force push warning and confirmation), FR22 (use --force-with-lease)

---

## Epic 3: 智能 Rebase 工作流

用户可以安全地使用 rebase，系统自动检测历史重写并引导用户完成 force push 操作。Rebase 完成后自动检测本地与远程分支的差异，提供安全的 force push 选项和差异预览。

### Story 3.1: 实现历史重写检测功能

As a developer,
I want the system to automatically detect when my local branch history has been rewritten (e.g., after rebase),
So that I know when I need to force push to update the remote branch.

**Acceptance Criteria:**

**Given** I have completed a rebase operation on my local branch
**When** the system checks the branch status
**Then** it compares the local branch commit history with the remote branch using `git log` comparison
**And** it detects if the commit hashes differ (indicating history rewrite)
**And** it identifies that a force push is required to update the remote
**And** the detection is accurate and handles edge cases (no remote branch, identical history, etc.)
**And** the detection completes efficiently (meets performance requirements)
**And** if detection fails, the system displays a clear error message

**References:** FR19 (detect local vs remote branch differences), Architecture requirement: 历史重写检测

### Story 3.2: 实现差异预览功能

As a developer,
I want to see the differences between my local and remote branch before force pushing,
So that I can understand what changes will be pushed and make an informed decision.

**Acceptance Criteria:**

**Given** the system has detected a history rewrite
**When** I choose to view the differences
**Then** the system displays the commit history differences between local and remote
**And** the system shows which commits are new, removed, or modified
**And** the output is clear and readable (formatted commit list or diff summary)
**And** the system shows the commit count difference (e.g., "Local has 5 commits, remote has 3 commits")
**And** the preview helps me understand why force push is needed
**And** the system can display this information in a user-friendly format

**References:** FR21 (view differences option)

### Story 3.3: 实现 Force Push 引导流程

As a developer,
I want the system to guide me through the force push process after rebase,
So that I can safely update the remote branch without making mistakes.

**Acceptance Criteria:**

**Given** the system has detected a history rewrite after rebase
**When** the system prompts me for action
**Then** it presents three options: "Force Push", "View Differences", or "Cancel"
**And** if I select "View Differences", it shows the preview (as per Story 3.2) and returns to the menu
**And** if I select "Force Push", it executes `git push --force-with-lease` (safer than `--force`)
**And** if I select "Cancel", it exits without making changes
**And** the system displays clear warnings about force push implications before execution
**And** the system requires confirmation before executing force push
**And** after successful force push, the system displays a success message
**And** if force push fails (e.g., remote was updated), the system shows a clear error and suggests next steps

**References:** FR20 (detect history rewrite and prompt), FR21 (provide options), FR22 (execute --force-with-lease)

### Story 3.4: 集成到 rebase 命令

As a developer,
I want the history rewrite detection and force push guidance to be automatically triggered after rebase,
So that I don't forget to update the remote branch and the process is seamless.

**Acceptance Criteria:**

**Given** I have completed a rebase using `ng rebase <target-branch>` or `git rebase`
**When** the rebase completes successfully
**Then** the system automatically checks for history rewrite (as per Story 3.1)
**And** if history rewrite is detected, the system automatically triggers the force push guidance flow (as per Story 3.3)
**And** the integration is seamless and doesn't interrupt the rebase workflow
**And** if no history rewrite is detected, the system proceeds normally without prompting
**And** the system handles rebase failures gracefully (conflicts, errors, etc.)
**And** the system maintains all existing rebase command functionality
**And** the system works with both interactive and non-interactive rebase scenarios

**References:** FR19, FR20, FR21, FR22 (integration with rebase workflow)

---

## Epic 4: 个性化配置管理

用户可以按个人和项目需求配置工具行为，支持全局级别、项目级别和命令级别的配置。配置包括 pull 策略、自动 stash 开关、stash 消息模板等，支持通过命令行查看和修改配置。

### Story 4.1: 实现配置数据结构与存储

As a developer,
I want the system to store configuration in a structured format at global and project levels,
So that my preferences are persisted and can be shared across projects or kept personal.

**Acceptance Criteria:**

**Given** I am using nemo-cli
**When** the system needs to store configuration
**Then** it supports global configuration at `~/.nemo-cli/config.json` (using Configstore)
**And** it supports project-level configuration at `.git/ng-config.json` (JSON file)
**And** the configuration structure includes: `pullStrategy` (merge/rebase), `autoStash` (boolean), `stashMessageTemplate` (string)
**And** the system creates default configuration files if they don't exist
**And** the system validates configuration file format and structure
**And** the system handles file read/write errors gracefully with clear error messages
**And** the configuration format is JSON and human-readable

**References:** FR26 (configuration storage at project/global level), FR43 (global and project-level configuration), Architecture requirement: 多层级配置

### Story 4.2: 实现三层配置加载与合并

As a developer,
I want the system to load and merge configuration from multiple levels with proper priority,
So that command-line options can override project settings, which can override global settings.

**Acceptance Criteria:**

**Given** configuration exists at multiple levels (global, project, command-line)
**When** the system loads configuration
**Then** it loads configurations in order: default values → global config → project config → command-line options
**And** it merges configurations with priority: command-level > project-level > global-level > default
**And** it validates configuration values (e.g., pullStrategy must be 'merge' or 'rebase')
**And** it provides type-safe configuration access
**And** if a configuration file is invalid, it displays an error and uses defaults or higher-level config
**And** the merge logic handles nested configuration objects correctly
**And** the system caches merged configuration for performance

**References:** FR46 (configuration priority), Architecture requirement: 多层级配置

### Story 4.3: 实现配置查看命令

As a developer,
I want to view my current configuration settings,
So that I can understand what configuration is active and where it comes from.

**Acceptance Criteria:**

**Given** I have configuration at various levels
**When** I run `ng config get` or `ng config get <key>`
**Then** the system displays the effective configuration value (after merging)
**And** if viewing a specific key, it shows only that key's value
**And** if viewing all config, it displays all configuration keys and values
**And** the system indicates the source of each configuration (global, project, default, or command-line)
**And** the output is clear and readable (formatted JSON or table)
**And** if a key doesn't exist, the system displays an appropriate message
**And** the command works for all supported configuration keys

**References:** FR44 (view configuration via command line)

### Story 4.4: 实现配置设置命令

As a developer,
I want to set configuration values at global or project level,
So that I can customize the tool behavior to match my preferences.

**Acceptance Criteria:**

**Given** I want to change a configuration value
**When** I run `ng config set <key> <value> --global` or `ng config set <key> <value> --project`
**Then** the system validates the key and value format
**And** if `--global` is specified, it updates `~/.nemo-cli/config.json`
**And** if `--project` is specified, it updates `.git/ng-config.json` in the current project
**And** if neither flag is specified, it prompts me to choose global or project level
**And** the system creates the configuration file if it doesn't exist
**And** the system preserves existing configuration when updating
**And** the system displays a success message after update
**And** the configuration change takes effect immediately (no restart required)
**And** if the value is invalid, the system displays an error and doesn't update

**References:** FR44 (modify configuration via command line), FR45 (configuration changes take effect immediately), FR26 (project/global level selection)

### Story 4.5: 集成配置到各功能模块

As a developer,
I want my configuration preferences to be automatically applied to all Git operations,
So that I don't need to specify options every time I use a command.

**Acceptance Criteria:**

**Given** I have configured pull strategy, auto stash, and stash message template
**When** I use `ng pull` command
**Then** the system uses my configured pull strategy (merge or rebase) as default
**And** command-line options (e.g., `--rebase`) override the configuration
**When** I use `ng checkout` or `ng pull` with uncommitted changes
**Then** the system respects my `autoStash` configuration
**And** if auto stash is enabled, it uses my configured `stashMessageTemplate`
**And** the configuration is loaded and applied consistently across all commands
**And** the system uses the merged configuration (considering all priority levels)
**And** if configuration is missing or invalid, the system uses sensible defaults

**References:** FR23 (configure pull strategy), FR24 (configure auto stash), FR25 (configure stash message template)

---

## Epic 5: 操作可观测性与数据安全

用户可以查看操作历史，系统保证数据完整性并提供错误恢复机制。所有操作都有日志记录，用户可以查看最近的自动操作历史，关键操作前创建恢复点，确保数据安全。

### Story 5.1: 实现操作日志记录功能

As a developer,
I want all automatic Git operations to be logged,
So that I can track what the system did and troubleshoot issues if needed.

**Acceptance Criteria:**

**Given** the system performs any automatic Git operation (stash, pull, push, etc.)
**When** an operation is executed
**Then** the system records a structured log entry with: timestamp (ISO 8601), command name, operation type, status (success/failed/cancelled), and details (branch, stash ref, etc.)
**And** the log entry is stored in `.git/ng-logs/YYYY-MM-DD.json` (date-sharded)
**And** the log format is JSON and includes: `{ "timestamp": "2025-12-21T10:00:00.000Z", "command": "checkout", "operation": "stash", "status": "success", "details": { "branch": "feature/xxx", "stashRef": "stash@{0}" } }`
**And** the system creates the log directory and file if they don't exist
**And** the system handles log write errors gracefully (doesn't fail the main operation)
**And** all automatic operations are logged (100% coverage per NFR22)
**And** the system maintains a reasonable log size (e.g., rotate or limit entries per day)

**References:** FR28 (operation logging), NFR22 (100% operation log coverage), Architecture requirement: 结构化日志

### Story 5.2: 实现操作历史查看功能

As a developer,
I want to view my recent operation history,
So that I can see what operations were performed and when.

**Acceptance Criteria:**

**Given** operation logs exist in `.git/ng-logs/`
**When** I run `ng logs` or `ng logs --recent`
**Then** the system displays recent operations (default: last 20 operations)
**And** each entry shows: timestamp, command, operation, status, and key details
**And** the output is clear and readable (formatted table or list)
**When** I run `ng logs --date 2025-12-21`
**Then** the system displays operations from that specific date
**When** I run `ng logs --command checkout`
**Then** the system filters and displays only checkout-related operations
**And** the system supports combining filters (date + command)
**And** if no logs exist, the system displays an appropriate message
**And** the system handles log file read errors gracefully

**References:** FR29 (view operation history), NFR24 (view recent operation history)

### Story 5.3: 实现恢复点机制

As a developer,
I want the system to create recovery points before critical operations,
So that I can restore my repository state if something goes wrong.

**Acceptance Criteria:**

**Given** the system is about to perform a critical operation (e.g., force push, rebase, stash pop with conflicts)
**When** the operation is initiated
**Then** the system creates a recovery point by recording the current Git state (current branch, commit hash, stash list)
**And** the recovery point is stored in a structured format (JSON file or in-memory with persistence option)
**And** the recovery point includes: timestamp, operation type, branch name, commit hash, and stash references
**And** the system can restore the repository to the recovery point state if needed
**And** recovery points are optional (can be enabled/disabled via configuration)
**And** the system manages recovery point storage (e.g., keep last N recovery points, auto-cleanup old ones)
**And** if recovery point creation fails, the system logs a warning but doesn't block the operation

**References:** FR30 (create recovery points before critical operations)

### Story 5.4: 实现数据完整性保证

As a developer,
I want the system to guarantee that my uncommitted work is never lost,
So that I can trust the tool with my code changes.

**Acceptance Criteria:**

**Given** the system performs any automatic operation sequence (e.g., stash → pull → pop)
**When** any step in the sequence fails
**Then** the system preserves all user data (uncommitted changes, stashes, etc.)
**And** the system attempts to roll back to the previous stable state
**And** the system displays clear error messages explaining what happened
**And** the system provides recovery instructions (e.g., "Your changes are safe in stash@{0}")
**And** the system never deletes user data without explicit confirmation
**And** if rollback is not possible, the system preserves data in a safe state (e.g., keeps stash, doesn't delete)
**And** the system logs all failure scenarios for troubleshooting
**And** the system meets NFR8 requirement: zero data loss (100%)
**And** the system meets NFR10 requirement: never lose uncommitted changes

**References:** FR27 (preserve data integrity on failure), NFR8 (zero data loss), NFR10 (never lose uncommitted changes), Architecture requirement: 原子性保证机制

---

## Epic 6: 帮助系统与 Shell 集成

用户可以通过帮助系统了解命令用法，无需查阅外部文档，并获得 Shell 自动补全支持。所有命令支持 `--help`，提供上下文相关的操作提醒，支持多种输出格式，实现 Bash 和 Zsh 的自动补全。

### Story 6.1: 增强 Commander.js 帮助系统

As a developer,
I want comprehensive and contextually relevant help information for all commands,
So that I can understand how to use the tool without consulting external documentation.

**Acceptance Criteria:**

**Given** I run any command with `--help` flag (e.g., `ng checkout --help`, `ng pull --help`)
**When** the help is displayed
**Then** it shows clear command description, usage examples, and available options
**And** the help information covers 95% of common use cases (per FR32)
**And** the help is concise and easy to read
**And** it includes practical examples for each command
**And** it explains what each option does and when to use it
**And** the help format is consistent across all commands
**And** the system enhances Commander.js default help with additional context and examples

**References:** FR31 (all commands support --help), FR32 (help covers 95% of use cases), FR34 (understand commands without external docs)

### Story 6.2: 实现上下文感知的命令建议

As a developer,
I want the system to suggest relevant commands based on my current Git state,
So that I can discover useful commands and workflows more easily.

**Acceptance Criteria:**

**Given** I am in a Git repository with a specific state (e.g., uncommitted changes, behind remote, etc.)
**When** I run `ng --help` or an invalid command
**Then** the system analyzes the current Git context (uncommitted changes, branch status, remote status, etc.)
**And** the system suggests relevant commands based on context (e.g., "You have uncommitted changes. Consider: ng stash, ng commit, ng checkout")
**And** the suggestions are helpful and actionable
**And** the suggestions appear in the help output or as separate contextual hints
**And** the system provides suggestions for common scenarios (90%+ coverage)
**And** the suggestions don't clutter the help output unnecessarily

**References:** FR33 (context-aware command suggestions)

### Story 6.3: 实现多种输出格式支持

As a developer,
I want to choose different output formats for commands,
So that I can use the tool in scripts, automation, or with different display preferences.

**Acceptance Criteria:**

**Given** I run a command that produces output (e.g., `ng stash list`, `ng branch list`)
**When** I use the default output format
**Then** the output is formatted for human readability (tables, formatted lists, colors)
**When** I use `--json` flag
**Then** the output is valid JSON format suitable for scripting
**And** the JSON structure is consistent and well-documented
**When** I use `--quiet` or `-q` flag
**Then** the output is minimal (only essential information, no progress messages)
**And** all commands follow the same output format conventions (per FR36)
**And** error messages maintain clarity regardless of output format
**And** the system supports table format for list commands (branches, stashes, etc.)

**References:** FR35 (multiple output formats), FR36 (unified output format), FR38 (success/failure status indicators)

### Story 6.4: 实现 Shell 自动补全生成

As a developer,
I want the system to generate shell completion scripts,
So that I can get tab completion for commands, subcommands, and options.

**Acceptance Criteria:**

**Given** I want to set up shell completion
**When** I run `ng completion bash` or `ng completion zsh`
**Then** the system generates a completion script for the specified shell
**And** the script supports completion for: main commands (checkout, pull, push, etc.), subcommands, and command options
**And** the completion script is valid and follows shell completion conventions
**And** the script includes all available commands and options
**And** the generated script can be saved to a file or displayed to stdout
**And** the system provides instructions on how to install the completion script

**References:** FR39 (Bash and Zsh completion support), FR40 (generate completion scripts), FR41 (complete commands, subcommands, options)

### Story 6.5: 实现上下文感知的补全

As a developer,
I want shell completion to be context-aware based on my Git repository state,
So that I get relevant suggestions (branch names, file names) when typing commands.

**Acceptance Criteria:**

**Given** I have shell completion installed
**When** I type `ng checkout` and press Tab
**Then** the system completes with available branch names (local and remote)
**When** I type `ng stash drop` and press Tab
**Then** the system completes with branch names that have associated stashes
**When** I type commands that accept file paths
**Then** the system completes with relevant file names from the repository
**And** the completion is fast and responsive (doesn't cause noticeable delay)
**And** the completion respects Git repository state (only shows valid options)
**And** the system handles edge cases (no branches, no stashes, etc.) gracefully

**References:** FR42 (context-aware completion for branch names, file names)

### Story 6.6: 实现 Shell 补全安装命令

As a developer,
I want an easy way to install shell completion,
So that I don't have to manually edit shell configuration files.

**Acceptance Criteria:**

**Given** I want to install shell completion
**When** I run `ng completion install bash` or `ng completion install zsh`
**Then** the system generates the completion script
**And** the system detects the appropriate shell configuration file (`.bashrc`, `.zshrc`, etc.)
**And** the system adds the completion script source line to the configuration file
**And** the system backs up the configuration file before modification
**And** the system provides clear feedback on installation success or failure
**And** the system supports manual installation instructions if auto-install fails
**And** the system verifies the installation after completion
**And** the completion works immediately after installation (or after shell restart)

**References:** FR40 (install completion scripts)
