/**
 * routes/plugins.js — 插件信息 API
 */
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const config = require('../config');

router.get('/', (req, res) => {
  try {
    // 读取已安装插件列表
    const installedPath = config.PATHS.plugins;
    const installed = JSON.parse(fs.readFileSync(installedPath, 'utf-8'));

    // 读取已知市场
    let markets = {};
    try {
      const marketsPath = path.join(config.PATHS.plugins, '..', 'known_marketplaces.json');
      markets = JSON.parse(fs.readFileSync(marketsPath, 'utf-8'));
    } catch {}

    // 读取插件目录缓存
    let catalog = {};
    try {
      const catalogPath = path.join(config.PATHS.plugins, '..', 'plugin-catalog-cache.json');
      catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    } catch {}

    res.json({
      success: true,
      data: {
        installed,
        marketplaces: markets,
        catalogSummary: {
          totalPlugins: catalog.plugins ? catalog.plugins.length : 0,
          lastUpdated: catalog.lastUpdated || null
        }
      }
    });
  } catch (err) {
    res.json({ success: false, error: '读取插件信息失败: ' + err.message });
  }
});

module.exports = router;
