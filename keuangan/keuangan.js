// ============================================
// STATE
// ============================================
let allData = [];
let currentFilter = '';

const tbody          = document.getElementById('tbodyKas');
const tfoot          = document.getElementById('tfootKas');
const statSaldo      = document.getElementById('statSaldo');
const statDebet      = document.getElementById('statDebet');
const statKredit     = document.getElementById('statKredit');
const tableSubtitle  = document.getElementById('tableSubtitle');
const addBtn         = document.getElementById('addBtn');
const filterBulan    = document.getElementById('filterBulan');
const filterInfo     = document.getElementById('filterInfo');
const drawer         = document.getElementById('drawer');
const drawerOverlay  = document.getElementById('drawerOverlay');
const bukuKasSection = document.getElementById('bukuKasSection');

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupKeuanganEvents();
  toggleAdminUI();
});

function setupKeuanganEvents() {
  // Tombol tambah (admin)
  if (addBtn) addBtn.addEventListener('click', () => openDrawer('add'));

  const drawerClose   = document.getElementById('drawerClose');
  const drawerCancel  = document.getElementById('drawerCancel');
  const formTransaksi = document.getElementById('formTransaksi');
  const refreshBtn    = document.getElementById('refreshBtn');

  if (drawerClose)   drawerClose.addEventListener('click', closeDrawer);
  if (drawerCancel)  drawerCancel.addEventListener('click', closeDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);
  if (formTransaksi) formTransaksi.addEventListener('submit', handleSubmit);
  if (refreshBtn)    refreshBtn.addEventListener('click', loadData);

  // FILTER BULAN — berlaku untuk SEMUA user (publik & admin)
  if (filterBulan) {
    filterBulan.addEventListener('change', e => {
      currentFilter = e.target.value;
      const filtered = getFilteredData();
      renderStats(filtered);
      updateFilterInfo();
      if (isAdmin) renderAll();
    });
  }

  // Preview jumlah
  const inputJumlah = document.getElementById('inputJumlah');
  if (inputJumlah) {
    inputJumlah.addEventListener('input', e => {
      const val = Number(e.target.value) || 0;
      const preview = document.getElementById('jumlahPreview');
      if (preview) preview.textContent = formatRupiah(val);
    });
  }

  // Label jenis transaksi
  document.querySelectorAll('input[name="jenis"]').forEach(r => {
    r.addEventListener('change', updateJumlahLabel);
  });

  // ESC untuk tutup drawer
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDrawer();
  });
}

function updateJumlahLabel() {
  const checked = document.querySelector('input[name="jenis"]:checked');
  if (!checked) return;
  const jenis = checked.value;
  const label = document.getElementById('labelJumlah');
  if (label) {
    label.textContent = jenis === 'debet' ? 'Jumlah Debet (Rp)' : 'Jumlah Kredit (Rp)';
  }
}

// ============================================
// LOAD
// ============================================
async function loadData() {
  if (isAdmin && tbody) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state-sd"><div class="spinner"></div><div>Memuat...</div></td></tr>`;
  }

  try {
    const res = await fetch(`${API_URL}?action=getTransaksi`, { redirect: 'follow' });
    const result = await res.json();
    if (result.status !== 'success') throw new Error(result.message || 'Gagal memuat');

    allData = result.data || [];
    buildMonthFilter();
    updateFilterInfo();
    renderStats(getFilteredData());
    if (isAdmin) renderAll();
  } catch (err) {
    if (isAdmin && tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state-sd" style="color:#b91c1c">⚠️ ${escapeHtml(err.message)}</td></tr>`;
    }
    if (statSaldo)  statSaldo.textContent  = 'Error';
    if (statDebet)  statDebet.textContent  = 'Error';
    if (statKredit) statKredit.textContent = 'Error';
    if (filterInfo) filterInfo.textContent = '⚠️ Gagal memuat data';
  }
}

