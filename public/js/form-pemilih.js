// ════════════════════════════════════════
//  form-pemilih.js — Logic Form Pemilih (v2)
//  Auto-parse NIK → Tanggal Lahir & Jenis Kelamin
// ════════════════════════════════════════

let nikCheckTimeout = null;

// ── Parse NIK → tanggal lahir & jenis kelamin ────────
function parseNIK(nik) {
  if (!nik || nik.length !== 16 || isNaN(nik)) return null;
  let tanggal = parseInt(nik.substring(6, 8));
  const bulan = parseInt(nik.substring(8, 10));
  let tahun   = parseInt(nik.substring(10, 12));

  let jenisKelamin = 'L';
  if (tanggal > 40) {
    jenisKelamin = 'P';
    tanggal -= 40;
  }

  const currentYear2Digit = new Date().getFullYear() % 100;
  tahun = tahun <= currentYear2Digit ? 2000 + tahun : 1900 + tahun;

  if (bulan < 1 || bulan > 12 || tanggal < 1 || tanggal > 31) return null;

  const tgl = `${tahun}-${String(bulan).padStart(2, '0')}-${String(tanggal).padStart(2, '0')}`;

  // Hitung umur
  const lahir = new Date(tgl);
  const now   = new Date();
  let umur    = now.getFullYear() - lahir.getFullYear();
  const m     = now.getMonth() - lahir.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < lahir.getDate())) umur--;

  return { tanggalLahir: tgl, jenisKelamin, umur };
}

// ── Event: NIK berubah → auto-fill & cek duplikat ────
function onNIKInput() {
  const nik = document.getElementById('inp-nik').value.trim();
  const tglEl  = document.getElementById('inp-tgl-lahir');
  const jkEl   = document.getElementById('inp-jk');
  const umurEl = document.getElementById('display-umur');
  const nikStatus = document.getElementById('nik-status');

  // Reset fields
  if (tglEl)  tglEl.value = '';
  if (jkEl)   jkEl.value  = '';
  if (umurEl) umurEl.textContent = '';
  if (nikStatus) { nikStatus.className = 'nik-status'; nikStatus.textContent = ''; }

  if (nik.length < 16) return;

  // Auto-fill dari NIK
  const parsed = parseNIK(nik);
  if (parsed) {
    if (tglEl)  tglEl.value = parsed.tanggalLahir;
    if (jkEl)   jkEl.value  = parsed.jenisKelamin;
    if (umurEl) umurEl.textContent = `${parsed.umur} tahun`;
  }

  // Cek duplikat real-time
  clearTimeout(nikCheckTimeout);
  nikCheckTimeout = setTimeout(async () => {
    if (nik.length !== 16) return;
    const editId = document.getElementById('edit-id')?.value;
    const result = await PemilihAPI.cekNIK(nik);

    if (result.exists) {
      // Jika sedang edit dan NIK milik data yg sama, abaikan
      if (editId && result.data) {
        // Cek apakah itu data sendiri (kita tidak punya id di cek-nik, jadi skip)
      }
      if (nikStatus) {
        nikStatus.className = 'nik-status nik-danger';
        nikStatus.innerHTML = `🔴 <strong>NIK SUDAH TERDAFTAR</strong> — ${result.data.nama} (${result.data.namaKader})`;
      }
    } else {
      if (nikStatus) {
        nikStatus.className = 'nik-status nik-safe';
        nikStatus.innerHTML = `🟢 NIK tersedia`;
      }
    }
  }, 300);
}

// ── Submit TAMBAH ─────────────────────────────────────
async function submitTambahPemilih() {
  const nama         = document.getElementById('inp-nama').value.trim();
  const nik          = document.getElementById('inp-nik').value.trim();
  const kaderId      = document.getElementById('inp-kader').value;
  const tanggalLahir = document.getElementById('inp-tgl-lahir').value;
  const jenisKelamin = document.getElementById('inp-jk').value;

  hideAlerts();
  if (!nama || !nik || !kaderId) { showError('Nama, NIK, dan Kader wajib diisi!'); return; }
  if (nik.length !== 16 || isNaN(nik)) { showError('NIK harus 16 digit angka!'); return; }

  const res = await PemilihAPI.tambah({ nama, nik, kaderId, tanggalLahir, jenisKelamin });

  if (res.error) {
    showError(res.error);
    return;
  }

  showSuccess(`${nama} berhasil didaftarkan!`);
  resetFormPemilih();
  showToast(`✅ ${nama} berhasil disimpan!`);
  setTimeout(() => { window.location.href = '/'; }, 1800);
}

// ── Submit EDIT ───────────────────────────────────────
async function submitEditPemilih() {
  const id           = document.getElementById('edit-id').value;
  const nama         = document.getElementById('inp-nama').value.trim();
  const nik          = document.getElementById('inp-nik').value.trim();
  const kaderId      = document.getElementById('inp-kader').value;
  const tanggalLahir = document.getElementById('inp-tgl-lahir').value;
  const jenisKelamin = document.getElementById('inp-jk').value;

  hideAlerts();
  if (!nama || !nik || !kaderId) { showError('Semua field wajib diisi!'); return; }
  if (nik.length !== 16 || isNaN(nik)) { showError('NIK harus 16 digit angka!'); return; }

  const res = await PemilihAPI.edit(id, { nama, nik, kaderId, tanggalLahir, jenisKelamin });
  if (res.error) { showError(res.error); return; }

  showSuccess('Data berhasil diperbarui!');
  showToast('✅ Data pemilih diperbarui!');
  setTimeout(() => { window.location.href = '/'; }, 1500);
}

// ── Helpers ───────────────────────────────────────────
function resetFormPemilih() {
  ['inp-nama','inp-nik','inp-tgl-lahir'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const sel = document.getElementById('inp-kader');
  if (sel) sel.value = '';
  const jk = document.getElementById('inp-jk');
  if (jk) jk.value = '';
  const umur = document.getElementById('display-umur');
  if (umur) umur.textContent = '';
  const nikStatus = document.getElementById('nik-status');
  if (nikStatus) { nikStatus.className = 'nik-status'; nikStatus.textContent = ''; }
}

function showError(msg) {
  const el = document.getElementById('alert-error');
  if (!el) return;
  el.textContent = '❌ ' + msg;
  el.classList.add('show');
}

function showSuccess(msg) {
  const el = document.getElementById('alert-success');
  if (!el) return;
  el.textContent = '✅ ' + msg;
  el.classList.add('show');
}

function hideAlerts() {
  document.getElementById('alert-error')?.classList.remove('show');
  document.getElementById('alert-success')?.classList.remove('show');
}
