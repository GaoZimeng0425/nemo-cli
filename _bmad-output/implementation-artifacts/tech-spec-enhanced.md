---
title: 'Enhanced ng blame interactive commit navigator'
slug: 'enhanced-ng-blame-interactive-commit-navigator'
created: '2026-02-02T10:33:00+08:00'
status: 'review'
stepsCompleted: [1, 2, 3]
tech_stack: ['TypeScript', 'Node.js LTS', 'Vitest', 'Winston', 'Chalk', '@clack/prompts', 'TinyExec']
files_to_modify: ['packages/git/src/commands/blame.ts']
code_patterns: ['Async/await error handling', 'Promise-based git command execution', 'Interactive CLI with @clack/prompts', 'Winston logging with colors', 'TypeScript strict mode']
test_patterns: ['Unit tests with Vitest', 'E2E testing with test git repository', 'Manual testing scenarios']
---

# Tech-Spec: Enhanced ng blame interactive commit navigator

**Created:** 2026-02-02T10:33:00+08:00

**Party Mode Enhancement:** 通过 BMad 智能体团队深度讨论，明确了实现细节、边界情况处理、测试策略、性能优化和错误处理。

## Overview

### Problem Statement

当前 `ng blame` 功能存在以下问题：
1. 只显示文件历史提交记录列表（提交信息），没有 diff 内容
2. 无法查看每次提交的具体修改内容
3. 无法在历次提交之间导航对比
4. 用户体验不符合 `git show --patch` 的标准

### Solution

重构 `ng blame` 为交互式提交导航器，实现以下功能：
1. 获取文件的历次提交，每个提交包含完整的 diff（通过 `git log -p`）
2. 一次只显示一个提交的完整信息（哈希、作者、日期、消息、diff）
3. 支持在历次提交之间导航：
   - `n` - 下一个提交（时间轴向前）
   - `p` - 上一个提交（时间轴向后）
   - `j` - 跳转到指定提交编号
   - `q` - 退出

### Scope

**In Scope:**
- 重构 `handleBlame` 函数，使用 `git log -p` 获取提交列表
- 重构 `enterInteractiveBlameMode` 函数，实现单提交导航交互
- 添加 `parseCommitsFromLog` 函数，解析 `git log -p` 输出（使用 `\x00` 分隔符）
- 添加 `showCommit` 函数，显示单个提交的完整信息和 diff
- 实现导航功能（n/p 切换，j 跳转）
- 添加缓存机制，避免重复调用 `git log`
- 处理边界情况：二进制文件、大 diff、空历史

**Out of Scope:**
- 逐行 blame 信息（显示每行的提交信息）
- 双提交并排对比（side-by-side）
- 范围对比（选择任意两个提交对比）
- 提交列表的搜索/过滤功能
- 跨文件对比

## Context for Development

### Codebase Patterns

1. **错误处理模式**：使用 `xASync` 包装异步 git 命令，统一错误处理
2. **交互式 UI 模式**：使用 `createCheckbox` 和 `createSelect` 进行用户交互（来自 `@nemo-cli/shared`）
3. **日志输出**：使用 `log.show` 和 `colors` 进行带颜色的终端输出
4. **文件解析模式**：解析命令输出时使用 `split('\n')` 和 `filter(Boolean)` 清理数据
5. **数据结构**：使用对象数组存储提交信息

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `packages/git/src/commands/blame.ts` | 当前 blame 实现文件，需要重构 |
| `packages/git/src/commands/diff.ts` | 参考 diff 命令的 git 调用方式 |
| `packages/shared/src/index.ts` | 共享工具函数入口（xASync, createCheckbox, log, colors） |
| `packages/shared/src/utils/command.ts` | xASync 命令执行函数 |
| `packages/shared/src/utils/prompts.ts` | createCheckbox 交互函数 |
| `packages/shared/src/utils/log.ts` | log.show 日志函数和清屏功能 |
| `packages/shared/src/utils/color.ts` | colors 颜色工具函数 |

### Technical Decisions

**从 Party Mode 深度讨论和代码分析得出的决策：**

1. **使用 `git log -p` 而不是 `git blame`**：直接获取历次提交及其 diff，性能更好，数据结构更简单
2. **单提交导航模式**：一次只显示一个提交的 diff，用 n/p 切换，简单直观
3. **保留 `blame` 命令名**：虽然功能改变，但用户习惯 `ng blame`，保持命令名不变
4. **安全的分隔符策略**：使用 `\x00`（null 字符）分隔 commit 头信息，避免消息中的 `|` 字符破坏解析
   ```typescript
   const prettyFormat = '%H%x00%an%x00%ad%x00%s'
   ```
