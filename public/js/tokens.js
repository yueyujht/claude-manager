/**
 * public/js/tokens.js — Token 详情页
 */
let tokenCharts = {};

async function renderTokens() {
  showLoading();
  const result = await fetchJSON(`${API_BASE}/tokens`);
  if (!result.success) { renderError(result.error); return; }

  const d = result.data;
  const models = d.models || {};

  // 汇总
  let totalIn = 0, totalOut = 0, totalCache = 0;
  Object.values(models).forEach(m => {
    totalIn += m.inputTokens || 0;
    totalOut += m.outputTokens || 0;
    totalCache += m.cacheReadInputTokens || 0;
  });

  let html = `
    <div class="page-header">
      <div>
        <div class="page-title">📈 Token 使用详情</div>
        <div class="page-subtitle">按模型、日期、项目的完整统计</div>
      </div>
    </div>

    <div class="cards-grid">
      <div class="stat-card">
        <div class="stat-card-label">总 Input</div>
        <div class="stat-card-value" style="color:var(--accent-blue)">${formatNumber(totalIn)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">总 Output</div>
        <div class="stat-card-value" style="color:var(--accent-green)">${formatNumber(totalOut)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">Cache Read</div>
        <div class="stat-card-value" style="color:var(--accent-orange)">${formatNumber(totalCache)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">会话/消息</div>
        <div class="stat-card-value">${d.totalSessions}<span style="font-size:16px;color:var(--text-muted)"> / ${d.totalMessages}</span></div>
      </div>
    </div>

    <div class="charts-row">
      <div class="panel">
        <div class="panel-title">📈 每日 Token 消耗趋势</div>
        <div class="chart-container"><canvas id="tokenDailyChart"></canvas></div>
      </div>
      <div class="panel">
        <div class="panel-title">🍩 按模型分布</div>
        <div class="chart-container"><canvas id="tokenModelChart"></canvas></div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">📊 模型用量明细</div>
      ${renderModelDetailTable(models)}
    </div>

    <div class="panel">
      <div class="panel-title">📁 按项目 Token 消耗</div>
      ${renderProjectTokenTable(d.projects)}
    </div>
  `;

  renderContent(html);

  // 渲染图表
  setTimeout(() => {
    renderTokenDailyChart(d.dailyTrend);
    renderModelPieChart(models);
  }, 100);

  updateStatus('Token 数据已加载');
  setStatusDot('connected');
}

function renderTokenDailyChart(dailyTrend) {
  const canvas = document.getElementById('tokenDailyChart');
  if (!canvas) return;
  if (tokenCharts.daily) tokenCharts.daily.destroy();

  const labels = dailyTrend.map(d => {
    const parts = d.date.split('-');
    return parts.length === 3 ? `${parts[1]}/${parts[2]}` : d.date;
  });

  // 按模型分组
  const modelNames = new Set();
  dailyTrend.forEach(d => {
    Object.keys(d.tokensByModel || {}).forEach(m => modelNames.add(m));
  });
  const colors = ['#4FC3F7', '#81C784', '#FFB74D', '#b39ddb', '#ef5350'];

  const datasets = [...modelNames].map((model, i) => ({
    label: model,
    data: dailyTrend.map(d => d.tokensByModel?.[model] || 0),
    borderColor: colors[i % colors.length],
    backgroundColor: 'transparent',
    tension: 0.3,
    pointRadius: 2
  }));

  tokenCharts.daily = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: getChartOptions()
  });
}

function renderModelPieChart(models) {
  const canvas = document.getElementById('tokenModelChart');
  if (!canvas) return;
  if (tokenCharts.model) tokenCharts.model.destroy();

  const labels = Object.keys(models);
  const data = Object.values(models).map(m =>
    (m.inputTokens || 0) + (m.outputTokens || 0)
  );
  const colors = ['#4FC3F7', '#81C784', '#FFB74D', '#b39ddb', '#ef5350'];

  tokenCharts.model = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: 'rgba(15, 17, 25, 1)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#9ca0b0', font: { size: 11 }, padding: 12 }
        }
      }
    }
  });
}

function renderModelDetailTable(models) {
  if (!models || Object.keys(models).length === 0) return '<div class="empty-state"><p>暂无数据</p></div>';
  let rows = Object.entries(models).map(([name, m]) => `
    <tr>
      <td><strong>${escapeHtml(name)}</strong></td>
      <td>${formatNumber(m.inputTokens)}</td>
      <td>${formatNumber(m.outputTokens)}</td>
      <td>${formatNumber(m.cacheReadInputTokens)}</td>
      <td>${formatNumber(m.cacheCreationInputTokens)}</td>
      <td>$${m.costUSD != null ? m.costUSD.toFixed(4) : '-'}</td>
    </tr>
  `).join('');
  return `<table class="data-table"><thead><tr><th>模型</th><th>Input</th><th>Output</th><th>Cache Read</th><th>Cache Create</th><th>费用(USD)</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderProjectTokenTable(projects) {
  if (!projects || projects.length === 0) return '<div class="empty-state"><p>暂无数据</p></div>';
  let rows = projects.map(p => `
    <tr>
      <td>${escapeHtml(p.name)}</td>
      <td>${formatNumber(p.totalInput)}</td>
      <td>${formatNumber(p.totalOutput)}</td>
      <td>${formatNumber(p.totalCache)}</td>
      <td>$${p.cost != null ? p.cost.toFixed(2) : '-'}</td>
    </tr>
  `).join('');
  return `<table class="data-table"><thead><tr><th>项目</th><th>Input</th><th>Output</th><th>Cache</th><th>费用(USD)</th></tr></thead><tbody>${rows}</tbody></table>`;
}
