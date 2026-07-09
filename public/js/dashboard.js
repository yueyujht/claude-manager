/**
 * public/js/dashboard.js — 仪表盘概览页
 */
let dashboardCharts = {};

async function renderDashboard(silent = false) {
  if (!silent) showLoading();

  try {
    const [result, counterResult] = await Promise.all([
      fetchJSON(`${API_BASE}/dashboard`),
      fetchJSON(`${API_BASE}/token-counter`)
    ]);

    // 静默模式下 API 失败直接返回，不破坏现有内容
    if (!result.success) {
      if (silent) return;
      renderError(result.error || '获取仪表盘数据失败');
      setStatusDot('error');
      updateStatus('数据加载失败', true);
      return;
    }

    const d = result.data;
    const s = d.summary;

    // Token-counter 降级：失败时使用 dashboard summary 中的 Token 字段
    let tc;
    if (counterResult.success) {
      tc = counterResult.data;
    } else {
      tc = {
        totalInput: s.totalInputTokens || 0,
        totalOutput: s.totalOutputTokens || 0,
        totalCacheRead: s.totalCacheReadTokens || 0,
        todayInput: s.todayInputTokens || 0,
        todayOutput: s.todayOutputTokens || 0,
        todayCacheRead: s.todayCacheReadTokens || 0,
      };
    }

    // 更新导航栏徽章
    document.getElementById('skillBadge').textContent = s.skillCount;

    const totalAll = (tc.totalInput || 0) + (tc.totalOutput || 0) + (tc.totalCacheRead || 0);
    const todayAll = (tc.todayInput || 0) + (tc.todayOutput || 0) + (tc.todayCacheRead || 0);

    if (silent) {
      // 静默刷新：只更新卡片数值和图表，不重建 DOM
      silentUpdateCards(totalAll, todayAll, tc, s);
      silentUpdateCharts(d.dailyActivity);
      updateStatus('仪表盘已刷新');
      setStatusDot('connected');
      return;
    }

    // ===== 完整页面渲染 =====
    let html = `
      <div class="page-header">
        <div>
          <div class="page-title">📊 仪表盘概览</div>
          <div class="page-subtitle">Claude Code 运行状态一览</div>
        </div>
      </div>

      <!-- 统计卡片 -->
      <div class="cards-grid">
        <div class="stat-card" data-stat="total-tokens" style="border-left: 3px solid var(--accent-blue)">
          <div class="stat-card-label">🔥 Token 总消耗</div>
          <div class="stat-card-value">${formatNumber(totalAll)}</div>
          <div class="stat-card-sub">输入 ${formatNumber(tc.totalInput || 0)} · 输出 ${formatNumber(tc.totalOutput || 0)} · Cache ${formatNumber(tc.totalCacheRead || 0)}</div>
        </div>
        <div class="stat-card" data-stat="today-tokens" style="border-left: 3px solid var(--accent-orange)">
          <div class="stat-card-label">📅 今日消耗</div>
          <div class="stat-card-value" style="color:var(--accent-orange)">${formatNumber(todayAll)}</div>
          <div class="stat-card-sub">输入 ${formatNumber(tc.todayInput || 0)} · 输出 ${formatNumber(tc.todayOutput || 0)} · Cache ${formatNumber(tc.todayCacheRead || 0)}</div>
        </div>
        <div class="stat-card" data-stat="active-sessions" style="border-left: 3px solid var(--accent-green)">
          <div class="stat-card-label">💬 活跃会话</div>
          <div class="stat-card-value">${s.activeSessions}</div>
          <div class="stat-card-sub">共 ${s.projectCount} 个项目</div>
        </div>
        <div class="stat-card" data-stat="skills-plugins" style="border-left: 3px solid var(--accent-purple)">
          <div class="stat-card-label">🛠 技能 / 插件</div>
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
          <div class="panel-title">📊 近期活动</div>
          <div class="chart-container">
            <canvas id="activityBarChart"></canvas>
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
    `;

    renderContent(html);

    // 图表渲染（DOM 更新后）
    requestAnimationFrame(() => {
      renderDailyTokenChart(d.dailyActivity);
      renderActivityBarChart(d.dailyActivity);
    });

    updateStatus('仪表盘已加载');
    setStatusDot('connected');
  } catch (err) {
    if (silent) return;
    renderError(err.message || '仪表盘加载异常');
    setStatusDot('error');
    updateStatus('仪表盘加载异常', true);
  }
}

/**
 * 静默刷新：只更新卡片数值，不重建 DOM
 */
