# claude管家

## 项目简介

Claude管家 —— Claude Code 状态仪表盘，全面展示 Claude Code 的运行状态。

包含功能：
- 📊 仪表盘概览（Token 统计、会话数、技能数、项目数）
- 📈 Token 使用详情（按模型、日期、项目的完整统计 + 图表）
- 🛠 技能库浏览（22 个已安装技能）
- 🔌 插件管理（已安装插件 + 市场信息）
- 💬 会话列表（活跃会话 PID、入口、版本）
- 📁 项目管理（6 个项目，含记忆文件、会话 JSONL）
- ⚙ 配置查看（CLAUDE.md + 脱敏 settings.json）
- 🧠 Memory 记忆库（4 条记忆，按项目分组）
- 📋 命令历史（711 条，分页搜索）
- 📝 执行计划（12 个计划文件）

## 技术栈

- **后端**: Node.js + Express 5
- **前端**: 纯 HTML/CSS/JS + Chart.js + marked.js
- **样式**: 深色主题（CSS 变量）

## 目录结构

```
claude管家/
├── CLAUDE.md              # 本文件
├── document/              # 文档目录
│   └── 仪表盘实现方案.md
├── package.json           # 项目配置
├── config.js              # 数据源路径配置
├── server.js              # Express 后端入口
├── routes/                # API 路由（10个）
│   ├── dashboard.js       # 仪表盘汇总
│   ├── tokens.js          # Token 统计
│   ├── skills.js          # 技能列表
│   ├── plugins.js         # 插件信息
│   ├── sessions.js        # 会话列表
│   ├── projects.js        # 项目列表
│   ├── config.js          # 配置查看
│   ├── memory.js          # 记忆库
│   ├── history.js         # 命令历史
│   └── plans.js           # 执行计划
└── public/                # 前端
    ├── index.html         # 单页应用入口
    ├── css/style.css      # 深色主题
    └── js/                # 页面逻辑（11个）
```

## 启动方式

```bash
cd e:\ai_project\claude管家
npm start
# 浏览器打开 → http://localhost:3000
```

## 全局规范

本项目遵循全局 CLAUDE.md 中定义的通用规范，详见 `~/.claude/CLAUDE.md`
