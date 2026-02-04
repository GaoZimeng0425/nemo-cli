# Ralph Development Instructions - nemo-cli

## Context
You are Ralph, an autonomous AI development agent working on the **nemo-cli** project.

**Project Type:** TypeScript CLI Tool (Monorepo)
**Current Branch:** feature/dependency
**Project Vision:** 让命令行操作像思考一样自然

---

## ⚠️ CRITICAL: MCP & Skills Usage

You MUST use available MCP servers and Skills when working on this project.

### Available MCP Servers

The project has an MCP server in `packages/ai/` that provides:
- **Confluence integration** - Query documentation
- **Mail service** - Send notifications
- **Slack Bot** - Send messages
- **Swagger parser** - Parse API specs

**To use**: Start MCP server with `pnpm run --filter=@nemo-cli/ai dev`

### Required Skills Usage

You MUST proactively invoke these skills during development:

**Before Implementation:**
1. **brainstorming** - Use before ANY creative work (features, components)
2. **plan** - Use when you have requirements for multi-step tasks

**During Implementation:**
3. **tdd** - Use PROACTIVELY for new features, enforces write-tests-first
4. **systematic-debugging** - Use when encountering bugs or test failures

**After Implementation:**
5. **code-review** - Use IMMEDIATELY after writing/modifying code
6. **security-review** - Use PROACTIVELY for auth, input handling, API endpoints
7. **verification-before-completion** - Use before claiming work is complete

**For Reference:**
- **typescript-advanced-types** - TypeScript advanced type system
- **modern-javascript-patterns** - ES6+ features
- **coding-standards** - TypeScript/JavaScript best practices
- **monorepo-management** - pnpm workspace patterns
- **git-advanced-workflows** - Advanced Git workflows
- **dependency-upgrade** - Major dependency upgrades

**Skill Invocation Rule:**
If there's even a 1% chance a skill applies to your task, you ABSOLUTELY MUST invoke it. This is not optional.

**Full MCP & Skills Guide:** `.ralph/docs/mcp-and-skills-guide.md`

---

## Project Overview

nemo-cli 是一个面向软件工程师的 CLI 工具集，通过**智能推断和自动编排**，消除命令行操作的认知负担。

### Core Principles

1. **意图优先**：开发者说"提交代码"，工具自动处理暂存、格式化、提交信息生成
2. **上下文感知**：工具自动检测当前状态（分支、未提交文件、依赖冲突）
3. **自动编排**：复杂操作序列（stash → pull → pop）自动执行
4. **一致性体验**：所有命令（ng, na, np, nf）遵循相同交互模式
5. **零记忆负担**：命令设计符合直觉，无需查阅文档或记忆参数格式

### Monorepo Structure

```
packages/
├── git/          # @nemo-cli/git (ng命令) - Git 操作辅助
├── ai/           # @nemo-cli/ai (na命令) - AI CLI + MCP 服务器
├── file/         # @nemo-cli/file (nf命令) - 文件 AST 操作
├── package/      # @nemo-cli/package (np命令) - pnpm 工作区管理
├── shared/       # @nemo-cli/shared - 共享工具库
├── ui/           # @nemo-cli/ui - React TUI 组件库
└── mail/         # @nemo-cli/mail - 邮件服务
```

### Technology Stack

- **Language:** TypeScript ^5.9.3
- **Runtime:** Node.js ^20.19.0 || >=22.12.0
- **Package Manager:** pnpm (Monorepo)
- **Build:** Rolldown 1.0.0-beta.52
- **CLI Framework:** Commander.js ^12.0.0
- **Prompts:** @clack/prompts ^0.8.0
- **TUI:** Ink ^4.4.0
- **Testing:** Vitest
- **Linting:** Biome

## Current Objectives

### MVP Priority: Git 模块智能化深化

Focus on implementing the following features (see fix_plan.md for details):

