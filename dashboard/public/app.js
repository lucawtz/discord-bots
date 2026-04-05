// ── ServerHub Dashboard SPA ─────────────────────────────────────
'use strict';

// ── State ───────────────────────────────────────────────────────
const state = {
  view: 'grid', // grid | list
  activeFilter: 'All',
  chartInstances: {},
  refreshTimer: null,
  metricsTimer: null,
  currentUser: null,
};

// ── API Client ──────────────────────────────────────────────────
const api = {
  async get(path) {
    const res = await fetch(`/api${path}`);
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `API ${res.status}`); }
    return res.json();
  },
  async post(path, body) {
    const opts = { method: 'POST' };
    if (body) { opts.headers = { 'Content-Type': 'application/json' }; opts.body = JSON.stringify(body); }
    const res = await fetch(`/api${path}`, opts);
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `API ${res.status}`); }
    return res.json();
  },
  async patch(path, body) {
    const res = await fetch(`/api${path}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `API ${res.status}`); }
    return res.json();
  },
  async del(path) {
    const res = await fetch(`/api${path}`, { method: 'DELETE' });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `API ${res.status}`); }
    return res.json();
  }
};

// ── Router ──────────────────────────────────────────────────────
function getRoute() {
  const hash = location.hash.slice(1) || '/servers';
  const parts = hash.split('/').filter(Boolean);
  return { path: hash, parts, page: parts[0] || 'servers' };
}

function navigate(path) {
  location.hash = path;
}

window.addEventListener('hashchange', () => render());

// ── Render Engine ───────────────────────────────────────────────
async function render() {
  clearTimers();
  const route = getRoute();
  const app = document.getElementById('app');
  updateSidebar(route.page);

  // Load current user once
  if (!state.currentUser) {
    try {
      state.currentUser = await api.get('/me');
      updateTopbarUser();
    } catch {
      window.location.href = '/login';
      return;
    }
  }

  try {
    if (route.page === 'servers' && route.parts.length === 1) {
      await renderServersPage(app);
    } else if (route.page === 'servers' && route.parts.length >= 2) {
      const tab = route.parts[2] || 'overview';
      await renderServerDetail(app, route.parts[1], tab);
    } else if (route.page === 'bots' && route.parts.length === 1) {
      await renderBotsPage(app);
    } else if (route.page === 'bots' && route.parts.length >= 2) {
      await renderBotDetail(app, route.parts[1]);
    } else if (route.page === 'alerts') {
      await renderAlertsPage(app);
    } else if (route.page === 'deployments') {
      await renderDeploymentsPage(app);
    } else if (route.page === 'network') {
      await renderNetworkPage(app);
    } else if (route.page === 'storage') {
      await renderStoragePage(app);
    } else if (route.page === 'settings') {
      await renderSettingsPage(app);
    } else {
      await renderServersPage(app);
    }
  } catch (err) {
    app.innerHTML = `<div class="empty-state"><div class="empty-state__title">Fehler</div><div class="empty-state__desc">${esc(err.message)}</div></div>`;
  }

  updateAlertBadge();
}

function clearTimers() {
  if (state.refreshTimer) clearInterval(state.refreshTimer);
  if (state.metricsTimer) clearInterval(state.metricsTimer);
  state.refreshTimer = null;
  state.metricsTimer = null;
  Object.values(state.chartInstances).forEach(c => c.destroy && c.destroy());
  state.chartInstances = {};
}

// ── Sidebar ─────────────────────────────────────────────────────
function updateSidebar(page) {
  document.querySelectorAll('.sidebar__item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
}

async function updateAlertBadge() {
  try {
    const data = await api.get('/alerts');
    const count = data.alerts.filter(a => !a.acknowledged).length;
    const badge = document.getElementById('alert-count');
    const sbBadge = document.getElementById('sidebar-alert-count');
    if (badge) { badge.textContent = count; badge.style.display = count > 0 ? 'flex' : 'none'; }
    if (sbBadge) { sbBadge.textContent = count; sbBadge.style.display = count > 0 ? 'inline' : 'none'; }
  } catch {}
}

// ── Helpers ─────────────────────────────────────────────────────
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes.toFixed(0) + ' B/s';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB/s';
  return (bytes / 1048576).toFixed(1) + ' MB/s';
}

function fillClass(pct) {
  if (pct < 60) return 'fill--low';
  if (pct < 80) return 'fill--mid';
  return 'fill--high';
}

function tagClass(tag) {
  const t = tag.toLowerCase();
  if (t === 'production') return 'tag--production';
  if (t === 'testing') return 'tag--testing';
  if (t === 'development') return 'tag--development';
  if (t === 'docker') return 'tag--docker';
  return '';
}

function statusClass(s) {
  if (s === 'running' || s === 'online') return 'status--running';
  if (s === 'crashed') return 'status--crashed';
  return 'status--stopped';
}

function statusLabel(s) {
  if (s === 'running') return 'Running';
  if (s === 'online') return 'Online';
  if (s === 'crashed') return 'Crashed';
  if (s === 'offline') return 'Offline';
  return 'Stopped';
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'gerade eben';
  if (m < 60) return `vor ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h}h`;
  return `vor ${Math.floor(h / 24)}d`;
}

function setBreadcrumb(...items) {
  const bc = document.getElementById('breadcrumb');
  bc.innerHTML = items.map((item, i) => {
    if (i === items.length - 1) return `<span class="current">${esc(item.label)}</span>`;
    return `<a href="${item.href}">${esc(item.label)}</a><span class="sep">/</span>`;
  }).join('');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toasts');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span>${esc(message)}</span><button class="toast__close" onclick="this.parentElement.remove()">&times;</button>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function resourceBar(label, pct, valueText) {
  return `<div class="resource-row">
    <span class="resource-row__label">${label}</span>
    <div class="resource-row__bar"><div class="resource-row__fill ${fillClass(pct)}" style="width:${Math.min(100, pct)}%"></div></div>
    <span class="resource-row__value">${valueText || Math.round(pct) + '%'}</span>
  </div>`;
}

function botIcon(icon, color) {
  const icons = { music: '&#9835;', activity: '&#9737;', 'volume-2': '&#9834;' };
  return `<div class="bot-card__icon" style="background:${color}22;color:${color}">${icons[icon] || '&#9679;'}</div>`;
}

// ── Page: Servers Overview ──────────────────────────────────────
async function renderServersPage(app) {
  setBreadcrumb({ label: 'Servers' });
  app.innerHTML = '<div class="skeleton" style="height:200px;margin-bottom:16px"></div><div class="skeleton" style="height:400px"></div>';

  const data = await api.get('/servers');
  const agg = data.aggregate;
  const servers = data.servers;

  // Collect all tags
  const allTags = ['All', ...new Set(servers.flatMap(s => s.tags))];

  app.innerHTML = `
    <div class="page-header">
      <h1>Server Overview</h1>
      <div class="page-header__actions">
        <div class="view-toggle">
          <button class="view-toggle__btn ${state.view === 'grid' ? 'active' : ''}" data-view="grid">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Grid
          </button>
          <button class="view-toggle__btn ${state.view === 'list' ? 'active' : ''}" data-view="list">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            List
          </button>
        </div>
      </div>
    </div>

    <div class="agg-stats">
      <div class="agg-stat agg-stat--accent">
        <div class="agg-stat__value">${agg.totalServers}</div>
        <div class="agg-stat__label">Server (${agg.onlineServers} online)</div>
      </div>
      <div class="agg-stat agg-stat--success">
        <div class="agg-stat__value">${agg.runningBots}</div>
        <div class="agg-stat__label">Bots running (${agg.totalBots} total)</div>
      </div>
      <div class="agg-stat ${agg.activeAlerts > 0 ? 'agg-stat--danger' : 'agg-stat--success'}">
        <div class="agg-stat__value">${agg.activeAlerts}</div>
        <div class="agg-stat__label">Active Alerts</div>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-bar__search-wrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="filter-bar__search" id="server-search" placeholder="Server suchen...">
      </div>
      <div class="filter-tags" id="server-tags">
        ${allTags.map(t => `<button class="filter-tag ${state.activeFilter === t ? 'active' : ''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}
      </div>
    </div>

    <div id="servers-container">
      ${state.view === 'grid' ? renderServerGrid(servers) : renderServerList(servers)}
    </div>
  `;

  // Event listeners
  app.querySelectorAll('.view-toggle__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.view = btn.dataset.view;
      render();
    });
  });

  app.querySelectorAll('.filter-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeFilter = btn.dataset.tag;
      render();
    });
  });

  app.querySelectorAll('.server-card, .server-row').forEach(el => {
    el.addEventListener('click', () => navigate(`/servers/${el.dataset.id}`));
  });

  // Auto-refresh
  state.refreshTimer = setInterval(async () => {
    try {
      const fresh = await api.get('/servers');
      const container = document.getElementById('servers-container');
      if (container) {
        container.innerHTML = state.view === 'grid' ? renderServerGrid(fresh.servers) : renderServerList(fresh.servers);
        container.querySelectorAll('.server-card, .server-row').forEach(el => {
          el.addEventListener('click', () => navigate(`/servers/${el.dataset.id}`));
        });
      }
    } catch {}
  }, 5000);
}

