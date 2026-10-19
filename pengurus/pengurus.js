// ============================================
// KONFIG FOTO OTOMATIS
// ============================================
// Foto diambil dari folder ini berdasarkan urutan data:
// pengurus1.png, pengurus2.png, pengurus3.png, dst.
const FOTO_FOLDER = './';
const FOTO_EXT    = '.png';

function fotoKe(index) {
  return `${FOTO_FOLDER}/pengurus${index}${FOTO_EXT}`;
}

// ============================================
// STATE
// ============================================
let pengurusData = [];
let filteredData = [];
let activeFilter = '';

const grid       = document.getElementById('pengurusGrid');
const addBtn     = document.getElementById('addPengurusBtn');
const modal      = document.getElementById('pengurusModal');
const chipFilter = document.getElementById('chipFilter');

// Palet warna kartu
const PALETTES = [
  ['#4facfe', '#00f2fe'], ['#ff9f43', '#ff6b9d'],
  ['#a78bfa', '#7c3aed'], ['#34d399', '#059669'],
  ['#fbbf24', '#f59e0b'], ['#f472b6', '#db2777'],
  ['#60a5fa', '#2563eb'], ['#fb923c', '#ea580c'],
  ['#2dd4bf', '#0d9488'], ['#c084fc', '#9333ea'],
];

function paletteFor(name) {
  let hash = 0;
  const s = String(name || '?');
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTES[Math.abs(hash) % PALETTES.length];
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadPengurus();
  setupPengurusEvents();
});

