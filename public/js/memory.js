/**
 * public/js/memory.js — Memory 记忆库页
 */
async function renderMemory() {
  showLoading();
  const result = await fetchJSON(`${API_BASE}/memory`);
  if (!result.success) { renderError(result.error); return; }

  const items = result.data.items || [];
  const byType = result.data.byType || {};

  let html = `
    <div class="page-header">
      <div>
        <div class="page-title">🧠 Memory 记忆库</div>
        <div class="page-subtitle">共 ${items.length} 条记忆，来自 ${new Set(items.map(i => i.project)).size} 个项目</div>
      </div>
    </div>

    <!-- 按类型统计 -->
    <div class="cards-grid">
      ${Object.entries(byType).map(([type, group]) => `
        <div class="stat-card">
          <div class="stat-card-label">${escapeHtml(type)}</div>
          <div class="stat-card-value">${group.length}</div>
          <div class="stat-card-sub">条记忆</div>
        </div>
      `).join('')}
    </div>
  `;

  // 按项目分组显示
  const byProject = {};
  items.forEach(i => {
    if (!byProject[i.project]) byProject[i.project] = [];
    byProject[i.project].push(i);
  });

  Object.entries(byProject).forEach(([project, mems]) => {
    html += `
    <div class="panel">
      <div class="panel-title">📁 ${escapeHtml(mems[0].displayProject || project)} <span style="font-size:12px;color:var(--text-muted)">(${mems.length} 条)</span></div>
      <div class="card-grid">
    `;
    mems.forEach(m => {
      html += `
        <div class="info-card" onclick="loadMemoryDetail('${escapeHtml(m.project)}', '${escapeHtml(m.file)}')">
          <div class="info-card-title">${escapeHtml(m.title)}</div>
          <div class="info-card-desc">${escapeHtml(m.description || '暂无描述')}</div>
          <div class="info-card-meta">
            <span class="badge badge-blue">${escapeHtml(m.type)}</span>
            <span style="margin-left:6px;font-size:11px;color:var(--text-muted)">📄 ${escapeHtml(m.file)}</span>
          </div>
        </div>
      `;
    });
    html += '</div></div>';
  });

  if (items.length === 0) {
    html += '<div class="empty-state"><span class="empty-icon">🧠</span><p>暂无记忆文件</p></div>';
  }

  renderContent(html);
  updateStatus(`已加载 ${items.length} 条记忆`);
  setStatusDot('connected');
}

/**
 * 加载单条记忆详情
 */
async function loadMemoryDetail(project, file) {
  showModal(file, '<div class="loading-spinner"><div class="spinner"></div><p>加载中...</p></div>');
  const result = await fetchJSON(`${API_BASE}/memory/${encodeURIComponent(project)}/${encodeURIComponent(file)}`);
  if (result.success) {
    const html = marked.parse(result.data.content || '暂无内容');
    document.getElementById('modalBody').innerHTML = `<div class="markdown-body">${html}</div>`;
  } else {
    document.getElementById('modalBody').innerHTML = `<div class="error-box"><span class="error-icon">⚠</span><p>${escapeHtml(result.error)}</p></div>`;
  }
}
