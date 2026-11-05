// ============================================
// STATE
// ============================================
let allAnggota = [];
let currentStatusFilter = '';
let searchQuery = '';

const tbody         = document.getElementById('tbodyAnggota');
const tfoot         = document.getElementById('tfootAnggota');
const addBtn        = document.getElementById('addBtn');
const filterStatus  = document.getElementById('filterStatus');
const searchInput   = document.getElementById('searchAnggota');
const drawer        = document.getElementById('drawer');
const drawerOverlay = document.getElementById('drawerOverlay');
const tableSubtitle = document.getElementById('tableSubtitle');

// ============================================
// PALET WARNA STATUS (fallback)
// ============================================
const STATUS_PALETTE = [
  ['#34d399', '#059669'], // 0 hijau
  ['#f87171', '#dc2626'], // 1 merah
  ['#94a3b8', '#64748b'], // 2 abu
  ['#fbbf24', '#f59e0b'], // 3 kuning
  ['#60a5fa', '#2563eb'], // 4 biru
  ['#c084fc', '#9333ea'], // 5 ungu
  ['#2dd4bf', '#0d9488'], // 6 teal
  ['#fb923c', '#ea580c'], // 7 oranye
];

function colorForStatus(name) {
  const s = String(name || '').toLowerCase().trim();
  if (!s) return STATUS_PALETTE[2];
  if (s.includes('tidak') || s.includes('non') || s.includes('berhenti')) return STATUS_PALETTE[1];
  if (s.includes('pensiun')) return STATUS_PALETTE[2];
  if (s.includes('mutasi') || s.includes('pindah')) return STATUS_PALETTE[3];
  if (s.includes('cuti')) return STATUS_PALETTE[4];
  if (s.includes('baru')) return STATUS_PALETTE[5];
  if (s.includes('aktif')) return STATUS_PALETTE[0];

  // fallback hash
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return STATUS_PALETTE[Math.abs(h) % STATUS_PALETTE.length];
}

function statusToClass(name) {
  const slug = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return 'status-' + (slug || 'default');
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadAnggota();
  setupAnggotaEvents();
});

function setupAnggotaEvents() {
  if (addBtn) addBtn.addEventListener('click', () => openDrawer('add'));

  const drawerClose  = document.getElementById('drawerClose');
  const drawerCancel = document.getElementById('drawerCancel');
  const formAnggota  = document.getElementById('formAnggota');
  const refreshBtn   = document.getElementById('refreshBtn');

  if (drawerClose)  drawerClose.addEventListener('click', closeDrawer);
  if (drawerCancel) drawerCancel.addEventListener('click', closeDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);
  if (formAnggota)  formAnggota.addEventListener('submit', handleSubmit);
  if (refreshBtn)   refreshBtn.addEventListener('click', loadAnggota);

  if (filterStatus) {
    filterStatus.addEventListener('change', e => {
      currentStatusFilter = e.target.value;
      renderAll();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', e => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderAll();
    });
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDrawer();
  });
}

// ============================================
// LOAD
// ============================================
async function loadAnggota() {
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state-sd"><div class="spinner"></div><div>Memuat...</div></td></tr>`;
  }

  try {
    const res = await fetch(`${API_URL}?action=getAnggota`, { redirect: 'follow' });
    const result = await res.json();
    if (result.status !== 'success') throw new Error(result.message || 'Gagal memuat');

    allAnggota = (result.data || []).map(a => ({
      id:         String(a.id || ''),
      nama:       String(a.nama || ''),
      npa:        String(a.npa || ''),
      unit_kerja: String(a.unit_kerja || a.unitKerja || a['Unit Kerja'] || ''),
      status:     String(a.status || 'Aktif').trim() || 'Aktif',
      keterangan: String(a.keterangan || '')
    }));

    buildStatusFilter();
    renderAll();
    updateHeroStats();
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state-sd" style="color:#b91c1c">⚠️ ${escapeHtml(err.message)}</td></tr>`;
    }
    if (tfoot) tfoot.classList.add('hidden');
  }
}

function buildStatusFilter() {
  if (!filterStatus) return;
  const statuses = new Set();
  allAnggota.forEach(a => { if (a.status) statuses.add(a.status.trim()); });

  const currentVal = filterStatus.value || currentStatusFilter;
  filterStatus.innerHTML = '<option value="">Semua Status</option>';
  Array.from(statuses).sort().forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    filterStatus.appendChild(opt);
  });
  filterStatus.value = currentVal;
  currentStatusFilter = currentVal;
}

function getFilteredData() {
  let data = [...allAnggota];
  if (currentStatusFilter) {
    data = data.filter(a => (a.status || '').trim() === currentStatusFilter);
  }
  if (searchQuery) {
    data = data.filter(a =>
      (a.nama || '').toLowerCase().includes(searchQuery) ||
      (a.npa || '').toLowerCase().includes(searchQuery) ||
      (a.unit_kerja || '').toLowerCase().includes(searchQuery)
    );
  }
  data.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
  return data;
}

// ============================================
// RENDER
// ============================================
function renderAll() {
  const data = getFilteredData();
  renderTable(data);
  updateSubtitle();

  if (addBtn) addBtn.classList.toggle('hidden', !isAdmin);
  document.querySelectorAll('.admin-only').forEach(el => {
    el.classList.toggle('hidden', !isAdmin);
  });
}

