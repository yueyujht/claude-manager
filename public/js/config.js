/**
 * public/js/config.js — 配置查看页
 */
async function renderConfig() {
  showLoading();

  // 并行加载两个数据源
  const [mdResult, settingsResult] = await Promise.all([
    fetchJSON(`${API_BASE}/config/claude-md`),
    fetchJSON(`${API_BASE}/config/settings`)
  ]);

  let html = `
    <div class="page-header">
      <div>
        <div class="page-title">⚙ 配置</div>
        <div class="page-subtitle">全局 CLAUDE.md + settings.json</div>
      </div>
    </div>

    <div class="charts-row">
      <!-- CLAUDE.md -->
      <div class="panel">
        <div class="panel-title">📝 全局 CLAUDE.md</div>
  `;

  if (mdResult.success) {
    const mdHtml = marked.parse(mdResult.data.content || '暂无内容');
    html += `<div class="markdown-body">${mdHtml}</div>`;
  } else {
    html += `<div class="error-box"><p>${escapeHtml(mdResult.error)}</p></div>`;
  }

  html += `</div>
      <!-- settings.json -->
      <div class="panel">
        <div class="panel-title">🔧 settings.json（已脱敏）</div>
  `;

  if (settingsResult.success) {
    const safe = settingsResult.data;

    // 基本信息
    html += `
      <table class="data-table">
        <tr><td style="color:var(--text-muted)">模型</td><td><span class="badge badge-blue">${escapeHtml(safe.model || '-')}</span></td></tr>
        <tr><td style="color:var(--text-muted)">主题</td><td>${escapeHtml(safe.theme || '-')}</td></tr>
        <tr><td style="color:var(--text-muted)">努力级别</td><td>${escapeHtml(safe.env?.CLAUDE_CODE_EFFORT_LEVEL || '-')}</td></tr>
        <tr><td style="color:var(--text-muted)">API 地址</td><td style="font-size:12px">${escapeHtml(safe.env?.ANTHROPIC_BASE_URL || '-')}</td></tr>
        <tr><td style="color:var(--text-muted)">主模型</td><td style="font-size:12px">${escapeHtml(safe.env?.ANTHROPIC_MODEL || '-')}</td></tr>
        <tr><td style="color:var(--text-muted)">子代理模型</td><td style="font-size:12px">${escapeHtml(safe.env?.CLAUDE_CODE_SUBAGENT_MODEL || '-')}</td></tr>
        <tr><td style="color:var(--text-muted)">Auth Token</td><td style="font-size:12px;color:var(--accent-orange)">${escapeHtml(safe.env?.ANTHROPIC_AUTH_TOKEN || '-')}</td></tr>
      </table>
    `;

    // 已安装插件
    if (safe.enabledPlugins) {
      html += `<div style="margin-top:12px"><strong style="color:var(--text-primary);font-size:13px">已启用插件:</strong>`;
      Object.keys(safe.enabledPlugins).forEach(p => {
        html += ` <span class="badge badge-green" style="margin:2px">${escapeHtml(p)}</span>`;
      });
      html += '</div>';
    }

    // 完整 JSON
    html += `
      <div style="margin-top:14px">
        <strong style="color:var(--text-primary);font-size:13px">完整 JSON:</strong>
        <pre style="background:var(--bg-card);padding:12px;border-radius:6px;overflow-x:auto;margin-top:6px;font-size:11px;max-height:400px;overflow-y:auto"><code>${escapeHtml(JSON.stringify(safe, null, 2))}</code></pre>
      </div>
    `;
  } else {
    html += `<div class="error-box"><p>${escapeHtml(settingsResult.error)}</p></div>`;
  }

  html += '</div></div>';
  renderContent(html);
  updateStatus('配置已加载');
  setStatusDot('connected');
}
