# ✅ 成功! Visualizer 已就绪

## 🎉 恭喜!服务器正在运行

你的可视化工具现在已经在运行了!

```
✓ 服务器地址: http://localhost:3000
✓ 浏览器应该已自动打开
```

## 📋 下一步:使用可视化工具

### 1️⃣ 在你的 Next.js 项目中生成依赖数据

```bash
cd /path/to/your-nextjs-app
nd analyze --format ai
```

这会生成: `ai-docs/deps.ai.json`

### 2️⃣ 在浏览器中加载数据

打开 http://localhost:3000,然后:

- **方式 A**: 拖拽 `ai-docs/deps.ai.json` 文件到页面上
- **方式 B**: 点击页面选择该文件

### 3️⃣ 开始探索!

- 🔍 **搜索**: 输入文件名查找节点
- 🎨 **过滤**: 点击顶部的 Scope 按钮
- 📄 **页面视图**: 选择"页面"查看特定路由
- 🔁 **循环视图**: 选择"循环"查看 SCC
- 🖱️ **点击节点**: 查看详情面板
- 📏 **拖拽**: 移动节点位置
- 🔎 **缩放**: 鼠标滚轮缩放

## 🎨 节点颜色说明

- 🔵 **蓝色** = App (应用代码)
- 🟢 **绿色** = Workspace (monorepo 包)
- ⚫ **灰色** = External (npm 包)
- 🟠 **橙色** = Internal (内部)
- 🟣 **紫色** = Other (其他)

## ⌨️ 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + F` | 聚焦搜索框 |
| `ESC` | 清除搜索/取消选择 |
| `+` / `-` | 放大/缩小 |
| `0` | 重置缩放 |
| `h + Enter` | 显示 Vite 帮助 |

## 🔄 重新启动

如果需要重启服务器:

```bash
# 停止当前服务器 (Ctrl+C)

# 重新启动
nd visualize --open
```

## 📝 完整工作流程

```bash
# 1. 进入你的 Next.js 项目
cd /path/to/your-nextjs-app

# 2. 分析依赖
nd analyze --format ai

# 3. 启动可视化工具
nd visualize --open

# 4. 在浏览器中加载 ai-docs/deps.ai.json

# 5. 开始探索依赖关系!
```

## 🐛 常见问题

### Q: 浏览器没有自动打开?
**A**: 手动访问 http://localhost:3000

### Q: 看到空白页面?
**A**:
1. 检查是否已加载 `deps.ai.json` 文件
2. 打开浏览器控制台查看错误
3. 尝试刷新页面

### Q: 找不到 deps.ai.json?
**A**:
```bash
# 查看文件位置
find . -name "deps.ai.json"

# 重新生成
nd analyze --format ai
```

### Q: 端口 3000 被占用?
**A**:
```bash
# 使用其他端口
nd visualize --port 3001 --open
```

## 🎯 核心功能

✅ **依赖关系可视化** - 交互式节点图
✅ **循环依赖检测** - SCC 高亮显示
✅ **智能筛选** - 按 Scope、页面过滤
✅ **快速搜索** - 实时搜索节点
✅ **详情面板** - 完整的节点信息
✅ **自动布局** - ELK 算法自动排列
✅ **响应式** - 支持不同屏幕尺寸

## 📚 更多文档

- **详细使用指南**: `USAGE.md`
- **快速开始**: `START-HERE.md`
- **项目 README**: `README.md`
- **开发文档**: `DEVELOPMENT.md`

---

**现在就开始探索你的项目依赖关系吧!** 🚀
