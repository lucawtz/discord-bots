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
    } else if (route.page === 'audit') {
      await renderAuditPage(app);
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
      <div class="agg-stat agg-stat--success" id="uptime-stat">
        <div class="agg-stat__value" id="uptime-avg">--</div>
        <div class="agg-stat__label">Avg. Uptime</div>
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

  // Load uptime summary
  (async () => {
    try {
      const uptimeData = await api.get('/uptime');
      if (uptimeData.checks && uptimeData.checks.length > 0) {
        const onlineCount = uptimeData.checks.filter(c => c.status === 'up').length;
        const pct = Math.round((onlineCount / uptimeData.checks.length) * 100);
        const el = document.getElementById('uptime-avg');
        if (el) el.textContent = pct + '%';
      }
    } catch {}
  })();

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
      <button class="tab ${activeTab === 'docker' ? 'active' : ''}" data-tab="docker">Docker</button>
      <button class="tab ${activeTab === 'cron' ? 'active' : ''}" data-tab="cron">Cron</button>
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
  } else if (activeTab === 'docker') {
    await renderServerDockerTab(tabContent);
  } else if (activeTab === 'cron') {
    await renderServerCronTab(tabContent);
  }
}

async function renderServerOverviewTab(container, srv, serverId) {
  const sys = srv.system;
  container.innerHTML = `
    <div style="display:flex;gap:6px;margin-bottom:16px" id="metrics-range">
      <button class="btn btn--sm btn--primary metrics-range-btn" data-range="10min">10min</button>
      <button class="btn btn--sm btn--secondary metrics-range-btn" data-range="1h">1h</button>
      <button class="btn btn--sm btn--secondary metrics-range-btn" data-range="6h">6h</button>
      <button class="btn btn--sm btn--secondary metrics-range-btn" data-range="24h">24h</button>
    </div>
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

  // Metrics range selector
  let currentRange = '10min';
  async function loadMetricsForRange(range) {
    try {
      let metricsData;
      if (range === '10min') {
        metricsData = await api.get(`/servers/${serverId}/metrics`);
      } else {
        metricsData = await api.get(`/metrics/history?range=${range}`);
      }
      drawCharts(metricsData.metrics || []);
    } catch {
      drawCharts([]);
    }
  }

  container.querySelectorAll('.metrics-range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentRange = btn.dataset.range;
      container.querySelectorAll('.metrics-range-btn').forEach(b => {
        b.className = `btn btn--sm ${b.dataset.range === currentRange ? 'btn--primary' : 'btn--secondary'} metrics-range-btn`;
      });
      // Stop live refresh if not 10min
      if (currentRange !== '10min' && state.metricsTimer) {
        clearInterval(state.metricsTimer);
        state.metricsTimer = null;
      }
      loadMetricsForRange(currentRange);
      // Restart live refresh if back to 10min
      if (currentRange === '10min') {
        state.metricsTimer = setInterval(async () => {
          try {
            const md = await api.get(`/servers/${serverId}/metrics`);
            const freshSrv = await api.get(`/servers/${serverId}`);
            updateLiveValues(freshSrv.system);
            drawCharts(md.metrics);
          } catch {}
        }, 5000);
      }
    });
  });

  // Load metrics and draw charts
  loadMetricsForRange('10min');

  // Live refresh (default 10min)
  state.metricsTimer = setInterval(async () => {
    if (currentRange !== '10min') return;
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

async function renderServerDockerTab(container) {
  container.innerHTML = '<div class="skeleton" style="height:300px"></div>';
  try {
    const data = await api.get('/docker/containers');
    const containers = data.containers || [];
    container.innerHTML = `
      <h2 style="font-size:16px;font-weight:600;margin-bottom:12px">Docker Container</h2>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Name</th><th>Image</th><th>Status</th><th>Ports</th><th>Erstellt</th><th>Aktionen</th></tr></thead>
        <tbody>${containers.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:var(--text-tri)">Keine Container</td></tr>' :
          containers.map(c => `<tr>
            <td><strong>${esc(c.name)}</strong><div style="font-size:10px;color:var(--text-tri);font-family:var(--mono)">${esc(c.id ? c.id.substring(0, 12) : '')}</div></td>
            <td style="font-family:var(--mono);font-size:12px">${esc(c.image)}</td>
            <td><span class="status ${c.state === 'running' ? 'status--running' : 'status--stopped'}"><span class="status__dot"></span>${esc(c.status)}</span></td>
            <td style="font-family:var(--mono);font-size:11px">${esc(Array.isArray(c.ports) ? c.ports.join(', ') : (c.ports || '-'))}</td>
            <td style="font-size:12px;color:var(--text-tri)">${c.created ? timeAgo(c.created) : '-'}</td>
            <td>
              <div style="display:flex;gap:4px;flex-wrap:wrap">
                <button class="btn btn--sm btn--ghost docker-action" data-id="${esc(c.id)}" data-action="start" ${c.state === 'running' ? 'disabled' : ''}>Start</button>
                <button class="btn btn--sm btn--danger docker-action" data-id="${esc(c.id)}" data-action="stop" ${c.state !== 'running' ? 'disabled' : ''}>Stop</button>
                <button class="btn btn--sm btn--secondary docker-action" data-id="${esc(c.id)}" data-action="restart" ${c.state !== 'running' ? 'disabled' : ''}>Restart</button>
                <button class="btn btn--sm btn--ghost docker-logs-btn" data-id="${esc(c.id)}" data-name="${esc(c.name)}">Logs</button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>
      <div id="docker-logs-area" style="margin-top:16px"></div>
    `;

    container.querySelectorAll('.docker-action').forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await api.post(`/docker/containers/${btn.dataset.id}/${btn.dataset.action}`);
          showToast(`Container ${btn.dataset.action} erfolgreich`, 'success');
          setTimeout(() => renderServerDockerTab(container), 1500);
        } catch (err) {
          showToast('Fehler: ' + err.message, 'error');
          btn.disabled = false;
        }
      });
    });

    container.querySelectorAll('.docker-logs-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const area = document.getElementById('docker-logs-area');
        if (!area) return;
        area.innerHTML = '<div class="skeleton" style="height:200px"></div>';
        try {
          const logData = await api.get(`/docker/containers/${btn.dataset.id}/logs?lines=100`);
          area.innerHTML = `
            <div class="logs-panel">
              <div class="logs-panel__header">
                <div class="logs-panel__header-left"><strong>${esc(btn.dataset.name)} Logs</strong></div>
                <button class="btn btn--sm btn--secondary" id="docker-logs-close">Schliessen</button>
              </div>
              <div class="logs-panel__body">${esc(logData.logs || 'Keine Logs')}</div>
            </div>`;
          document.getElementById('docker-logs-close')?.addEventListener('click', () => { area.innerHTML = ''; });
        } catch (err) {
          area.innerHTML = `<div class="empty-state"><div class="empty-state__desc">Fehler: ${esc(err.message)}</div></div>`;
        }
      });
    });
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state__desc">Fehler: ${esc(err.message)}</div></div>`;
  }
}

