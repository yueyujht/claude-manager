/**
 * routes/sessions.js — 会话信息 API
 */
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const config = require('../config');

// GET /api/sessions — 会话列表
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
          kind: data.kind,
          name: data.name || null,
          status: data.status || 'active',
          fileSize: fs.statSync(path.join(sessionsDir, f)).size
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

// GET /api/sessions/:pid — 会话详情
router.get('/:pid', (req, res) => {
  try {
    const sessionsDir = config.PATHS.sessions;
    const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json'));
    let sessionData = null;

    for (const f of files) {
      const data = JSON.parse(fs.readFileSync(path.join(sessionsDir, f), 'utf-8'));
      if (String(data.pid) === req.params.pid) {
        sessionData = data;
        break;
      }
    }

    if (!sessionData) {
      return res.json({ success: false, error: '会话不存在' });
    }

    // 尝试读取会话对应的 JSONL 消息统计
    let messageStats = null;
    try {
      const projectsDir = config.PATHS.projects;
      const projectDirs = fs.readdirSync(projectsDir, { withFileTypes: true })
        .filter(d => d.isDirectory());
      for (const dir of projectDirs) {
        const projPath = path.join(projectsDir, dir.name);
        let jsonlFiles = [];
        try { jsonlFiles = fs.readdirSync(projPath).filter(jf => jf.endsWith('.jsonl')); } catch { continue; }
        for (const jf of jsonlFiles) {
          // 只读取前 512 字节提取第一行，避免全量读取整个 JSONL
          const jfPath = path.join(projPath, jf);
          try {
            const fd = fs.openSync(jfPath, 'r');
            const buf = Buffer.alloc(512);
            const bytesRead = fs.readSync(fd, buf, 0, 512, 0);
            fs.closeSync(fd);
            const firstLine = buf.toString('utf-8', 0, bytesRead).split('\n')[0];
            if (!firstLine) continue;
            const first = JSON.parse(firstLine);
            if (first.sessionId === sessionData.sessionId) {
              // 匹配到后再完整读取计算行数
              const fullContent = fs.readFileSync(jfPath, 'utf-8');
              const lines = fullContent.trim().split('\n').filter(Boolean);
              messageStats = { lineCount: lines.length, fileName: jf };
              break;
            }
          } catch { continue; }
        }
        if (messageStats) break;
      }
    } catch {}

    res.json({ success: true, data: { ...sessionData, messageStats } });
  } catch (err) {
    res.json({ success: false, error: '读取会话详情失败: ' + err.message });
  }
});

module.exports = router;
