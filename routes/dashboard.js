/**
 * routes/dashboard.js — 仪表盘汇总 API
 * 聚合 Token、会话、技能等关键统计数据
 */
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const config = require('../config');
const tokenCounter = require('./token-counter');

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
    // 读取 Token 计数器（来自 JSONL 精确统计）
    const counterFile = path.join(__dirname, '..', 'data', 'token-counter.json');
    let counter = readJSON(counterFile, {});

    // 如果计数器为空或版本过旧，触发全量扫描
    if (!counter || counter.version !== tokenCounter.CURRENT_VERSION) {
      try {
        if (typeof tokenCounter.scanAllJSONL === 'function') {
          counter = tokenCounter.scanAllJSONL();
        }
      } catch (err) {
        console.error('扫描 Token 数据失败:', err.message);
      }
    }

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

    // 每日活动数据（从 stats-cache 获取图表数据）
    const stats = readJSON(config.PATHS.statsCache, {});
    const dailyActivity = stats.dailyActivity || [];

    // 模型费用信息
    const modelUsage = stats.modelUsage || {};
    const modelCosts = {};
    Object.entries(modelUsage).forEach(([model, data]) => {
      modelCosts[model] = {
        inputTokens: data.inputTokens || 0,
        outputTokens: data.outputTokens || 0,
        cacheReadInputTokens: data.cacheReadInputTokens || 0,
        costUSD: data.costUSD || 0
      };
    });

    // 项目 Token 分布（从 counter.scannedFiles 聚合）
    const projMap = {};
    Object.entries(counter.scannedFiles || {}).forEach(([fileKey, info]) => {
      const projEncoded = fileKey.split('/')[0];
      if (!projMap[projEncoded]) {
        projMap[projEncoded] = { totalInputTokens: 0, totalOutputTokens: 0, totalCacheReadTokens: 0 };
      }
      projMap[projEncoded].totalInputTokens += info.cumInput || 0;
      projMap[projEncoded].totalOutputTokens += info.cumOutput || 0;
      projMap[projEncoded].totalCacheReadTokens += info.cumCacheRead || 0;
    });
    const projectsArr = Object.entries(projMap).map(([projEncoded, p]) => {
      const displayName = projEncoded.replace(/--/g, '\\').replace(/^-/, '');
      // 预估费用（按 Claude 3.5 Sonnet 标准定价）
      const costUSD = (p.totalInputTokens / 1000000 * 3) +
                      (p.totalOutputTokens / 1000000 * 15) +
                      (p.totalCacheReadTokens / 1000000 * 0.30);
      return {
        name: displayName.split(/[\\/]/).pop() || displayName,
        totalInputTokens: p.totalInputTokens,
        totalOutputTokens: p.totalOutputTokens,
        totalCacheReadTokens: p.totalCacheReadTokens,
        costUSD: parseFloat(costUSD.toFixed(4))
      };
    }).sort((a, b) => b.totalInputTokens - a.totalInputTokens);

    res.json({
      success: true,
      data: {
        summary: {
          totalInputTokens: counter.totalInput || 0,
          totalOutputTokens: counter.totalOutput || 0,
          totalCacheReadTokens: counter.totalCacheRead || 0,
          todayInputTokens: counter.todayInput || 0,
          todayOutputTokens: counter.todayOutput || 0,
          todayCacheReadTokens: counter.todayCacheRead || 0,
          todayAllTokens: (counter.todayInput || 0) + (counter.todayOutput || 0) + (counter.todayCacheRead || 0),
          skillCount,
          pluginCount: (() => {
            try {
              const plugins = JSON.parse(fs.readFileSync(config.PATHS.plugins, 'utf-8'));
              return (plugins.plugins || Object.keys(plugins)).length;
            } catch { return 0; }
          })(),
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
        projects: projectsArr
      }
    });
  } catch (err) {
    res.json({ success: false, error: '读取仪表盘数据失败: ' + err.message });
  }
});

module.exports = router;