async function renderServerCronTab(container) {
  container.innerHTML = '<div class="skeleton" style="height:200px"></div>';
  try {
    const data = await api.get('/cron');
    const jobs = data.jobs || [];
    container.innerHTML = `
      <h2 style="font-size:16px;font-weight:600;margin-bottom:12px">Cron Jobs</h2>
      <div class="table-wrap"><table class="table table--mono">
        <thead><tr><th>Schedule</th><th>Command</th><th>User</th></tr></thead>
        <tbody>${jobs.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:var(--text-tri)">Keine Cron Jobs</td></tr>' :
          jobs.map(j => `<tr>
            <td style="font-weight:600;white-space:nowrap">${esc(j.schedule)}</td>
            <td style="max-width:500px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(j.command)}">${esc(j.command)}</td>
            <td>${esc(j.user || '-')}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state__desc">Fehler: ${esc(err.message)}</div></div>`;
  }
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

    <div class="tabs" id="bot-tabs">
      <button class="tab active" data-tab="status">Status</button>
      <button class="tab" data-tab="config">Config</button>
      <button class="tab" data-tab="logs">Logs</button>
      <button class="tab" data-tab="env">Env Vars</button>
      <button class="tab" data-tab="recovery">Recovery</button>
    </div>

    <div id="bot-tab-status">
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
    </div>

    <div id="bot-tab-config" style="display:none">
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
    </div>

    <div id="bot-tab-logs" style="display:none">
      <h2 style="font-size:16px;font-weight:600;margin-bottom:12px">Recent Logs</h2>
      <div class="logs-panel">
        <div class="logs-panel__body" id="bot-logs-body">Lade Logs...</div>
      </div>
    </div>

    <div id="bot-tab-env" style="display:none"><div class="skeleton" style="height:200px"></div></div>
    <div id="bot-tab-recovery" style="display:none"><div class="skeleton" style="height:200px"></div></div>
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
  const botTabMap = { status: 'bot-tab-status', config: 'bot-tab-config', logs: 'bot-tab-logs', env: 'bot-tab-env', recovery: 'bot-tab-recovery' };
  let envLoaded = false, recoveryLoaded = false;
  app.querySelectorAll('#bot-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      app.querySelectorAll('#bot-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      Object.values(botTabMap).forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
      const target = document.getElementById(botTabMap[tab.dataset.tab]);
      if (target) target.style.display = 'block';
      if (tab.dataset.tab === 'env' && !envLoaded) { envLoaded = true; loadBotEnv(botId); }
      if (tab.dataset.tab === 'recovery' && !recoveryLoaded) { recoveryLoaded = true; loadBotRecovery(botId); }
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

async function loadBotEnv(botId) {
  const container = document.getElementById('bot-tab-env');
  if (!container) return;
  try {
    const data = await api.get(`/bots/${botId}/env`);
    const vars = data.vars || [];
    renderEnvEditor(container, botId, vars);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state__desc">Fehler: ${esc(err.message)}</div></div>`;
  }
}

function renderEnvEditor(container, botId, vars) {
  container.innerHTML = `
    <div class="settings-card">
      <div class="settings-card__header" style="display:flex;justify-content:space-between;align-items:center">
        <span>Umgebungsvariablen</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn--sm btn--secondary" id="env-add-btn">+ Variable</button>
          <button class="btn btn--sm btn--primary" id="env-save-btn">Speichern</button>
        </div>
      </div>
      <div class="settings-card__body" id="env-rows">
        ${vars.length === 0 ? '<div style="color:var(--text-tri);font-size:13px">Keine Variablen definiert</div>' :
          vars.map((v, i) => `
            <div class="env-row" data-index="${i}">
              <input type="text" class="form-input env-row__key" value="${esc(v.key)}" placeholder="KEY">
              <input type="text" class="form-input env-row__value" value="${esc(v.value)}" placeholder="value">
              <button class="btn btn--sm btn--danger env-row__actions env-remove-btn">X</button>
            </div>`).join('')}
      </div>
    </div>`;

  document.getElementById('env-add-btn')?.addEventListener('click', () => {
    const rows = document.getElementById('env-rows');
    const hint = rows.querySelector('div[style]');
    if (hint && hint.textContent.includes('Keine Variablen')) hint.remove();
    const idx = rows.querySelectorAll('.env-row').length;
    const div = document.createElement('div');
    div.className = 'env-row';
    div.dataset.index = idx;
    div.innerHTML = `
      <input type="text" class="form-input env-row__key" value="" placeholder="KEY">
      <input type="text" class="form-input env-row__value" value="" placeholder="value">
      <button class="btn btn--sm btn--danger env-row__actions env-remove-btn">X</button>`;
    rows.appendChild(div);
    div.querySelector('.env-remove-btn').addEventListener('click', () => div.remove());
  });

  container.querySelectorAll('.env-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.env-row').remove());
  });

  document.getElementById('env-save-btn')?.addEventListener('click', async () => {
    const rows = document.querySelectorAll('#env-rows .env-row');
    const newVars = [];
    rows.forEach(row => {
      const key = row.querySelector('.env-row__key').value.trim();
      const value = row.querySelector('.env-row__value').value;
      if (key) newVars.push({ key, value });
    });
    try {
      await api.post(`/bots/${botId}/env`, { vars: newVars });
      showToast('Env-Variablen gespeichert', 'success');
    } catch (err) {
      showToast('Fehler: ' + err.message, 'error');
    }
  });
}

