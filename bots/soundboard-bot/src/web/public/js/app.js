let allSounds = [];
let categories = [];
let deleteTargetId = null;
let editTargetId = null;

// Freesound state
let fsResults = [];
let fsCurrentPage = 1;
let fsTotalCount = 0;
let fsCurrentQuery = '';
let fsAddTarget = null;

// API Key fuer schreibende Aktionen (Upload, Edit, Delete)
let storedApiKey = localStorage.getItem('soundboardApiKey') || '';

function getAuthHeaders(extra = {}) {
  const headers = { ...extra };
  if (storedApiKey) headers['X-API-Key'] = storedApiKey;
  return headers;
}

document.addEventListener('DOMContentLoaded', init);

async function init() {
  setupApiKeyPrompt();
  setupTabs();
  setupMobileMenu();
  setupUploadForm();
  setupDeleteModal();
  setupEditModal();
  setupSearch();
  setupFreesound();
  await refresh();
}

function setupApiKeyPrompt() {
  const keyInput = document.getElementById('api-key-input');
  const keySave = document.getElementById('api-key-save');
  if (!keyInput || !keySave) return;
  keyInput.value = storedApiKey;
  keySave.addEventListener('click', () => {
    storedApiKey = keyInput.value.trim();
    localStorage.setItem('soundboardApiKey', storedApiKey);
    showToast('API Key gespeichert', 'success');
  });
}

// --- Tabs (Sidebar Navigation) ---
function setupTabs() {
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-nav .nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'manage') renderManage();
      closeMobileSidebar();
    });
  });
}

// --- Mobile Menu ---
function setupMobileMenu() {
  document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').classList.add('active');
  });
  document.getElementById('sidebar-overlay').addEventListener('click', closeMobileSidebar);
}

function closeMobileSidebar() {
  document.querySelector('.sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('active');
}

// --- Daten laden ---
async function refresh() {
  try {
    const [soundsRes, catsRes] = await Promise.all([
      fetch('/api/sounds'),
      fetch('/api/categories'),
    ]);
    allSounds = await soundsRes.json();
    categories = await catsRes.json();
  } catch {
    allSounds = [];
    categories = [];
  }
  populateCategoryFilters();
  renderSounds();
  renderManage();
  updateCounts();
}

let filtersInitialized = false;

function populateCategoryFilters() {
  // Filter-Dropdowns (mit "Alle Kategorien")
  ['filter-category', 'manage-filter-category'].forEach(id => {
    const select = document.getElementById(id);
    const current = select.value;
    select.innerHTML = '<option value="">Alle Kategorien</option>';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    });
    select.value = current;
  });

  if (!filtersInitialized) {
    document.getElementById('filter-category').addEventListener('change', renderSounds);
    document.getElementById('manage-filter-category').addEventListener('change', renderManage);
    filtersInitialized = true;
  }

  // Kategorie-Selects in Formularen/Modals
  ['upload-category', 'fs-add-category', 'edit-category'].forEach(id => {
    const select = document.getElementById(id);
    select.innerHTML = '';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    });
  });
}

function updateCounts() {
  document.getElementById('sound-count').textContent = allSounds.length + ' Sounds';
  document.getElementById('manage-sound-count').textContent = allSounds.length + ' Sounds';
}

// --- Sounds Tab ---
function getFilteredSounds(categoryFilterId) {
  const category = document.getElementById(categoryFilterId).value;
  let filtered = allSounds;
  if (category) {
    filtered = filtered.filter(s => s.category === category);
  }
  return filtered;
}

