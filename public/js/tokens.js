/**
 * public/js/tokens.js — Token 详情页
 */
let tokenCharts = {};
let tokenDailyFull = [];  // 全量每日数据
let tokenTimeRange = 30;  // 默认30天

async function renderTokens(silent = false) {
  if (!silent) showLoading();
  const result = await fetchJSON(`${API_BASE}/tokens`);
  if (!result.success) { if (silent) return; renderError(result.error); return; }

  const d = result.data;
  const models = d.models || {};
  tokenDailyFull = d.dailyTrend || [];

  // 汇总
  let totalIn = 0, totalOut = 0, totalCache = 0;
  Object.values(models).forEach(m => {
    totalIn += m.inputTokens || 0;
    totalOut += m.outputTokens || 0;
    totalCache += m.cacheReadInputTokens || 0;
  });

  const filteredDaily = filterDailyByRange(tokenDailyFull, tokenTimeRange);

  let html = `
    <div class="page-header">
      <div>
        <div class="page-title">📈 Token 使用详情</div>
        <div class="page-subtitle">按模型、日期、项目的完整统计</div>
      </div>
      <div class="time-range-btns">
        <button class="page-btn ${tokenTimeRange === 7 ? 'active' : ''}" onclick="switchTokenRange(7)">7天</button>
        <button class="page-btn ${tokenTimeRange === 30 ? 'active' : ''}" onclick="switchTokenRange(30)">30天</button>
        <button class="page-btn ${tokenTimeRange === 90 ? 'active' : ''}" onclick="switchTokenRange(90)">90天</button>
        <button class="page-btn ${tokenTimeRange === 0 ? 'active' : ''}" onclick="switchTokenRange(0)">全部</button>
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
        <div class="panel-title" id="tokenDailyTitle">📈 每日 Token 消耗趋势（${tokenTimeRange === 0 ? '全部' : '近' + tokenTimeRange + '天'}）</div>
        <div class="chart-container"><canvas id="tokenDailyChart"></canvas></div>
      </div>
      <div class="panel">
        <div class="panel-title">🍩 按模型分布</div>
        <div class="chart-container"><canvas id="tokenModelChart"></canvas></div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">📊 模型用量明细
        <button class="btn-refresh" style="font-size:11px;padding:4px 10px;margin-left:12px" onclick="exportModelCSV()">📥 导出CSV</button>
      </div>
      ${renderModelDetailTable(models)}
    </div>

    <div class="panel">
      <div class="panel-title">📁 按项目 Token 消耗
        <button class="btn-refresh" style="font-size:11px;padding:4px 10px;margin-left:12px" onclick="exportProjectCSV()">📥 导出CSV</button>
      </div>
      ${renderProjectTokenTable(d.projects)}
    </div>
  `;

  renderContent(html);

  // 渲染图表（等 DOM 更新后）
  requestAnimationFrame(() => {
    renderTokenDailyChart(filteredDaily);
    renderModelPieChart(models);
  });

  updateStatus('Token 数据已加载');
  setStatusDot('connected');
}

/**
 * 切换时间范围
 */
function switchTokenRange(days) {
  tokenTimeRange = days;
  const filtered = filterDailyByRange(tokenDailyFull, days);
  renderTokenDailyChart(filtered);
  // 更新按钮和标题
  document.querySelectorAll('.time-range-btns .page-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.textContent) === days || (days === 0 && btn.textContent === '全部'));
  });
  const titleEl = document.getElementById('tokenDailyTitle');
  if (titleEl) {
    titleEl.innerHTML = `📈 每日 Token 消耗趋势（${days === 0 ? '全部' : '近' + days + '天'}）`;
  }
}

function filterDailyByRange(daily, days) {
  if (!daily || days === 0) return daily || [];
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return daily.filter(d => d.date >= cutoffStr);
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

// ========== CSV 导出 ==========

let tokenModelsCache = {};
let tokenProjectsCache = [];

async function exportModelCSV() {
  if (Object.keys(tokenModelsCache).length === 0) {
    const result = await fetchJSON(`${API_BASE}/tokens/models`);
    if (result.success) tokenModelsCache = result.data;
  }
  const rows = Object.entries(tokenModelsCache).map(([name, m]) => [
    name, m.inputTokens, m.outputTokens, m.cacheReadInputTokens, m.cacheCreationInputTokens,
    m.costUSD != null ? m.costUSD.toFixed(4) : '0'
  ]);
  exportCSV('claude-token-models', ['模型', 'Input', 'Output', 'Cache Read', 'Cache Create', '费用(USD)'], rows);
}

async function exportProjectCSV() {
  const result = await fetchJSON(`${API_BASE}/tokens`);
  if (result.success) {
    const rows = result.data.projects.map(p => [
      p.name, p.totalInput, p.totalOutput, p.totalCache, p.cost != null ? p.cost.toFixed(2) : '0'
    ]);
    exportCSV('claude-token-projects', ['项目', 'Input', 'Output', 'Cache', '费用(USD)'], rows);
  }
}
