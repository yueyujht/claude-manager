/**
 * routes/tokens.js — Token 统计 API
 */
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const config = require('../config');

function readJSON(filePath, defaultVal = null) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); }
  catch { return defaultVal; }
}

// GET /api/tokens — 完整 Token 统计
router.get('/', (req, res) => {
  try {
    const stats = readJSON(config.PATHS.statsCache, {});

    // 读取备份获取历史数据
    const backupDir = config.PATHS.backups;
    let backupFiles = [];
    try {
      backupFiles = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('.claude.json.backup.'))
        .sort();
    } catch {}

    const allBackupData = backupFiles.map(f =>
      readJSON(path.join(backupDir, f), {})
    );

    // 汇总所有备份中的模型用量
    const modelTotals = {};
    allBackupData.forEach(b => {
      const projects = b.projects || {};
      Object.values(projects).forEach(p => {
        const usage = p.lastModelUsage || {};
        Object.entries(usage).forEach(([model, data]) => {
          if (!modelTotals[model]) {
            modelTotals[model] = { inputTokens: 0, outputTokens: 0, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 };
          }
          modelTotals[model].inputTokens += data.inputTokens || 0;
          modelTotals[model].outputTokens += data.outputTokens || 0;
          modelTotals[model].cacheReadInputTokens += data.cacheReadInputTokens || 0;
          modelTotals[model].cacheCreationInputTokens += data.cacheCreationInputTokens || 0;
        });
      });
    });

    // 加上当前 stats 的数据
    const currentModels = stats.modelUsage || {};
    Object.entries(currentModels).forEach(([model, data]) => {
      if (!modelTotals[model]) {
        modelTotals[model] = { inputTokens: 0, outputTokens: 0, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 };
      }
      modelTotals[model].inputTokens += data.inputTokens || 0;
      modelTotals[model].outputTokens += data.outputTokens || 0;
      modelTotals[model].cacheReadInputTokens += data.cacheReadInputTokens || 0;
      modelTotals[model].cacheCreationInputTokens += data.cacheCreationInputTokens || 0;
    });

    // 每日趋势（合并所有来源）
    const dailyData = stats.dailyModelTokens || [];
    // 按日期合并
    const dailyMap = {};
    dailyData.forEach(d => {
      if (!dailyMap[d.date]) dailyMap[d.date] = {};
      Object.entries(d.tokensByModel || {}).forEach(([model, tokens]) => {
        dailyMap[d.date][model] = (dailyMap[d.date][model] || 0) + tokens;
      });
    });

    const dailyTrend = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, models]) => ({ date, tokensByModel: models }));

    // 项目级 Token（从备份）
    const projectTokens = [];
    allBackupData.forEach(b => {
      const projects = b.projects || {};
      Object.entries(projects).forEach(([projPath, projData]) => {
        const existing = projectTokens.find(p => p.path === projPath);
        if (existing) {
          existing.totalInput += projData.lastTotalInputTokens || 0;
          existing.totalOutput += projData.lastTotalOutputTokens || 0;
          existing.totalCache += projData.lastTotalCacheReadInputTokens || 0;
          existing.cost += projData.lastCost || 0;
        } else {
          projectTokens.push({
            name: projPath.split(/[\\/]/).pop() || projPath,
            path: projPath,
            totalInput: projData.lastTotalInputTokens || 0,
            totalOutput: projData.lastTotalOutputTokens || 0,
            totalCache: projData.lastTotalCacheReadInputTokens || 0,
            cost: projData.lastCost || 0
          });
        }
      });
    });

    res.json({
      success: true,
      data: {
        models: modelTotals,
        dailyTrend,
        projects: projectTokens.sort((a, b) => b.totalInput - a.totalInput),
        totalSessions: stats.totalSessions || 0,
        totalMessages: stats.totalMessages || 0
      }
    });
  } catch (err) {
    res.json({ success: false, error: '读取 Token 数据失败: ' + err.message });
  }
});

// GET /api/tokens/daily — 每日 Token 趋势（简化格式，便于图表）
router.get('/daily', (req, res) => {
  try {
    const stats = readJSON(config.PATHS.statsCache, {});
    const daily = (stats.dailyModelTokens || []).map(d => ({
      date: d.date,
      total: Object.values(d.tokensByModel || {}).reduce((a, b) => a + b, 0)
    }));
    res.json({ success: true, data: daily });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/tokens/models — 按模型统计
router.get('/models', (req, res) => {
  try {
    const stats = readJSON(config.PATHS.statsCache, {});
    const models = {};
    Object.entries(stats.modelUsage || {}).forEach(([name, data]) => {
      models[name] = {
        inputTokens: data.inputTokens || 0,
        outputTokens: data.outputTokens || 0,
        cacheReadInputTokens: data.cacheReadInputTokens || 0,
        cacheCreationInputTokens: data.cacheCreationInputTokens || 0,
        costUSD: data.costUSD || 0
      };
    });
    res.json({ success: true, data: models });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