function silentUpdateCards(totalAll, todayAll, tc, s) {
  const setValue = (stat, content, isHtml = false) => {
    const card = document.querySelector(`[data-stat="${stat}"]`);
    if (!card) return;
    const valueEl = card.querySelector('.stat-card-value');
    if (valueEl) {
      if (isHtml) valueEl.innerHTML = content;
      else valueEl.textContent = content;
    }
  };
  const setSub = (stat, content) => {
    const card = document.querySelector(`[data-stat="${stat}"]`);
    if (!card) return;
    const subEl = card.querySelector('.stat-card-sub');
    if (subEl) subEl.textContent = content;
  };

  setValue('total-tokens', formatNumber(totalAll));
  setValue('today-tokens', formatNumber(todayAll));
  setValue('active-sessions', s.activeSessions);
  setValue('skills-plugins',
    `${s.skillCount}<span style="font-size:16px;color:var(--text-muted)"> / ${s.pluginCount}</span>`, true);

  setSub('total-tokens', `输入 ${formatNumber(tc.totalInput || 0)} · 输出 ${formatNumber(tc.totalOutput || 0)} · Cache ${formatNumber(tc.totalCacheRead || 0)}`);
  setSub('today-tokens', `输入 ${formatNumber(tc.todayInput || 0)} · 输出 ${formatNumber(tc.todayOutput || 0)} · Cache ${formatNumber(tc.todayCacheRead || 0)}`);
  setSub('active-sessions', `共 ${s.projectCount} 个项目`);
  setSub('skills-plugins', `${s.memoryCount} 条记忆 · ${s.historyCount} 条历史`);
}

/**
 * 静默刷新：只更新图表数据（chart.update），图表不存在时才新建
 */
function silentUpdateCharts(dailyActivity) {
  // 每日 Token 折线图
  const dailyCanvas = document.getElementById('dailyTokenChart');
  if (dailyCanvas) {
    const labels = dailyActivity.map(d => {
      const parts = d.date.split('-');
      return parts.length === 3 ? `${parts[1]}/${parts[2]}` : d.date;
    });

    let tokenData = [];
    if (dailyActivity.length > 0 && dailyActivity[0].tokensByModel) {
      tokenData = dailyActivity.map(d =>
        Object.values(d.tokensByModel || {}).reduce((a, b) => a + b, 0)
      );
    } else {
      tokenData = dailyActivity.map(d => d.toolCallCount || 0);
    }

    if (dashboardCharts.daily) {
      // 图表已存在：只更新数据
      dashboardCharts.daily.data.labels = labels;
      dashboardCharts.daily.data.datasets[0].data = tokenData;
      dashboardCharts.daily.update('none');
    } else if (tokenData.some(v => v > 0)) {
      // 图表不存在且有数据时创建
      dashboardCharts.daily = new Chart(dailyCanvas, {
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
  }

  // 活动柱状图
  const activityCanvas = document.getElementById('activityBarChart');
  if (activityCanvas) {
    const recent = dailyActivity.slice(-14);
    const barLabels = recent.map(d => {
      const parts = d.date.split('-');
      return parts.length === 3 ? `${parts[1]}/${parts[2]}` : d.date;
    });

    if (dashboardCharts.activity) {
      // 图表已存在：只更新数据
      dashboardCharts.activity.data.labels = barLabels;
      dashboardCharts.activity.data.datasets[0].data = recent.map(d => d.messageCount || 0);
      dashboardCharts.activity.update('none');
    } else {
      // 图表不存在时新建
      dashboardCharts.activity = new Chart(activityCanvas, {
        type: 'bar',
        data: {
          labels: barLabels,
          datasets: [{
            label: '消息数',
            data: recent.map(d => d.messageCount || 0),
            backgroundColor: '#4FC3F7',
            borderRadius: 4
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
  }
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
 * 近期活动柱状图（消息数/工具调用）
 */
function renderActivityBarChart(dailyActivity) {
  const canvas = document.getElementById('activityBarChart');
  if (!canvas) return;

  if (dashboardCharts.activity) dashboardCharts.activity.destroy();

  const recent = dailyActivity.slice(-14);
  const labels = recent.map(d => {
    const parts = d.date.split('-');
    return parts.length === 3 ? `${parts[1]}/${parts[2]}` : d.date;
  });

  dashboardCharts.activity = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '消息数',
        data: recent.map(d => d.messageCount || 0),
        backgroundColor: '#4FC3F7',
        borderRadius: 4
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

