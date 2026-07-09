/**
 * routes/projects.js — 项目列表 API
 */
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const config = require('../config');

// 辅助：安全读取目录
function readDirs(dirPath) {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
  } catch { return []; }
}

function readFiles(dirPath, filter = () => true) {
  try {
    return fs.readdirSync(dirPath).filter(filter);
  } catch { return []; }
}

// GET /api/projects — 项目列表
router.get('/', (req, res) => {
  try {
    const projectsDir = config.PATHS.projects;
    const projectNames = readDirs(projectsDir);

    const projects = projectNames.map(name => {
      const projPath = path.join(projectsDir, name);

      // 统计 JSONL 会话文件
      const jsonlFiles = readFiles(projPath, f => f.endsWith('.jsonl'));
      // 统计记忆文件
      const memDir = path.join(projPath, 'memory');
      const memFiles = readFiles(memDir, f => f.endsWith('.md') && f !== 'MEMORY.md');
      // 统计子目录（会话详情目录）
      const subDirs = readDirs(projPath).filter(d => !d.startsWith('.'));

      // 解码项目路径
      const decodedPath = name.replace(/--/g, '\\').replace(/^-/, '');

      return {
        name,
        displayPath: decodedPath,
        sessionCount: jsonlFiles.length,
        subDirCount: subDirs.length,
        memoryCount: memFiles.length
      };
    });

    res.json({
      success: true,
      data: projects.sort((a, b) => b.sessionCount - a.sessionCount)
    });
  } catch (err) {
    res.json({ success: false, error: '读取项目列表失败: ' + err.message });
  }
});

// GET /api/projects/:name — 项目详情
router.get('/:name', (req, res) => {
  try {
    const projPath = path.join(config.PATHS.projects, req.params.name);

    // 检查目录是否存在
    if (!fs.existsSync(projPath)) {
      return res.json({ success: false, error: '项目不存在' });
    }

    // 读取 memory 文件
    const memDir = path.join(projPath, 'memory');
    const memories = [];
    try {
      const memFiles = fs.readdirSync(memDir).filter(f => f.endsWith('.md') && f !== 'MEMORY.md');
      memFiles.forEach(f => {
        const content = fs.readFileSync(path.join(memDir, f), 'utf-8');
        // 解析 YAML front matter
        let title = f;
        let type = '';
        if (content.startsWith('---')) {
          const endIdx = content.indexOf('---', 3);
          if (endIdx > 0) {
            const fm = content.substring(3, endIdx);
            const titleMatch = fm.match(/^name:\s*(.+)$/m);
            const typeMatch = fm.match(/^description:\s*(.+)$/m);
            if (titleMatch) title = titleMatch[1].trim();
            if (typeMatch) type = typeMatch[1].trim();
          }
        }
        memories.push({ file: f, title, type });
      });
    } catch {}

    // 读取会话 JSONL 摘要
    const jsonlFiles = [];
    try {
      const files = fs.readdirSync(projPath).filter(f => f.endsWith('.jsonl'));
      files.forEach(f => {
        const stat = fs.statSync(path.join(projPath, f));
        jsonlFiles.push({
          file: f,
          size: stat.size,
          modified: stat.mtime.toISOString()
        });
      });
    } catch {}

    res.json({
      success: true,
      data: {
        name: req.params.name,
        memories,
        sessions: jsonlFiles.sort((a, b) => b.modified.localeCompare(a.modified))
      }
    });
  } catch (err) {
    res.json({ success: false, error: '读取项目详情失败: ' + err.message });
  }
});

module.exports = router;
