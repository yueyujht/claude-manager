/**
 * public/js/app.js — 主控制器
 * 处理导航切换、页面路由、自动刷新
 */

// 当前页面
let currentPage = 'dashboard';
let autoRefreshTimer = null;
const AUTO_REFRESH_INTERVAL = 30000;

// 页面路由映射：页面名 → 渲染函数
const pageRoutes = {
  dashboard: renderDashboard,
  tokens: renderTokens,
  skills: renderSkills,
  plugins: renderPlugins,
  sessions: renderSessions,
  projects: renderProjects,
  config: renderConfig,
  memory: renderMemory,
  history: renderHistory,
  plans: renderPlans
};

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
  // 绑定导航点击事件
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      navigateTo(page);
    });
  });

  // 自动刷新开关
  document.getElementById('autoRefresh').addEventListener('change', (e) => {
    if (e.target.checked) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  });

  // 键盘快捷键
  document.addEventListener('keydown', (e) => {
    // Ctrl+K 或 / 聚焦搜索
    if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && !e.target.closest('input'))) {
      e.preventDefault();
      const searchInput = document.getElementById('globalSearch');
      if (searchInput) searchInput.focus();
    }
    // R 刷新当前页
    if (e.key === 'r' && !e.ctrlKey && !e.metaKey && !e.target.closest('input, textarea')) {
      refreshCurrentPage();
    }
  });

  // 从 URL hash 读取初始页面
  const hashPage = window.location.hash.replace('#', '') || 'dashboard';
  navigateTo(hashPage);
  startAutoRefresh();

  // 监听浏览器前进/后退
  window.addEventListener('hashchange', () => {
    const page = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(page);
  });
});

// ========== 导航切换 ==========
function navigateTo(page) {
  if (currentPage === page && document.getElementById('pageContent').innerHTML) return;

  currentPage = page;
  window.location.hash = page;

  // 更新导航高亮
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // 渲染页面
  const renderFn = pageRoutes[page];
  if (renderFn) {
    showLoading();
    setStatusDot('loading');
    updateStatus('加载中...');

    // 使用 Promise 包装以支持异步渲染
    Promise.resolve(renderFn()).catch(err => {
      renderError('页面渲染失败: ' + err.message);
      setStatusDot('error');
      updateStatus('加载失败', true);
    });
  }
}

// ========== 刷新功能 ==========
function refreshCurrentPage() {
  setStatusDot('loading');
  const renderFn = pageRoutes[currentPage];
  if (renderFn) {
    Promise.resolve(renderFn()).catch(err => {
      renderError('刷新失败: ' + err.message);
      setStatusDot('error');
      updateStatus('刷新失败', true);
    });
  }
}

function startAutoRefresh() {
  stopAutoRefresh();
  autoRefreshTimer = setInterval(() => {
    // 静默刷新仪表盘、Token、会话页
    if (['dashboard', 'tokens', 'sessions'].includes(currentPage)) {
      const renderFn = pageRoutes[currentPage];
      if (renderFn) {
        Promise.resolve(renderFn(true)).catch(() => {});
      }
    }
  }, AUTO_REFRESH_INTERVAL);
}

function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

// ========== 模态框 ==========
function showModal(title, bodyHtml) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('skillModal').classList.add('active');
}

function closeModal() {
  document.getElementById('skillModal').classList.remove('active');
}

// 点击遮罩关闭
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    closeModal();
  }
});

// ========== 全局搜索 ==========
let globalSearchCache = null;

async function handleGlobalSearch(query) {
  const resultsEl = document.getElementById('globalSearchResults');
  if (!query || query.trim().length < 1) {
    resultsEl.classList.remove('active');
    return;
  }

  // 延迟加载缓存
  if (!globalSearchCache) {
    await buildSearchCache();
  }

  const q = query.toLowerCase();
  const results = [];

  // 搜索技能
  (globalSearchCache.skills || []).forEach(s => {
    if (s.name.toLowerCase().includes(q) || (s.title || '').toLowerCase().includes(q)) {
      results.push({ type: 'skill', icon: '🛠', title: s.title || s.name, sub: '技能', page: 'skills', query: s.name });
    }
  });

  // 搜索项目
  (globalSearchCache.projects || []).forEach(p => {
    const displayName = (p.displayPath || p.name).replace(/--/g, ' / ').replace(/^-/, '');
    if (displayName.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)) {
      results.push({ type: 'project', icon: '📁', title: displayName, sub: `${p.sessionCount} 会话`, page: 'projects' });
    }
  });

  // 搜索计划
  (globalSearchCache.plans || []).forEach(p => {
    if (p.title.toLowerCase().includes(q) || p.file.toLowerCase().includes(q)) {
      results.push({ type: 'plan', icon: '📝', title: p.title, sub: p.file, page: 'plans' });
    }
  });

  // 搜索历史（最多匹配20条）
  (globalSearchCache.history || []).forEach(h => {
    if (h.text.toLowerCase().includes(q)) {
      results.push({ type: 'history', icon: '📋', title: h.text.substring(0, 80), sub: formatDate(h.timestamp), page: 'history', query: h.text.substring(0, 30) });
    }
  });

  const limited = results.slice(0, 15);

  if (limited.length === 0) {
    resultsEl.innerHTML = '<div class="global-search-empty">未找到匹配结果</div>';
  } else {
    resultsEl.innerHTML = limited.map(r => `
      <div class="global-search-result-item" onclick="navigateTo('${r.page}');document.getElementById('globalSearchResults').classList.remove('active')">
        <span class="result-icon">${r.icon}</span>
        <div class="result-text">
          <div class="result-title">${escapeHtml(r.title)}</div>
          <div class="result-sub">${escapeHtml(r.sub)}</div>
        </div>
      </div>
    `).join('');
  }
  resultsEl.classList.add('active');
}

async function buildSearchCache() {
  try {
    const [skills, projects, plans, history] = await Promise.all([
      fetchJSON(`${API_BASE}/skills`),
      fetchJSON(`${API_BASE}/projects`),
      fetchJSON(`${API_BASE}/plans`),
      fetchJSON(`${API_BASE}/history?limit=200`)
    ]);
    globalSearchCache = {
      skills: skills.data || [],
      projects: projects.data || [],
      plans: plans.data || [],
      history: (history.data && history.data.items) ? history.data.items : []
    };
  } catch {
    globalSearchCache = { skills: [], projects: [], plans: [], history: [] };
  }
}

// ========== 主题切换 ==========
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') !== 'light';
  if (isDark) {
    html.setAttribute('data-theme', 'light');
    document.getElementById('themeToggle').textContent = '☀️';
  } else {
    html.removeAttribute('data-theme');
    document.getElementById('themeToggle').textContent = '🌓';
  }
}
