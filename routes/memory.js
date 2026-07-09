/**
 * routes/memory.js — Memory 记忆库 API
 */
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const config = require('../config');

// GET /api/memory — 所有记忆列表
router.get('/', (req, res) => {
  try {
    const projectsDir = config.PATHS.projects;
    const allMemories = [];

    // 扫描所有项目
    let projectNames = [];
    try {
      projectNames = fs.readdirSync(projectsDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
    } catch {}

    projectNames.forEach(projName => {
      const memDir = path.join(projectsDir, projName, 'memory');
      try {
        const memFiles = fs.readdirSync(memDir).filter(f => f.endsWith('.md') && f !== 'MEMORY.md');
        memFiles.forEach(f => {
          const content = fs.readFileSync(path.join(memDir, f), 'utf-8');

          // 解析 YAML front matter
          let title = f.replace('.md', '');
          let description = '';
          let type = 'reference';

          if (content.startsWith('---')) {
            const endIdx = content.indexOf('---', 3);
            if (endIdx > 0) {
              const fm = content.substring(3, endIdx);
              const nameMatch = fm.match(/^name:\s*(.+)$/m);
              const descMatch = fm.match(/^description:\s*(.+)$/m);
              const typeMatch = fm.match(/^type:\s*(.+)$/m);
              if (nameMatch) title = nameMatch[1].trim();
              if (descMatch) description = descMatch[1].trim();
              if (typeMatch) type = typeMatch[1].trim();
            }
          }

          allMemories.push({
            project: projName,
            displayProject: projName.replace(/--/g, '\\').replace(/^-/, ''),
            file: f,
            title,
            description,
            type
          });
        });
      } catch {}
    });

    // 按类型分组
    const byType = {};
    allMemories.forEach(m => {
      if (!byType[m.type]) byType[m.type] = [];
      byType[m.type].push(m);
    });

    res.json({
      success: true,
      data: { items: allMemories, byType }
    });
  } catch (err) {
    res.json({ success: false, error: '读取记忆列表失败: ' + err.message });
  }
});

// GET /api/memory/:project/:file — 单个记忆详情
router.get('/:project/:file', (req, res) => {
  try {
    const memPath = path.join(
      config.PATHS.projects,
      req.params.project,
      'memory',
      req.params.file
    );
    const content = fs.readFileSync(memPath, 'utf-8');
    res.json({ success: true, data: { project: req.params.project, file: req.params.file, content } });
  } catch (err) {
    res.json({ success: false, error: '记忆文件不存在或无法读取' });
  }
});

module.exports = router;