function filterServers(servers) {
  if (state.activeFilter === 'All') return servers;
  return servers.filter(s => s.tags.includes(state.activeFilter));
}

function renderServerGrid(servers) {
  const filtered = filterServers(servers);
  if (filtered.length === 0) return '<div class="empty-state"><div class="empty-state__title">Keine Server gefunden</div></div>';
  return `<div class="card-grid">${filtered.map(s => `
    <div class="server-card" data-id="${s.id}">
      <div class="server-card__header">
        <div>
          <div class="server-card__name">${esc(s.name)}</div>
          <div class="server-card__ip">${esc(s.host)}</div>
          <div class="server-card__os">${esc(s.os)}</div>
        </div>
        <div class="status status--${s.status}"><span class="status__dot"></span>${statusLabel(s.status)}</div>
      </div>
      <div class="server-card__resources">
        ${resourceBar('CPU', s.cpu)}
        ${resourceBar('RAM', s.ram)}
        ${resourceBar('DSK', s.disk)}
      </div>
      <div style="display:flex;gap:16px;font-size:12px;color:var(--text-sec);margin-bottom:12px">
        <span>IN: ${formatBytes(s.netIn)}</span>
        <span>OUT: ${formatBytes(s.netOut)}</span>
      </div>
      <div class="server-card__footer">
        <div class="server-card__bots">Bots: <span>${s.botsRunning} running</span>${s.botsCrashed > 0 ? ` | <span style="color:var(--danger)">${s.botsCrashed} crashed</span>` : ''}</div>
        <div class="server-card__tags">${s.tags.map(t => `<span class="tag ${tagClass(t)}">${esc(t)}</span>`).join('')}</div>
      </div>
      <div class="server-card__uptime" style="margin-top:8px">Uptime: ${esc(s.uptime)}</div>
    </div>
  `).join('')}</div>`;
}

function renderServerList(servers) {
  const filtered = filterServers(servers);
  return `<div class="table-wrap"><table class="table">
    <thead><tr><th>Name</th><th>IP</th><th>Status</th><th>CPU</th><th>RAM</th><th>Disk</th><th>Bots</th><th>Uptime</th></tr></thead>
    <tbody>${filtered.map(s => `
      <tr class="server-row" data-id="${s.id}" style="cursor:pointer">
        <td><strong>${esc(s.name)}</strong></td>
        <td style="font-family:var(--mono);font-size:12px">${esc(s.host)}</td>
        <td><span class="status status--${s.status}"><span class="status__dot"></span>${statusLabel(s.status)}</span></td>
        <td><span style="color:${s.cpu > 80 ? 'var(--danger)' : s.cpu > 60 ? 'var(--warning)' : 'var(--success)'}">${Math.round(s.cpu)}%</span></td>
        <td><span style="color:${s.ram > 80 ? 'var(--danger)' : s.ram > 60 ? 'var(--warning)' : 'var(--success)'}">${Math.round(s.ram)}%</span></td>
        <td><span style="color:${s.disk > 80 ? 'var(--danger)' : s.disk > 60 ? 'var(--warning)' : 'var(--success)'}">${Math.round(s.disk)}%</span></td>
        <td>${s.botsRunning}/${s.botsTotal}</td>
        <td style="color:var(--text-tri)">${esc(s.uptime)}</td>
      </tr>
    `).join('')}</tbody>
  </table></div>`;
}

// ── Page: Server Detail ─────────────────────────────────────────
async function renderServerDetail(app, serverId, activeTab) {
  setBreadcrumb({ label: 'Servers', href: '#/servers' }, { label: serverId });
  app.innerHTML = '<div class="skeleton" style="height:100px;margin-bottom:16px"></div><div class="skeleton" style="height:400px"></div>';

  const srv = await api.get(`/servers/${serverId}`);

  app.innerHTML = `
    <div class="detail-header">
      <a href="#/servers" class="detail-header__back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back
      </a>
      <div class="detail-header__info">
        <div class="detail-header__title">${esc(srv.name)}</div>
        <div class="detail-header__meta">
          <span style="font-family:var(--mono)">${esc(srv.host)}</span>
          <span class="sep">|</span>
          <span>${esc(srv.os)}</span>
          <span class="sep">|</span>
          <span>Uptime: ${esc(srv.system.uptime)}</span>
          <span class="sep">|</span>
          <span class="status status--${srv.status}"><span class="status__dot"></span>${statusLabel(srv.status)}</span>
          ${srv.tags.map(t => `<span class="tag ${tagClass(t)}">${esc(t)}</span>`).join('')}
        </div>
      </div>
    </div>

    <div class="tabs" id="detail-tabs">
      <button class="tab ${activeTab === 'overview' ? 'active' : ''}" data-tab="overview">Overview</button>
      <button class="tab ${activeTab === 'processes' ? 'active' : ''}" data-tab="processes">Processes</button>
      <button class="tab ${activeTab === 'logs' ? 'active' : ''}" data-tab="logs">Logs</button>
    </div>

    <div id="tab-content"></div>
  `;

  app.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => navigate(`/servers/${serverId}/${t.dataset.tab}`));
  });

  const tabContent = document.getElementById('tab-content');

  if (activeTab === 'overview') {
    await renderServerOverviewTab(tabContent, srv, serverId);
  } else if (activeTab === 'processes') {
    await renderServerProcessesTab(tabContent, serverId);
  } else if (activeTab === 'logs') {
    await renderServerLogsTab(tabContent, srv);
  }
}