async function loadBotRecovery(botId) {
  const container = document.getElementById('bot-tab-recovery');
  if (!container) return;
  try {
    const data = await api.get(`/bots/${botId}/recovery`);
    container.innerHTML = `
      <div class="settings-card">
        <div class="settings-card__header">Crash Recovery Einstellungen</div>
        <div class="settings-card__body">
          <div style="display:grid;gap:16px;max-width:500px">
            <div class="settings-row" style="border:none;padding:0">
              <div><div class="settings-row__label">Auto-Recovery aktiviert</div></div>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" id="recovery-enabled" ${data.enabled ? 'checked' : ''}> <span style="font-size:13px">${data.enabled ? 'Aktiv' : 'Inaktiv'}</span>
              </label>
            </div>
            <div class="field">
              <label style="display:block;font-size:12px;color:var(--text-sec);margin-bottom:6px">Max. Neustarts</label>
              <input type="number" class="form-input" id="recovery-max-restarts" value="${data.maxRestarts || 5}" min="1" max="100">
            </div>
            <div class="field">
              <label style="display:block;font-size:12px;color:var(--text-sec);margin-bottom:6px">Neustart-Verzoegerung (ms)</label>
              <input type="number" class="form-input" id="recovery-delay" value="${data.restartDelay || 5000}" min="1000" step="1000">
            </div>
            <div class="field">
              <label style="display:block;font-size:12px;color:var(--text-sec);margin-bottom:6px">Backoff-Strategie</label>
              <select class="form-select" id="recovery-backoff" style="width:100%">
                <option value="linear" ${data.backoff === 'linear' ? 'selected' : ''}>Linear</option>
                <option value="exponential" ${data.backoff === 'exponential' ? 'selected' : ''}>Exponential</option>
                <option value="fixed" ${data.backoff === 'fixed' || !data.backoff ? 'selected' : ''}>Fixed</option>
              </select>
            </div>
            <div class="field">
              <label style="display:block;font-size:12px;color:var(--text-sec);margin-bottom:6px">Health Check URL (optional)</label>
              <input type="text" class="form-input" id="recovery-health-url" value="${esc(data.healthCheckUrl || '')}" placeholder="http://localhost:3000/health">
            </div>
            <button class="btn btn--primary" id="recovery-save-btn" style="width:fit-content">Speichern</button>
          </div>
        </div>
      </div>`;

    document.getElementById('recovery-save-btn')?.addEventListener('click', async () => {
      try {
        await api.post(`/bots/${botId}/recovery`, {
          enabled: document.getElementById('recovery-enabled').checked,
          maxRestarts: parseInt(document.getElementById('recovery-max-restarts').value) || 5,
          restartDelay: parseInt(document.getElementById('recovery-delay').value) || 5000,
          backoff: document.getElementById('recovery-backoff').value,
          healthCheckUrl: document.getElementById('recovery-health-url').value.trim()
        });
        showToast('Recovery-Einstellungen gespeichert', 'success');
      } catch (err) {
        showToast('Fehler: ' + err.message, 'error');
      }
    });
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state__desc">Fehler: ${esc(err.message)}</div></div>`;
  }
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
      <button class="tab" data-tab="webhook">Webhook</button>
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

    <div id="alerts-webhook" style="display:none"><div class="skeleton" style="height:200px"></div></div>
  `;

  // Tab switching
  const tabs = { active: 'alerts-active', resolved: 'alerts-acked', rules: 'alerts-rules', webhook: 'alerts-webhook' };
  let webhookLoaded = false;
  app.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      app.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      Object.values(tabs).forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
      const target = document.getElementById(tabs[tab.dataset.tab]);
      if (target) target.style.display = 'block';
      if (tab.dataset.tab === 'webhook' && !webhookLoaded) { webhookLoaded = true; loadWebhookSettings(); }
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

async function loadWebhookSettings() {
  const container = document.getElementById('alerts-webhook');
  if (!container) return;
  try {
    const data = await api.get('/settings/webhook');
    container.innerHTML = `
      <div class="settings-card">
        <div class="settings-card__header">Discord Webhook Konfiguration</div>
        <div class="settings-card__body">
          <div style="display:grid;gap:16px;max-width:500px">
            <div class="settings-row" style="border:none;padding:0">
              <div><div class="settings-row__label">Webhook aktiviert</div></div>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" id="webhook-enabled" ${data.enabled ? 'checked' : ''}> <span style="font-size:13px">${data.enabled ? 'Aktiv' : 'Inaktiv'}</span>
              </label>
            </div>
            <div class="field">
              <label style="display:block;font-size:12px;color:var(--text-sec);margin-bottom:6px">Webhook URL</label>
              <input type="text" class="form-input" id="webhook-url" value="${esc(data.url || '')}" placeholder="https://discord.com/api/webhooks/...">
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn--primary" id="webhook-save-btn">Speichern</button>
              <button class="btn btn--secondary" id="webhook-test-btn">Test senden</button>
            </div>
          </div>
        </div>
      </div>`;

    document.getElementById('webhook-save-btn')?.addEventListener('click', async () => {
      try {
        await api.post('/settings/webhook', {
          url: document.getElementById('webhook-url').value.trim(),
          enabled: document.getElementById('webhook-enabled').checked
        });
        showToast('Webhook gespeichert', 'success');
      } catch (err) { showToast('Fehler: ' + err.message, 'error'); }
    });

    document.getElementById('webhook-test-btn')?.addEventListener('click', async () => {
      try {
        await api.post('/settings/webhook', {
          url: document.getElementById('webhook-url').value.trim(),
          enabled: document.getElementById('webhook-enabled').checked
        });
        showToast('Test-Alert gesendet', 'success');
      } catch (err) { showToast('Fehler: ' + err.message, 'error'); }
    });
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state__desc">Fehler: ${esc(err.message)}</div></div>`;
  }
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

    <div class="tabs" id="network-tabs">
      <button class="tab active" data-tab="ports">Ports</button>
      <button class="tab" data-tab="firewall">Firewall</button>
      <button class="tab" data-tab="ssl">SSL Check</button>
      <button class="tab" data-tab="uptime">Uptime</button>
    </div>

    <div id="net-ports">
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
    </div>

    <div id="net-firewall" style="display:none"><div class="skeleton" style="height:200px"></div></div>
    <div id="net-ssl" style="display:none">
      <div class="settings-card">
        <div class="settings-card__header">SSL/TLS Zertifikat pruefen</div>
        <div class="settings-card__body">
          <div style="display:flex;gap:8px;margin-bottom:16px">
            <input type="text" class="form-input" id="ssl-host" placeholder="z.B. example.com" style="max-width:300px">
            <button class="btn btn--primary" id="ssl-check-btn">Pruefen</button>
          </div>
          <div id="ssl-result"></div>
        </div>
      </div>
    </div>
    <div id="net-uptime" style="display:none"><div class="skeleton" style="height:200px"></div></div>
  `;

  // Tab switching
  const netTabs = { ports: 'net-ports', firewall: 'net-firewall', ssl: 'net-ssl', uptime: 'net-uptime' };
  let firewallLoaded = false, uptimeLoaded = false;
  app.querySelectorAll('#network-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      app.querySelectorAll('#network-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      Object.values(netTabs).forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
      const target = document.getElementById(netTabs[tab.dataset.tab]);
      if (target) target.style.display = 'block';
      if (tab.dataset.tab === 'firewall' && !firewallLoaded) { firewallLoaded = true; loadFirewall(); }
      if (tab.dataset.tab === 'uptime' && !uptimeLoaded) { uptimeLoaded = true; loadUptime(); }
    });
  });

  // SSL Check
  document.getElementById('ssl-check-btn')?.addEventListener('click', async () => {
    const host = document.getElementById('ssl-host').value.trim();
    if (!host) return showToast('Hostname eingeben', 'error');
    const resultDiv = document.getElementById('ssl-result');
    resultDiv.innerHTML = '<div class="skeleton" style="height:80px"></div>';
    try {
      const data = await api.get(`/ssl-check?host=${encodeURIComponent(host)}`);
      if (data.error) {
        resultDiv.innerHTML = `<div style="padding:12px;border-radius:var(--radius);background:var(--danger-bg);color:var(--danger)">${esc(data.error)}</div>`;
      } else {
        const color = data.daysLeft > 30 ? 'var(--success)' : data.daysLeft > 7 ? 'var(--warning)' : 'var(--danger)';
        resultDiv.innerHTML = `
          <div class="agg-stats">
            <div class="agg-stat"><div class="agg-stat__value" style="color:${data.valid ? 'var(--success)' : 'var(--danger)'}">${data.valid ? 'Gueltig' : 'Ungueltig'}</div><div class="agg-stat__label">Status</div></div>
            <div class="agg-stat"><div class="agg-stat__value" style="color:${color}">${data.daysLeft}</div><div class="agg-stat__label">Tage verbleibend</div></div>
            <div class="agg-stat"><div class="agg-stat__value" style="font-size:14px;color:var(--text)">${esc(data.issuer || '-')}</div><div class="agg-stat__label">Aussteller</div></div>
            <div class="agg-stat"><div class="agg-stat__value" style="font-size:14px;color:var(--text)">${data.expires ? new Date(data.expires).toLocaleDateString('de-DE') : '-'}</div><div class="agg-stat__label">Ablaufdatum</div></div>
          </div>`;
      }
    } catch (err) {
      resultDiv.innerHTML = `<div style="padding:12px;border-radius:var(--radius);background:var(--danger-bg);color:var(--danger)">${esc(err.message)}</div>`;
    }
  });
}

async function loadFirewall() {
  const container = document.getElementById('net-firewall');
  if (!container) return;
  try {
    const data = await api.get('/firewall');
    container.innerHTML = `
      <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
        <h2 style="font-size:16px;font-weight:600">UFW Firewall</h2>
        <span class="status ${data.status === 'active' ? 'status--running' : 'status--stopped'}"><span class="status__dot"></span>${esc(data.status || 'unknown')}</span>
      </div>
      <div class="table-wrap"><table class="table table--mono">
        <thead><tr><th>#</th><th>Action</th><th>From</th><th>To</th><th>Port</th><th>Protocol</th></tr></thead>
        <tbody>${(!data.rules || data.rules.length === 0) ? '<tr><td colspan="6" style="text-align:center;color:var(--text-tri)">Keine Regeln</td></tr>' :
          data.rules.map(r => `<tr>
            <td>${r.number || '-'}</td>
            <td><span class="tag ${r.action === 'ALLOW' ? 'tag--production' : 'tag--testing'}">${esc(r.action)}</span></td>
            <td>${esc(r.from || 'Anywhere')}</td>
            <td>${esc(r.to || 'Anywhere')}</td>
            <td style="font-weight:600">${esc(String(r.port || '-'))}</td>
            <td>${esc(r.protocol || '-')}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state__desc">Fehler: ${esc(err.message)}</div></div>`;
  }
}

