// ============================================
// STATE
// ============================================
let programData = [];
let filteredData = [];
let activeFilter = '';

const listEl     = document.getElementById('programList');
const addBtn     = document.getElementById('addProgramBtn');
const modal      = document.getElementById('programModal');
const chipFilter = document.getElementById('chipFilter');

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadProgram();
  setupProgramEvents();
});

function setupProgramEvents() {
  if (addBtn) addBtn.addEventListener('click', () => openProgramModal('add'));

  document.querySelectorAll('[data-close-modal="program"]').forEach(el => {
    el.addEventListener('click', () => closeModal(modal));
  });
  document.getElementById('formProgram').addEventListener('submit', handleProgramSubmit);

  chipFilter.addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    chipFilter.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    applyFilter();
  });
}

// ============================================
// LOAD
// ============================================
async function loadProgram() {
  try {
    const res = await fetch(`${API_URL}?action=getProgram`, { redirect: 'follow' });
    const result = await res.json();
    if (result.status !== 'success') throw new Error(result.message);

    programData = result.data || [];
    applyFilter();
    updateHeroStats();
    updateAdminUI();
  } catch (err) {
    listEl.innerHTML = `<div class="empty-state-sd" style="color:#b91c1c">⚠️ Gagal memuat: ${escapeHtml(err.message)}</div>`;
  }
}

// ============================================
// FILTER
// ============================================
function applyFilter() {
  filteredData = activeFilter
    ? programData.filter(p => (p.status || 'Rencana') === activeFilter)
    : [...programData];
  renderProgram();
}

// ============================================
// HERO STATS
// ============================================
function updateHeroStats() {
  const total    = programData.length;
  const berjalan = programData.filter(p => p.status === 'Berjalan').length;
  const selesai  = programData.filter(p => p.status === 'Selesai').length;

  animateNumber(document.getElementById('heroTotal'),    total);
  animateNumber(document.getElementById('heroBerjalan'), berjalan);
  animateNumber(document.getElementById('heroSelesai'),  selesai);
}

function animateNumber(el, target) {
  if (!el) return;
  const dur = 700;
  const t0  = performance.now();
  function step(now) {
    const p = Math.min((now - t0) / dur, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ============================================
// RENDER
// ============================================
function renderProgram() {
  if (filteredData.length === 0) {
    listEl.innerHTML = `<div class="empty-state-sd">📭 Belum ada program${activeFilter ? ' dengan status ini' : ''}.</div>`;
    return;
  }

  listEl.innerHTML = filteredData.map(p => {
    const status = (p.status || 'Rencana');
    const statusClass = `status-${status.toLowerCase()}`;

    return `
      <div class="program-card">
        <div class="program-card-body">
          <div class="program-card-header">
            <h3>${escapeHtml(p.nama)}</h3>
            <span class="status-badge ${statusClass}">${escapeHtml(status)}</span>
          </div>
          ${p.deskripsi ? `<p class="program-desc">${escapeHtml(p.deskripsi)}</p>` : ''}
          ${p.target ? `<div class="program-meta">🎯 Target: ${escapeHtml(p.target)}</div>` : ''}
        </div>
        <div class="program-card-actions admin-only ${isAdmin ? '' : 'hidden'}">
          <button class="btn btn-edit" onclick="editProgram('${escapeAttr(p.id)}')">✏️ Edit</button>
          <button class="btn btn-hapus" onclick="hapusProgram('${escapeAttr(p.id)}')">🗑️ Hapus</button>
        </div>
      </div>`;
  }).join('');
}

function updateAdminUI() {
  if (addBtn) addBtn.classList.toggle('hidden', !isAdmin);
  document.querySelectorAll('.program-card-actions').forEach(el => {
    el.classList.toggle('hidden', !isAdmin);
  });
}

// ============================================
// MODAL & SUBMIT
// ============================================
function openProgramModal(mode, data = null) {
  const title = document.getElementById('programModalTitle');
  document.getElementById('formProgram').reset();
  document.getElementById('programId').value = '';

  if (mode === 'edit' && data) {
    title.textContent = 'Edit Program';
    document.getElementById('programId').value        = data.id;
    document.getElementById('programNama').value      = data.nama;
    document.getElementById('programDeskripsi').value = data.deskripsi || '';
    document.getElementById('programTanggal').value   = data.target || '';
    document.getElementById('programStatus').value    = data.status || 'Rencana';
  } else {
    title.textContent = 'Tambah Program';
  }
  modal.classList.remove('hidden');
}

async function handleProgramSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('programId').value;
  const payload = {
    action:    id ? 'updateProgram' : 'addProgram',
    token:     token,
    id:        id || undefined,
    nama:      document.getElementById('programNama').value,
    deskripsi: document.getElementById('programDeskripsi').value,
    target:    document.getElementById('programTanggal').value,
    status:    document.getElementById('programStatus').value
  };

  try {
    const res = await fetch(API_URL, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.status === 'success') { closeModal(modal); loadProgram(); }
    else alert('Gagal: ' + result.message);
  } catch (err) { alert('Error: ' + err.message); }
}

function editProgram(id) {
  const data = programData.find(p => p.id === id);
  if (data) openProgramModal('edit', data);
}

async function hapusProgram(id) {
  if (!confirm('Yakin ingin menghapus program ini?')) return;
  try {
    const res = await fetch(API_URL, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'deleteProgram', token, id })
    });
    const result = await res.json();
    if (result.status === 'success') loadProgram();
    else alert('Gagal: ' + result.message);
  } catch (err) { alert('Error: ' + err.message); }
}

window.editProgram  = editProgram;
window.hapusProgram = hapusProgram;