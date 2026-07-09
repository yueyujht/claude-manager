/**
 * public/js/plans.js — 执行计划页
 */
async function renderPlans() {
  showLoading();
  const result = await fetchJSON(`${API_BASE}/plans`);
  if (!result.success) { renderError(result.error); return; }

  const plans = result.data || [];

  let html = `
    <div class="page-header">
      <div>
        <div class="page-title">📝 执行计划</div>
        <div class="page-subtitle">共 ${plans.length} 个计划文件</div>
      </div>
    </div>
    <div class="card-grid">
  `;

  if (plans.length === 0) {
    html += '<div class="empty-state"><span class="empty-icon">📝</span><p>暂无计划文件</p></div>';
  } else {
    plans.forEach(p => {
      html += `
        <div class="info-card">
          <div class="info-card-title">${escapeHtml(p.title)}</div>
          <div class="info-card-desc">📄 ${escapeHtml(p.file)}</div>
          <div class="info-card-meta">
            <span>📅 ${formatDate(p.created)}</span>
            <span style="margin-left:8px">📦 ${formatSize(p.size)}</span>
          </div>
        </div>
      `;
    });
  }

  html += '</div>';
  renderContent(html);
  updateStatus(`已加载 ${plans.length} 个计划`);
  setStatusDot('connected');
}
