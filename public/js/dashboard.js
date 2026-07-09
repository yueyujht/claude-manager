/**
 * public/js/dashboard.js — 仪表盘概览页
 */
let dashboardCharts = {}; // 存储图表实例，避免重复创建

async function renderDashboard(silent = false) {
  if (!silent) showLoading();

  const result = await fetchJSON(`${API_BASE}/dashboard`);
  if (!result.success) {
    renderError(result.error || '获取仪表盘数据失败');
    setStatusDot('error');
    updateStatus('数据加载失败', true);
    return;
  }

  const d = result.data;
  const s = d.summary;

  // 更新导航栏徽章
  document.getElementById('skillBadge').textContent = s.skillCount;

  // 统计卡片 + Token趋势图 + 项目分布
  let html = `
    <div class="page-header">
      <div>
        <div class="page-title">📊 仪表盘概览</div>
        <div class="page-subtitle">Claude Code 运行状态一览</div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="cards-grid">
      <div class="stat-card">
        <div class="stat-card-label">Token 总消耗</div>
        <div class="stat-card-value">${formatNumber(s.totalInputTokens + s.totalOutputTokens)}</div>
        <div class="stat-card-sub">输入 ${formatNumber(s.totalInputTokens)} · 输出 ${formatNumber(s.totalOutputTokens)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Cache 读取</div>
        <div class="stat-card-value">${formatNumber(s.totalCacheReadTokens)}</div>
        <div class="stat-card-sub">有效节省 API 调用</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">活跃会话</div>
        <div class="stat-card-value">${s.activeSessions}</div>
        <div class="stat-card-sub">共 ${s.projectCount} 个项目</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">技能 / 插件</div>
        <div class="stat-card-value">${s.skillCount}<span style="font-size:16px;color:var(--text-muted)"> / ${s.pluginCount}</span></div>
        <div class="stat-card-sub">${s.memoryCount} 条记忆 · ${s.historyCount} 条历史</div>
      </div>
    </div>

    <!-- 图表行 -->
    <div class="charts-row">
      <div class="panel">
        <div class="panel-title">📈 Token 消耗趋势（每日）</div>
        <div class="chart-container">
          <canvas id="dailyTokenChart"></canvas>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">📊 按项目 Token 分布</div>
        <div class="chart-container">
          <canvas id="projectTokenChart"></canvas>
        </div>
      </div>
    </div>

    <!-- 会话列表 + 模型用量 -->
    <div class="charts-row">
      <div class="panel">
        <div class="panel-title">💬 活跃会话</div>
        ${renderSessionTable(d.sessions)}
      </div>
      <div class="panel">
        <div class="panel-title">🤖 模型用量</div>
        ${renderModelTable(d.modelCosts)}
      </div>
    </div>

    <!-- 最近项目 -->
    <div class="panel">
      <div class="panel-title">📁 项目 Token 消耗 TOP 5</div>
      ${renderProjectMiniTable(d.projects.slice(0, 5))}
    </div>
  `;

  renderContent(html);

  // 渲染图表（需要等 DOM 更新后）
  setTimeout(() => {
    renderDailyTokenChart(d.dailyActivity);
    renderProjectTokenChart(d.projects);
  }, 100);

  updateStatus('仪表盘已加载');
  setStatusDot('connected');
}

/**
 * 每日 Token 趋势折线图
 */
function renderDailyTokenChart(dailyActivity) {
  const canvas = document.getElementById('dailyTokenChart');
  if (!canvas) return;

  // 销毁旧图表
  if (dashboardCharts.daily) dashboardCharts.daily.destroy();

  const labels = dailyActivity.map(d => {
    const parts = d.date.split('-');
    return parts.length === 3 ? `${parts[1]}/${parts[2]}` : d.date;
  });

  let tokenData = [];
  if (dailyActivity.length > 0 && dailyActivity[0].tokensByModel) {
    // dailyModelTokens 格式
    tokenData = dailyActivity.map(d =>
      Object.values(d.tokensByModel || {}).reduce((a, b) => a + b, 0)
    );
  } else {
    // dailyActivity 格式
    tokenData = dailyActivity.map(d => d.toolCallCount || 0);
  }

  // 如果没数据，画一个占位
  if (tokenData.every(v => v === 0)) {
    // 尝试从 token API 获取更详细数据
    fetchJSON(`${API_BASE}/tokens/daily`).then(result => {
      if (result.success && result.data.length > 0) {
        const newLabels = result.data.map(d => {
          const parts = d.date.split('-');
          return parts.length === 3 ? `${parts[1]}/${parts[2]}` : d.date;
        });
        const newData = result.data.map(d => d.total);
        renderLineChart('dailyTokenChart', newLabels, newData, 'Token');
      }
    });
    return;
  }

  dashboardCharts.daily = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Token 消耗',
        data: tokenData,
        borderColor: '#4FC3F7',
        backgroundColor: 'rgba(79, 195, 247, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: '#4FC3F7'
      }]
    },
    options: getChartOptions()
  });
}

