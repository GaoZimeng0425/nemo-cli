# Ralph Fix Plan - nemo-cli 智能化深化

## 项目概述

**项目名称:** nemo-cli
**核心目标:** 通过智能推断和自动编排，让命令行操作像思考一样自然
**当前分支:** feature/dependency
**更新日期:** 2026-02-04

## MVP 核心任务（高优先级）

### Git 模块智能化深化（核心）

- [ ] **分支级别 Stash 管理**
  - 自动检测未提交更改并执行 stash
  - Stash 消息中记录来源分支：`[ng-auto] branch:{branchName} timestamp:{iso8601}`
  - 切换回分支时自动识别并 pop 对应的 stash
  - 按分支分组显示 stash 列表
  - pop 时冲突处理：提示用户手动解决并保留 stash

- [ ] **Pull 安全模式**
  - 自动检测未提交更改
  - 执行 stash → pull → pop 序列
  - 支持 merge/rebase 策略选择
  - pop 冲突时显示冲突文件列表和解决建议

- [ ] **Push 安全模式**
  - push 前检查远程是否有新提交
  - 如有新提交，自动执行 pull（使用配置的策略）
  - pull 成功后自动执行 push
  - force push 选项（用于 rebase 后场景）
  - force push 前显示警告并要求确认

- [ ] **Rebase 工作流优化**
  - 检测历史重写（基于 git log 比较）
  - 提示需要 force push
  - 提供选项：force push / 查看差异 / 取消操作
  - 执行 `git push --force-with-lease`

### 统一的帮助系统

- [ ] **增强 Commander.js 帮助系统**
  - 所有命令支持 `--help` 选项
  - 提供上下文相关的操作提醒
  - 帮助信息清晰、简洁，覆盖 95% 使用场景
  - 根据当前上下文提供相关命令建议

- [ ] **零文档依赖支持**
  - `--help` 使用率目标 < 10%
  - 首次使用 5 分钟内完成第一个任务
  - 90% 日常操作无需查阅文档

### 基础错误处理和恢复

- [ ] **统一错误处理模式**
  - 关键路径异常场景有明确处理
  - 清晰的错误信息，包含恢复建议
  - 操作日志记录（100% 覆盖率）
  - 所有错误可追溯

- [ ] **数据完整性保证**
  - 零数据丢失（100%）
  - 操作失败时保留用户数据
  - 自动恢复率 > 90%

## 次要任务（中优先级）

### AI 模块智能化深化

- [ ] 智能推断用户意图，减少交互步骤
- [ ] 上下文感知的 AI 操作建议
- [ ] Git + AI 集成（跨模块协同）

### Package 模块智能化

- [ ] 智能依赖分析
- [ ] 冲突检测
- [ ] 升级建议
- [ ] 统一的交互模式

### File 模块智能化

- [ ] 智能文件操作
- [ ] AST 分析增强
- [ ] 统一的交互模式

### 跨模块协同能力

- [ ] Git + Package：提交时自动检测依赖变更
- [ ] Git + File：文件操作与版本控制协同
- [ ] AI + 各模块：智能操作建议和自动化

## 配置与个性化

- [ ] **多层级配置加载器**
  - 全局配置：`~/.nemoclirc/git/config.json`
  - 项目级配置：`.nemo-cli/git.json`
  - 配置优先级：项目级 > 全局 > 默认值
  - 配置变更立即生效

- [ ] **可配置项**
  - Pull 策略（merge/rebase）
  - 自动 stash 功能开关
  - Stash 消息格式模板
  - 默认输出格式

## 架构实现

### 新增服务层

- [ ] `StashManager` - 分支级 Stash 管理服务
  - `createBranchStash(branchName)` - 创建分支 stash
  - `findBranchStash(branchName)` - 查找分支 stash
  - `autoPopBranchStash(branchName)` - 自动 pop stash
  - `deleteBranchStash(branchName, stashRef)` - 删除 stash

- [ ] `PullService` - Pull 安全模式服务
  - `safePull(branch, options)` - 安全 pull
  - `hasUncommittedChanges()` - 检测未提交更改
  - `handlePullConflict(conflictFiles)` - 处理冲突

- [ ] `PushService` - Push 安全模式服务
  - `safePush(branch, options)` - 安全 push
  - `hasRemoteUpdates(branch)` - 检测远程更新

- [ ] `RebaseService` - Rebase 工作流服务
  - `detectHistoryRewrite(branch)` - 检测历史重写
  - `safeForcePush(branch)` - 安全 force push
  - `showDiffPreview(branch)` - 显示差异预览

### 新增工具层

- [ ] `stash-utils.ts` - Stash 工具函数
- [ ] `conflict-handler.ts` - 冲突处理
- [ ] `history-detector.ts` - 历史重写检测

### 新增配置层

- [ ] `config/loader.ts` - 配置加载器
- [ ] `config/validator.ts` - 配置验证
- [ ] `config/defaults.ts` - 默认配置

### 新增日志层

- [ ] `logging/operation-logger.ts` - 操作日志记录
- [ ] `logging/history-manager.ts` - 操作历史管理

## 测试要求

### 单元测试

- [ ] 服务层测试覆盖率 > 80%
- [ ] 工具层测试覆盖率 > 80%
- [ ] 命令层测试覆盖率 > 80%

### 集成测试

- [ ] Pull/Push 安全模式端到端测试
- [ ] Stash 管理端到端测试
- [ ] Rebase 工作流端到端测试

### 性能测试

- [ ] 分支切换 < 500ms（包含 stash 操作）
- [ ] 命令启动 < 200ms（冷启动）
- [ ] Stash 检索 < 100ms

## 技术债务

- [ ] 重构现有命令以使用新的服务层
- [ ] 统一错误处理模式
- [ ] 完善文档覆盖率（API 文档 100%）
- [ ] 优化性能以满足 NFR 要求

## 成功标准

### 用户成功
- [ ] 90% 以上日常操作无需查阅文档
- [ ] 命令执行成功率 > 95%
- [ ] 首次使用到首次成功操作 < 5 分钟

### 技术成功
- [ ] 代码覆盖率 > 80%
- [ ] 圈复杂度 < 10
- [ ] 操作成功率 > 99%
- [ ] 数据完整性 100%（零数据丢失）

### 团队采用
- [ ] 1 个月内 50% 团队成员使用
- [ ] 3 个月内 80% 团队成员使用
- [ ] 成为团队标准工作流

## 已完成

- [x] 项目已启用 Ralph
- [x] PRD 文档已完成
- [x] 架构文档已完成
- [x] 开发指南已完成
- [x] 基础 Git 命令已实现（commit, checkout, branch, stash, pull, push 等）

## 备注

- 优先实现 Git 模块智能化深化功能
- 确保所有操作都记录日志
- 遵循"意图优先"的设计理念
- 保持与现有命令的向后兼容性（100%）
- 所有危险操作（如 force push）需要用户确认

## 参考文档

- PRD: `/_bmad-output/prd.md`
- 架构: `/_bmad-output/architecture.md`
- 开发指南: `/_bmad-output/development-guide.md`
- 项目上下文: `/_bmad-output/project-context.md`