async function renderServerOverviewTab(container, srv, serverId) {
  const sys = srv.system;
  container.innerHTML = `
    <div class="chart-grid" id="charts-area">
      <div class="chart-card">
        <div class="chart-card__header">
          <span class="chart-card__title">CPU Usage</span>
          <span class="chart-card__value" id="cpu-live">${sys.cpu}%</span>
        </div>
        <canvas id="chart-cpu"></canvas>
      </div>
      <div class="chart-card">
        <div class="chart-card__header">
          <span class="chart-card__title">RAM Usage</span>
          <span class="chart-card__value" id="ram-live">${sys.ramUsed} / ${sys.ramTotal} MB (${Math.round(sys.ram)}%)</span>
        </div>
        <canvas id="chart-ram"></canvas>
      </div>
      <div class="chart-card">
        <div class="chart-card__header">
          <span class="chart-card__title">Disk Usage</span>
          <span class="chart-card__value" id="disk-live">${sys.diskUsed} / ${sys.diskTotal} GB (${sys.disk}%)</span>
        </div>
        <canvas id="chart-disk"></canvas>
      </div>
      <div class="chart-card">
        <div class="chart-card__header">
          <span class="chart-card__title">Network I/O</span>
          <span class="chart-card__value" id="net-live">IN: ${formatBytes(sys.netIn)} | OUT: ${formatBytes(sys.netOut)}</span>
        </div>
        <canvas id="chart-net"></canvas>
      </div>
    </div>

    <div style="margin-bottom:24px">
      <h2 style="font-size:16px;font-weight:600;margin-bottom:12px">Running Bots</h2>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Name</th><th>Status</th><th>CPU</th><th>RAM</th><th>Uptime</th><th>Method</th><th>Actions</th></tr></thead>
        <tbody>${srv.bots.map(b => `
          <tr>
            <td><a href="#/bots/${b.id}" style="font-weight:600">${esc(b.name)}</a><div style="font-size:11px;color:var(--text-tri)">${esc(b.description)}</div></td>
            <td><span class="status ${statusClass(b.status)}"><span class="status__dot"></span>${statusLabel(b.status)}</span></td>
            <td>-</td>
            <td>${b.memMB} MB</td>
            <td style="color:var(--text-sec)">${esc(b.uptime || '-')}</td>
            <td><span class="tag tag--docker">${esc(b.method)}</span></td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="btn btn--sm btn--ghost bot-action" data-id="${b.id}" data-action="restart" ${!b.running ? 'disabled' : ''}>Restart</button>
                <button class="btn btn--sm btn--ghost bot-action" data-id="${b.id}" data-action="${b.running ? 'stop' : 'start'}">${b.running ? 'Stop' : 'Start'}</button>
              </div>
            </td>
          </tr>
        `).join('')}</tbody>
      </table></div>
    </div>
  `;

  // Bot actions
  container.querySelectorAll('.bot-action').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const { id, action } = btn.dataset;
      btn.disabled = true;
      try {
        await api.post(`/bots/${id}/${action}`);
        showToast(`${action} erfolgreich`, 'success');
        setTimeout(() => render(), 1000);
      } catch (err) {
        showToast(`Fehler: ${err.message}`, 'error');
      }
    });
  });

  // Load metrics and draw charts
  try {
    const metricsData = await api.get(`/servers/${serverId}/metrics`);
    drawCharts(metricsData.metrics);
  } catch {
    drawCharts([]);
  }

  // Live refresh
  state.metricsTimer = setInterval(async () => {
    try {
      const metricsData = await api.get(`/servers/${serverId}/metrics`);
      const freshSrv = await api.get(`/servers/${serverId}`);
      updateLiveValues(freshSrv.system);
      drawCharts(metricsData.metrics);
    } catch {}
  }, 5000);
}

function updateLiveValues(sys) {
  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('cpu-live', sys.cpu + '%');
  el('ram-live', `${sys.ramUsed} / ${sys.ramTotal} MB (${Math.round(sys.ram)}%)`);
  el('disk-live', `${sys.diskUsed} / ${sys.diskTotal} GB (${sys.disk}%)`);
  el('net-live', `IN: ${formatBytes(sys.netIn)} | OUT: ${formatBytes(sys.netOut)}`);
}

function drawCharts(metrics) {
  if (metrics.length < 2) return;
  const labels = metrics.map(m => {
    const d = new Date(m.time);
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  });

  drawLineChart('chart-cpu', labels, [{ data: metrics.map(m => m.cpu), color: '#3B82F6', label: 'CPU %' }], 100);
  drawLineChart('chart-ram', labels, [{ data: metrics.map(m => m.ram), color: '#8B5CF6', label: 'RAM %' }], 100);
  drawLineChart('chart-disk', labels, [{ data: metrics.map(m => m.disk), color: '#F59E0B', label: 'Disk %' }], 100);
  drawLineChart('chart-net', labels, [
    { data: metrics.map(m => m.netIn / 1024), color: '#22C55E', label: 'IN KB/s' },
    { data: metrics.map(m => m.netOut / 1024), color: '#EF4444', label: 'OUT KB/s' }
  ]);
}