function setupPengurusEvents() {
  if (addBtn) addBtn.addEventListener('click', () => openPengurusModal('add'));

  document.querySelectorAll('[data-close-modal="pengurus"]').forEach(el => {
    el.addEventListener('click', () => closeModal(modal));
  });

  document.getElementById('formPengurus').addEventListener('submit', handlePengurusSubmit);

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
async function loadPengurus() {
  try {
    const res = await fetch(`${API_URL}?action=getPengurus`, { redirect: 'follow' });
    const result = await res.json();
    if (result.status !== 'success') throw new Error(result.message);

    pengurusData = result.data || [];
    buildChips();
    applyFilter();
    updateHeroStats();
    updateAdminUI();
  } catch (err) {
    grid.innerHTML = `<div class="empty-state-sd" style="color:#b91c1c">⚠️ Gagal memuat: ${escapeHtml(err.message)}</div>`;
  }
}

// ============================================
// FILTER CHIP
// ============================================
function buildChips() {
  const jabatanSet = new Set();
  pengurusData.forEach(p => { if (p.jabatan) jabatanSet.add(p.jabatan.trim()); });

  const current = activeFilter;
  chipFilter.innerHTML =
    `<button class="chip ${current === '' ? 'active' : ''}" data-filter="">Semua</button>`;

  Array.from(jabatanSet).sort().forEach(j => {
    const b = document.createElement('button');
    b.className = 'chip' + (current === j ? ' active' : '');
    b.dataset.filter = j;
    b.textContent = j;
    chipFilter.appendChild(b);
  });
}

function applyFilter() {
  filteredData = activeFilter
    ? pengurusData.filter(p =>
        String(p.jabatan || '').trim().toLowerCase() === activeFilter.toLowerCase())
    : [...pengurusData];
  renderPengurus();
}

// ============================================
// HERO STATS
// ============================================
function updateHeroStats() {
  const total   = pengurusData.length;
  const jabatan = new Set(
    pengurusData.map(p => String(p.jabatan || '').trim()).filter(Boolean)
  ).size;
  const periode = pengurusData.find(p => p.periode)?.periode || '—';

  animateNumber(document.getElementById('heroTotal'),   total);
  animateNumber(document.getElementById('heroJabatan'), jabatan);
  const el = document.getElementById('heroPeriode');
  if (el) el.textContent = periode;
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
function renderPengurus() {
  if (filteredData.length === 0) {
    grid.innerHTML = `<div class="empty-state-sd">📭 Belum ada data pengurus${activeFilter ? ' untuk jabatan ini' : ''}.</div>`;
    return;
  }

  grid.innerHTML = filteredData.map((p, i) => {
    const [c1, c2] = paletteFor(p.nama);

    // Ambil index global (1-based) — konsisten walau difilter
    const globalIndex = pengurusData.findIndex(x => x.id === p.id) + 1;
    const fotoSrc = fotoKe(globalIndex);

    return `
      <div class="pengurus-card" style="--c1:${c1};--c2:${c2};animation-delay:${i * 70}ms">
        <div class="pengurus-foto">
          <img
            src="${fotoSrc}"
            alt="Foto ${escapeAttr(p.nama)}"
            loading="lazy"
            onerror="this.style.display='none';this.parentElement.querySelector('.pengurus-avatar').style.display='flex';">
          <div class="pengurus-avatar" style="display:none;">
            ${initials(p.nama)}
          </div>
        </div>
        <div class="pengurus-info">
          <div class="pengurus-nama">${escapeHtml(p.nama)}</div>
          <div class="pengurus-jabatan-badge">${escapeHtml(p.jabatan || 'Anggota')}</div>
          ${p.periode ? `<div class="pengurus-meta">📅 Periode ${escapeHtml(p.periode)}</div>` : ''}
          ${p.kontak  ? `<div class="pengurus-meta">📞 ${escapeHtml(p.kontak)}</div>` : ''}
        </div>
        <div class="pengurus-actions admin-only ${isAdmin ? '' : 'hidden'}">
          <button class="btn btn-edit" onclick="editPengurus('${escapeAttr(p.id)}')">✏️ Edit</button>
          <button class="btn btn-hapus" onclick="hapusPengurus('${escapeAttr(p.id)}')">🗑️ Hapus</button>
        </div>
      </div>`;
  }).join('');
}

function updateAdminUI() {
  if (addBtn) addBtn.classList.toggle('hidden', !isAdmin);
  document.querySelectorAll('.pengurus-actions').forEach(el => {
    el.classList.toggle('hidden', !isAdmin);
  });
}

// ============================================
// MODAL & SUBMIT
// ============================================
function openPengurusModal(mode, data = null) {
  const title = document.getElementById('pengurusModalTitle');
  document.getElementById('formPengurus').reset();
  document.getElementById('pengurusId').value = '';

  if (mode === 'edit' && data) {
    title.textContent = 'Edit Pengurus';
    document.getElementById('pengurusId').value      = data.id;
    document.getElementById('pengurusNama').value    = data.nama;
    document.getElementById('pengurusJabatan').value = data.jabatan;
    document.getElementById('pengurusPeriode').value = data.periode || '';
    document.getElementById('pengurusKontak').value  = data.kontak  || '';
  } else {
    title.textContent = 'Tambah Pengurus';
  }
  modal.classList.remove('hidden');
}

async function handlePengurusSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('pengurusId').value;
  const payload = {
    action:  id ? 'updatePengurus' : 'addPengurus',
    token:   token,
    id:      id || undefined,
    nama:    document.getElementById('pengurusNama').value,
    jabatan: document.getElementById('pengurusJabatan').value,
    periode: document.getElementById('pengurusPeriode').value,
    kontak:  document.getElementById('pengurusKontak').value
  };

  try {
    const res = await fetch(API_URL, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.status === 'success') { closeModal(modal); loadPengurus(); }
    else alert('Gagal: ' + result.message);
  } catch (err) { alert('Error: ' + err.message); }
}

function editPengurus(id) {
  const data = pengurusData.find(p => p.id === id);
  if (data) openPengurusModal('edit', data);
}

async function hapusPengurus(id) {
  if (!confirm('Yakin ingin menghapus pengurus ini?')) return;
  try {
    const res = await fetch(API_URL, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'deletePengurus', token, id })
    });
    const result = await res.json();
    if (result.status === 'success') loadPengurus();
    else alert('Gagal: ' + result.message);
  } catch (err) { alert('Error: ' + err.message); }
}

window.editPengurus  = editPengurus;
window.hapusPengurus = hapusPengurus;