# ng show 功能

## 概述

`ng show` 命令提供交互式的 commit 查看体验，对标 `git show`，但具有更友好的用户界面。

## 使用方法

### 1. 交互模式（无参数）

显示最近的 commit 列表供选择：

```bash
ng show
```

- 显示最近 20 个 commit
- 使用 ↑↓ 或 j/k 键导航
- Enter 键选择 commit
- q 键退出

### 2. 直接模式（指定 hash）

直接查看指定 commit 的详情：

```bash
ng show abc1234
```

### 3. 限制显示数量

只显示最近 N 个 commit：

```bash
ng show -n 10
```

## 交互界面

### Commit 选择界面

```
┌─────────────────────────────────────┐
│     Recent Commits (20)             │
├─────────────────────────────────────┤
│ ● abc1234 Add new feature           │
│   (John Doe, 2 hours ago)           │
│                                     │
│   defg567 Fix bug in auth           │
│   (Jane Smith, 5 hours ago)         │
│                                     │
│   hij8901 Update docs               │
│   (Bob Wilson, 1 day ago)           │
│                                     │
│ ...                                 │
├─────────────────────────────────────┤
│ ↑↓/jk: Navigate | Enter: Select | q │
└─────────────────────────────────────┘
```

### Commit 详情界面

```
┌─ 左侧面板 (30%) ─────────────┬─ 右侧面板 (70%) ────────────────┐
│ Changed Files (5) ◀          │ abc1234 Add new feature         │
│                              │ (John Doe, 2 hours ago) ▶       │
│ ● src/index.ts               │ ─────────────────────────────   │
│                              │  diff --git a/src/index.ts     │
│   src/utils.ts               │  index 1234567..abcdefg 100644 │
│   src/types.ts               │  --- a/src/index.ts            │
│   README.md                  │  +++ b/src/index.ts            │
│                              │  @@ -10,7 +10,9 @@             │
│ ↑↓/jk Files | →/l Diff       │     export function foo() {    │
│ Enter/q                      │  +  export function bar() {    │
│                              │       return true               │
│                              │     }                          │
│                              │  ─────────────────────────────   │
└──────────────────────────────┴────────────────────────────────┘
```

## 键盘快捷键

### Commit 选择界面
- `↑↓` 或 `j/k`：上下导航
- `Enter`：选择当前 commit
- `q`：退出

### Commit 详情界面

#### 文件列表面板（左侧）
- `↑↓` 或 `j/k`：在文件列表中导航
- `→` 或 `l`：切换到 diff 面板
- `Enter` 或 `q`：退出

#### Diff 面板（右侧）
- `↑↓` 或 `j/k`：滚动 diff 内容
- `←` 或 `h`：切换回文件列表面板
- `Enter` 或 `q`：退出

## 特性

- ✅ 彩色 diff 高亮（绿色新增，红色删除）
- ✅ 分屏显示，高效浏览
- ✅ 支持 vim 风格快捷键
- ✅ 自动滚动，保持选中项可见
- ✅ 懒加载 diff，提升性能

## 示例

```bash
# 查看最近的 commit
ng show

# 查看指定 commit
ng show abc1234

# 只看最近 5 个 commit
ng show -n 5
```

## 技术实现

- 使用 React + Ink 构建终端 UI
- 参考 `ng status` 的交互模式
- 支持上下左右键盘导航
- 按需加载 diff 内容，优化性能