function drawLineChart(canvasId, labels, datasets, maxY) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 120 * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width;
  const H = 120;
  const pad = { top: 8, right: 8, bottom: 20, left: 40 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  ctx.clearRect(0, 0, W, H);

  // Calculate max Y
  if (!maxY) {
    maxY = 0;
    datasets.forEach(ds => { ds.data.forEach(v => { if (v > maxY) maxY = v; }); });
    maxY = Math.max(maxY * 1.2, 1);
  }

  // Grid lines
  ctx.strokeStyle = '#27272A';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (chartH / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    ctx.fillStyle = '#71717A';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(maxY - (maxY / 4) * i), pad.left - 4, y + 3);
  }

  // X labels (show every nth)
  const step = Math.max(1, Math.floor(labels.length / 6));
  ctx.fillStyle = '#71717A';
  ctx.font = '9px Inter, sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < labels.length; i += step) {
    const x = pad.left + (i / (labels.length - 1)) * chartW;
    ctx.fillText(labels[i], x, H - 4);
  }

  // Draw lines
  datasets.forEach(ds => {
    ctx.beginPath();
    ctx.strokeStyle = ds.color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';

    ds.data.forEach((val, i) => {
      const x = pad.left + (i / (ds.data.length - 1)) * chartW;
      const y = pad.top + chartH - (val / maxY) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill gradient
    const lastX = pad.left + chartW;
    const lastY = pad.top + chartH - (ds.data[ds.data.length - 1] / maxY) * chartH;
    ctx.lineTo(lastX, pad.top + chartH);
    ctx.lineTo(pad.left, pad.top + chartH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    grad.addColorStop(0, ds.color + '30');
    grad.addColorStop(1, ds.color + '05');
    ctx.fillStyle = grad;
    ctx.fill();
  });
}

async function renderServerProcessesTab(container, serverId) {
  container.innerHTML = '<div class="skeleton" style="height:400px"></div>';
  const data = await api.get(`/servers/${serverId}/processes`);

  container.innerHTML = `
    <div class="table-wrap"><table class="table table--mono">
      <thead><tr><th>PID</th><th>User</th><th>CPU %</th><th>MEM %</th><th>RSS</th><th>Command</th></tr></thead>
      <tbody>${data.processes.map(p => `
        <tr>
          <td>${p.pid}</td>
          <td>${esc(p.user)}</td>
          <td style="color:${p.cpu > 50 ? 'var(--danger)' : p.cpu > 20 ? 'var(--warning)' : 'var(--text-sec)'}">${p.cpu}%</td>
          <td style="color:${p.mem > 50 ? 'var(--danger)' : p.mem > 20 ? 'var(--warning)' : 'var(--text-sec)'}">${p.mem}%</td>
          <td>${Math.round(p.rss / 1024)} MB</td>
          <td style="max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(p.command)}">${esc(p.command)}</td>
        </tr>
      `).join('')}</tbody>
    </table></div>
  `;

  state.refreshTimer = setInterval(async () => {
    try {
      const fresh = await api.get(`/servers/${serverId}/processes`);
      const tbody = container.querySelector('tbody');
      if (tbody) {
        tbody.innerHTML = fresh.processes.map(p => `
          <tr>
            <td>${p.pid}</td>
            <td>${esc(p.user)}</td>
            <td style="color:${p.cpu > 50 ? 'var(--danger)' : p.cpu > 20 ? 'var(--warning)' : 'var(--text-sec)'}">${p.cpu}%</td>
            <td style="color:${p.mem > 50 ? 'var(--danger)' : p.mem > 20 ? 'var(--warning)' : 'var(--text-sec)'}">${p.mem}%</td>
            <td>${Math.round(p.rss / 1024)} MB</td>
            <td style="max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(p.command)}">${esc(p.command)}</td>
          </tr>
        `).join('');
      }
    } catch {}
  }, 5000);
}

async function renderServerLogsTab(container, srv) {
  const botOptions = srv.bots.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join('');

  container.innerHTML = `
    <div class="logs-panel">
      <div class="logs-panel__header">
        <div class="logs-panel__header-left">
          <select class="form-select" id="log-source">
            <option value="">System Logs</option>
            ${botOptions}
          </select>
          <select class="form-select" id="log-lines">
            <option value="50">50 Zeilen</option>
            <option value="100" selected>100 Zeilen</option>
            <option value="200">200 Zeilen</option>
            <option value="500">500 Zeilen</option>
          </select>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <label style="font-size:12px;color:var(--text-sec);display:flex;align-items:center;gap:4px">
            <input type="checkbox" id="log-auto" checked> Auto-scroll
          </label>
          <button class="btn btn--sm btn--secondary" id="log-refresh">Refresh</button>
        </div>
      </div>
      <div class="logs-panel__body" id="log-body">Lade Logs...</div>
    </div>
  `;

  async function loadLogs() {
    const source = document.getElementById('log-source').value;
    const lines = document.getElementById('log-lines').value;
    const body = document.getElementById('log-body');
    try {
      let data;
      if (source) {
        data = await api.get(`/bots/${source}/logs?lines=${lines}`);
      } else {
        data = await api.get(`/system/logs?lines=${lines}`);
      }
      body.textContent = data.logs;
      if (document.getElementById('log-auto')?.checked) {
        body.scrollTop = body.scrollHeight;
      }
    } catch (err) {
      body.textContent = 'Fehler: ' + err.message;
    }
  }

  loadLogs();
  document.getElementById('log-source').addEventListener('change', loadLogs);
  document.getElementById('log-lines').addEventListener('change', loadLogs);
  document.getElementById('log-refresh').addEventListener('click', loadLogs);

  state.refreshTimer = setInterval(loadLogs, 10000);
}

// ── Page: Bots ──────────────────────────────────────────────────
async function renderBotsPage(app) {
  setBreadcrumb({ label: 'Bots' });
  app.innerHTML = '<div class="skeleton" style="height:400px"></div>';

  const data = await api.get('/bots');
  const bots = data.bots;

  app.innerHTML = `
    <div class="page-header">
      <h1>Bot Management</h1>
    </div>
    <div class="filter-bar">
      <div class="filter-bar__search-wrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="filter-bar__search" id="bot-search" placeholder="Bot suchen...">
      </div>
      <div class="filter-tags">
        <button class="filter-tag active" data-filter="all">All</button>
        <button class="filter-tag" data-filter="running">Running</button>
        <button class="filter-tag" data-filter="stopped">Stopped</button>
        <button class="filter-tag" data-filter="crashed">Crashed</button>
      </div>
    </div>
    <div class="card-grid" id="bots-grid">
      ${bots.map(b => renderBotCard(b)).join('')}
    </div>
  `;

  // Filter tags
  app.querySelectorAll('.filter-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      app.querySelectorAll('.filter-tag').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      app.querySelectorAll('.bot-card').forEach(card => {
        const status = card.dataset.status;
        card.style.display = (filter === 'all' || status === filter) ? '' : 'none';
      });
    });
  });

  // Bot actions
  app.querySelectorAll('.bot-action').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const { id, action } = btn.dataset;
      btn.disabled = true;
      try {
        await api.post(`/bots/${id}/${action}`);
        showToast(`${action} erfolgreich`, 'success');
        setTimeout(() => render(), 1500);
      } catch (err) {
        showToast(`Fehler: ${err.message}`, 'error');
        btn.disabled = false;
      }
    });
  });

  // Card click -> detail
  app.querySelectorAll('.bot-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.bot-card__actions')) return;
      navigate(`/bots/${card.dataset.id}`);
    });
  });

  state.refreshTimer = setInterval(async () => {
    try {
      const fresh = await api.get('/bots');
      const grid = document.getElementById('bots-grid');
      if (!grid) return;

      // Get active filter
      const activeFilterBtn = app.querySelector('.filter-tag.active');
      const filter = activeFilterBtn ? activeFilterBtn.dataset.filter : 'all';

      grid.innerHTML = fresh.bots.map(b => renderBotCard(b)).join('');

      // Re-apply filter visibility
      grid.querySelectorAll('.bot-card').forEach(card => {
        const status = card.dataset.status;
        card.style.display = (filter === 'all' || status === filter) ? '' : 'none';
      });

      // Re-attach bot action listeners
      grid.querySelectorAll('.bot-action').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const { id, action } = btn.dataset;
          btn.disabled = true;
          try {
            await api.post(`/bots/${id}/${action}`);
            showToast(`${action} erfolgreich`, 'success');
            setTimeout(() => render(), 1500);
          } catch (err) {
            showToast(`Fehler: ${err.message}`, 'error');
            btn.disabled = false;
          }
        });
      });

      // Re-attach card click listeners
      grid.querySelectorAll('.bot-card').forEach(card => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.bot-card__actions')) return;
          navigate(`/bots/${card.dataset.id}`);
        });
      });
    } catch {}
  }, 5000);
}

function renderBotCard(b) {
  return `
    <div class="bot-card" data-id="${b.id}" data-status="${b.status}" style="cursor:pointer">
      <div class="bot-card__header">
        ${botIcon(b.icon, b.color)}
        <div class="bot-card__info">
          <div class="bot-card__name">${esc(b.name)}</div>
          <div class="bot-card__desc">${esc(b.description)}</div>
        </div>
        <span class="status ${statusClass(b.status)}"><span class="status__dot"></span>${statusLabel(b.status)}</span>
      </div>
      <div class="bot-card__body">
        <div class="bot-card__stats">
          <div class="bot-card__stat">
            <div class="bot-card__stat-val">${esc(b.uptime || '-')}</div>
            <div class="bot-card__stat-lbl">Uptime</div>
          </div>
          <div class="bot-card__stat">
            <div class="bot-card__stat-val">${b.running ? b.memMB + ' MB' : '-'}</div>
            <div class="bot-card__stat-lbl">RAM</div>
          </div>
          <div class="bot-card__stat">
            <div class="bot-card__stat-val">${b.running ? 'PID ' + b.pid : '-'}</div>
            <div class="bot-card__stat-lbl">Process</div>
          </div>
        </div>
        <div class="bot-card__meta">
          <div class="bot-card__meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg>
            ${esc(b.server)}
          </div>
          <div class="bot-card__meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            ${esc(b.method)}
          </div>
          ${b.port ? `<div class="bot-card__meta-item">Port: ${b.port}</div>` : ''}
        </div>
        <div class="bot-card__actions">
          <button class="btn btn--sm btn--secondary bot-action" data-id="${b.id}" data-action="start" ${b.running ? 'disabled' : ''}>Start</button>
          <button class="btn btn--sm btn--danger bot-action" data-id="${b.id}" data-action="stop" ${!b.running ? 'disabled' : ''}>Stop</button>
          <button class="btn btn--sm btn--secondary bot-action" data-id="${b.id}" data-action="restart" ${!b.running ? 'disabled' : ''}>Restart</button>
          <a href="#/bots/${b.id}" class="btn btn--sm btn--ghost" onclick="event.stopPropagation()">Details</a>
        </div>
      </div>
    </div>`;
}