function renderSounds() {
  const searchQuery = document.getElementById('search-sounds').value.toLowerCase();
  let filtered = getFilteredSounds('filter-category');
  if (searchQuery) {
    filtered = filtered.filter(s =>
      s.name.toLowerCase().includes(searchQuery) ||
      s.category.toLowerCase().includes(searchQuery)
    );
  }
  const grid = document.getElementById('sounds-grid');
  const empty = document.getElementById('sounds-empty');
  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  grid.innerHTML = filtered.map(s => `
    <div class="sound-card sound-card-preview">
      <div class="sound-name">${escapeHtml(s.name)}</div>
      <div class="sound-meta">
        <span class="category-badge">${escapeHtml(s.category)}</span>
        ${s.is_predefined ? '<span class="predefined-badge">Vorgegeben</span>' : ''}
      </div>
      ${s.created_at ? `<div class="sound-date">${formatDate(s.created_at)}</div>` : ''}
      <div class="preview-player">
        <button class="btn btn-secondary btn-sm preview-play-btn" data-id="${s.id}">
          <svg class="icon-play" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          <svg class="icon-stop hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
          </svg>
          <span class="preview-label">Anhören</span>
        </button>
        <audio class="preview-audio" preload="none">
          <source src="/api/sounds/${s.id}/audio">
        </audio>
      </div>
    </div>
  `).join('');

  // Preview-Buttons
  grid.querySelectorAll('.preview-play-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.sound-card');
      const audio = card.querySelector('.preview-audio');
      const iconPlay = btn.querySelector('.icon-play');
      const iconStop = btn.querySelector('.icon-stop');
      const label = btn.querySelector('.preview-label');

      if (audio.paused) {
        // Alle anderen stoppen
        grid.querySelectorAll('.preview-audio').forEach(a => { a.pause(); a.currentTime = 0; });
        grid.querySelectorAll('.preview-play-btn').forEach(b => {
          b.querySelector('.icon-play').classList.remove('hidden');
          b.querySelector('.icon-stop').classList.add('hidden');
          b.querySelector('.preview-label').textContent = 'Anhören';
        });
        audio.play();
        iconPlay.classList.add('hidden');
        iconStop.classList.remove('hidden');
        label.textContent = 'Stopp';
        audio.onended = () => {
          iconPlay.classList.remove('hidden');
          iconStop.classList.add('hidden');
          label.textContent = 'Anhören';
        };
      } else {
        audio.pause();
        audio.currentTime = 0;
        iconPlay.classList.remove('hidden');
        iconStop.classList.add('hidden');
        label.textContent = 'Anhören';
      }
    });
  });
}

function setupSearch() {
  document.getElementById('search-sounds').addEventListener('input', renderSounds);
}

// --- Manage Tab ---
function renderManage() {
  const filtered = getFilteredSounds('manage-filter-category');
  const grid = document.getElementById('manage-grid');
  const empty = document.getElementById('manage-empty');
  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  grid.innerHTML = filtered.map(s => `
    <div class="sound-card sound-card-clickable" data-id="${s.id}">
      <div class="sound-name">${escapeHtml(s.name)}</div>
      <div class="sound-meta">
        <span class="category-badge">${escapeHtml(s.category)}</span>
        ${s.is_predefined ? '<span class="predefined-badge">Vorgegeben</span>' : ''}
      </div>
      ${s.created_at ? `<div class="sound-date">${formatDate(s.created_at)}</div>` : ''}
      <div class="card-edit-hint">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        Bearbeiten
      </div>
    </div>
  `).join('');

  // Klick auf Card öffnet Edit-Modal
  grid.querySelectorAll('.sound-card-clickable').forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.id);
      const sound = allSounds.find(s => s.id === id);
      if (sound) openEditModal(sound);
    });
  });
}

// --- Edit Modal ---
function setupEditModal() {
  document.getElementById('edit-cancel').addEventListener('click', closeEditModal);
  document.getElementById('edit-modal').addEventListener('click', (e) => {
    if (e.target.id === 'edit-modal') closeEditModal();
  });

  // Speichern
  document.getElementById('edit-save').addEventListener('click', async () => {
    if (!editTargetId) return;
    const btn = document.getElementById('edit-save');
    btn.disabled = true;

    const name = document.getElementById('edit-name').value.trim();
    const category = document.getElementById('edit-category').value;
    const predefined = document.getElementById('edit-predefined').checked;

    if (!name) {
      showToast('Name ist erforderlich', 'error');
      btn.disabled = false;
      return;
    }

    try {
      const res = await fetch(`/api/sounds/${editTargetId}`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name, category, predefined }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`"${data.name}" gespeichert!`, 'success');
        closeEditModal();
        await refresh();
      } else {
        showToast(data.error || 'Fehler beim Speichern', 'error');
      }
    } catch {
      showToast('Netzwerk-Fehler', 'error');
    }
    btn.disabled = false;
  });

  // Löschen aus dem Edit-Modal heraus
  document.getElementById('edit-delete').addEventListener('click', () => {
    if (!editTargetId) return;
    const sound = allSounds.find(s => s.id === editTargetId);
    deleteTargetId = editTargetId;
    document.getElementById('delete-sound-name').textContent = sound ? sound.name : '';
    closeEditModal();
    document.getElementById('delete-modal').classList.remove('hidden');
  });
}