function buildMonthFilter() {
  if (!filterBulan) return;

  const months = new Set();
  allData.forEach(d => {
    if (d.tanggal && d.tanggal.length >= 7) months.add(d.tanggal.substring(0, 7));
  });

  const sorted = Array.from(months).sort().reverse();
  const currentVal = filterBulan.value || currentFilter;

  filterBulan.innerHTML = '<option value="">Semua Bulan</option>';
  sorted.forEach(m => {
    const [y, mo] = m.split('-');
    const label = new Date(Number(y), Number(mo) - 1).toLocaleDateString('id-ID', {
      month: 'long', year: 'numeric'
    });
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = label;
    filterBulan.appendChild(opt);
  });

  filterBulan.value = currentVal;
  currentFilter = currentVal;
}

function getFilteredData() {
  let data = [...allData];
  if (currentFilter) {
    data = data.filter(d => d.tanggal && d.tanggal.startsWith(currentFilter));
  }
  data.sort((a, b) => {
    if (a.tanggal !== b.tanggal) return (a.tanggal || '').localeCompare(b.tanggal || '');
    return String(a.id).localeCompare(String(b.id));
  });
  return data;
}

// ============================================
// INFO FILTER (tampil untuk semua user)
// ============================================
function updateFilterInfo() {
  if (!filterInfo) return;
  const filtered = getFilteredData();

  if (currentFilter) {
    const [y, mo] = currentFilter.split('-');
    const label = new Date(Number(y), Number(mo) - 1).toLocaleDateString('id-ID', {
      month: 'long', year: 'numeric'
    });
    filterInfo.textContent = `📅 Menampilkan ${filtered.length} transaksi bulan ${label}`;
  } else {
    filterInfo.textContent = `📅 Menampilkan semua ${filtered.length} transaksi`;
  }
}

// ============================================
// RENDER (ADMIN ONLY — tabel buku kas)
// ============================================
function renderAll() {
  const data = getFilteredData();
  renderTable(data);
  updateSubtitle();
  toggleAdminUI();
}

function updateSubtitle() {
  if (!tableSubtitle) return;
  if (currentFilter) {
    const [y, mo] = currentFilter.split('-');
    const label = new Date(Number(y), Number(mo) - 1).toLocaleDateString('id-ID', {
      month: 'long', year: 'numeric'
    });
    tableSubtitle.textContent = `Menampilkan bulan ${label}`;
  } else {
    tableSubtitle.textContent = 'Mode admin · bisa menambah, mengedit, menghapus';
  }
}

