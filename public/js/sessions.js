/**
 * public/js/sessions.js — 会话列表页
 */
async function renderSessions(silent = false) {
  if (!silent) showLoading();
  const result = await fetchJSON(`${API_BASE}/sessions`);
  if (!result.success) { if (silent) return; renderError(result.error); return; }

  const sessions = result.data || [];

  let html = `
    <div class="page-header">
      <div>
        <div class="page-title">💬 会话</div>
        <div class="page-subtitle">共 ${sessions.length} 个活跃会话</div>
      </div>
      <button class="btn-refresh" style="font-size:11px;padding:4px 10px" onclick="exportSessionsCSV()">📥 导出CSV</button>
    </div>

    <div class="panel">
      <div class="panel-title">活跃会话列表</div>
  `;

  if (sessions.length === 0) {
    html += '<div class="empty-state"><span class="empty-icon">💤</span><p>暂无活跃会话</p></div>';
  } else {
    html += `
      <table class="data-table">
        <thead>
          <tr>
            <th>PID</th>
            <th>Session ID</th>
            <th>工作目录</th>
            <th>入口</th>
            <th>版本</th>
            <th>启动时间</th>
            <th>名称</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
    `;

    sessions.forEach(s => {
      html += `
        <tr class="session-row" data-pid="${s.pid}">
          <td><span class="badge ${s.status === 'active' ? 'badge-green' : 'badge-red'}">PID ${s.pid}</span></td>
          <td style="font-size:11px;color:var(--text-muted)">${escapeHtml((s.sessionId || '').substring(0, 12))}...</td>
          <td>${escapeHtml((s.cwd || '').length > 40 ? '...' + (s.cwd || '').slice(-37) : (s.cwd || '-'))}</td>
          <td><span class="badge badge-blue">${escapeHtml(s.kind || '-')}</span></td>
          <td>${escapeHtml(s.version || '-')}</td>
          <td>${formatTimestamp(s.startedAt)}</td>
          <td>${escapeHtml(s.name || '-')}</td>
          <td><button class="btn-expand" data-pid="${s.pid}">展开</button></td>
        </tr>
      `;
    });

    html += '</tbody></table>';
  }

  html += '</div><div id="sessionDetailPanel"></div>';
  renderContent(html);

  // 绑定展开按钮事件（data-pid 属性传参，避免内联 onclick XSS 风险）
  document.querySelectorAll('.btn-expand[data-pid]').forEach(btn => {
    btn.addEventListener('click', () => toggleSessionDetail(btn.dataset.pid));
  });

  updateStatus(`已加载 ${sessions.length} 个会话`);
  setStatusDot('connected');
}

/**
 * 切换会话详情面板
 */
async function toggleSessionDetail(pid) {
  const detailEl = document.getElementById('sessionDetailPanel');
  // 如果已展开，收起
  if (detailEl.dataset.activePid === pid) {
    detailEl.innerHTML = '';
    delete detailEl.dataset.activePid;
    return;
  }

  detailEl.innerHTML = '<div class="panel"><div class="loading-spinner"><div class="spinner"></div><p>加载会话详情...</p></div></div>';
  detailEl.dataset.activePid = pid;

  const result = await fetchJSON(`${API_BASE}/sessions/${encodeURIComponent(pid)}`);
  if (!result.success) {
    detailEl.innerHTML = `<div class="panel"><div class="error-box"><p>${escapeHtml(result.error)}</p></div></div>`;
    return;
  }

  const d = result.data;
  let html = `
    <div class="panel">
      <div class="panel-title">🔍 会话 PID ${d.pid} 详情</div>
      <table class="data-table">
        <tr><td style="color:var(--text-muted);width:120px">Session ID</td><td style="font-size:12px">${escapeHtml(d.sessionId || '-')}</td></tr>
        <tr><td style="color:var(--text-muted)">工作目录</td><td>${escapeHtml(d.cwd || '-')}</td></tr>
        <tr><td style="color:var(--text-muted)">入口</td><td><span class="badge badge-blue">${escapeHtml(d.kind || '-')}</span></td></tr>
        <tr><td style="color:var(--text-muted)">版本</td><td>${escapeHtml(d.version || '-')}</td></tr>
        <tr><td style="color:var(--text-muted)">名称</td><td>${escapeHtml(d.name || '-')}</td></tr>
        <tr><td style="color:var(--text-muted)">状态</td><td>${escapeHtml(d.status || 'active')}</td></tr>
        <tr><td style="color:var(--text-muted)">启动时间</td><td>${formatTimestamp(d.startedAt)}</td></tr>
  `;

  if (d.messageStats) {
    html += `<tr><td style="color:var(--text-muted)">消息记录</td><td>📄 ${escapeHtml(d.messageStats.fileName)} · ${d.messageStats.lineCount} 行</td></tr>`;
  }

  html += `</table></div>`;
  detailEl.innerHTML = html;
  detailEl.scrollIntoView({ behavior: 'smooth' });
}

async function exportSessionsCSV() {
  const result = await fetchJSON(`${API_BASE}/sessions`);
  if (result.success) {
    const rows = result.data.map(s => [
      s.pid, s.sessionId, s.cwd, s.kind, s.version, s.name || '', s.status,
      s.startedAt ? new Date(s.startedAt).toISOString() : ''
    ]);
    exportCSV('claude-sessions', ['PID', 'SessionID', '工作目录', '入口', '版本', '名称', '状态', '启动时间'], rows);
  }
}
