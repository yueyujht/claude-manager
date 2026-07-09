/**
 * config.js — Claude管家仪表盘配置
 * 集中管理数据源路径和服务配置
 */
const path = require('path');

// Claude Code 用户数据根目录
const CLAUDE_HOME = path.join(process.env.USERPROFILE || 'C:\\Users\\jht25', '.claude');

module.exports = {
  CLAUDE_HOME,
  PORT: 3000,
  HOST: '127.0.0.1',

  // 各数据源路径
  PATHS: {
    statsCache:   path.join(CLAUDE_HOME, 'stats-cache.json'),
    settings:     path.join(CLAUDE_HOME, 'settings.json'),
    claudeMd:     path.join(CLAUDE_HOME, 'claude.md'),
    history:      path.join(CLAUDE_HOME, 'history.jsonl'),
    skills:       path.join(CLAUDE_HOME, 'skills'),
    plugins:      path.join(CLAUDE_HOME, 'plugins', 'installed_plugins.json'),
    sessions:     path.join(CLAUDE_HOME, 'sessions'),
    projects:     path.join(CLAUDE_HOME, 'projects'),
    plans:        path.join(CLAUDE_HOME, 'plans'),
    backups:      path.join(CLAUDE_HOME, 'backups'),
    telemetry:    path.join(CLAUDE_HOME, 'telemetry'),
    scheduledTasks: path.join(CLAUDE_HOME, 'scheduled_tasks.json'),
  }
};
