/**
 * routes/sessions.js — 会话信息 API
 */
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const config = require('../config');

router.get('/', (req, res) => {
  try {
    const sessionsDir = config.PATHS.sessions;
    const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json'));

    const sessions = [];
    files.forEach(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(sessionsDir, f), 'utf-8'));
        sessions.push({
          pid: data.pid,
          sessionId: data.sessionId,
          cwd: data.cwd,
          startedAt: data.startedAt,
          version: data.version,
          kind: data.kind,       // "cli" 或 "vscode"
          name: data.name || null,
          status: data.status || 'active'
        });
      } catch {
        // 跳过损坏的会话文件
      }
    });

    res.json({
      success: true,
      data: sessions.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))
    });
  } catch (err) {
    res.json({ success: false, error: '读取会话列表失败: ' + err.message });
  }
});

module.exports = router;
