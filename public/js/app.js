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

  // 加载默认页面（概览）
  navigateTo('dashboard');
  startAutoRefresh();
});

// ========== 导航切换 ==========
function navigateTo(page) {
  if (currentPage === page && document.getElementById('pageContent').innerHTML) return;

  currentPage = page;

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
    if (currentPage === 'dashboard') {
      // 静默刷新仪表盘（不显示 loading）
      renderDashboard(true).catch(() => {});
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