5. **简单交互**：不使用复杂状态管理，用 `currentIndex` 变量跟踪当前提交位置
6. **缓存策略**：
   - 在 `handleBlame` 层级缓存 `commits` 数组
   - 避免每次导航时重新调用 `git log -p`
   - 用 `cachedCommits` 变量存储，初始值为 null
7. **并发安全**：`createCheckbox` 本身是阻塞的，无需额外的并发控制，避免快速按键导致的竞态条件
8. **二进制文件处理**：检测 "Binary files differ" 字符串，显示友好提示而不是 diff 乱码
9. **大 diff 限制**：限制 diff 显示为 50 行，避免终端刷屏，超过部分提示 "... (truncated)"
10. **工具函数约束**：只能使用 `@nemo-cli/shared` 的已有工具，不添加新依赖

## Implementation Plan

### Tasks

1. **重构 `handleBlame` 函数**
   - 移除 `git blame --line-porcelain` 调用
   - 改用 `git log --follow -p --pretty=format:%H%x00%an%x00%ad%x00%s -- <file>`
   - 添加缓存逻辑：
     ```typescript
     let cachedCommits: Array<Commit> | null = null
     if (!cachedCommits) {
       const [error, result] = await xASync('git', ['log', '-p', '--pretty=format:%H%x00%an%x00%ad%x00%s', '--', filePath])
       if (error) {
         handleError(error, 'git log')
         return
       }
       cachedCommits = parseCommitsFromLog(result.stdout)
     }
     ```
   - 调用 `parseCommitsFromLog` 解析输出
   - 验证至少有一个提交，否则提示用户

2. **实现 `parseCommitsFromLog` 函数**
   - 接收参数：`logOutput: string`
   - 用 `split('diff --git')` 分开每个提交
   - 解析每个提交的 header（使用 `\x00` 分隔符）：
     ```typescript
     const [hash, author, date, message] = header.split('\x00')
     if (!hash) return // 跳过空行
     ```
   - 提取 commit hash（前 8 字符）
   - 剩余部分为 diff 内容（标准 git diff 格式）
   - 返回：`Array<{ hash, author, date, message, diff }>`

3. **实现 `showCommit` 函数**
   - 接收参数：`commit: { hash, author, date, message, diff }`, `index: number`, `total: number`
   - 清屏：使用 `log.clearScreen()`
   - 显示提交信息：
     ```typescript
     log.show(`📝 Commit ${index + 1}/${total}`)
     log.show(`${colors.cyan(commit.hash)} - ${colors.yellow(commit.author)} - ${colors.dim(commit.date)}`)
     log.show(`${commit.message}`)
     log.show(colors.bold('--- Diff ---'))
     ```
   - 检查并处理二进制文件：
     ```typescript
     const isBinary = commit.diff.includes('Binary files differ')
     if (isBinary) {
       log.show('📄 Binary file - diff not available')
       log.show(commit.diff)
     } else {
       // 处理大 diff 限制
       const maxLines = 50
       const diffLines = commit.diff.split('\n')
       if (diffLines.length > maxLines) {
         log.show(colors.dim(`(Showing first ${maxLines} lines of ${diffLines.length})`))
         log.show(diffLines.slice(0, maxLines).join('\n'))
         log.show(colors.dim('\n... (truncated)'))
       } else {
         log.show(commit.diff)
       }
     }
     ```
   - 显示导航提示：
     ```typescript
     log.show(colors.bold('\n--- Actions ---'))
     log.show('[n] Next commit [p] Previous commit [j] Jump [q] Quit')
     ```

4. **重构 `enterInteractiveBlameMode` 函数**
   - 接收参数：`filePath: string`, `commits: Array<{ hash, author, date, message, diff }>`
   - 添加 `currentIndex` 变量，初始值为 0（最新提交）
   - 实现主循环：
     ```typescript
     let currentIndex = 0
     while (true) {
       await showCommit(commits[currentIndex], currentIndex + 1, commits.length)
       const input = await createCheckbox({
         message: 'Enter action:',
         options: [
           { label: 'Next commit', value: 'n' },
           { label: 'Previous commit', value: 'p' },
           { label: 'Jump to commit', value: 'j' },
           { label: 'Quit', value: 'q' }
         ]
       })
       if (input[0] === 'q') exit(0)
       if (input[0] === 'n' && currentIndex < commits.length - 1) currentIndex++
       if (input[0] === 'p' && currentIndex > 0) currentIndex--
       if (input[0] === 'j') {
         // 提示输入数字
         log.show('Enter commit number (1-10):')
         const jumpInput = await readUserInput()
         const jumpNum = parseInt(jumpInput)
         if (!isNaN(jumpNum) && jumpNum >= 1 && jumpNum <= commits.length) {
           currentIndex = jumpNum - 1
         } else {
           log.show(`Invalid number. Please enter 1-${commits.length}`, { type: 'error' })
         }
       }
     }
     ```
   - 边界检查：不允许 currentIndex 超出范围
   - 注意：`createCheckbox` 本身阻塞，无需额外的并发控制
   - 注意：`readUserInput` 需要实现，因为 `createCheckbox` 不支持数字输入

