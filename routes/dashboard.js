/**
 * routes/dashboard.js — 仪表盘汇总 API
 * 聚合 Token、会话、技能等关键统计数据
 */
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const config = require('../config');

// 安全读取 JSON 文件，失败返回默认值
function readJSON(filePath, defaultVal = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return defaultVal;
  }
}

// 安全读取目录下的子目录列表
function readDirs(dirPath) {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .filter(d => d.isDirectory() || d.isSymbolicLink())
      .map(d => d.name);
  } catch {
    return [];
  }
}

// 安全读取目录下的文件列表
function readFiles(dirPath) {
  try {
    return fs.readdirSync(dirPath).filter(f => !f.startsWith('.'));
  } catch {
    return [];
  }
}

router.get('/', (req, res) => {
  try {
    // 读取 stats-cache.json（Token 统计）
    const stats = readJSON(config.PATHS.statsCache, {});
    // 读取最新备份文件获取更详细的项目级数据
    const backupFiles = readFiles(config.PATHS.backups)
      .filter(f => f.startsWith('.claude.json.backup.'))
      .sort();
    const latestBackup = backupFiles.length > 0
      ? readJSON(path.join(config.PATHS.backups, backupFiles[backupFiles.length - 1]), {})
      : {};

    // 汇总 Token 数据
    const modelUsage = stats.modelUsage || {};
    let totalInput = 0, totalOutput = 0, totalCacheRead = 0;
    Object.values(modelUsage).forEach(m => {
      totalInput += m.inputTokens || 0;
      totalOutput += m.outputTokens || 0;
      totalCacheRead += m.cacheReadInputTokens || 0;
    });

    // 从备份中获取项目级累计数据
    const projectsUsage = latestBackup.projects || {};
    let grandInput = totalInput, grandOutput = totalOutput, grandCache = totalCacheRead;
    Object.values(projectsUsage).forEach(p => {
      grandInput += p.lastTotalInputTokens || 0;
      grandOutput += p.lastTotalOutputTokens || 0;
      grandCache += p.lastTotalCacheReadInputTokens || 0;
    });

    // 技能数量
    const skillDirs = readDirs(config.PATHS.skills);
    const skillCount = skillDirs.length;

    // 活跃会话
    const sessionFiles = readFiles(config.PATHS.sessions).filter(f => f.endsWith('.json'));
    let sessions = [];
    sessionFiles.forEach(f => {
      const s = readJSON(path.join(config.PATHS.sessions, f));
      if (s) sessions.push(s);
    });

    // 项目数量
    const projectDirs = readDirs(config.PATHS.projects);

    // 记忆文件数量
    let memoryCount = 0;
    projectDirs.forEach(proj => {
      const memDir = path.join(config.PATHS.projects, proj, 'memory');
      const memFiles = readFiles(memDir).filter(f => f.endsWith('.md') && f !== 'MEMORY.md');
      memoryCount += memFiles.length;
    });

    // 命令历史条数
    let historyCount = 0;
    try {
      const hist = fs.readFileSync(config.PATHS.history, 'utf-8');
      historyCount = hist.trim().split('\n').filter(Boolean).length;
    } catch {}

    // 计划文件数
    const planFiles = readFiles(config.PATHS.plans).filter(f => f.endsWith('.md'));

    // 每日活动数据
    const dailyActivity = stats.dailyActivity || [];

    // 模型费用信息
    const modelCosts = {};
    Object.entries(modelUsage).forEach(([model, data]) => {
      modelCosts[model] = {
        inputTokens: data.inputTokens || 0,
        outputTokens: data.outputTokens || 0,
        cacheReadInputTokens: data.cacheReadInputTokens || 0,
        costUSD: data.costUSD || 0
      };
    });

    // 项目 Token 统计（从备份文件）
    const projectStats = [];
    Object.entries(projectsUsage).forEach(([projPath, projData]) => {
      projectStats.push({
        name: projPath.split(/[\\/]/).pop() || projPath,
        path: projPath,
        totalInputTokens: projData.lastTotalInputTokens || 0,
        totalOutputTokens: projData.lastTotalOutputTokens || 0,
        totalCacheReadTokens: projData.lastTotalCacheReadInputTokens || 0,
        costUSD: projData.lastCost || 0,
        sessionCount: projData.lastSessionMetrics ? 1 : 0
      });
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalInputTokens: grandInput,
          totalOutputTokens: grandOutput,
          totalCacheReadTokens: grandCache,
          skillCount,
          pluginCount: 2, // 已知有2个官方插件
          activeSessions: sessions.filter(s => s.status !== 'ended').length,
          projectCount: projectDirs.length,
          memoryCount,
          historyCount,
          planCount: planFiles.length
        },
        modelCosts,
        dailyActivity: dailyActivity.slice(-30), // 最近30天
        sessions: sessions.map(s => ({
          pid: s.pid,
          sessionId: s.sessionId,
          cwd: s.cwd,
          kind: s.kind,
          version: s.version,
          status: s.status || 'active'
        })),
        projects: projectStats.sort((a, b) => b.totalInputTokens - a.totalInputTokens),
        // 启动次数统计
        launchCount: latestBackup.launchCount || 0
      }
    });
  } catch (err) {
    res.json({ success: false, error: '读取仪表盘数据失败: ' + err.message });
  }
});

module.exports = router;