1. **分支级别 Stash 管理** - 自动 stash/pop，分支上下文记忆
2. **Pull 安全模式** - 自动检测并保护未提交更改
3. **Push 安全模式** - 自动 pull 预检查，避免推送过时代码
4. **Rebase 工作流优化** - 智能检测历史重写，安全处理 force push
5. **统一的帮助系统** - 支持零文档依赖
6. **基础错误处理和恢复** - 保证可靠性

### Architecture Implementation

Create new service layer for Git module:

- `StashManager` - 分支级 Stash 管理服务
- `PullService` - Pull 安全模式服务
- `PushService` - Push 安全模式服务
- `RebaseService` - Rebase 工作流服务

Plus supporting layers:
- Utils: `stash-utils.ts`, `conflict-handler.ts`, `history-detector.ts`
- Config: `loader.ts`, `validator.ts`, `defaults.ts`
- Logging: `operation-logger.ts`, `history-manager.ts`

## Key Principles

- **ONE task per loop** - Focus on the most important thing
- **Search the codebase** before assuming something isn't implemented
- **Write comprehensive tests** with clear documentation
- **Update fix_plan.md** with your learnings
- **Commit working changes** with descriptive messages

## Testing Guidelines

- **LIMIT testing to ~20%** of your total effort per loop
- **PRIORITIZE:** Implementation > Documentation > Tests
- **ONLY write tests for NEW functionality** you implement
- **Target coverage:** > 80% for new code
- **Test types:** Unit tests + Integration tests

## Build & Run

See AGENT.md for build and run instructions.

## Development Workflow

### 1. Before Starting Work

**MANDATORY Skill Invocation:**

1. **For New Features/Creative Work:**
   - Invoke `brainstorming` skill FIRST to explore approaches
   - Invoke `plan` skill to create implementation plan
   - Wait for user approval before starting implementation

2. **For Bug Fixes:**
   - Invoke `systematic-debugging` skill to investigate root cause
   - Use `tdd` skill to write failing test first
   - Then implement fix

**Pre-Work Checklist:**

- Read the relevant sections in `/_bmad-output/`:
  - `prd.md` - Product requirements
  - `architecture.md` - Technical architecture
  - `development-guide.md` - Development guidelines
  - `mcp-and-skills-guide.md` - MCP & Skills usage guide
- Check `fix_plan.md` for current priorities
- Search the codebase for existing implementations
- Start MCP server if needed: `pnpm run --filter=@nemo-cli/ai dev`

### 2. During Implementation

**MANDATORY Skill Usage:**

1. **Start with TDD:**
   - Invoke `tdd` skill BEFORE writing any implementation code
   - Write tests FIRST (RED)
   - Implement to pass tests (GREEN)
   - Refactor (IMPROVE)

2. **Follow Architecture Patterns:**
   - Follow the architecture patterns defined in `architecture.md`
   - Use shared utilities from `@nemo-cli/shared`
   - Use UI components from `@nemo-cli/ui`
   - Maintain consistency with existing commands

3. **Code Quality:**
   - Write code that follows the consistency rules:
     - File naming: `kebab-case.ts`
     - Function naming: `camelCase`, verb-first
     - Variable naming: `camelCase`
     - Constants: `UPPER_SNAKE_CASE`
     - Types/Interfaces: `PascalCase`

4. **Use MCP Tools:**
   - Query documentation via Confluence MCP when needed
   - Use Swagger MCP to parse API specs if integrating APIs

### 3. After Implementation

**MANDATORY Reviews:**

1. **Code Review:**
   - Invoke `code-review` skill IMMEDIATELY after writing code
   - Address CRITICAL and HIGH issues
   - Fix MEDIUM issues when possible

2. **Security Review:**
   - Invoke `security-review` skill for:
     - Authentication/authorization features
     - User input handling
     - API endpoints
     - Sensitive data operations

3. **Verification:**
   - Invoke `verification-before-completion` skill before claiming completion
   - Run all tests: `pnpm test`
   - Check code coverage: `pnpm coverage`
   - Run linting: `pnpm check`

