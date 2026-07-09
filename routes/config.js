/**
 * routes/config.js — 配置查看 API
 * 返回 CLAUDE.md 和脱敏后的 settings
 */
const router = require('express').Router();
const fs = require('fs');
const config = require('../config');

// GET /api/config/claude-md — 全局 CLAUDE.md
router.get('/claude-md', (req, res) => {
  try {
    const content = fs.readFileSync(config.PATHS.claudeMd, 'utf-8');
    res.json({ success: true, data: { content, path: config.PATHS.claudeMd } });
  } catch (err) {
    res.json({ success: false, error: '读取 CLAUDE.md 失败: ' + err.message });
  }
});

// GET /api/config/settings — settings.json（脱敏）
router.get('/settings', (req, res) => {
  try {
    const raw = JSON.parse(fs.readFileSync(config.PATHS.settings, 'utf-8'));

    // 脱敏处理：隐藏敏感信息
    const safe = JSON.parse(JSON.stringify(raw));
    if (safe.env) {
      // 隐藏 API Token
      if (safe.env.ANTHROPIC_AUTH_TOKEN) {
        const t = safe.env.ANTHROPIC_AUTH_TOKEN;
        if (t.length > 8) {
          safe.env.ANTHROPIC_AUTH_TOKEN = t.substring(0, 4) + '...' + t.substring(t.length - 4);
        } else {
          safe.env.ANTHROPIC_AUTH_TOKEN = '***';
        }
      }
      // 标记其他敏感字段
      ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GITHUB_TOKEN'].forEach(key => {
        if (safe.env[key]) safe.env[key] = '***已隐藏***';
      });
    }

    res.json({ success: true, data: safe });
  } catch (err) {
    res.json({ success: false, error: '读取 settings.json 失败: ' + err.message });
  }
});

module.exports = router;