// ── Page: Bot Detail ────────────────────────────────────────────
async function renderBotDetail(app, botId) {
  setBreadcrumb({ label: 'Bots', href: '#/bots' }, { label: botId });
  app.innerHTML = '<div class="skeleton" style="height:400px"></div>';

  const bot = await api.get(`/bots/${botId}`);

  app.innerHTML = `
    <div class="detail-header">
      <a href="#/bots" class="detail-header__back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back
      </a>
      <div class="detail-header__info">
        <div class="detail-header__title">${esc(bot.name)}</div>
        <div class="detail-header__meta">
          <span>Server: ${esc(bot.server)}</span>
          <span class="sep">|</span>
          <span>${esc(bot.method)}</span>
          ${bot.port ? `<span class="sep">|</span><span>Port: ${bot.port}</span>` : ''}
          <span class="sep">|</span>
          <span class="status ${statusClass(bot.status)}"><span class="status__dot"></span>${statusLabel(bot.status)}</span>
          ${bot.uptime ? `<span class="sep">|</span><span>Uptime: ${esc(bot.uptime)}</span>` : ''}
        </div>
      </div>
      <div class="detail-header__actions">
        <button class="btn btn--secondary bot-ctrl" data-action="start" ${bot.running ? 'disabled' : ''}>Start</button>
        <button class="btn btn--danger bot-ctrl" data-action="stop" ${!bot.running ? 'disabled' : ''}>Stop</button>
        <button class="btn btn--primary bot-ctrl" data-action="restart" ${!bot.running ? 'disabled' : ''}>Restart</button>
      </div>
    </div>

    <div class="tabs">
      <button class="tab active" data-tab="status">Status</button>
      <button class="tab" data-tab="config">Config</button>
      <button class="tab" data-tab="logs">Logs</button>
    </div>

    <div id="bot-tab-content">
      <div class="agg-stats" style="margin-bottom:24px">
        <div class="agg-stat">
          <div class="agg-stat__value" style="color:var(--text)">${esc(bot.uptime || '-')}</div>
          <div class="agg-stat__label">Uptime</div>
        </div>
        <div class="agg-stat">
          <div class="agg-stat__value" style="color:var(--text)">${bot.memMB} MB</div>
          <div class="agg-stat__label">Memory</div>
        </div>
        <div class="agg-stat">
          <div class="agg-stat__value" style="color:var(--text)">${bot.pid || '-'}</div>
          <div class="agg-stat__label">PID</div>
        </div>
        <div class="agg-stat">
          <div class="agg-stat__value" style="color:var(--text)">${bot.restarts}</div>
          <div class="agg-stat__label">Restarts</div>
        </div>
      </div>

      <h2 style="font-size:16px;font-weight:600;margin-bottom:12px">Configuration</h2>
      <div class="settings-card">
        <div class="settings-card__body">
          <div class="settings-row">
            <div><div class="settings-row__label">Service Name</div></div>
            <div style="font-family:var(--mono);font-size:13px;color:var(--text-sec)">${esc(bot.service)}</div>
          </div>
          <div class="settings-row">
            <div><div class="settings-row__label">Deployment Method</div></div>
            <div><span class="tag tag--docker">${esc(bot.method)}</span></div>
          </div>
          <div class="settings-row">
            <div><div class="settings-row__label">Port</div></div>
            <div style="font-family:var(--mono);font-size:13px;color:var(--text-sec)">${bot.port || 'None'}</div>
          </div>
          <div class="settings-row">
            <div><div class="settings-row__label">Server</div></div>
            <div><a href="#/servers/${bot.server}">${esc(bot.server)}</a></div>
          </div>
        </div>
      </div>

      <h2 style="font-size:16px;font-weight:600;margin:24px 0 12px">Recent Logs</h2>
      <div class="logs-panel">
        <div class="logs-panel__body" id="bot-logs-body">Lade Logs...</div>
      </div>
    </div>
  `;

  // Bot control buttons
  app.querySelectorAll('.bot-ctrl').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await api.post(`/bots/${botId}/${btn.dataset.action}`);
        showToast(`${btn.dataset.action} erfolgreich`, 'success');
        setTimeout(() => render(), 1500);
      } catch (err) {
        showToast(`Fehler: ${err.message}`, 'error');
        btn.disabled = false;
      }
    });
  });

  // Tabs
  app.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      // Simple tab toggle (scroll to section)
      app.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  // Load logs
  try {
    const logsData = await api.get(`/bots/${botId}/logs?lines=80`);
    const body = document.getElementById('bot-logs-body');
    if (body) {
      body.textContent = logsData.logs;
      body.scrollTop = body.scrollHeight;
    }
  } catch {}
}

// ── Page: Alerts ────────────────────────────────────────────────
async function renderAlertsPage(app) {
  setBreadcrumb({ label: 'Alerts' });
  app.innerHTML = '<div class="skeleton" style="height:400px"></div>';

  const data = await api.get('/alerts');

  const activeAlerts = data.alerts.filter(a => !a.acknowledged);
  const ackedAlerts = data.alerts.filter(a => a.acknowledged);

  app.innerHTML = `
    <div class="page-header">
      <h1>Alerts & Notifications</h1>
    </div>

    <div class="tabs">
      <button class="tab active" data-tab="active">Active (${activeAlerts.length})</button>
      <button class="tab" data-tab="resolved">Acknowledged (${ackedAlerts.length})</button>
      <button class="tab" data-tab="rules">Rules</button>
    </div>

    <div id="alerts-active">
      ${activeAlerts.length === 0 ? `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <div class="empty-state__title">Keine aktiven Alerts</div>
          <div class="empty-state__desc">Alles sieht gut aus!</div>
        </div>
      ` : activeAlerts.map(a => renderAlertCard(a)).join('')}
    </div>

    <div id="alerts-acked" style="display:none">
      ${ackedAlerts.length === 0 ? '<div class="empty-state"><div class="empty-state__desc">Keine bestaetigten Alerts</div></div>' : ackedAlerts.map(a => renderAlertCard(a, true)).join('')}
    </div>

    <div id="alerts-rules" style="display:none">
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Rule</th><th>Metric</th><th>Threshold</th><th>Severity</th><th>Status</th></tr></thead>
        <tbody>${data.rules.map(r => `
          <tr>
            <td><strong>${esc(r.name)}</strong></td>
            <td style="text-transform:uppercase">${esc(r.metric)}</td>
            <td>${r.operator === 'gt' ? '>' : '='} ${r.threshold}${typeof r.threshold === 'number' ? '%' : ''}</td>
            <td><span class="alert-card__severity alert-card__severity--${r.severity}">${r.severity}</span></td>
            <td><span class="status ${r.enabled ? 'status--running' : 'status--stopped'}"><span class="status__dot"></span>${r.enabled ? 'Aktiv' : 'Inaktiv'}</span></td>
          </tr>
        `).join('')}</tbody>
      </table></div>
    </div>
  `;

  // Tab switching
  const tabs = { active: 'alerts-active', resolved: 'alerts-acked', rules: 'alerts-rules' };
  app.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      app.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      Object.values(tabs).forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
      const target = document.getElementById(tabs[tab.dataset.tab]);
      if (target) target.style.display = 'block';
    });
  });

  // Acknowledge buttons
  app.querySelectorAll('.alert-ack').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await api.post(`/alerts/${btn.dataset.id}/acknowledge`);
        showToast('Alert bestaetigt', 'success');
        render();
      } catch (err) {
        showToast(`Fehler: ${err.message}`, 'error');
      }
    });
  });
}

function renderAlertCard(a, acked) {
  return `
    <div class="alert-card alert-card--${a.severity}">
      <div class="alert-card__header">
        <div class="alert-card__title">${esc(a.ruleName)}</div>
        <span class="alert-card__severity alert-card__severity--${a.severity}">${a.severity}</span>
      </div>
      <div class="alert-card__body">
        ${a.metric}: ${a.value}${typeof a.value === 'number' ? '%' : ''} (Schwellenwert: ${a.threshold}${typeof a.threshold === 'number' ? '%' : ''})
        <div class="alert-card__time">Ausgeloest: ${timeAgo(a.triggeredAt)}</div>
      </div>
      ${!acked ? `<div class="alert-card__footer">
        <button class="btn btn--sm btn--secondary alert-ack" data-id="${a.id}">Bestaetigen</button>
        ${a.botId ? `<a href="#/bots/${a.botId}" class="btn btn--sm btn--ghost">Bot ansehen</a>` : ''}
      </div>` : ''}
    </div>
  `;
}

// ── Page: Deployments ───────────────────────────────────────────
async function renderDeploymentsPage(app) {
  setBreadcrumb({ label: 'Deployments' });
  app.innerHTML = '<div class="skeleton" style="height:400px"></div>';

  const data = await api.get('/deployments');
  const deployments = data.deployments;

  app.innerHTML = `
    <div class="page-header">
      <h1>Deployment History</h1>
    </div>

    ${deployments.length === 0 ? `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <div class="empty-state__title">Noch keine Deployments</div>
        <div class="empty-state__desc">Bot-Aktionen (Start, Stop, Restart) werden hier aufgezeichnet.</div>
      </div>
    ` : renderTimeline(deployments)}
  `;
}