function openEditModal(sound) {
  editTargetId = sound.id;
  document.getElementById('edit-name').value = sound.name;
  document.getElementById('edit-category').value = sound.category;
  document.getElementById('edit-predefined').checked = !!sound.is_predefined;

  const audio = document.getElementById('edit-audio');
  audio.src = `/api/sounds/${sound.id}/audio`;
  audio.load();

  document.getElementById('edit-modal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.add('hidden');
  const audio = document.getElementById('edit-audio');
  audio.pause();
  audio.src = '';
  editTargetId = null;
}

// --- Delete Modal ---
function setupDeleteModal() {
  document.getElementById('delete-cancel').addEventListener('click', () => {
    document.getElementById('delete-modal').classList.add('hidden');
    deleteTargetId = null;
  });
  document.getElementById('delete-confirm').addEventListener('click', async () => {
    if (!deleteTargetId) return;
    try {
      const res = await fetch(`/api/sounds/${deleteTargetId}`, { method: 'DELETE', headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok) {
        showToast('Sound gelöscht!', 'success');
        await refresh();
      } else {
        showToast(data.error || 'Fehler beim Löschen', 'error');
      }
    } catch {
      showToast('Netzwerk-Fehler', 'error');
    }
    document.getElementById('delete-modal').classList.add('hidden');
    deleteTargetId = null;
  });
  document.getElementById('delete-modal').addEventListener('click', (e) => {
    if (e.target.id === 'delete-modal') {
      document.getElementById('delete-modal').classList.add('hidden');
      deleteTargetId = null;
    }
  });
}

// --- Upload ---
function setupUploadForm() {
  const fileInput = document.getElementById('upload-file');
  const fileNameEl = document.getElementById('file-name');
  const dropZone = document.getElementById('file-drop');

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      fileNameEl.textContent = fileInput.files[0].name;
      fileNameEl.classList.remove('hidden');
    } else {
      fileNameEl.classList.add('hidden');
    }
  });

  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      fileInput.files = e.dataTransfer.files;
      fileNameEl.textContent = e.dataTransfer.files[0].name;
      fileNameEl.classList.remove('hidden');
    }
  });

  document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('upload-btn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoading = btn.querySelector('.btn-loading');
    btn.disabled = true;
    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('name', document.getElementById('upload-name').value.trim());
    formData.append('category', document.getElementById('upload-category').value);
    formData.append('predefined', document.getElementById('upload-predefined').checked ? 'true' : 'false');

    try {
      const res = await fetch('/api/upload', { method: 'POST', headers: getAuthHeaders(), body: formData });
      const data = await res.json();
      if (res.ok) {
        showToast(`"${data.name}" hochgeladen!`, 'success');
        document.getElementById('upload-form').reset();
        fileNameEl.classList.add('hidden');
        await refresh();
      } else {
        showToast(data.error || 'Fehler beim Hochladen', 'error');
      }
    } catch {
      showToast('Netzwerk-Fehler', 'error');
    }

    btn.disabled = false;
    btnText.classList.remove('hidden');
    btnLoading.classList.add('hidden');
  });
}

