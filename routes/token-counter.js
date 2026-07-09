/**
 * routes/token-counter.js — 独立 Token 计数器 API
 * 从 JSONL 文件提取精确的 token 消耗，持久化到项目 data/ 目录
 *
 * 增量扫描策略：
 *   1. 持 token-counter.json 记录每文件的扫描进度（lineCount）
 *   2. 每次请求仅读取新增的行，累加到全局计数器
 *   3. 文件未修改时跳过读取（通过 stat 的 size + mtime 判断）
 *   4. 版本变更时触发全量重建（version 字段）
 */
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const config = require('../config');

const COUNTER_FILE = path.join(__dirname, '..', 'data', 'token-counter.json');
const CURRENT_VERSION = 3;

/** 安全读取 JSON */
function readJSON(filePath, defaultVal = null) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); }
  catch { return defaultVal; }
}

/** 解析时间戳 */
function parseTimestamp(ts) {
  if (!ts) return 0;
  const d = new Date(ts);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

/** 获取今日日期字符串 YYYY-MM-DD */
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

/**
 * 提取一行 JSON 中的日期字符串 (YYYY-MM-DD)
 * 返回空字符串表示无法解析
 */
function extractDate(entry) {
  try {
    const ts = entry.timestamp;
    if (ts) {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    }
  } catch {}
  return '';
}

/**
 * 扫描所有 JSONL 文件，累加 token 消耗
 */
function scanAllJSONL() {
  let counter = readJSON(COUNTER_FILE, null);

  // 全新初始化 或 版本升级 → 全量重建，确保 cache_read 等统计口径正确
  if (!counter || counter.version !== CURRENT_VERSION) {
    counter = {
      version: CURRENT_VERSION,
      totalInput: 0, totalOutput: 0, totalCacheRead: 0,
      todayInput: 0, todayOutput: 0, todayCacheRead: 0,
      date: '', lastUpdate: null, scannedFiles: {}
    };
  }

  const today = todayStr();

  // 日期变了，重置今日计数
  if (counter.date !== today) {
    counter.todayInput = 0;
    counter.todayOutput = 0;
    counter.todayCacheRead = 0;
    counter.date = today;
  }

  /**
   * 递归收集目录下所有 .jsonl 文件（含 subagents/ 等子目录）
   * 返回 { filePath, fileKey } 数组
   * fileKey 基于 projects/ 的相对路径（如 E--proj/session.jsonl 或 E--proj/uuid/subagents/a.jsonl）
   */
  function collectJSONLFiles(dirPath, baseDir) {
    const results = [];
    let entries;
    try { entries = fs.readdirSync(dirPath, { withFileTypes: true }); }
    catch { return results; }

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        // 递归扫描子目录（跳过 memory/ 减少无效遍历）
        if (entry.name !== 'memory') {
          results.push(...collectJSONLFiles(fullPath, baseDir));
        }
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        results.push({ filePath: fullPath, fileKey: relPath });
      }
    }
    return results;
  }

  const scannedFiles = counter.scannedFiles || {};
  const projectsDir = config.PATHS.projects;

  // 获取项目目录列表
  let projectDirs = [];
  try {
    projectDirs = fs.readdirSync(projectsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
  } catch { return counter; }

  // 收集当前所有 JSONL 文件（全量 + 子目录），用于后续清理
  const validFileKeys = new Set();

  for (const projName of projectDirs) {
    const projPath = path.join(projectsDir, projName);
    const jsonlFiles = collectJSONLFiles(projPath, projectsDir);

    for (const { filePath, fileKey } of jsonlFiles) {
      validFileKeys.add(fileKey);

      let fileStat;
      try { fileStat = fs.statSync(filePath); } catch { continue; }

      const oldInfo = scannedFiles[fileKey];

      // 性能优化：文件未修改且已全量扫描过，跳过读取
      if (oldInfo && oldInfo.size === fileStat.size && oldInfo.mtimeMs === fileStat.mtimeMs) {
        continue;
      }

      // 读取文件内容
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      // 处理文件截断或重写：如果现有行数比记录少，从头扫描
      const startLine = (oldInfo && lines.length >= oldInfo.lineCount) ? oldInfo.lineCount : 0;
      const newLines = lines.slice(startLine);
      if (newLines.length === 0) continue;

      let addedInput = 0, addedOutput = 0, addedCacheRead = 0;
      let addedTodayInput = 0, addedTodayOutput = 0, addedTodayCacheRead = 0;
      let maxCacheReadInBatch = 0;

      for (const line of newLines) {
        try {
          const entry = JSON.parse(line);
          if (entry.type === 'assistant' && entry.message && entry.message.usage) {
            const u = entry.message.usage;
            const inputTokens = u.input_tokens || 0;
            const outputTokens = u.output_tokens || 0;
            const cacheRead = u.cache_read_input_tokens || 0;

            // ---- 累计总消耗（每行独立累加） ----
            addedInput += inputTokens;
            addedOutput += outputTokens;
            addedCacheRead += cacheRead;

            // 跟踪本批次最大值（诊断用）
            if (cacheRead > maxCacheReadInBatch) maxCacheReadInBatch = cacheRead;

            // ---- "今日"判断：逐行检查时间戳，而非仅看最后一行 ----
            const lineDate = extractDate(entry);
            if (lineDate === today) {
              addedTodayInput += inputTokens;
              addedTodayOutput += outputTokens;
              addedTodayCacheRead += cacheRead;
            }
          }
        } catch {}
      }

      // 累计值计算：增量扫描时保留旧累计，全量重扫时从0开始
      const oldCumInput = (startLine > 0 && oldInfo) ? (oldInfo.cumInput || 0) : 0;
      const oldCumOutput = (startLine > 0 && oldInfo) ? (oldInfo.cumOutput || 0) : 0;
      const oldCumCacheRead = (startLine > 0 && oldInfo) ? (oldInfo.cumCacheRead || 0) : 0;
      // 更新文件扫描状态（保留 size/mtime 用于下次跳过判断）
      scannedFiles[fileKey] = {
        lineCount: lines.length,
        size: fileStat.size,
        mtimeMs: fileStat.mtimeMs,
        sessionCacheRead: addedCacheRead,   // 本次扫描新增的 cache_read 累计值
        maxCacheRead: maxCacheReadInBatch,   // 本次扫描到的最大值（辅助诊断）
        done: false,
        cumInput: oldCumInput + addedInput,
        cumOutput: oldCumOutput + addedOutput,
        cumCacheRead: oldCumCacheRead + addedCacheRead
      };

      // 累加到全局计数器
      counter.totalInput += addedInput;
      counter.totalOutput += addedOutput;
      counter.totalCacheRead += addedCacheRead;

      // 累加到今日计数器（仅有 today 标签的行）
      counter.todayInput += addedTodayInput;
      counter.todayOutput += addedTodayOutput;
      counter.todayCacheRead += addedTodayCacheRead;
    }
  }

  // 清理已删除文件的扫描记录
  for (const key of Object.keys(scannedFiles)) {
    if (!validFileKeys.has(key)) {
      delete scannedFiles[key];
    }
  }

  // 标记已完成文件（超过5分钟未修改 = 会话已结束不再增长）
  for (const [, info] of Object.entries(scannedFiles)) {
    // 用 info.mtimeMs 判断：当前时间 - 上次记录的时间 > 5分钟
    if (Date.now() - info.mtimeMs > 300000) {
      info.done = true;
    }
  }

  counter.scannedFiles = scannedFiles;
  counter.lastUpdate = new Date().toISOString();
  counter.date = today;

  // 确保 data/ 目录存在（防止首次运行时报错）
  const dataDir = path.dirname(COUNTER_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(COUNTER_FILE, JSON.stringify(counter, null, 2), 'utf-8');

  return counter;
}

// GET /api/token-counter — 获取计数 + 触发扫描
router.get('/', (req, res) => {
  try {
    const counter = scanAllJSONL();
    const today = todayStr();
    res.json({
      success: true,
      data: {
        totalInput: counter.totalInput,
        totalOutput: counter.totalOutput,
        totalCacheRead: counter.totalCacheRead,
        totalAll: counter.totalInput + counter.totalOutput + counter.totalCacheRead,
        todayInput: counter.todayInput,
        todayOutput: counter.todayOutput,
        todayCacheRead: counter.todayCacheRead,
        todayAll: counter.todayInput + counter.todayOutput + counter.todayCacheRead,
        date: today,
        lastUpdate: counter.lastUpdate
      }
    });
  } catch (err) {
    res.json({ success: false, error: '读取 Token 计数失败: ' + err.message });
  }
});

// POST /api/token-counter/refresh — 强制刷新计数（全量重建）
router.post('/refresh', (req, res) => {
  try {
    // 删除持久化文件，下次 GET 时会全量重建
    try { fs.unlinkSync(COUNTER_FILE); } catch {}
    const counter = scanAllJSONL();
    res.json({
      success: true,
      data: {
        totalAll: counter.totalInput + counter.totalOutput + counter.totalCacheRead
      }
    });
  } catch (err) {
    res.json({ success: false, error: '刷新失败: ' + err.message });
  }
});

// 导出 scanAllJSONL 供 dashboard 等模块直接调用，避免文件读取竞态
router.scanAllJSONL = scanAllJSONL;
router.CURRENT_VERSION = CURRENT_VERSION;
module.exports = router;
