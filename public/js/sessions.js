/**
 * public/js/sessions.js — 会话列表页
 */
async function renderSessions() {
  showLoading();
  const result = await fetchJSON(`${API_BASE}/sessions`);
  if (!result.success) { renderError(result.error); return; }

  const sessions = result.data || [];

  let html = `
    <div class="page-header">
      <div>
        <div class="page-title">💬 会话</div>
        <div class="page-subtitle">共 ${sessions.length} 个活跃会话</div>
      </div>
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
          </tr>
        </thead>
        <tbody>
    `;

    sessions.forEach(s => {
      html += `
        <tr>
          <td><span class="badge ${s.status === 'active' ? 'badge-green' : 'badge-red'}">PID ${s.pid}</span></td>
          <td style="font-size:11px;color:var(--text-muted)">${escapeHtml(s.sessionId || '-')}</td>
          <td>${escapeHtml(s.cwd || '-')}</td>
          <td><span class="badge badge-blue">${escapeHtml(s.kind || '-')}</span></td>
          <td>${escapeHtml(s.version || '-')}</td>
          <td>${formatTimestamp(s.startedAt)}</td>
          <td>${escapeHtml(s.name || '-')}</td>
        </tr>
      `;
    });

    html += '</tbody></table>';
  }

  html += '</div>';
  renderContent(html);
  updateStatus(`已加载 ${sessions.length} 个会话`);
  setStatusDot('connected');
}
