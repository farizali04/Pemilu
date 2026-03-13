// ════════════════════════════════════════
//  auth.js — Otentikasi & JWT Helper Frontend
// ════════════════════════════════════════

// ── 1. Cek Login Otomatis di setiap halaman (kecuali login) ──
const isLoginPage = window.location.pathname === '/login';
const token = localStorage.getItem('token');
const userRole = localStorage.getItem('userRole');

if (!token && !isLoginPage) {
  // Belum login, tendang ke halaman login
  window.location.href = '/login';
} else if (token && isLoginPage) {
  // Sudah login tapi akses halaman login, tendang ke dashboard
  window.location.href = '/';
}

// ── 2. Helper Fetch dengan Bearer Token ──
window.fetchWithAuth = async function(url, options = {}) {
  // Pastikan headers ada
  if (!options.headers) {
    options.headers = {};
  }
  
  // Tambahkan Authorization token jika ada (dan bukan hapus multipart form data)
  const isFormData = options.body instanceof FormData;
  if (!isFormData && !options.headers['Content-Type']) {
    options.headers['Content-Type'] = 'application/json';
  }
  
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, options);
    
    // Jika token kadaluarsa atau tidak valid (401), tendang ke login
    if (response.status === 401 && !isLoginPage) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('username');
      localStorage.removeItem('namaKader');
      window.location.href = '/login?expired=1';
    }
    
    return response;
  } catch (error) {
    console.error('Fetch Error:', error);
    throw error;
  }
};

// ── 3. Logout ──
window.logout = function() {
  localStorage.clear();
  window.location.href = '/login';
};

// ── 4. UI Manipulation (Render info user & kosmetik admin) ──
document.addEventListener('DOMContentLoaded', () => {
  if (isLoginPage) return;

  // Render info user di header
  const username = localStorage.getItem('username') || '';
  const namaKader = localStorage.getItem('namaKader') && localStorage.getItem('namaKader') !== 'null' 
    ? localStorage.getItem('namaKader') 
    : userRole; // Jika null (Superadmin), tampilkan role

  const headerNav = document.querySelector('.nav');
  if (headerNav) {
    const userHtml = `
      <div class="user-profile" style="display:flex;align-items:center;gap:12px;margin-left:20px;padding-left:20px;border-left:1px solid var(--border);">
        <div style="text-align:right;">
          <div style="font-size:13px;font-weight:700;color:var(--text);">${username}</div>
          <div style="font-size:11px;color:var(--text3);">${namaKader}</div>
        </div>
        <button onclick="logout()" class="btn btn-outline btn-sm" style="padding:4px 8px;border-color:var(--danger);color:var(--danger);">Logout</button>
      </div>
    `;
    headerNav.insertAdjacentHTML('beforeend', userHtml);
  }

  // Kosmetik RBAC: Sembunyikan elemen Superadmin jika role Kader
  if (userRole === 'Kader') {
    const adminElems = document.querySelectorAll('.superadmin-only');
    adminElems.forEach(el => el.style.display = 'none');
  }
});
