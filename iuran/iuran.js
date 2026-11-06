// ============================================
// iuran/iuran.js — VERSI RINGKAS (Hanya Kotak Bulan)
// ============================================

let allIuranTrx = [];      
let lembagaList = [];

let currentLembagaIndex = 0;
let slideTimer = null;
let progressRaf = null;
let progressStart = 0;
const SLIDE_INTERVAL = 5000;

const ALL_MONTHS = [
  { num: 1,  name: 'Januari' },  { num: 2,  name: 'Februari' },
  { num: 3,  name: 'Maret' },    { num: 4,  name: 'April' },
  { num: 5,  name: 'Mei' },      { num: 6,  name: 'Juni' },
  { num: 7,  name: 'Juli' },     { num: 8,  name: 'Agustus' },
  { num: 9,  name: 'September' },{ num: 10, name: 'Oktober' },
  { num: 11, name: 'November' }, { num: 12, name: 'Desember' },
];

const slideEl       = document.getElementById('lembagaSlide');
const dotsEl        = document.getElementById('sliderDots');
const progressEl    = document.getElementById('sliderProgress');
const prevBtn       = document.getElementById('prevSlide');
const nextBtn       = document.getElementById('nextSlide');

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', () => {
  setupEvents();
  loadData();
});

function setupEvents() {
  if (prevBtn) prevBtn.addEventListener('click', () => goToSlide(currentLembagaIndex - 1, true));
  if (nextBtn) nextBtn.addEventListener('click', () => goToSlide(currentLembagaIndex + 1, true));

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAutoSlide();
    else if (lembagaList.length > 1) startAutoSlide();
  });
}

// ---------- LOAD DATA (Hanya Transaksi) ----------
async function loadData() {
  if (slideEl) slideEl.innerHTML = `<div class="spinner"></div><div>Memuat data iuran...</div>`;

  try {
    const resTrx = await fetch(`${API_URL}?action=getTransaksi`).then(r => r.json());
    if (resTrx.status !== 'success') throw new Error('Gagal memuat transaksi');

    // Filter hanya transaksi yang mengandung "Iuran PGRI"
    allIuranTrx = (resTrx.data || [])
      .filter(t => /iuran\s*pgri/i.test(String(t.uraian || '')))
      .map(parseIuranRow)
      .filter(t => t.lembaga)
      .sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || ''));

    buildLembagaList();
    renderSlide(true);

    if (lembagaList.length > 1) startAutoSlide();
  } catch (err) {
    if (slideEl) slideEl.innerHTML = `<div class="empty-state-sd" style="color:#b91c1c">⚠️ ${escapeHtml(err.message)}</div>`;
  }
}

// ---------- PARSING & GROUPING ----------
function parseIuranRow(t) {
  const uraian = String(t.uraian || '').trim();
  const m = uraian.match(/iuran\s*pgri\s+(.+)/i);
  const lembaga = m ? m[1].replace(/[.,;:]+$/g, '').replace(/\s+/g, ' ').trim().toUpperCase() : '';

  const tanggal = String(t.tanggal || '').trim();
  let bulanNum = null, tahun = null;
  if (/^\d{4}-\d{2}-\d{2}/.test(tanggal)) {
    tahun    = Number(tanggal.substring(0, 4));
    bulanNum = Number(tanggal.substring(5, 7));
  }

  return {
    id: String(t.id || ''),
    lembaga, tanggal, tahun, bulanNum,
    nominal: (Number(t.debet) > 0 ? Number(t.debet) : Number(t.kredit)) || 0
  };
}

function buildLembagaList() {
  const map = new Map();
  allIuranTrx.forEach(row => {
    if (!map.has(row.lembaga)) {
      map.set(row.lembaga, { lembaga: row.lembaga, rows: [], totalNominal: 0 });
    }
    const entry = map.get(row.lembaga);
    entry.rows.push(row);
    entry.totalNominal += row.nominal;
  });
  lembagaList = Array.from(map.values()).sort((a, b) => a.lembaga.localeCompare(b.lembaga));
}

