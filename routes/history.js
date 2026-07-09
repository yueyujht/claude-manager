/**
 * routes/history.js — 命令历史 API
 */
const router = require('express').Router();
const fs = require('fs');
const config = require('../config');

// GET /api/history — 命令历史（分页）
router.get('/', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';

    const raw = fs.readFileSync(config.PATHS.history, 'utf-8');
    const lines = raw.trim().split('\n').filter(Boolean);

    // 解析每行 JSONL
    let items = [];
    lines.forEach(line => {
      try {
        const entry = JSON.parse(line);
        if (entry.display && entry.timestamp) {
          items.push({
            text: entry.display.substring(0, 200),
            timestamp: entry.timestamp,
            project: entry.project || '',
            sessionId: entry.sessionId || ''
          });
        }
      } catch {}
    });

    // 搜索过滤
    if (search) {
      const kw = search.toLowerCase();
      items = items.filter(i =>
        i.text.toLowerCase().includes(kw) ||
        i.project.toLowerCase().includes(kw)
      );
    }

    // 反向排序（新的在前）
    items.sort((a, b) => b.timestamp - a.timestamp);

    // 分页
    const total = items.length;
    const totalPages = Math.ceil(total / limit);
    const startIdx = (page - 1) * limit;
    const pagedItems = items.slice(startIdx, startIdx + limit);

    res.json({
      success: true,
      data: {
        items: pagedItems,
        pagination: { page, limit, total, totalPages }
      }
    });
  } catch (err) {
    res.json({ success: false, error: '读取历史记录失败: ' + err.message });
  }
});

module.exports = router;
