/**
 * public/js/plugins.js — 插件页
 */
async function renderPlugins() {
  showLoading();
  const result = await fetchJSON(`${API_BASE}/plugins`);
  if (!result.success) { renderError(result.error); return; }

  const d = result.data;
  const installed = d.installed || {};

  let html = `
    <div class="page-header">
      <div>
        <div class="page-title">🔌 插件</div>
        <div class="page-subtitle">已安装插件及市场信息</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">📦 已安装插件</div>
      <div class="card-grid">
  `;

  // 显示已安装插件
  if (installed.plugins && installed.plugins.length > 0) {
    installed.plugins.forEach(p => {
      html += `
        <div class="info-card">
          <div class="info-card-title">${escapeHtml(p.name || p)}</div>
          <div class="info-card-desc">${escapeHtml(p.description || '官方插件')}</div>
          <div class="info-card-meta">
            <span class="badge badge-green">已安装</span>
            ${p.version ? `<span style="margin-left:6px;color:var(--text-muted)">v${escapeHtml(p.version)}</span>` : ''}
          </div>
        </div>
      `;
    });
  } else {
    const enabled = d.installed || {};
    Object.keys(enabled).forEach(key => {
      if (key === 'plugins') return;
      html += `
        <div class="info-card">
          <div class="info-card-title">${escapeHtml(key)}</div>
          <div class="info-card-desc">已启用</div>
        </div>
      `;
    });
  }

  html += `</div></div>`;

  // 市场信息
  if (d.marketplaces && Object.keys(d.marketplaces).length > 0) {
    html += `
    <div class="panel">
      <div class="panel-title">🏪 插件市场</div>
      <table class="data-table">
        <thead><tr><th>名称</th><th>来源</th></tr></thead>
        <tbody>
    `;
    Object.entries(d.marketplaces).forEach(([name, info]) => {
      html += `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(typeof info === 'string' ? info : JSON.stringify(info))}</td></tr>`;
    });
    html += `</tbody></table></div>`;
  }

  // 目录缓存
  if (d.catalogSummary && d.catalogSummary.totalPlugins > 0) {
    html += `
    <div class="panel">
      <div class="panel-title">📋 插件目录</div>
      <div class="stat-card" style="display:inline-block">
        <div class="stat-card-label">可用插件总数</div>
        <div class="stat-card-value">${d.catalogSummary.totalPlugins}</div>
      </div>
    </div>`;
  }

  renderContent(html);
  updateStatus('插件信息已加载');
  setStatusDot('connected');
}