// --- Freesound ---
function setupFreesound() {
  const searchInput = document.getElementById('freesound-search');
  const searchBtn = document.getElementById('freesound-search-btn');

  searchBtn.addEventListener('click', () => {
    fsCurrentPage = 1;
    fsCurrentQuery = searchInput.value.trim();
    searchFreesound();
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fsCurrentPage = 1;
      fsCurrentQuery = searchInput.value.trim();
      searchFreesound();
    }
  });

  document.getElementById('freesound-prev').addEventListener('click', () => {
    if (fsCurrentPage > 1) {
      fsCurrentPage--;
      searchFreesound();
    }
  });

  document.getElementById('freesound-next').addEventListener('click', () => {
    fsCurrentPage++;
    searchFreesound();
  });

  // Hinzufügen-Modal
  document.getElementById('fs-add-cancel').addEventListener('click', closeFreesoundModal);
  document.getElementById('add-freesound-modal').addEventListener('click', (e) => {
    if (e.target.id === 'add-freesound-modal') closeFreesoundModal();
  });

  document.getElementById('fs-add-confirm').addEventListener('click', async () => {
    if (!fsAddTarget) return;
    const btn = document.getElementById('fs-add-confirm');
    btn.disabled = true;
    btn.textContent = 'Wird hinzugefügt...';

    const name = document.getElementById('fs-add-name').value.trim();
    const category = document.getElementById('fs-add-category').value;

    if (!name) {
      showToast('Name ist erforderlich', 'error');
      btn.disabled = false;
      btn.textContent = 'Hinzufügen';
      return;
    }

    try {
      const res = await fetch('/api/freesound/add', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          freesoundId: fsAddTarget.id,
          name,
          category,
          previewUrl: fsAddTarget.previewUrl,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        showToast(`"${data.name}" als Standardsound hinzugefügt!`, 'success');
        closeFreesoundModal();
        await refresh();
      } else {
        showToast(data.error || 'Fehler', 'error');
      }
    } catch {
      showToast('Netzwerk-Fehler', 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Hinzufügen';
  });
}

async function searchFreesound() {
  if (!fsCurrentQuery) return;

  const grid = document.getElementById('freesound-grid');
  const empty = document.getElementById('freesound-empty');
  const pagination = document.getElementById('freesound-pagination');

  grid.innerHTML = '<p class="loading-text">Suche auf Freesound.org...</p>';
  empty.classList.add('hidden');
  pagination.classList.add('hidden');

  try {
    const res = await fetch(`/api/freesound/search?q=${encodeURIComponent(fsCurrentQuery)}&page=${fsCurrentPage}`);
    const data = await res.json();

    if (!res.ok) {
      grid.innerHTML = '';
      showToast(data.error || 'Suche fehlgeschlagen', 'error');
      return;
    }

    fsResults = data.results;
    fsTotalCount = data.count;

    if (fsResults.length === 0) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    const totalPages = Math.ceil(fsTotalCount / 20);

    grid.innerHTML = fsResults.map(s => `
      <div class="sound-card freesound-card">
        <div class="sound-name">${escapeHtml(s.name)}</div>
        <div class="sound-meta">
          <span class="duration-badge">${s.duration.toFixed(1)}s</span>
          <span class="category-badge">${escapeHtml(s.username)}</span>
        </div>
        <div class="fs-tags">${s.tags.map(t => `<span class="fs-tag">${escapeHtml(t)}</span>`).join('')}</div>
        ${s.previewUrl ? `
          <audio class="fs-audio" preload="none">
            <source src="${escapeHtml(s.previewUrl)}" type="audio/mpeg">
          </audio>
          <div class="fs-card-actions">
            <button class="btn btn-secondary btn-sm fs-play-btn">Anhören</button>
            <button class="btn btn-primary btn-sm fs-add-btn" data-idx="${fsResults.indexOf(s)}">Hinzufügen</button>
          </div>
        ` : ''}
      </div>
    `).join('');

    // Play-Buttons
    grid.querySelectorAll('.fs-play-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const audio = btn.closest('.sound-card').querySelector('.fs-audio');
        if (audio.paused) {
          grid.querySelectorAll('.fs-audio').forEach(a => { a.pause(); a.currentTime = 0; });
          grid.querySelectorAll('.fs-play-btn').forEach(b => b.textContent = 'Anhören');
          audio.play();
          btn.textContent = 'Stopp';
          audio.onended = () => { btn.textContent = 'Anhören'; };
        } else {
          audio.pause();
          audio.currentTime = 0;
          btn.textContent = 'Anhören';
        }
      });
    });

    // Add-Buttons
    grid.querySelectorAll('.fs-add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sound = fsResults[parseInt(btn.dataset.idx)];
        openFreesoundAddModal(sound);
      });
    });

    // Pagination
    pagination.classList.remove('hidden');
    document.getElementById('freesound-page-info').textContent = `Seite ${fsCurrentPage} / ${totalPages} (${fsTotalCount} Ergebnisse)`;
    document.getElementById('freesound-prev').disabled = fsCurrentPage <= 1;
    document.getElementById('freesound-next').disabled = fsCurrentPage >= totalPages;

  } catch {
    grid.innerHTML = '';
    showToast('Netzwerk-Fehler bei der Suche', 'error');
  }
}

function openFreesoundAddModal(sound) {
  fsAddTarget = sound;
  const suggestedName = sound.name.length > 32 ? sound.name.slice(0, 32) : sound.name;
  document.getElementById('fs-add-name').value = suggestedName;
  document.getElementById('fs-add-category').selectedIndex = 0;
  document.getElementById('fs-add-duration').textContent = `Dauer: ${sound.duration.toFixed(1)}s`;
  document.getElementById('fs-add-author').textContent = `von ${sound.username}`;
  const audio = document.getElementById('fs-add-audio');
  audio.src = sound.previewUrl;
  audio.load();
  document.getElementById('add-freesound-modal').classList.remove('hidden');
}

function closeFreesoundModal() {
  document.getElementById('add-freesound-modal').classList.add('hidden');
  const audio = document.getElementById('fs-add-audio');
  audio.pause();
  audio.src = '';
  fsAddTarget = null;
}

// --- Hilfsfunktionen ---
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
