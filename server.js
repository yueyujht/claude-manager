/**
 * server.js — Claude管家仪表盘后端入口
 * 提供 REST API + 静态文件服务
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件服务（前端页面）
app.use(express.static(path.join(__dirname, 'public')));

// ========== API 路由注册 ==========
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/tokens',    require('./routes/tokens'));
app.use('/api/skills',    require('./routes/skills'));
app.use('/api/plugins',   require('./routes/plugins'));
app.use('/api/sessions',  require('./routes/sessions'));
app.use('/api/projects',  require('./routes/projects'));
app.use('/api/config',    require('./routes/config'));
app.use('/api/memory',    require('./routes/memory'));
app.use('/api/history',   require('./routes/history'));
app.use('/api/plans',     require('./routes/plans'));

// 404 处理
app.use((req, res) => {
  res.status(404).json({ success: false, error: '接口不存在' });
});

// 启动服务
app.listen(config.PORT, config.HOST, () => {
  console.log('═══════════════════════════════════════');
  console.log('  🔵 Claude管家 仪表盘已启动');
  console.log(`  ➡  http://${config.HOST}:${config.PORT}`);
  console.log(`  📂 数据源: ${config.CLAUDE_HOME}`);
  console.log('  按 Ctrl+C 停止服务');
  console.log('═══════════════════════════════════════');
});
