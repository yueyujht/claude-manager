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
    <div class="card-grid" id="planGrid">
  `;

  if (plans.length === 0) {
    html += '<div class="empty-state"><span class="empty-icon">📝</span><p>暂无计划文件</p></div>';
  } else {
    plans.forEach(p => {
      html += `
        <div class="info-card" data-file="${escapeHtml(p.file)}">
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

  // 绑定卡片点击事件（data-file 属性传参，避免内联 onclick XSS 风险）
  document.getElementById('planGrid')?.addEventListener('click', (e) => {
    const card = e.target.closest('.info-card');
    if (card && card.dataset.file) {
      openPlanDetail(card.dataset.file);
    }
  });

  updateStatus(`已加载 ${plans.length} 个计划`);
  setStatusDot('connected');
}

/**
 * 打开计划详情
 */
async function openPlanDetail(file) {
  showModal(file, '<div class="loading-spinner"><div class="spinner"></div><p>加载中...</p></div>');
  const result = await fetchJSON(`${API_BASE}/plans/${encodeURIComponent(file)}`);
  if (result.success) {
    const html = marked.parse(result.data.content || '暂无内容');
    document.getElementById('modalBody').innerHTML = `<div class="markdown-body">${html}</div>`;
  } else {
    document.getElementById('modalBody').innerHTML = `<div class="error-box"><span class="error-icon">⚠</span><p>${escapeHtml(result.error)}</p></div>`;
  }
}