5. **实现 `readUserInput` 辅助函数**
   - 使用 Node.js 原生的 `readline` 模块读取用户输入
   - 返回 Promise<string>
   - 处理取消操作（Ctrl+C）

6. **添加错误处理**
   - 实现 `handleGitError(error: Error, context: string)` 函数：
     ```typescript
     const handleGitError = (error: Error, context: string) => {
       const errorMessage = error.message || String(error)
       if (errorMessage.includes('not a git repository')) {
         log.show(`❌ Error: ${context} is not in a git repository`, { type: 'error' })
         return
       }
       if (errorMessage.includes('does not exist')) {
         log.show(`❌ Error: ${context} - file not found`, { type: 'error' })
         return
       }
       log.show(`❌ Error: ${errorMessage}`, { type: 'error' })
     }
     ```
   - 处理文件不存在的情况（先检查文件存在）
   - 处理没有 git 历史的情况（`git log` 返回空）
   - 处理 `git log` 命令失败的情况
   - 处理跳转编号超出范围的情况

7. **优化用户体验**
   - 添加提交计数显示（当前/总数）：`Commit 3/10`
   - 添加欢迎信息：
     ```typescript
     log.show(colors.bold(`Found ${commits.length} commits for ${filePath}`))
     log.show(colors.dim('Use [n/p] to navigate, [j] to jump, [q] to quit'))
     ```
   - 添加边界提示：第一个提交时 `p` 选项显示但说明无效，最后一个提交时 `n` 选项显示但说明无效
   - 添加帮助提示：首次使用时显示操作说明（已在欢迎信息中包含）

### Acceptance Criteria

**AC1: 获取并解析提交列表**
- Given: 用户执行 `ng blame <file>`
- When: 文件有 git 历史
- Then: 应成功获取历次提交列表
- And: 每个提交包含 hash, author, date, message, diff
- And: 按时间倒序排列（最新在前）
- And: 正确处理包含 `|` 字符的消息（使用 `\x00` 分隔符）

**AC2: 显示单个提交**
- Given: 用户在交互模式中
- When: 显示某个提交
- Then: 应显示完整信息（哈希、作者、日期、消息、diff）
- And: 使用颜色区分不同信息类型
- And: diff 格式符合 git 标准（红色删除、绿色添加）
- And: 提交列表显示当前/总数（如 `Commit 3/10`）
- And: 每次显示前清屏（`log.clearScreen()`），避免历史堆叠

**AC3: 导航功能**
- Given: 用户在交互模式中
- When: 用户输入 `n`
- Then: 应移动到下一个提交（索引 + 1）
- And: 在最后一个提交时，`n` 选项仍然显示但无效（或提示已是最新提交）
- And: 显示新的提交信息

- Given: 用户在交互模式中
- When: 用户输入 `p`
- Then: 应移动到上一个提交（索引 - 1）
- And: 在第一个提交时，`p` 选项仍然显示但无效（或提示已是最早提交）
- And: 显示新的提交信息

**AC4: 跳转功能**
- Given: 用户在交互模式中
- When: 用户输入 `j`
- Then: 应提示输入提交编号（1-N）
- And: 验证编号在有效范围内
- And: 跳转到指定提交
- And: 显示该提交信息
- And: 如果输入无效，提示错误并保持当前提交不变

**AC5: 退出功能**
- Given: 用户在任何时候输入 `q`
- Then: 应立即退出程序（exit code 0）

**AC6: 错误处理**
- Given: 文件不存在
- When: 用户执行 `ng blame <file>`
- Then: 应显示友好的错误提示
- And: 应明确说明文件路径

- Given: 文件存在但不在 git 仓库中
- When: 用户执行 `ng blame <file>`
- Then: 应显示 "not in a git repository" 错误
- And: 不应该崩溃或显示堆栈跟踪

- Given: git 命令失败（网络、权限等）
- When: 执行 git 操作
- Then: 应显示错误消息
- And: 应该优雅降级而不是崩溃

**AC7: 二进制文件处理**
- Given: 文件是二进制文件
- When: 显示包含该文件的提交
- Then: 应检测 "Binary files differ" 字符串
- And: 应显示 "Binary file - diff not available" 提示
- And: 仍然显示 git 的原始输出