function renderTable(data) {
  if (!tbody) return;

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state-sd">📭 Belum ada transaksi${currentFilter ? ' di bulan ini' : ''}.</td></tr>`;
    if (tfoot) tfoot.classList.add('hidden');
    return;
  }

  let saldo = 0, totalDebet = 0, totalKredit = 0;

  tbody.innerHTML = data.map((t, i) => {
    const debet  = Number(t.debet)  || 0;
    const kredit = Number(t.kredit) || 0;
    saldo += debet - kredit;
    totalDebet  += debet;
    totalKredit += kredit;

    return `
      <tr>
        <td class="col-no">${i + 1}</td>
        <td class="col-tgl">${formatTanggal(t.tanggal)}</td>
        <td>${escapeHtml(t.uraian)}</td>
        <td class="text-right ${debet > 0 ? 'amount-income' : 'amount-null'}">${debet > 0 ? formatRupiah(debet) : '—'}</td>
        <td class="text-right ${kredit > 0 ? 'amount-expense' : 'amount-null'}">${kredit > 0 ? formatRupiah(kredit) : '—'}</td>
        <td class="text-right saldo ${saldo < 0 ? 'negative' : ''}">${formatRupiah(saldo)}</td>
        <td class="text-center">
          <div class="aksi-group">
            <button class="btn btn-edit" onclick="editTransaksi('${escapeAttr(t.id)}')">✏️ Edit</button>
            <button class="btn btn-hapus" onclick="hapusTransaksi('${escapeAttr(t.id)}')">🗑️ Hapus</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  if (tfoot) {
    tfoot.classList.remove('hidden');
    document.getElementById('totalDebetFooter').textContent  = formatRupiah(totalDebet);
    document.getElementById('totalKreditFooter').textContent = formatRupiah(totalKredit);
    document.getElementById('saldoAkhirFooter').textContent  = formatRupiah(saldo);
  }
}

// ============================================
// RENDER STATS (PUBLIK — 3 KARTU, IKUT FILTER)
// ============================================
function renderStats(data) {
  let debet = 0, kredit = 0;
  data.forEach(t => {
    debet  += Number(t.debet)  || 0;
    kredit += Number(t.kredit) || 0;
  });
  const saldo = debet - kredit;

  if (statDebet)  statDebet.textContent  = formatRupiah(debet);
  if (statKredit) statKredit.textContent = formatRupiah(kredit);
  if (statSaldo)  {
    statSaldo.textContent = formatRupiah(saldo);
    statSaldo.style.color = saldo < 0 ? '#dc2626' : '';
  }
}

// ============================================
// TOGGLE ADMIN UI
// ============================================
function toggleAdminUI() {
  if (bukuKasSection) bukuKasSection.classList.toggle('hidden', !isAdmin);
  if (addBtn) addBtn.classList.toggle('hidden', !isAdmin);
  document.querySelectorAll('.admin-only').forEach(el => {
    el.classList.toggle('hidden', !isAdmin);
  });
}

// ============================================
// DRAWER
// ============================================
function openDrawer(mode, data = null) {
  if (!drawer || !isAdmin) return;

  const title   = document.getElementById('drawerTitle');
  const inputId = document.getElementById('inputId');

  document.getElementById('formTransaksi').reset();
  document.getElementById('inputTanggal').value = new Date().toISOString().split('T')[0];
  document.getElementById('jumlahPreview').textContent = 'Rp 0';

  if (mode === 'edit' && data) {
    title.textContent = 'Edit Transaksi';
    inputId.value = data.id;
    document.getElementById('inputTanggal').value = data.tanggal;
    document.getElementById('inputUraian').value  = data.uraian;

    if (Number(data.debet) > 0) {
      document.querySelector('input[name="jenis"][value="debet"]').checked = true;
      document.getElementById('inputJumlah').value = data.debet;
    } else {
      document.querySelector('input[name="jenis"][value="kredit"]').checked = true;
      document.getElementById('inputJumlah').value = data.kredit;
    }
    document.getElementById('jumlahPreview').textContent = formatRupiah(data.debet || data.kredit);
    document.getElementById('submitBtn').textContent = 'Update';
  } else {
    title.textContent = 'Tambah Transaksi';
    inputId.value = '';
    document.getElementById('submitBtn').textContent = 'Simpan';
  }

  updateJumlahLabel();
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
  const jenis = document.querySelector('input[name="jenis"]:checked').value;
  const jumlah = Number(document.getElementById('inputJumlah').value);

  const payload = {
    action: id ? 'updateTransaksi' : 'addTransaksi',
    token:  token,
    id:     id || undefined,
    tanggal: document.getElementById('inputTanggal').value,
    uraian:  document.getElementById('inputUraian').value,
    debet:   jenis === 'debet'  ? jumlah : 0,
    kredit:  jenis === 'kredit' ? jumlah : 0
  };

  const btn  = document.getElementById('submitBtn');
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
      await loadData();
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

function editTransaksi(id) {
  if (!isAdmin) return;
  const data = allData.find(t => t.id === id);
  if (data) openDrawer('edit', data);
}

async function hapusTransaksi(id) {
  if (!isAdmin) return;
  if (!confirm('Yakin ingin menghapus transaksi ini?')) return;
  try {
    const res = await fetch(API_URL, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'deleteTransaksi', token, id })
    });
    const result = await res.json();
    if (result.status === 'success') await loadData();
    else alert('Gagal: ' + result.message);
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

window.editTransaksi  = editTransaksi;
window.hapusTransaksi = hapusTransaksi;
