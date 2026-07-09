/**
 * public/js/utils.js — 工具函数
 */

// API 基础路径
const API_BASE = '/api';

/**
 * 通用 fetch 封装，带错误处理
 */
async function fetchJSON(url) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return data;
  } catch (err) {
    console.error('请求失败:', url, err);
    return { success: false, error: err.message };
  }
}

/**
 * 格式化大数字（添加千分位分隔）
 */
function formatNumber(n) {
  if (n == null || isNaN(n)) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('zh-CN');
}

/**
 * 格式化日期字符串
 */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    // 尝试解析 "2026-06-03" 格式
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
    return dateStr;
  }
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * 格式化时间戳
 */
function formatTimestamp(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  return d.toLocaleString('zh-CN');
}

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes >= 1_048_576) return (bytes / 1_048_576).toFixed(1) + ' MB';
  if (bytes >= 1_024) return (bytes / 1_024).toFixed(1) + ' KB';
  return bytes + ' B';
}

/**
 * 转义 HTML（防止 XSS）
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * 显示加载状态
 */
function showLoading() {
  document.getElementById('loadingSpinner').style.display = 'flex';
  document.getElementById('pageContent').innerHTML = '';
}

/**
 * 隐藏加载状态
 */
function hideLoading() {
  document.getElementById('loadingSpinner').style.display = 'none';
}

/**
 * 渲染内容到主区域
 */
function renderContent(html) {
  hideLoading();
  document.getElementById('pageContent').innerHTML = html;
}

/**
 * 显示错误信息
 */
function renderError(msg) {
  hideLoading();
  document.getElementById('pageContent').innerHTML = `
    <div class="error-box">
      <span class="error-icon">⚠</span>
      <p>${escapeHtml(msg)}</p>
      <button class="btn" onclick="refreshCurrentPage()">重试</button>
    </div>`;
}

/**
 * 更新状态栏
 */
function updateStatus(text, isError = false) {
  const el = document.getElementById('statusText');
  el.textContent = text;
  el.style.color = isError ? '#ef5350' : '#81C784';
  document.getElementById('lastRefresh').textContent = new Date().toLocaleTimeString('zh-CN');
}

/**
 * 更新状态指示灯
 */
function setStatusDot(status) {
  const dot = document.getElementById('statusDot');
  dot.className = 'status-dot status-' + status; // connected, loading, error
}

/**
 * 节流函数
 */
function throttle(fn, delay) {
  let timer = null;
  return function(...args) {
    if (timer) return;
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}