/**
 * 按项目 Token 分布柱状图
 */
function renderProjectTokenChart(projects) {
  const canvas = document.getElementById('projectTokenChart');
  if (!canvas) return;

  if (dashboardCharts.project) dashboardCharts.project.destroy();

  const top5 = projects.slice(0, 5);
  const colors = ['#4FC3F7', '#81C784', '#FFB74D', '#b39ddb', '#ef5350'];

  dashboardCharts.project = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: top5.map(p => p.name.substring(0, 20)),
      datasets: [{
        label: 'Input Tokens',
        data: top5.map(p => p.totalInputTokens),
        backgroundColor: colors
      }]
    },
    options: {
      ...getChartOptions(),
      plugins: {
        legend: { display: false }
      }
    }
  });
}

/**
 * Chart.js 通用配置（深色主题）
 */
function getChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#9ca0b0', font: { size: 11 } }
      },
      tooltip: {
        backgroundColor: 'rgba(28, 31, 46, 0.95)',
        titleColor: '#e2e4e9',
        bodyColor: '#9ca0b0',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: { color: '#6b6f7e', font: { size: 10 } },
        grid: { color: 'rgba(255,255,255,0.03)' }
      },
      y: {
        ticks: {
          color: '#6b6f7e',
          font: { size: 10 },
          callback: v => formatNumber(v)
        },
        grid: { color: 'rgba(255,255,255,0.03)' }
      }
    }
  };
}

/**
 * 渲染折线图（通用）
 */
function renderLineChart(canvasId, labels, data, label) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (dashboardCharts[canvasId]) dashboardCharts[canvasId].destroy();

  dashboardCharts[canvasId] = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label,
        data,
        borderColor: '#4FC3F7',
        backgroundColor: 'rgba(79, 195, 247, 0.1)',
        fill: true,
        tension: 0.3
      }]
    },
    options: getChartOptions()
  });
}

// ========== 渲染辅助函数 ==========

function renderSessionTable(sessions) {
  if (!sessions || sessions.length === 0) {
    return '<div class="empty-state"><span class="empty-icon">💤</span><p>暂无活跃会话</p></div>';
  }
  let rows = sessions.map(s => `
    <tr>
      <td><span class="badge badge-green">PID ${s.pid}</span></td>
      <td>${escapeHtml(s.cwd || '-')}</td>
      <td>${s.kind || '-'}</td>
      <td>${s.version || '-'}</td>
      <td><span class="badge badge-blue">${s.status || 'active'}</span></td>
    </tr>
  `).join('');
  return `<table class="data-table"><thead><tr><th>进程</th><th>工作目录</th><th>入口</th><th>版本</th><th>状态</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderModelTable(modelCosts) {
  if (!modelCosts || Object.keys(modelCosts).length === 0) {
    return '<div class="empty-state"><span class="empty-icon">🤖</span><p>暂无模型数据</p></div>';
  }
  let rows = Object.entries(modelCosts).map(([model, data]) => `
    <tr>
      <td>${escapeHtml(model)}</td>
      <td>${formatNumber(data.inputTokens)}</td>
      <td>${formatNumber(data.outputTokens)}</td>
      <td>${formatNumber(data.cacheReadInputTokens)}</td>
      <td>$${data.costUSD != null ? data.costUSD.toFixed(2) : '0.00'}</td>
    </tr>
  `).join('');
  return `<table class="data-table"><thead><tr><th>模型</th><th>Input</th><th>Output</th><th>Cache Read</th><th>费用</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderProjectMiniTable(projects) {
  if (!projects || projects.length === 0) {
    return '<div class="empty-state"><p>暂无项目数据</p></div>';
  }
  let rows = projects.map(p => `
    <tr>
      <td>${escapeHtml(p.name)}</td>
      <td>${formatNumber(p.totalInputTokens)}</td>
      <td>${formatNumber(p.totalOutputTokens)}</td>
      <td>${formatNumber(p.totalCacheReadTokens)}</td>
      <td>$${p.costUSD != null ? p.costUSD.toFixed(2) : '0.00'}</td>
    </tr>
  `).join('');
  return `<table class="data-table"><thead><tr><th>项目</th><th>Input</th><th>Output</th><th>Cache</th><th>费用</th></tr></thead><tbody>${rows}</tbody></table>`;
}
