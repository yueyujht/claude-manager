/**
 * routes/skills.js — 技能列表 API
 */
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const config = require('../config');

// GET /api/skills — 所有技能列表
router.get('/', (req, res) => {
  try {
    const skillsDir = config.PATHS.skills;
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });

    const skills = [];
    entries.forEach(entry => {
      // 跳过非目录和非符号链接
      if (!entry.isDirectory() && !entry.isSymbolicLink()) return;

      const skillPath = path.join(skillsDir, entry.name);
      const skillMdPath = path.join(skillPath, 'SKILL.md');

      try {
        const content = fs.readFileSync(skillMdPath, 'utf-8');
        // 提取第一行作为标题（通常是 # 标题）
        const lines = content.split('\n');
        let title = entry.name;
        let description = '';

        for (const line of lines) {
          if (line.startsWith('# ')) {
            title = line.replace('# ', '').trim();
            break;
          }
        }
        // 提取第一段非空文字作为描述
        let foundTitle = false;
        for (const line of lines) {
          if (!foundTitle && line.startsWith('# ')) {
            foundTitle = true;
            continue;
          }
          if (foundTitle && line.trim() && !line.startsWith('#') && !line.startsWith('---')) {
            description = line.trim().substring(0, 120);
            break;
          }
        }

        skills.push({
          name: entry.name,
          title,
          description,
          isSymlink: entry.isSymbolicLink()
        });
      } catch {
        // 跳过无法读取的技能
      }
    });

    res.json({ success: true, data: skills });
  } catch (err) {
    res.json({ success: false, error: '读取技能列表失败: ' + err.message });
  }
});

// GET /api/skills/:name — 单个技能详情
router.get('/:name', (req, res) => {
  try {
    const skillPath = path.join(config.PATHS.skills, req.params.name, 'SKILL.md');
    const content = fs.readFileSync(skillPath, 'utf-8');
    res.json({ success: true, data: { name: req.params.name, content } });
  } catch (err) {
    res.json({ success: false, error: `技能 "${req.params.name}" 不存在或无法读取` });
  }
});

module.exports = router;