**AC8: 大 diff 限制**
- Given: 某个提交的 diff 超过 50 行
- When: 显示该提交
- Then: 应只显示前 50 行
- And: 应提示 "(Showing first 50 lines of 123)"
- And: 应显示 "... (truncated)" 结尾标记

## Additional Context

### Dependencies

- `@nemo-cli/shared` - 共享工具函数（已存在）
- `readline` - Node.js 原生模块（用于 `readUserInput` 函数）
- 无额外外部依赖需要安装

### Testing Strategy

1. **单元测试**（使用 Vitest）：
   - 文件：`packages/git/__tests__/blame.test.ts`
   - 测试 `parseCommitsFromLog` 函数正确解析 `git log -p` 输出：
     - 测试单个提交
     - 测试多个提交
     - 测试空输入
     - 测试包含 `|` 字符的消息
     - 测试包含 `\n` 字符的消息
   - 测试 `showCommit` 函数正确处理：
     - 正常提交
     - 二进制文件（检测 "Binary files differ"）
     - 大 diff（超过 50 行）
   - 测试 `readUserInput` 函数正确读取和处理输入
   - 测试验证逻辑：
     - 有效跳转编号
     - 无效跳转编号（超出范围、非数字）
     - 边界跳转（第一个和最后一个）

2. **集成测试**（限制 MVP v1）：
   - 测试 `ng blame` 命令能正确启动交互模式
   - 测试错误处理：
     - 文件不存在
     - 非 git 仓库
     - 空历史（没有提交）
   - 注意：完整的交互流程（导航、跳转）不要求自动化，通过手动测试验证

3. **E2E 测试**（补充单元测试）：
   - 创建测试 git 仓库（setup）
   - 执行初始提交（添加文件、commit）
   - 验证 `handleBlame` 能获取提交
   - 验证错误处理逻辑
   - 清理测试环境（teardown）
   - 注意：E2E 测试覆盖边界和错误处理，不要求完整的交互自动化

4. **手动测试场景**：
   - 使用真实仓库测试导航功能（n/p 切换）
   - 测试跳转功能（j 跳转）
   - 测试边界情况（第一个/最后一个提交）
   - 测试包含重命名历史的文件
   - 测试跨平台兼容性（macOS/Linux/Windows）
   - 测试大文件的 diff 显示性能
   - 测试二进制文件的处理
   - 测试网络问题（远程 git 仓库）

### Notes

**从 Party Mode 深度讨论和代码分析得出的关键点：**

1. **性能考虑**：
   - ✅ 缓存 `commits` 数组，避免重复调用 `git log -p`
   - ✅ 延迟解析 `git log -p`（只在第一次）
   - ❓ diff 分页（需要用户反馈：50 行限制是否合适？）
2. **终端限制**：
   - 考虑终端宽度限制（通常 80-120 列），长消息可能需要截断
   - 大 diff 限制为 50 行，避免刷屏
3. **diff 解析**：
   - ✅ 不需要自己实现 diff 算法，直接显示 `git log -p` 的输出，因为它已经是标准 diff 格式
   - ✅ 使用 `\x00` 分隔符，避免消息中的 `|` 字符破坏解析
4. **用户体验**：
   - ✅ 参考 `git log --patch --interactive` 的体验，我们提供类似但更友好的界面
   - ✅ 添加欢迎信息，说明操作方式
   - ✅ 每次显示前清屏（`log.clearScreen()`）
   - ✅ 显示提交计数（当前/总数）
5. **命名考虑**：虽然功能是"提交导航"，但保留 `ng blame` 命令名，因为用户已经熟悉
6. **并发安全**：
   - ✅ `createCheckbox` 本身是阻塞的，无需额外的并发控制
   - ✅ 避免快速按键导致的竞态条件
7. **边界情况处理**：
   - ✅ 二进制文件：检测并友好提示
   - ✅ 大 diff：限制显示并提示截断
   - ✅ 空历史：验证并提示用户
   - ✅ 无效输入：验证并提示错误，不崩溃
8. **测试策略平衡**：
   - ✅ 单元测试：核心逻辑（parse, validate）
   - ✅ E2E 测试：错误处理和边界情况
   - ✅ 集成测试：命令启动和基本错误
   - ✅ 手动测试：完整交互流程和真实场景
9. **技术栈约束**：
   - TypeScript 严格模式（无 `any`，无 `@ts-ignore`）
   - 只使用 `@nemo-cli/shared` 的已有工具
   - Node.js 原生 `readline` 模块用于输入