function updateSubtitle() {
  if (!tableSubtitle) return;
  const total = getFilteredData().length;
  tableSubtitle.textContent = isAdmin
    ? `Mode admin · ${total} anggota ditampilkan`
    : `Menampilkan ${total} anggota`;
}

function renderTable(data) {
  if (!tbody) return;

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state-sd">📭 Belum ada data anggota.</td></tr>`;
    if (tfoot) tfoot.classList.add('hidden');
    return;
  }

  tbody.innerHTML = data.map((a, i) => {
    const statusRaw   = (a.status || 'Aktif').trim() || 'Aktif';
    const statusClass = statusToClass(statusRaw);
    const [c1, c2]    = colorForStatus(statusRaw);
    const badgeStyle  = `background:linear-gradient(135deg,${c1},${c2});color:#fff;`;

    const aksi = isAdmin
      ? `<td class="admin-only text-center">
           <div class="aksi-group">
             <button class="btn btn-edit" onclick="editAnggota('${escapeAttr(a.id)}')">✏️ Edit</button>
             <button class="btn btn-hapus" onclick="hapusAnggota('${escapeAttr(a.id)}')">🗑️ Hapus</button>
           </div>
         </td>`
      : `<td class="admin-only hidden"></td>`;

    return `
      <tr>
        <td class="col-no">${i + 1}</td>
        <td><strong>${escapeHtml(a.nama || '—')}</strong></td>
        <td>${a.npa ? `<code style="font-size:0.82rem;">${escapeHtml(a.npa)}</code>` : '—'}</td>
        <td>${escapeHtml(a.unit_kerja || '—')}</td>
        <td>
          <span class="status-badge ${statusClass}" style="${badgeStyle}">
            ${escapeHtml(statusRaw)}
          </span>
        </td>
        <td style="color:var(--sd-muted);font-size:0.82rem;">${escapeHtml(a.keterangan || '—')}</td>
        ${aksi}
      </tr>`;
  }).join('');

  if (tfoot) {
    tfoot.classList.remove('hidden');
    document.getElementById('totalAnggotaFooter').textContent = `${data.length} anggota ditampilkan`;
  }
}

function updateHeroStats() {
  const total = allAnggota.length;
  const aktif = allAnggota.filter(a => (a.status || '').trim().toLowerCase() === 'aktif').length;
  const units = new Set(
    allAnggota.map(a => (a.unit_kerja || '').trim()).filter(Boolean)
  ).size;

  animateNumber(document.getElementById('heroTotalAnggota'), total);
  animateNumber(document.getElementById('heroAktif'), aktif);
  animateNumber(document.getElementById('heroUnit'), units);
}

function animateNumber(el, target) {
  if (!el) return;
  const dur = 700;
  const t0 = performance.now();
  function step(now) {
    const p = Math.min((now - t0) / dur, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ============================================
// DRAWER
// ============================================
function openDrawer(mode, data = null) {
  if (!isAdmin || !drawer) return;

  const title = document.getElementById('drawerTitle');
  const inputId = document.getElementById('inputId');
  document.getElementById('formAnggota').reset();
  inputId.value = '';

  if (mode === 'edit' && data) {
    title.textContent = 'Edit Anggota';
    inputId.value = data.id;
    document.getElementById('inputNama').value       = data.nama || '';
    document.getElementById('inputNpa').value        = data.npa || '';
    document.getElementById('inputUnit').value       = data.unit_kerja || '';
    document.getElementById('inputStatus').value     = data.status || 'Aktif';
    document.getElementById('inputKeterangan').value = data.keterangan || '';
    document.getElementById('submitBtn').textContent = 'Update';
  } else {
    title.textContent = 'Tambah Anggota';
    document.getElementById('submitBtn').textContent = 'Simpan';
  }

  drawer.classList.add('open');
  drawerOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  if (!drawer) return;
  drawer.classList.remove('open');
  drawerOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

// ============================================
// SUBMIT
// ============================================
async function handleSubmit(e) {
  e.preventDefault();
  if (!isAdmin) return;

  const id = document.getElementById('inputId').value;
  const payload = {
    action: id ? 'updateAnggota' : 'addAnggota',
    token: token,
    id: id || undefined,
    nama: document.getElementById('inputNama').value,
    npa: document.getElementById('inputNpa').value,
    unit_kerja: document.getElementById('inputUnit').value,
    status: document.getElementById('inputStatus').value,
    keterangan: document.getElementById('inputKeterangan').value
  };

  const btn = document.getElementById('submitBtn');
  const orig = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  try {
    const res = await fetch(API_URL, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.status === 'success') {
      closeDrawer();
      await loadAnggota();
    } else {
      alert('Gagal: ' + result.message);
    }
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = orig;
  }
}

function editAnggota(id) {
  if (!isAdmin) return;
  const data = allAnggota.find(a => a.id === id);
  if (data) openDrawer('edit', data);
}

async function hapusAnggota(id) {
  if (!isAdmin) return;
  if (!confirm('Yakin ingin menghapus anggota ini?')) return;
  try {
    const res = await fetch(API_URL, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'deleteAnggota', token, id })
    });
    const result = await res.json();
    if (result.status === 'success') await loadAnggota();
    else alert('Gagal: ' + result.message);
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

window.editAnggota  = editAnggota;
window.hapusAnggota = hapusAnggota;