async function loadUptime() {
  const container = document.getElementById('net-uptime');
  if (!container) return;
  try {
    const data = await api.get('/uptime');
    container.innerHTML = `
      <h2 style="font-size:16px;font-weight:600;margin-bottom:12px">Uptime Monitoring</h2>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Name</th><th>Host</th><th>Status</th><th>Latenz</th><th>Paketverlust</th><th>Letzter Check</th></tr></thead>
        <tbody>${(!data.checks || data.checks.length === 0) ? '<tr><td colspan="6" style="text-align:center;color:var(--text-tri)">Keine Uptime-Checks</td></tr>' :
          data.checks.map(c => `<tr>
            <td><strong>${esc(c.name)}</strong></td>
            <td style="font-family:var(--mono);font-size:12px">${esc(c.host)}</td>
            <td><span class="status ${c.status === 'up' ? 'status--running' : 'status--crashed'}"><span class="status__dot"></span>${c.status === 'up' ? 'Online' : 'Offline'}</span></td>
            <td style="font-family:var(--mono);font-size:12px">${c.latency != null ? c.latency + ' ms' : '-'}</td>
            <td style="color:${(c.packetLoss || 0) > 0 ? 'var(--danger)' : 'var(--text-sec)'}">${c.packetLoss != null ? c.packetLoss + '%' : '-'}</td>
            <td style="font-size:12px;color:var(--text-tri)">${c.lastCheck ? new Date(c.lastCheck).toLocaleString('de-DE') : '-'}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state__desc">Fehler: ${esc(err.message)}</div></div>`;
  }
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

    <div class="tabs" id="storage-tabs">
      <button class="tab active" data-tab="files">Dateien</button>
      <button class="tab" data-tab="backups">Backups</button>
    </div>

    <div id="storage-files"></div>
    <div id="storage-backups" style="display:none"></div>
  `;

  // Tab switching
  const storageTabs = { files: 'storage-files', backups: 'storage-backups' };
  app.querySelectorAll('#storage-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      app.querySelectorAll('#storage-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      Object.values(storageTabs).forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
      const target = document.getElementById(storageTabs[tab.dataset.tab]);
      if (target) target.style.display = 'block';
    });
  });

  // Load file browser and backups
  loadFileBrowser('/home/ubuntu');
  loadBackups();
}

async function loadFileBrowser(dirPath) {
  const container = document.getElementById('storage-files');
  if (!container) return;
  container.innerHTML = '<div class="skeleton" style="height:300px"></div>';

  try {
    const data = await api.get(`/files?path=${encodeURIComponent(dirPath)}`);
    const currentPath = data.currentPath || dirPath;
    const pathParts = currentPath.split('/').filter(Boolean);

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <div class="file-browser__path">
          <span class="file-browser__path-segment" data-path="/">/</span>
          ${pathParts.map((p, i) => {
            const fullPath = '/' + pathParts.slice(0, i + 1).join('/');
            return `<span style="color:var(--text-tri)">/</span><span class="file-browser__path-segment" data-path="${esc(fullPath)}">${esc(p)}</span>`;
          }).join('')}
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn--sm btn--secondary" id="file-new-folder">+ Ordner</button>
        </div>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th style="width:30px"></th><th>Name</th><th>Groesse</th><th>Geaendert</th><th>Rechte</th><th>Aktionen</th></tr></thead>
        <tbody>
          ${currentPath !== '/' ? `<tr class="file-row" data-path="${esc(currentPath.substring(0, currentPath.lastIndexOf('/'))) || '/'}" data-type="dir">
            <td><span class="file-icon file-icon--dir">&#128193;</span></td>
            <td><strong>..</strong></td><td></td><td></td><td></td><td></td>
          </tr>` : ''}
          ${(!data.entries || data.entries.length === 0) ? '<tr><td colspan="6" style="text-align:center;color:var(--text-tri)">Leerer Ordner</td></tr>' :
            data.entries.map(f => `<tr class="file-row" data-path="${esc(currentPath + '/' + f.name)}" data-type="${f.type}">
              <td><span class="file-icon ${f.type === 'dir' ? 'file-icon--dir' : ''}">${f.type === 'dir' ? '&#128193;' : '&#128196;'}</span></td>
              <td><strong>${esc(f.name)}</strong></td>
              <td style="font-size:12px;color:var(--text-sec)">${f.type === 'file' ? formatFileSize(f.size) : '-'}</td>
              <td style="font-size:12px;color:var(--text-tri)">${f.modified ? new Date(f.modified).toLocaleString('de-DE') : '-'}</td>
              <td style="font-family:var(--mono);font-size:11px;color:var(--text-tri)">${esc(f.permissions || '-')}</td>
              <td>
                <div style="display:flex;gap:4px">
                  ${f.type === 'file' ? `<button class="btn btn--sm btn--ghost file-view-btn" data-path="${esc(currentPath + '/' + f.name)}">Ansehen</button>` : ''}
                  <button class="btn btn--sm btn--danger file-delete-btn" data-path="${esc(currentPath + '/' + f.name)}" data-name="${esc(f.name)}">Loeschen</button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table></div>
      <div id="file-editor-area" style="margin-top:16px"></div>
    `;

    // Navigate directories
    container.querySelectorAll('.file-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        if (row.dataset.type === 'dir') loadFileBrowser(row.dataset.path);
      });
    });

    // Path breadcrumb navigation
    container.querySelectorAll('.file-browser__path-segment').forEach(seg => {
      seg.addEventListener('click', () => loadFileBrowser(seg.dataset.path));
    });

    // New folder
    container.querySelector('#file-new-folder')?.addEventListener('click', async () => {
      const name = prompt('Ordnername:');
      if (!name) return;
      try {
        await api.post('/files/mkdir', { path: currentPath + '/' + name });
        showToast('Ordner erstellt', 'success');
        loadFileBrowser(currentPath);
      } catch (err) { showToast('Fehler: ' + err.message, 'error'); }
    });

    // View/Edit file
    container.querySelectorAll('.file-view-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const filePath = btn.dataset.path;
        const editorArea = document.getElementById('file-editor-area');
        if (!editorArea) return;
        editorArea.innerHTML = '<div class="skeleton" style="height:200px"></div>';
        try {
          const fileData = await api.get(`/files/read?path=${encodeURIComponent(filePath)}`);
          editorArea.innerHTML = `
            <div class="settings-card">
              <div class="settings-card__header" style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-family:var(--mono);font-size:12px">${esc(filePath)}</span>
                <div style="display:flex;gap:8px">
                  <button class="btn btn--sm btn--primary" id="file-save-btn">Speichern</button>
                  <button class="btn btn--sm btn--secondary" id="file-close-btn">Schliessen</button>
                </div>
              </div>
              <div class="settings-card__body">
                <textarea class="code-editor" id="file-content">${esc(fileData.content || '')}</textarea>
              </div>
            </div>`;
          document.getElementById('file-save-btn')?.addEventListener('click', async () => {
            try {
              await api.post('/files/write', { path: filePath, content: document.getElementById('file-content').value });
              showToast('Datei gespeichert', 'success');
            } catch (err) { showToast('Fehler: ' + err.message, 'error'); }
          });
          document.getElementById('file-close-btn')?.addEventListener('click', () => { editorArea.innerHTML = ''; });
        } catch (err) {
          editorArea.innerHTML = `<div class="empty-state"><div class="empty-state__desc">Fehler: ${esc(err.message)}</div></div>`;
        }
      });
    });

    // Delete
    container.querySelectorAll('.file-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(`"${btn.dataset.name}" wirklich loeschen?`)) return;
        try {
          await api.post('/files/delete', { path: btn.dataset.path });
          showToast('Geloescht', 'success');
          loadFileBrowser(currentPath);
        } catch (err) { showToast('Fehler: ' + err.message, 'error'); }
      });
    });
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state__title">Fehler</div><div class="empty-state__desc">${esc(err.message)}</div></div>`;
  }
}

