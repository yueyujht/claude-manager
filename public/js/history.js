/**
 * public/js/history.js — 命令历史页
 */
let historyPage = 1;
let historySearch = '';

async function renderHistory() {
  showLoading();
  await loadHistoryPage(1, '');
}

async function loadHistoryPage(page, search) {
  historyPage = page;
  historySearch = search;

  const params = new URLSearchParams({ page, limit: 50 });
  if (search) params.set('search', search);

  const result = await fetchJSON(`${API_BASE}/history?${params}`);
  if (!result.success) { renderError(result.error); return; }

  const d = result.data;
  const { items, pagination } = d;

  let html = `
    <div class="page-header">
      <div>
        <div class="page-title">📋 命令历史</div>
        <div class="page-subtitle">共 ${pagination.total} 条记录</div>
      </div>
      <input type="text" class="search-input" placeholder="🔍 搜索历史..." value="${escapeHtml(search)}"
        onkeyup="if(event.key==='Enter'){historySearch=this.value;historyPage=1;loadHistoryPage(1,this.value)}">
    </div>

    <div class="panel">
      <ul class="history-list">
  `;

  if (items.length === 0) {
    html += '<div class="empty-state"><span class="empty-icon">📋</span><p>暂无历史记录</p></div>';
  } else {
    items.forEach(item => {
      const time = new Date(item.timestamp);
      const timeStr = time.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      html += `
        <li class="history-item">
          <span class="history-time">${timeStr}</span>
          <span class="history-text" title="${escapeHtml(item.text)}">${escapeHtml(item.text)}</span>
          <span class="history-project">${escapeHtml((item.project || '').split(/[\\/]/).pop() || '-')}</span>
        </li>
      `;
    });
  }

  html += `</ul></div>`;

  // 分页控件
  if (pagination.totalPages > 1) {
    html += `<div class="pagination">`;
    html += `<button class="page-btn" onclick="loadHistoryPage(${page - 1}, '${escapeHtml(search)}')" ${page <= 1 ? 'disabled' : ''}>◀ 上一页</button>`;

    const maxPages = Math.min(pagination.totalPages, 10);
    const startPage = Math.max(1, page - 4);
    const endPage = Math.min(pagination.totalPages, startPage + maxPages - 1);

    for (let i = startPage; i <= endPage; i++) {
      html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="loadHistoryPage(${i}, '${escapeHtml(search)}')">${i}</button>`;
    }

    html += `<button class="page-btn" onclick="loadHistoryPage(${page + 1}, '${escapeHtml(search)}')" ${page >= pagination.totalPages ? 'disabled' : ''}>下一页 ▶</button>`;
    html += `<span class="page-info">${page} / ${pagination.totalPages} 页</span>`;
    html += `</div>`;
  }

  renderContent(html);
  updateStatus(`已加载第 ${page} 页，共 ${pagination.total} 条`);
  setStatusDot('connected');
}
