/**
 * routes/plans.js — 执行计划 API
 */
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const config = require('../config');

// GET /api/plans — 计划列表
router.get('/', (req, res) => {
  try {
    const plansDir = config.PATHS.plans;
    const files = fs.readdirSync(plansDir).filter(f => f.endsWith('.md'));

    const plans = files.map(f => {
      const filePath = path.join(plansDir, f);
      const stat = fs.statSync(filePath);
      // 提取第一行作为标题
      let title = f.replace('.md', '');
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const firstLine = content.split('\n')[0];
        if (firstLine.startsWith('# ')) {
          title = firstLine.replace('# ', '').trim();
        }
      } catch {}

      return {
        file: f,
        title,
        size: stat.size,
        created: stat.birthtime.toISOString(),
        modified: stat.mtime.toISOString()
      };
    });

    // 按修改时间倒序
    plans.sort((a, b) => b.modified.localeCompare(a.modified));

    res.json({ success: true, data: plans });
  } catch (err) {
    res.json({ success: false, error: '读取计划列表失败: ' + err.message });
  }
});

module.exports = router;
