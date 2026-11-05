// ============================================
// KONFIGURASI
// ============================================
const API_URL = 'https://script.google.com/macros/s/AKfycbxFTciCYUPTEkrqYo4feRnlfxTo38Xo_NoHPRwi7_5eBY0oRNFUqmLrmbXC5lHjqDlKCw/exec';

let token = localStorage.getItem('adminToken') || null;
let isAdmin = !!token;

// ============================================
// INIT GLOBAL
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  setupGlobalEvents();
  updateGlobalAuthUI();
  loadDashboardKas();
  loadDashboardAnggota();
});

function setupGlobalEvents() {
  const loginBtn  = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      const modal = document.getElementById('loginModal');
      if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => {
          const input = document.getElementById('inputPassword');
          if (input) input.focus();
        }, 100);
      }
    });
  }

  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  document.querySelectorAll('[data-close-modal="login"]').forEach(el => {
    el.addEventListener('click', () => closeModal());
  });

  const formLogin = document.getElementById('formLogin');
  if (formLogin) formLogin.addEventListener('submit', handleLogin);
}

// ============================================
// AUTH
// ============================================
async function handleLogin(e) {
  e.preventDefault();
  const password = document.getElementById('inputPassword').value;
  const errorEl  = document.getElementById('loginError');
  const submitBtn = e.target.querySelector('button[type="submit"]');

  submitBtn.disabled = true;
  submitBtn.textContent = 'Memverifikasi...';

  try {
    const res = await fetch(
      `${API_URL}?action=login&password=${encodeURIComponent(password)}`,
      { redirect: 'follow' }
    );
    const data = await res.json();

    if (data.status === 'success') {
      token = data.token;
      isAdmin = true;
      localStorage.setItem('adminToken', token);
      closeModal();
      location.reload();
    } else {
      errorEl.textContent = data.message || 'Password salah';
      errorEl.classList.remove('hidden');
    }
  } catch (err) {
    errorEl.textContent = 'Gagal terhubung ke server';
    errorEl.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Masuk';
  }
}

function handleLogout() {
  if (!confirm('Yakin ingin logout dari mode admin?')) return;
  token = null;
  isAdmin = false;
  localStorage.removeItem('adminToken');
  location.reload();
}

function updateGlobalAuthUI() {
  const loginBtn  = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const adminBadge = document.getElementById('adminBadge');

  if (isAdmin) {
    if (loginBtn)  loginBtn.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    if (adminBadge) adminBadge.classList.remove('hidden');
  } else {
    if (loginBtn)  loginBtn.classList.remove('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
    if (adminBadge) adminBadge.classList.add('hidden');
  }
}

function closeModal() {
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  const pw  = document.getElementById('inputPassword');
  if (pw) pw.value = '';
  const err = document.getElementById('loginError');
  if (err) err.classList.add('hidden');
}

// ============================================
// DASHBOARD — KAS (3 kartu saja)
// ============================================
async function loadDashboardKas() {
  const elSaldo  = document.getElementById('dashSaldo');
  const elDebet  = document.getElementById('dashDebet');
  const elKredit = document.getElementById('dashKredit');
  if (!elSaldo && !elDebet && !elKredit) return;

  try {
    const res = await fetch(`${API_URL}?action=getTransaksi`, { redirect: 'follow' });
    const result = await res.json();
    if (result.status !== 'success') throw new Error(result.message);

    const data = result.data || [];
    let debet = 0, kredit = 0;
    data.forEach(t => {
      debet  += Number(t.debet)  || 0;
      kredit += Number(t.kredit) || 0;
    });
    const saldo = debet - kredit;

    if (elSaldo)  elSaldo.textContent  = formatRupiah(saldo);
    if (elDebet)  elDebet.textContent  = formatRupiah(debet);
    if (elKredit) elKredit.textContent = formatRupiah(kredit);
  } catch (err) {
    if (elSaldo)  elSaldo.textContent  = 'Error';
    if (elDebet)  elDebet.textContent  = 'Error';
    if (elKredit) elKredit.textContent = 'Error';
  }
}

// ============================================
// DASHBOARD — ANGGOTA
// ============================================
async function loadDashboardAnggota() {
  const elTotal = document.getElementById('dashTotalAnggota');
  const elAktif = document.getElementById('dashAnggotaAktif');
  if (!elTotal && !elAktif) return;

  try {
    const res = await fetch(`${API_URL}?action=getAnggota`, { redirect: 'follow' });
    const result = await res.json();
    if (result.status !== 'success') throw new Error(result.message);
    const data = result.data || [];
    if (elTotal) elTotal.textContent = data.length;
    if (elAktif) elAktif.textContent = data.filter(a =>
      (a.status || '').trim().toLowerCase() === 'aktif'
    ).length;
  } catch (err) {
    if (elTotal) elTotal.textContent = '—';
    if (elAktif) elAktif.textContent = '—';
  }
}

// ============================================
// UTILS
// ============================================
function formatRupiah(num) {
  const n = Number(num) || 0;
  const sign = n < 0 ? '-' : '';
  return sign + 'Rp ' + Math.abs(n).toLocaleString('id-ID');
}

function formatTanggal(str) {
  if (!str) return '-';
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function escapeAttr(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}