async function loadBackups() {
  const container = document.getElementById('storage-backups');
  if (!container) return;
  container.innerHTML = '<div class="skeleton" style="height:200px"></div>';

  try {
    const data = await api.get('/backups');
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="font-size:16px;font-weight:600">Backups</h2>
        <button class="btn btn--sm btn--primary" id="create-backup-btn">+ Backup erstellen</button>
      </div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Name</th><th>Groesse</th><th>Datum</th><th>Typ</th><th>Aktionen</th></tr></thead>
        <tbody>${(!data.backups || data.backups.length === 0) ? '<tr><td colspan="5" style="text-align:center;color:var(--text-tri)">Keine Backups vorhanden</td></tr>' :
          data.backups.map(b => `<tr>
            <td><strong>${esc(b.name)}</strong></td>
            <td style="font-size:12px;color:var(--text-sec)">${formatFileSize(b.size)}</td>
            <td style="font-size:12px;color:var(--text-tri)">${b.date ? new Date(b.date).toLocaleString('de-DE') : '-'}</td>
            <td><span class="tag tag--development">${esc(b.type || 'manual')}</span></td>
            <td><button class="btn btn--sm btn--danger backup-delete-btn" data-name="${esc(b.name)}">Loeschen</button></td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;

    container.querySelector('#create-backup-btn')?.addEventListener('click', async () => {
      const name = prompt('Backup-Name (leer fuer automatisch):');
      try {
        await api.post('/backups/create', { name: name || undefined });
        showToast('Backup erstellt', 'success');
        loadBackups();
      } catch (err) { showToast('Fehler: ' + err.message, 'error'); }
    });

    container.querySelectorAll('.backup-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Backup "${btn.dataset.name}" wirklich loeschen?`)) return;
        try {
          await api.post('/backups/delete', { name: btn.dataset.name });
          showToast('Backup geloescht', 'success');
          loadBackups();
        } catch (err) { showToast('Fehler: ' + err.message, 'error'); }
      });
    });
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state__desc">Fehler: ${esc(err.message)}</div></div>`;
  }
}

