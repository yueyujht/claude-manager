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

    plans.sort((a, b) => b.modified.localeCompare(a.modified));
    res.json({ success: true, data: plans });
  } catch (err) {
    res.json({ success: false, error: '读取计划列表失败: ' + err.message });
  }
});

// GET /api/plans/:file — 单个计划详情
router.get('/:file', (req, res) => {
  try {
    const plansDir = path.resolve(config.PATHS.plans);
    const filePath = path.resolve(plansDir, req.params.file);
    // 路径遍历防护：确保解析后的路径仍在 plans 目录下
    if (!filePath.startsWith(plansDir + path.sep)) {
      return res.json({ success: false, error: '无效的文件路径' });
    }
    if (!fs.existsSync(filePath)) {
      return res.json({ success: false, error: '计划文件不存在' });
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ success: true, data: { file: req.params.file, content } });
  } catch (err) {
    res.json({ success: false, error: '读取计划详情失败: ' + err.message });
  }
});

module.exports = router;