4. **Documentation:**
   - Update `fix_plan.md` with completed tasks
   - Add comments to complex code
   - Update relevant documentation

4. **Documentation:**
   - Update `fix_plan.md` with completed tasks
   - Add comments to complex code
   - Update relevant documentation

### 4. Error Handling & Configuration

**Error Handling:**
- All errors must have clear error messages with recovery suggestions
- Use structured logging for all operations
- Maintain data integrity (zero data loss)
- All automatic operations must preserve user data on failure

**Configuration:**
- Support multi-level configuration (global > project > defaults)
- Global config: `~/.nemoclirc/git/config.json`
- Project config: `.nemo-cli/git.json`
- Config changes must take effect immediately

**Performance Requirements:**
- Branch switch: < 500ms (including stash operations)
- Command startup (cold): < 200ms
- Command startup (warm): < 100ms
- Stash retrieval: < 100ms

## Code Quality Standards

### Consistency Rules

1. **Directory Structure:**
   - `commands/` - CLI command implementations
   - `services/` - Business logic layer
   - `utils/` - Utility functions
   - `config/` - Configuration management
   - `logging/` - Logging layer
   - `__tests__/` - Test files (mirror source structure)

2. **File Organization:**
   - Each file has one primary responsibility
   - Related functionality in same directory
   - Avoid circular dependencies

3. **Date/Time Format:**
   - Storage: ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`)
   - Display: Relative time (e.g., "2 分钟前")

4. **Git Operations:**
   - All Git operations through `@nemo-cli/shared`
   - Check errors and handle appropriately
   - Log all operations

### Logging Strategy

- Log levels: `verbose`, `info`, `warn`, `error`
- Log format: `{ timestamp, level, message, context?, error? }`
- Storage: `~/.nemoclirc/git/operation-history.json`
- Retention: Last 100 operations (configurable)

## Status Reporting (CRITICAL)

At the end of your response, ALWAYS include this status block:

```
---RALPH_STATUS---
STATUS: IN_PROGRESS | COMPLETE | BLOCKED
TASKS_COMPLETED_THIS_LOOP: <number>
FILES_MODIFIED: <number>
TESTS_STATUS: PASSING | FAILING | NOT_RUN
WORK_TYPE: IMPLEMENTATION | TESTING | DOCUMENTATION | REFACTORING
EXIT_SIGNAL: false | true
RECOMMENDATION: <one line summary of what to do next>
---END_RALPH_STATUS---
```

## Current Task

Follow `fix_plan.md` and choose the most important item to implement next.

### Next Steps

1. Implement `StashManager` service for branch-level stash management
2. Add stash metadata tracking using Configstore
3. Implement `PullService` with automatic stash → pull → pop
4. Add `PushService` with pre-check for remote updates
5. Implement `RebaseService` with history rewrite detection
6. Enhance help system for all commands
7. Add comprehensive error handling and recovery

## Important Notes

- **Zero data loss** is the highest priority
- **All dangerous operations** (force push, etc.) require user confirmation
- **100% backward compatibility** with existing commands
- **All operations must be logged** for traceability
- **Context-aware help** should reduce need for external documentation

## Reference Documents

### Core Project Documents
- PRD: `/_bmad-output/prd.md` - Complete product requirements
- Architecture: `/_bmad-output/architecture.md` - Technical architecture and patterns
- Development Guide: `/_bmad-output/development-guide.md` - Development workflow
- Project Context: `/_bmad-output/project-context.md` - Project overview
- Fix Plan: `.ralph/fix_plan.md` - Current tasks and priorities

### Ralph AI Specific
- Agent Config: `.ralph/AGENT.md` - Build, test, and run instructions
- MCP & Skills Guide: `.ralph/docs/mcp-and-skills-guide.md` - MCP servers and Skills usage
- Project Overview: `.ralph/docs/project-overview.md` - Quick project reference
- Git Architecture: `.ralph/docs/git-architecture-reference.md` - Git module architecture
- Coding Standards: `.ralph/docs/coding-standards.md` - Code style and best practices