// ---------- RENDER SLIDE ----------
function renderSlide(reset = false) {
  if (!slideEl || lembagaList.length === 0) return;

  if (reset) currentLembagaIndex = 0;
  if (currentLembagaIndex < 0) currentLembagaIndex = lembagaList.length - 1;
  if (currentLembagaIndex >= lembagaList.length) currentLembagaIndex = 0;

  const entry = lembagaList[currentLembagaIndex];

  // Logika Bulan (Awal Transaksi s.d Bulan Ini)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  let minBulan = Infinity, minTahun = Infinity;
  allIuranTrx.forEach(r => {
    if (!r.bulanNum || !r.tahun) return;
    if (r.tahun < minTahun || (r.tahun === minTahun && r.bulanNum < minBulan)) {
      minTahun = r.tahun; minBulan = r.bulanNum;
    }
  });
  if (!isFinite(minBulan)) { minBulan = currentMonth; minTahun = currentYear; }

  const monthsToShow = [];
  let y = minTahun, m = minBulan;
  while (y < currentYear || (y === currentYear && m <= currentMonth)) {
    monthsToShow.push({ num: m, name: ALL_MONTHS[m - 1].name, year: y });
    m++; if (m > 12) { m = 1; y++; }
  }

  const monthsHtml = monthsToShow.map(mm => {
    const paidRow = entry.rows.find(r => r.bulanNum === mm.num && r.tahun === mm.year && r.nominal > 0);
    const paid = !!paidRow;
    const cls = paid ? 'bayar' : 'belum';
    return `
      <div class="month-chip ${cls}" style="padding: 1.25rem 0.5rem;">
        <span class="month-name" style="font-size: 1.1rem; margin-bottom: 0.5rem;">${mm.name}</span>
        <span class="month-status" style="font-size: 0.9rem;">${paid ? '✓ LUNAS' : '✕ BELUM'}</span>
        ${(paid && paidRow.tanggal) ? `<span class="month-date" style="margin-top: 0.5rem; font-size: 0.75rem;">${formatTanggal(paidRow.tanggal)}</span>` : ''}
      </div>`;
  }).join('');

  // TAMPILAN SANGAT SEDERHANA (Tanpa rincian, tanpa target)
  slideEl.innerHTML = `
    <div class="lembaga-header">
      <div class="lembaga-name"><span class="lembaga-icon">🏫</span> ${escapeHtml(entry.lembaga)}</div>
      <div class="lembaga-progress-text">${entry.rows.length} bulan bayar · Terkumpul: ${formatRupiah(entry.totalNominal)}</div>
    </div>
    
    <div class="lembaga-months" style="margin-top: 1rem;">${monthsHtml}</div>
  `;

  slideEl.classList.remove('fade-in');
  void slideEl.offsetWidth;
  slideEl.classList.add('fade-in');
  renderDots();
}

function renderDots() {
  if (!dotsEl) return;
  dotsEl.innerHTML = lembagaList.map((l, i) => `
    <button class="slider-dot ${i === currentLembagaIndex ? 'active' : ''}" data-index="${i}"></button>
  `).join('');
  dotsEl.querySelectorAll('.slider-dot').forEach(dot => {
    dot.addEventListener('click', () => goToSlide(Number(dot.dataset.index), true));
  });
}

// ---------- AUTO SLIDE ----------
function goToSlide(index, manual = false) {
  if (lembagaList.length === 0) return;
  if (manual) stopAutoSlide();
  slideEl.classList.add('fade-out');
  setTimeout(() => {
    slideEl.classList.remove('fade-out');
    currentLembagaIndex = index;
    renderSlide(false);
    if (manual || lembagaList.length > 1) startAutoSlide();
  }, 180);
}

function startAutoSlide() {
  stopAutoSlide();
  if (lembagaList.length <= 1) return;
  progressStart = performance.now();
  animateProgress();
  slideTimer = setTimeout(() => goToSlide(currentLembagaIndex + 1, false), SLIDE_INTERVAL);
}

function stopAutoSlide() {
  if (slideTimer) { clearTimeout(slideTimer); slideTimer = null; }
  if (progressRaf) { cancelAnimationFrame(progressRaf); progressRaf = null; }
  if (progressEl) progressEl.style.width = '0%';
}

function animateProgress() {
  if (!progressEl) return;
  const tick = (now) => {
    const pct = Math.min((now - progressStart) / SLIDE_INTERVAL, 1) * 100;
    progressEl.style.width = pct + '%';
    if (pct < 100) progressRaf = requestAnimationFrame(tick);
  };
  progressRaf = requestAnimationFrame(tick);
}