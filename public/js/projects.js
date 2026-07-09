/**
 * public/js/projects.js — 项目列表页
 */
async function renderProjects() {
  showLoading();
  const result = await fetchJSON(`${API_BASE}/projects`);
  if (!result.success) { renderError(result.error); return; }

  const projects = result.data || [];

  let html = `
    <div class="page-header">
      <div>
        <div class="page-title">📁 项目</div>
        <div class="page-subtitle">共 ${projects.length} 个项目</div>
      </div>
    </div>
    <div class="card-grid">
  `;

  if (projects.length === 0) {
    html += '<div class="empty-state"><span class="empty-icon">📭</span><p>暂无项目数据</p></div>';
  } else {
    projects.forEach(p => {
      html += `
        <div class="info-card" onclick="loadProjectDetail('${escapeHtml(p.name)}')">
          <div class="info-card-title">📁 ${escapeHtml((p.displayPath || p.name).length > 30 ? (p.displayPath || p.name).substring(0, 30) + '...' : (p.displayPath || p.name))}</div>
          <div class="info-card-desc" style="font-size:11px;color:var(--text-muted)">${p.sessionCount} 会话 · ${p.subDirCount} 目录 · ${p.memoryCount} 记忆</div>
          <div class="info-card-meta">
            <span class="badge badge-blue">${p.sessionCount} 会话</span>
            <span class="badge badge-green" style="margin-left:4px">${p.subDirCount} 目录</span>
            ${p.memoryCount > 0 ? `<span class="badge badge-orange" style="margin-left:4px">${p.memoryCount} 记忆</span>` : ''}
          </div>
        </div>
      `;
    });
  }

  html += '</div>';

  // 项目详情面板
  html += '<div id="projectDetail"></div>';

  renderContent(html);
  updateStatus(`已加载 ${projects.length} 个项目`);
  setStatusDot('connected');
}

/**
 * 加载项目详情
 */
async function loadProjectDetail(name) {
  const detailEl = document.getElementById('projectDetail');
  detailEl.innerHTML = '<div class="panel"><div class="loading-spinner"><div class="spinner"></div><p>加载项目详情...</p></div></div>';
  detailEl.scrollIntoView({ behavior: 'smooth' });

  const result = await fetchJSON(`${API_BASE}/projects/${encodeURIComponent(name)}`);
  if (!result.success) {
    detailEl.innerHTML = `<div class="panel"><div class="error-box"><span class="error-icon">⚠</span><p>${escapeHtml(result.error)}</p></div></div>`;
    return;
  }

  const d = result.data;
  // 解码项目名显示
  const displayName = name.replace(/--/g, ' / ').replace(/^-/, '');

  let html = `<div class="panel">
    <div class="panel-title">📋 ${escapeHtml(displayName)} 详情</div>`;

  // Token 消耗摘要
  if (d.tokenData) {
    html += `
    <div class="cards-grid" style="margin-top:12px">
      <div class="stat-card">
        <div class="stat-card-label">Input Tokens</div>
        <div class="stat-card-value" style="font-size:20px;color:var(--accent-blue)">${formatNumber(d.tokenData.inputTokens)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Output Tokens</div>
        <div class="stat-card-value" style="font-size:20px;color:var(--accent-green)">${formatNumber(d.tokenData.outputTokens)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Cache Tokens</div>
        <div class="stat-card-value" style="font-size:20px;color:var(--accent-orange)">${formatNumber(d.tokenData.cacheTokens)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">费用</div>
        <div class="stat-card-value" style="font-size:20px">$${d.tokenData.costUSD.toFixed(2)}</div>
      </div>
    </div>`;
  }

  html += `
    <h4 style="color:var(--text-primary);margin:12px 0 8px">🧠 记忆文件 (${d.memories.length})</h4>`;

  if (d.memories.length === 0) {
    html += '<div class="empty-state"><p>暂无记忆文件</p></div>';
  } else {
    html += '<div class="card-grid">';
    d.memories.forEach(m => {
      html += `
        <div class="info-card">
          <div class="info-card-title">${escapeHtml(m.title)}</div>
          <div class="info-card-desc">${escapeHtml(m.type || '记忆')}</div>
          <div class="info-card-meta">📄 ${escapeHtml(m.file)}</div>
        </div>
      `;
    });
    html += '</div>';
  }

  html += `<h4 style="color:var(--text-primary);margin:16px 0 8px">💬 会话文件 (${d.sessions.length})</h4>`;
  if (d.sessions.length === 0) {
    html += '<div class="empty-state"><p>暂无会话记录</p></div>';
  } else {
    html += '<table class="data-table"><thead><tr><th>文件</th><th>大小</th><th>修改时间</th></tr></thead><tbody>';
    d.sessions.forEach(s => {
      html += `<tr><td style="font-size:12px">${escapeHtml(s.file)}</td><td>${formatSize(s.size)}</td><td>${formatDate(s.modified)}</td></tr>`;
    });
    html += '</tbody></table>';
  }

  html += '</div>';
  detailEl.innerHTML = html;
}
