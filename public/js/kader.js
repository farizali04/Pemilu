// ════════════════════════════════════════
//  kader.js — API calls untuk Kader
// ════════════════════════════════════════

const KaderAPI = {

  async getAll() {
    const res = await fetchWithAuth('/api/kader');
    return res.json();
  },

  async getById(id) {
    const res = await fetchWithAuth(`/api/kader/${id}`);
    return res.json();
  },

  async tambah(data) {
    const res = await fetchWithAuth('/api/kader', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async edit(id, data) {
    const res = await fetchWithAuth(`/api/kader/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async hapus(id) {
    const res = await fetchWithAuth(`/api/kader/${id}`, { method: 'DELETE' });
    return res.json();
  }
};

// ── Render select/dropdown kader ─────────────────────
async function populateKaderSelect(selectId = 'inp-kader', selectedId = '') {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const kaders = await KaderAPI.getAll();
  sel.innerHTML = '<option value="">— Pilih Kader —</option>' +
    kaders.map(k =>
      `<option value="${k.id}" ${k.id === selectedId ? 'selected' : ''}>
        Kader ${k.nomor} — ${k.nama}
      </option>`
    ).join('');
}

// ── Render tabel kader ───────────────────────────────
function renderTabelKader(data, tbodyId = 'tbody-kader') {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4">
      <div class="empty"><div class="empty-icon">🎖️</div><p>Belum ada kader.</p></div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(k => `
    <tr>
      <td><span class="badge badge-blue">Kader ${k.nomor}</span></td>
      <td style="font-weight:600;color:var(--text);">${k.nama}</td>
      <td><span class="badge badge-green">${k.jumlahPemilih} pemilih</span></td>
      <td>
        <div class="gap-12">
          <a href="/edit-kader?id=${k.id}" class="btn btn-outline btn-xs">✏️ Edit</a>
          <button class="btn btn-danger btn-xs" onclick="konfirmasiHapusKader('${k.id}','${k.nama}',${k.nomor})">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function konfirmasiHapusKader(id, nama, nomor) {
  if (!confirm(`Hapus Kader ${nomor} — ${nama}?`)) return;
  const res = await KaderAPI.hapus(id);
  if (res.success) {
    showToast(`Kader ${nomor} — ${nama} dihapus.`, '🗑️');
    if (typeof loadKader === 'function') loadKader();
    if (typeof updateHeaderStats === 'function') updateHeaderStats();
  } else {
    showToast(res.error || 'Gagal menghapus.', '❌');
  }
}
