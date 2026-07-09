/**
 * public/js/skills.js — 技能列表页
 */
async function renderSkills() {
  showLoading();
  const result = await fetchJSON(`${API_BASE}/skills`);
  if (!result.success) { renderError(result.error); return; }

  const skills = result.data || [];
  document.getElementById('skillBadge').textContent = skills.length;

  let html = `
    <div class="page-header">
      <div>
        <div class="page-title">🛠 技能库</div>
        <div class="page-subtitle">共 ${skills.length} 个已安装技能</div>
      </div>
      <input type="text" class="search-input" placeholder="🔍 搜索技能..." oninput="filterSkillCards(this.value)">
    </div>
    <div class="card-grid" id="skillCards">
      ${skills.map(s => `
        <div class="info-card skill-card" data-name="${escapeHtml(s.name)}" onclick="openSkillDetail('${escapeHtml(s.name)}')">
          <div class="info-card-title">${escapeHtml(s.title || s.name)}</div>
          <div class="info-card-desc">${escapeHtml(s.description || '暂无描述')}</div>
          <div class="info-card-meta">
            📁 ${escapeHtml(s.name)}
            ${s.isSymlink ? '<span class="badge badge-orange" style="margin-left:6px">符号链接</span>' : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  renderContent(html);
  updateStatus(`已加载 ${skills.length} 个技能`);
  setStatusDot('connected');
}

/**
 * 过滤技能卡片
 */
function filterSkillCards(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('.skill-card').forEach(card => {
    const name = card.dataset.name.toLowerCase();
    card.style.display = name.includes(q) ? '' : 'none';
  });
}

/**
 * 打开技能详情
 */
async function openSkillDetail(name) {
  showModal(name, '<div class="loading-spinner"><div class="spinner"></div><p>加载中...</p></div>');
  const result = await fetchJSON(`${API_BASE}/skills/${encodeURIComponent(name)}`);
  if (result.success) {
    // 用 marked.js 渲染 Markdown
    const html = marked.parse(result.data.content || '暂无内容');
    document.getElementById('modalBody').innerHTML = `<div class="markdown-body">${html}</div>`;
  } else {
    document.getElementById('modalBody').innerHTML = `<div class="error-box"><span class="error-icon">⚠</span><p>${escapeHtml(result.error)}</p></div>`;
  }
}