// ── Helper: Format file size ────────────────────────────────────
function formatFileSize(bytes) {
  if (bytes == null || isNaN(bytes)) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(2) + ' GB';
}

// ── Page: Audit Log ─────────────────────────────────────────────
async function renderAuditPage(app) {
  setBreadcrumb({ label: 'Audit Log' });
  app.innerHTML = '<div class="skeleton" style="height:400px"></div>';
  try {
    const data = await api.get('/audit-log?limit=200');

    app.innerHTML = `
      <div class="page-header"><h1>Audit Log</h1></div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Zeit</th><th>Benutzer</th><th>Aktion</th><th>Ziel</th><th>Details</th></tr></thead>
        <tbody>${(!data.entries || data.entries.length === 0) ? '<tr><td colspan="5" style="text-align:center;color:var(--text-tri)">Noch keine Eintraege</td></tr>' :
          data.entries.map(e => `<tr>
            <td style="font-family:var(--mono);font-size:12px;white-space:nowrap;color:var(--text-tri)">${new Date(e.time).toLocaleString('de-DE')}</td>
            <td><strong>${esc(e.user)}</strong></td>
            <td><span class="tag ${e.action.includes('delete') || e.action.includes('stop') ? 'tag--testing' : e.action.includes('create') || e.action.includes('start') ? 'tag--production' : 'tag--development'}">${esc(e.action)}</span></td>
            <td style="font-family:var(--mono);font-size:12px">${esc(e.target || '-')}</td>
            <td style="font-size:12px;color:var(--text-sec);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(e.details || '')}">${esc(e.details || '-')}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;
  } catch (err) {
    app.innerHTML = `<div class="page-header"><h1>Audit Log</h1></div><div class="empty-state"><div class="empty-state__title">Fehler</div><div class="empty-state__desc">${esc(err.message)}</div></div>`;
  }
}