function renderTimeline(deployments) {
  // Group by date
  const grouped = {};
  deployments.forEach(d => {
    const date = new Date(d.time).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(d);
  });

  let html = '<div class="timeline">';
  for (const [date, items] of Object.entries(grouped)) {
    html += `<div class="timeline__date">${esc(date)}</div>`;
    items.forEach(d => {
      const time = new Date(d.time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      html += `
        <div class="timeline__item timeline__item--${d.status === 'success' ? 'success' : 'failed'}">
          <div class="timeline__item-header">
            <span class="timeline__item-title">${esc(d.bot)} — ${esc(d.type)}</span>
            <span class="timeline__item-time">${time}</span>
          </div>
          <div class="timeline__item-body">
            Server: ${esc(d.server)} | By: ${esc(d.user)} | Status:
            <span style="color:${d.status === 'success' ? 'var(--success)' : 'var(--danger)'}">${d.status}</span>
          </div>
        </div>
      `;
    });
  }
  html += '</div>';
  return html;
}

// ── Page: Network ───────────────────────────────────────────────
async function renderNetworkPage(app) {
  setBreadcrumb({ label: 'Network' });
  app.innerHTML = '<div class="skeleton" style="height:400px"></div>';

  // Use first server
  let ports = [];
  try {
    const data = await api.get('/servers/oracle-prod-01/network');
    ports = data.ports;
  } catch {}

  let srv;
  try { srv = await api.get('/servers/oracle-prod-01'); } catch { srv = null; }

  app.innerHTML = `
    <div class="page-header">
      <h1>Networking</h1>
    </div>

    ${srv ? `
    <div class="agg-stats" style="margin-bottom:24px">
      <div class="agg-stat">
        <div class="agg-stat__value" style="color:var(--success)">${formatBytes(srv.system.netIn)}</div>
        <div class="agg-stat__label">Inbound</div>
      </div>
      <div class="agg-stat">
        <div class="agg-stat__value" style="color:var(--accent)">${formatBytes(srv.system.netOut)}</div>
        <div class="agg-stat__label">Outbound</div>
      </div>
    </div>` : ''}

    <h2 style="font-size:16px;font-weight:600;margin-bottom:12px">Open Ports</h2>
    <div class="table-wrap"><table class="table table--mono">
      <thead><tr><th>Port</th><th>Address</th><th>Process</th><th>State</th></tr></thead>
      <tbody>${ports.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:var(--text-tri)">Keine Port-Daten verfuegbar</td></tr>' :
        ports.map(p => `
          <tr>
            <td style="font-weight:600">${p.port}</td>
            <td>${esc(p.address)}</td>
            <td>${esc(p.process)}</td>
            <td><span class="status status--running"><span class="status__dot"></span>LISTEN</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table></div>
  `;
}

// ── Page: Storage ───────────────────────────────────────────────
async function renderStoragePage(app) {
  setBreadcrumb({ label: 'Storage' });
  let srv;
  try { srv = await api.get('/servers/oracle-prod-01'); } catch { srv = null; }

  app.innerHTML = `
    <div class="page-header">
      <h1>Storage & Files</h1>
    </div>

    ${srv ? `
    <div class="settings-card" style="margin-bottom:24px">
      <div class="settings-card__header">Disk Overview — oracle-prod-01</div>
      <div class="settings-card__body">
        <div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span>Used: ${srv.system.diskUsed} GB / ${srv.system.diskTotal} GB</span>
            <span style="font-weight:600;color:${srv.system.disk > 80 ? 'var(--danger)' : srv.system.disk > 60 ? 'var(--warning)' : 'var(--success)'}">${srv.system.disk}%</span>
          </div>
          <div class="resource-row__bar" style="height:12px;border-radius:6px">
            <div class="resource-row__fill ${fillClass(srv.system.disk)}" style="width:${srv.system.disk}%;height:100%;border-radius:6px"></div>
          </div>
        </div>
      </div>
    </div>` : ''}

    <div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
      <div class="empty-state__title">File Browser</div>
      <div class="empty-state__desc">Der Dateibrowser wird in einer zukuenftigen Version verfuegbar sein.</div>
    </div>
  `;
}

// ── Page: Settings ──────────────────────────────────────────────
async function renderSettingsPage(app) {
  setBreadcrumb({ label: 'Settings' });
  const me = state.currentUser;
  const isAdmin = me && me.role === 'admin';

  let users = [];
  let pendingResets = [];
  if (isAdmin) {
    try { users = (await api.get('/users')).users; } catch {}
    try { pendingResets = (await api.get('/password-resets')).resets; } catch {}
  }

  app.innerHTML = `
    <div class="page-header">
      <h1>Settings</h1>
    </div>

    <div class="tabs">
      <button class="tab active" data-tab="profile">Mein Profil</button>
      ${isAdmin ? '<button class="tab" data-tab="users">Users & Rollen</button>' : ''}
      <button class="tab" data-tab="roles">Rollen-Info</button>
    </div>

    <!-- Profile Tab -->
    <div id="settings-profile">
      <div class="settings-card">
        <div class="settings-card__header">Profil</div>
        <div class="settings-card__body">
          <div style="display:grid;gap:16px;max-width:420px">
            <div class="field">
              <label style="display:block;font-size:12px;color:var(--text-sec);margin-bottom:6px">Name</label>
              <input type="text" class="form-input" id="profile-name" value="${esc(me.name)}">
            </div>
            <div class="field">
              <label style="display:block;font-size:12px;color:var(--text-sec);margin-bottom:6px">E-Mail</label>
              <input type="email" class="form-input" value="${esc(me.email)}" disabled style="opacity:0.6">
              <div style="font-size:11px;color:var(--text-tri);margin-top:4px">E-Mail kann nur von einem Admin geaendert werden</div>
            </div>
            <div class="field">
              <label style="display:block;font-size:12px;color:var(--text-sec);margin-bottom:6px">Rolle</label>
              <div><span class="tag ${me.role === 'admin' ? 'tag--production' : me.role === 'dev' ? 'tag--development' : 'tag--testing'}">${esc(me.role)}</span></div>
            </div>
            <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:4px">
              <label style="display:block;font-size:12px;color:var(--text-sec);margin-bottom:6px">Neues Passwort (leer lassen um es nicht zu aendern)</label>
              <input type="password" class="form-input" id="profile-password" autocomplete="new-password">
            </div>
            <div>
              <label style="display:block;font-size:12px;color:var(--text-sec);margin-bottom:6px">Passwort wiederholen</label>
              <input type="password" class="form-input" id="profile-password2" autocomplete="new-password">
            </div>
            <button class="btn btn--primary" id="save-profile" style="width:fit-content">Speichern</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Users Tab (admin only) -->
    ${isAdmin ? `
    <div id="settings-users" style="display:none">
      <div class="settings-card">
        <div class="settings-card__header" style="display:flex;justify-content:space-between;align-items:center">
          <span>Benutzer</span>
          <button class="btn btn--sm btn--primary" id="add-user-btn">+ Benutzer hinzufuegen</button>
        </div>
        <div class="settings-card__body" style="padding:0">
          <div class="table-wrap" style="border:none"><table class="table">
            <thead><tr><th>Name</th><th>E-Mail</th><th>Rolle</th><th>Status</th><th>Erstellt</th><th>Aktionen</th></tr></thead>
            <tbody id="users-table-body">
              ${users.map(u => renderUserRow(u, me)).join('')}
            </tbody>
          </table></div>
        </div>
      </div>

      <!-- Add User Form (hidden) -->
      <div class="settings-card" id="add-user-form" style="display:none">
        <div class="settings-card__header">Neuen Benutzer erstellen</div>
        <div class="settings-card__body">
          <div style="display:grid;gap:14px;max-width:420px">
            <div class="field">
              <label style="display:block;font-size:12px;color:var(--text-sec);margin-bottom:6px">Name *</label>
              <input type="text" class="form-input" id="new-name" required>
            </div>
            <div class="field">
              <label style="display:block;font-size:12px;color:var(--text-sec);margin-bottom:6px">E-Mail *</label>
              <input type="email" class="form-input" id="new-email" required>
            </div>
            <div class="field">
              <label style="display:block;font-size:12px;color:var(--text-sec);margin-bottom:6px">Passwort * (min. 6 Zeichen)</label>
              <input type="password" class="form-input" id="new-password" required minlength="6">
            </div>
            <div class="field">
              <label style="display:block;font-size:12px;color:var(--text-sec);margin-bottom:6px">Rolle</label>
              <select class="form-select" id="new-role" style="width:100%">
                <option value="dev">Developer</option>
                <option value="support">Support</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn--primary" id="create-user-btn">Erstellen</button>
              <button class="btn btn--secondary" id="cancel-user-btn">Abbrechen</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Pending Password Resets -->
      <div class="settings-card" id="resets-card" ${pendingResets.length === 0 ? 'style="display:none"' : ''}>
        <div class="settings-card__header" style="display:flex;justify-content:space-between;align-items:center">
          <span>Offene Passwort-Reset-Anfragen</span>
          <span class="tag tag--testing">${pendingResets.length}</span>
        </div>
        <div class="settings-card__body" style="padding:0">
          <div class="table-wrap" style="border:none"><table class="table">
            <thead><tr><th>Benutzer</th><th>E-Mail</th><th>Angefragt</th><th>Laeuft ab in</th><th>Aktionen</th></tr></thead>
            <tbody id="resets-body">
              ${pendingResets.map(r => `<tr data-token="${r.token}">
                <td><strong>${esc(r.userName)}</strong></td>
                <td style="font-size:12px;color:var(--text-sec)">${esc(r.email)}</td>
                <td style="font-size:12px;color:var(--text-tri)">${timeAgo(r.createdAt)}</td>
                <td style="font-size:12px;color:var(--text-tri)">${r.expiresIn} min</td>
                <td>
                  <div style="display:flex;gap:4px">
                    <button class="btn btn--sm btn--primary copy-reset-link" data-token="${r.token}">Link kopieren</button>
                    <button class="btn btn--sm btn--danger dismiss-reset" data-token="${r.token}">Verwerfen</button>
                  </div>
                </td>
              </tr>`).join('')}
            </tbody>
          </table></div>
        </div>
      </div>

      <!-- Generate Reset Link for User -->
      <div class="settings-card">
        <div class="settings-card__header">Passwort-Reset-Link generieren</div>
        <div class="settings-card__body">
          <div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap">
            <div style="flex:1;min-width:200px">
              <label style="display:block;font-size:12px;color:var(--text-sec);margin-bottom:6px">Benutzer auswaehlen</label>
              <select class="form-select" id="reset-user-select" style="width:100%">
                ${users.map(u => `<option value="${u.id}">${esc(u.name)} (${esc(u.email)})</option>`).join('')}
              </select>
            </div>
            <button class="btn btn--sm btn--secondary" id="generate-reset-btn">Link generieren</button>
          </div>
          <div id="generated-link-area" style="display:none;margin-top:12px">
            <label style="display:block;font-size:12px;color:var(--text-sec);margin-bottom:6px">Reset-Link (gueltig fuer 1 Stunde)</label>
            <div style="display:flex;gap:8px">
              <input type="text" class="form-input" id="generated-link" readonly style="font-family:var(--mono);font-size:12px">
              <button class="btn btn--sm btn--secondary" id="copy-generated-link">Kopieren</button>
            </div>
          </div>
        </div>
      </div>
    </div>` : ''}

    <!-- Roles Tab -->
    <div id="settings-roles" style="display:none">
      <div class="settings-card">
        <div class="settings-card__header">Rollen & Berechtigungen</div>
        <div class="settings-card__body">
          <div class="settings-row">
            <div>
              <div class="settings-row__label" style="font-weight:600">Admin</div>
              <div class="settings-row__desc">Voller Zugriff: Server, Bots, Files, Network, Alerts, User-Verwaltung, Deployments, Rollback</div>
            </div>
            <span class="tag tag--production">Full Access</span>
          </div>
          <div class="settings-row">
            <div>
              <div class="settings-row__label" style="font-weight:600">Developer</div>
              <div class="settings-row__desc">Deploy, Start, Stop, Restart, Logs, Files bearbeiten (kein Loeschen), Alerts ansehen</div>
            </div>
            <span class="tag tag--development">Limited</span>
          </div>
          <div class="settings-row">
            <div>
              <div class="settings-row__label" style="font-weight:600">Support</div>
              <div class="settings-row__desc">Nur Lesezugriff + Bot Restart</div>
            </div>
            <span class="tag tag--testing">Read-Only</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Tab switching
  const tabMap = { profile: 'settings-profile', users: 'settings-users', roles: 'settings-roles' };
  app.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      app.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      Object.values(tabMap).forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
      const target = document.getElementById(tabMap[tab.dataset.tab]);
      if (target) target.style.display = 'block';
    });
  });

  // Save profile
  document.getElementById('save-profile')?.addEventListener('click', async () => {
    const name = document.getElementById('profile-name').value.trim();
    const pw = document.getElementById('profile-password').value;
    const pw2 = document.getElementById('profile-password2').value;

    if (!name) return showToast('Name darf nicht leer sein', 'error');
    if (pw && pw.length < 6) return showToast('Passwort muss mindestens 6 Zeichen haben', 'error');
    if (pw && pw !== pw2) return showToast('Passwoerter stimmen nicht ueberein', 'error');

    try {
      const data = { name };
      if (pw) data.password = pw;
      await api.patch(`/users/${me.id}`, data);
      state.currentUser.name = name;
      updateTopbarUser();
      document.getElementById('profile-password').value = '';
      document.getElementById('profile-password2').value = '';
      showToast('Profil gespeichert', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  if (!isAdmin) return;

  // Show/hide add user form
  document.getElementById('add-user-btn')?.addEventListener('click', () => {
    document.getElementById('add-user-form').style.display = 'block';
    document.getElementById('new-name').focus();
  });
  document.getElementById('cancel-user-btn')?.addEventListener('click', () => {
    document.getElementById('add-user-form').style.display = 'none';
  });

  // Create user
  document.getElementById('create-user-btn')?.addEventListener('click', async () => {
    const name = document.getElementById('new-name').value.trim();
    const email = document.getElementById('new-email').value.trim();
    const password = document.getElementById('new-password').value;
    const role = document.getElementById('new-role').value;

    if (!name || !email || !password) return showToast('Alle Pflichtfelder ausfuellen', 'error');
    if (password.length < 6) return showToast('Passwort muss mindestens 6 Zeichen haben', 'error');

    try {
      await api.post('/users', { name, email, password, role });
      showToast(`Benutzer ${name} erstellt`, 'success');
      render(); // Refresh page
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // User actions (edit role, toggle status, delete)
  attachUserActions(app, me);

  // Copy reset link from pending requests
  app.querySelectorAll('.copy-reset-link').forEach(btn => {
    btn.addEventListener('click', async () => {
      const link = `${location.origin}/reset-password?token=${btn.dataset.token}`;
      try {
        await navigator.clipboard.writeText(link);
        btn.textContent = 'Kopiert!';
        setTimeout(() => { btn.textContent = 'Link kopieren'; }, 2000);
      } catch {
        prompt('Reset-Link:', link);
      }
    });
  });

  // Dismiss reset request
  app.querySelectorAll('.dismiss-reset').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await api.del(`/password-resets/${btn.dataset.token}`);
        const row = btn.closest('tr');
        if (row) row.remove();
        showToast('Anfrage verworfen', 'success');
        // Hide card if empty
        const tbody = document.getElementById('resets-body');
        if (tbody && tbody.children.length === 0) {
          document.getElementById('resets-card').style.display = 'none';
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  // Generate reset link for selected user
  document.getElementById('generate-reset-btn')?.addEventListener('click', async () => {
    const userId = document.getElementById('reset-user-select').value;
    if (!userId) return;
    try {
      const data = await api.post('/password-resets/generate', { userId });
      const link = `${location.origin}/reset-password?token=${data.token}`;
      const area = document.getElementById('generated-link-area');
      const input = document.getElementById('generated-link');
      area.style.display = 'block';
      input.value = link;
      showToast(`Reset-Link fuer ${data.email} erstellt`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Copy generated link
  document.getElementById('copy-generated-link')?.addEventListener('click', async () => {
    const input = document.getElementById('generated-link');
    try {
      await navigator.clipboard.writeText(input.value);
      showToast('Link kopiert', 'success');
    } catch {
      input.select();
    }
  });
}

function renderUserRow(u, me) {
  const roleTag = u.role === 'admin' ? 'tag--production' : u.role === 'dev' ? 'tag--development' : 'tag--testing';
  const statusCls = u.status === 'active' ? 'status--running' : 'status--stopped';
  const isSelf = me.id === u.id;
  const created = u.createdAt ? new Date(u.createdAt).toLocaleDateString('de-DE') : '-';

  return `<tr data-user-id="${u.id}">
    <td><strong>${esc(u.name)}</strong>${isSelf ? ' <span style="font-size:10px;color:var(--text-tri)">(du)</span>' : ''}</td>
    <td style="font-size:12px;color:var(--text-sec)">${esc(u.email)}</td>
    <td>
      <select class="form-select user-role-select" data-uid="${u.id}" ${isSelf ? 'disabled' : ''} style="font-size:12px;padding:4px 8px">
        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
        <option value="dev" ${u.role === 'dev' ? 'selected' : ''}>Developer</option>
        <option value="support" ${u.role === 'support' ? 'selected' : ''}>Support</option>
      </select>
    </td>
    <td><span class="status ${statusCls}"><span class="status__dot"></span>${u.status === 'active' ? 'Aktiv' : 'Deaktiviert'}</span></td>
    <td style="font-size:12px;color:var(--text-tri)">${created}</td>
    <td>
      <div style="display:flex;gap:4px">
        ${!isSelf ? `
          <button class="btn btn--sm btn--ghost user-toggle-status" data-uid="${u.id}" data-status="${u.status === 'active' ? 'disabled' : 'active'}">${u.status === 'active' ? 'Deaktivieren' : 'Aktivieren'}</button>
          <button class="btn btn--sm btn--danger user-delete" data-uid="${u.id}" data-name="${esc(u.name)}">Loeschen</button>
        ` : '<span style="font-size:11px;color:var(--text-tri)">-</span>'}
      </div>
    </td>
  </tr>`;
}

function attachUserActions(app, me) {
  // Role change
  app.querySelectorAll('.user-role-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      try {
        await api.patch(`/users/${sel.dataset.uid}`, { role: sel.value });
        showToast('Rolle geaendert', 'success');
      } catch (err) {
        showToast(err.message, 'error');
        render();
      }
    });
  });

  // Toggle status
  app.querySelectorAll('.user-toggle-status').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await api.patch(`/users/${btn.dataset.uid}`, { status: btn.dataset.status });
        showToast(btn.dataset.status === 'active' ? 'Benutzer aktiviert' : 'Benutzer deaktiviert', 'success');
        render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  // Delete
  app.querySelectorAll('.user-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(`Benutzer "${btn.dataset.name}" wirklich loeschen?`)) return;
      try {
        await api.del(`/users/${btn.dataset.uid}`);
        showToast('Benutzer geloescht', 'success');
        render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

// ── Topbar User ─────────────────────────────────────────────────
function updateTopbarUser() {
  const u = state.currentUser;
  if (!u) return;
  const avatar = document.querySelector('.topbar__avatar');
  if (avatar) avatar.textContent = u.name.charAt(0).toUpperCase();
  const dropdown = document.getElementById('user-dropdown');
  if (dropdown) {
    const roleTag = u.role === 'admin' ? 'tag--production' : u.role === 'dev' ? 'tag--development' : 'tag--testing';
    dropdown.innerHTML = `
      <div style="padding:10px 12px;border-bottom:1px solid var(--border)">
        <div style="font-weight:600;font-size:13px">${esc(u.name)}</div>
        <div style="font-size:11px;color:var(--text-tri);margin-top:2px">${esc(u.email)}</div>
        <span class="tag ${roleTag}" style="margin-top:6px;display:inline-block">${esc(u.role)}</span>
      </div>
      <a href="#/settings" class="topbar__user-item">Einstellungen</a>
      <a href="/logout" class="topbar__user-item topbar__user-item--danger">Logout</a>
    `;
  }
}

// ── Sidebar Toggle ──────────────────────────────────────────────
document.getElementById('sidebar-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
});
document.getElementById('sidebar-overlay').addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
});

// ── User Dropdown ───────────────────────────────────────────────
document.getElementById('user-menu').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('user-dropdown').classList.toggle('open');
});
document.addEventListener('click', () => {
  document.getElementById('user-dropdown').classList.remove('open');
});

// ── Command Palette (Ctrl+K) ────────────────────────────────────
const searchOverlay = document.getElementById('search-overlay');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

function openSearch() {
  searchOverlay.style.display = 'flex';
  searchInput.value = '';
  searchInput.focus();
  renderSearchResults('');
}
function closeSearch() {
  searchOverlay.style.display = 'none';
}

document.getElementById('search-btn').addEventListener('click', openSearch);
document.getElementById('alerts-btn').addEventListener('click', () => navigate('/alerts'));
searchOverlay.addEventListener('click', (e) => { if (e.target === searchOverlay) closeSearch(); });
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
  if (e.key === 'Escape') closeSearch();
});

searchInput.addEventListener('input', (e) => renderSearchResults(e.target.value));

function renderSearchResults(query) {
  const q = query.toLowerCase();
  const items = [
    { label: 'Server Overview', hint: '#/servers', icon: 'server', group: 'Pages' },
    { label: 'Bot Management', hint: '#/bots', icon: 'bot', group: 'Pages' },
    { label: 'Alerts', hint: '#/alerts', icon: 'bell', group: 'Pages' },
    { label: 'Deployments', hint: '#/deployments', icon: 'clock', group: 'Pages' },
    { label: 'Network', hint: '#/network', icon: 'globe', group: 'Pages' },
    { label: 'Storage', hint: '#/storage', icon: 'box', group: 'Pages' },
    { label: 'Settings', hint: '#/settings', icon: 'settings', group: 'Pages' },
    { label: 'oracle-prod-01', hint: '#/servers/oracle-prod-01', icon: 'server', group: 'Servers' },
    { label: 'BeatByte', hint: '#/bots/beatbyte', icon: 'bot', group: 'Bots' },
    { label: 'Monitoring Bot', hint: '#/bots/monitoring', icon: 'bot', group: 'Bots' },
    { label: 'Soundboard Bot', hint: '#/bots/soundboard', icon: 'bot', group: 'Bots' },
  ];

  const filtered = q ? items.filter(i => i.label.toLowerCase().includes(q)) : items;
  const groups = {};
  filtered.forEach(i => {
    if (!groups[i.group]) groups[i.group] = [];
    groups[i.group].push(i);
  });

  let html = '';
  for (const [group, items] of Object.entries(groups)) {
    html += `<div class="command-palette__group">${esc(group)}</div>`;
    items.forEach(i => {
      html += `<div class="command-palette__item" data-href="${i.hint}">${esc(i.label)}<span class="command-palette__item-hint">${esc(i.hint)}</span></div>`;
    });
  }
  searchResults.innerHTML = html || '<div style="padding:16px;text-align:center;color:var(--text-tri)">Keine Ergebnisse</div>';

  searchResults.querySelectorAll('.command-palette__item').forEach(item => {
    item.addEventListener('click', () => {
      location.hash = item.dataset.href;
      closeSearch();
    });
  });
}

// ── Init ────────────────────────────────────────────────────────
render();
