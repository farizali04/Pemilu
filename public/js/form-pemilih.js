// ════════════════════════════════════════
//  form-pemilih.js — Logic Form Pemilih
// ════════════════════════════════════════

let dupTimeout      = null;
let duplikatSaatIni = []; // hasil cek duplikat terakhir

// ── Real-time cek duplikat ────────────────────────────
function onInputPemilih() {
  clearTimeout(dupTimeout);
  dupTimeout = setTimeout(async () => {
    const nama = document.getElementById('inp-nama')?.value.trim() || '';
    const nik  = document.getElementById('inp-nik')?.value.trim()  || '';
    if (!nama && !nik) {
      document.getElementById('alert-dup')?.classList.remove('show');
      duplikatSaatIni = [];
      return;
    }
    const dups   = await PemilihAPI.cekDuplikat(nama, nik);
    const editId = document.getElementById('edit-id')?.value;
    duplikatSaatIni = editId ? dups.filter(d => d.pemilih.id !== editId) : dups;
    renderDupAlert(duplikatSaatIni);
  }, 400);
}

// ── Submit TAMBAH ─────────────────────────────────────
async function submitTambahPemilih() {
  const nama    = document.getElementById('inp-nama').value.trim();
  const nik     = document.getElementById('inp-nik').value.trim();
  const kaderId = document.getElementById('inp-kader').value;
  const umur    = document.getElementById('inp-umur').value;

  hideAlerts();
  if (!nama || !nik || !kaderId || !umur) { showError('Semua field wajib diisi!'); return; }
  if (nik.length !== 16 || isNaN(nik))   { showError('NIK harus 16 digit angka!'); return; }
  if (parseInt(umur) < 17)               { showError('Umur minimal 17 tahun!'); return; }

  // Kirim info duplikat jika ada
  let duplikatInfo = null;
  if (duplikatSaatIni.length > 0) {
    duplikatInfo = JSON.stringify({
      alasan   : duplikatSaatIni.map(d => `${d.reason}: ${d.pemilih.nama}`).join('; '),
      idTerkait: duplikatSaatIni.map(d => d.pemilih.id),
      level    : duplikatSaatIni[0].level
    });
  }

  const res = await PemilihAPI.tambah({ nama, nik, kaderId, umur, duplikatInfo });
  if (res.error) { showError(res.error); return; }

  const adaDup = !!duplikatInfo;
  showSuccess(adaDup
    ? `${nama} disimpan dengan tanda ⚠️ duplikat. Cek di dashboard.`
    : `${nama} berhasil didaftarkan!`
  );
  resetFormPemilih();
  showToast(adaDup ? `⚠️ ${nama} disimpan (terindikasi duplikat)` : `✅ ${nama} berhasil disimpan!`);
  setTimeout(() => { window.location.href = '/'; }, 1800);
}

// ── Submit EDIT ───────────────────────────────────────
async function submitEditPemilih() {
  const id      = document.getElementById('edit-id').value;
  const nama    = document.getElementById('inp-nama').value.trim();
  const nik     = document.getElementById('inp-nik').value.trim();
  const kaderId = document.getElementById('inp-kader').value;
  const umur    = document.getElementById('inp-umur').value;

  hideAlerts();
  if (!nama || !nik || !kaderId || !umur) { showError('Semua field wajib diisi!'); return; }
  if (nik.length !== 16 || isNaN(nik))   { showError('NIK harus 16 digit angka!'); return; }

  const res = await PemilihAPI.edit(id, { nama, nik, kaderId, umur });
  if (res.error) { showError(res.error); return; }

  showSuccess('Data berhasil diperbarui!');
  showToast('✅ Data pemilih diperbarui!');
  setTimeout(() => { window.location.href = '/'; }, 1500);
}

// ── Helpers ───────────────────────────────────────────
function resetFormPemilih() {
  ['inp-nama','inp-nik','inp-umur'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const sel = document.getElementById('inp-kader');
  if (sel) sel.value = '';
  document.getElementById('alert-dup')?.classList.remove('show');
  duplikatSaatIni = [];
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