// ── Page: Settings ────────���─────────────────────���───────────────
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

      <!-- 2FA Section -->
      <div class="settings-card" style="margin-top:16px">
        <div class="settings-card__header">Zwei-Faktor-Authentifizierung (2FA)</div>
        <div class="settings-card__body" id="twofa-section">
          <div style="color:var(--text-tri);font-size:13px">Status wird geladen...</div>
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

  // ── 2FA Setup ──────────────────────────────────────────────────
  async function load2FAStatus() {
    const section = document.getElementById('twofa-section');
    if (!section) return;
    try {
      const { enabled } = await api.get('/2fa/status');
      if (enabled) {
        section.innerHTML = `
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
            <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:6px;font-size:13px;font-weight:600;background:rgba(34,197,94,0.1);color:#22C55E;border:1px solid rgba(34,197,94,0.2)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              2FA aktiv
            </span>
          </div>
          <div id="twofa-disable-area" style="display:none;max-width:420px">
            <div style="font-size:12px;color:var(--text-sec);margin-bottom:8px">Gib deinen aktuellen 2FA-Code ein, um die Zwei-Faktor-Authentifizierung zu deaktivieren:</div>
            <div style="display:flex;gap:8px;align-items:end">
              <input type="text" class="form-input" id="twofa-disable-code" maxlength="6" pattern="[0-9]*" inputmode="numeric" placeholder="000000" style="width:140px;font-family:var(--mono);text-align:center;letter-spacing:4px;font-size:16px">
              <button class="btn btn--sm btn--danger" id="twofa-disable-confirm">Deaktivieren</button>
              <button class="btn btn--sm btn--ghost" id="twofa-disable-cancel">Abbrechen</button>
            </div>
            <div id="twofa-disable-error" style="display:none;color:#EF4444;font-size:12px;margin-top:8px"></div>
          </div>
          <button class="btn btn--sm btn--secondary" id="twofa-disable-btn">2FA deaktivieren</button>
        `;
        document.getElementById('twofa-disable-btn').addEventListener('click', () => {
          document.getElementById('twofa-disable-area').style.display = 'block';
          document.getElementById('twofa-disable-btn').style.display = 'none';
          document.getElementById('twofa-disable-code').focus();
        });
        document.getElementById('twofa-disable-cancel').addEventListener('click', () => {
          document.getElementById('twofa-disable-area').style.display = 'none';
          document.getElementById('twofa-disable-btn').style.display = '';
        });
        document.getElementById('twofa-disable-code').addEventListener('input', (e) => {
          e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
        document.getElementById('twofa-disable-confirm').addEventListener('click', async () => {
          const code = document.getElementById('twofa-disable-code').value.trim();
          const errEl = document.getElementById('twofa-disable-error');
          if (!code || code.length !== 6) {
            errEl.textContent = 'Bitte gib einen 6-stelligen Code ein.';
            errEl.style.display = 'block';
            return;
          }
          try {
            await api.post('/2fa/disable', { code });
            showToast('2FA wurde deaktiviert', 'success');
            load2FAStatus();
          } catch (err) {
            errEl.textContent = err.message || 'Ungueltiger Code';
            errEl.style.display = 'block';
          }
        });
      } else {
        section.innerHTML = `
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
            <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:6px;font-size:13px;font-weight:500;background:rgba(161,161,170,0.1);color:#A1A1AA;border:1px solid rgba(161,161,170,0.2)">2FA nicht aktiv</span>
          </div>
          <div id="twofa-setup-area" style="display:none;max-width:420px"></div>
          <button class="btn btn--sm btn--primary" id="twofa-enable-btn">2FA aktivieren</button>
        `;
        document.getElementById('twofa-enable-btn').addEventListener('click', async () => {
          const btn = document.getElementById('twofa-enable-btn');
          btn.disabled = true;
          btn.textContent = 'Wird vorbereitet...';
          try {
            const data = await api.post('/2fa/setup');
            btn.style.display = 'none';
            const area = document.getElementById('twofa-setup-area');
            area.style.display = 'block';
            area.innerHTML = `
              <div style="font-size:13px;color:var(--text-sec);margin-bottom:16px">Scanne den QR-Code mit deiner Authenticator-App (z.B. Google Authenticator, Authy):</div>
              <div style="text-align:center;margin-bottom:16px;background:#fff;border-radius:8px;padding:12px;display:inline-block">
                <img src="${data.qrCode}" alt="QR Code" style="width:200px;height:200px">
              </div>
              <div style="margin-bottom:16px">
                <div style="font-size:11px;color:var(--text-tri);margin-bottom:4px">Oder manuell eingeben:</div>
                <code style="font-size:13px;color:var(--text-sec);background:var(--bg);padding:6px 10px;border-radius:4px;border:1px solid var(--border);display:block;word-break:break-all;font-family:var(--mono)">${data.secret}</code>
              </div>
              <div style="font-size:12px;color:var(--text-sec);margin-bottom:8px">Gib den 6-stelligen Code aus der App ein, um die Einrichtung abzuschliessen:</div>
              <div style="display:flex;gap:8px;align-items:end">
                <input type="text" class="form-input" id="twofa-setup-code" maxlength="6" pattern="[0-9]*" inputmode="numeric" placeholder="000000" style="width:140px;font-family:var(--mono);text-align:center;letter-spacing:4px;font-size:16px">
                <button class="btn btn--sm btn--primary" id="twofa-setup-confirm">Aktivieren</button>
              </div>
              <div id="twofa-setup-error" style="display:none;color:#EF4444;font-size:12px;margin-top:8px"></div>
            `;
            document.getElementById('twofa-setup-code').focus();
            document.getElementById('twofa-setup-code').addEventListener('input', (e) => {
              e.target.value = e.target.value.replace(/[^0-9]/g, '');
            });
            document.getElementById('twofa-setup-confirm').addEventListener('click', async () => {
              const code = document.getElementById('twofa-setup-code').value.trim();
              const errEl = document.getElementById('twofa-setup-error');
              if (!code || code.length !== 6) {
                errEl.textContent = 'Bitte gib einen 6-stelligen Code ein.';
                errEl.style.display = 'block';
                return;
              }
              try {
                await api.post('/2fa/confirm-setup', { code });
                showToast('2FA wurde erfolgreich aktiviert', 'success');
                load2FAStatus();
              } catch (err) {
                errEl.textContent = err.message || 'Ungueltiger Code';
                errEl.style.display = 'block';
                document.getElementById('twofa-setup-code').value = '';
                document.getElementById('twofa-setup-code').focus();
              }
            });
          } catch (err) {
            showToast(err.message, 'error');
            btn.disabled = false;
            btn.textContent = '2FA aktivieren';
          }
        });
      }
    } catch (err) {
      section.innerHTML = '<div style="color:#EF4444;font-size:13px">Fehler beim Laden des 2FA-Status</div>';
    }
  }
  load2FAStatus();

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

// ── Theme Toggle ────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  applyTheme(saved);
}
function applyTheme(theme) {
  document.body.classList.toggle('light', theme === 'light');
  const darkIcon = document.getElementById('theme-icon-dark');
  const lightIcon = document.getElementById('theme-icon-light');
  if (darkIcon && lightIcon) {
    darkIcon.style.display = theme === 'dark' ? '' : 'none';
    lightIcon.style.display = theme === 'light' ? '' : 'none';
  }
  localStorage.setItem('theme', theme);
}
document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const current = localStorage.getItem('theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
});
initTheme();

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
    { label: 'Audit Log', hint: '#/audit', icon: 'file', group: 'Pages' },
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
