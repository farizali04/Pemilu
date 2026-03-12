// ════════════════════════════════════════
//  pemilih.js — API calls untuk Pemilih
// ════════════════════════════════════════

const PemilihAPI = {

  async getAll(query = '', kaderId = '') {
    const params = new URLSearchParams();
    if (query)   params.set('q', query);
    if (kaderId) params.set('kaderId', kaderId);
    const res = await fetch(`/api/pemilih?${params}`);
    return res.json();
  },

  async getById(id) {
    const res = await fetch(`/api/pemilih/${id}`);
    return res.json();
  },

  async tambah(data) {
    const res = await fetch('/api/pemilih', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async edit(id, data) {
    const res = await fetch(`/api/pemilih/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async hapus(id) {
    const res = await fetch(`/api/pemilih/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async cekDuplikat(nama, nik) {
    const res = await fetch('/api/pemilih/cek-duplikat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama, nik })
    });
    return res.json();
  }
};

// ── Render tabel pemilih ──────────────────────────────
function renderTabelPemilih(data, tbodyId = 'tbody-pemilih', showActions = true) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">
      <div class="empty"><div class="empty-icon">📭</div><p>Belum ada data pemilih.</p></div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = data.map((p, i) => `
    <tr>
      <td style="color:var(--text3);">${i + 1}</td>
      <td style="font-weight:600;color:var(--text);">${p.nama}</td>
      <td><span class="nik">${p.nik}</span></td>
      <td><span class="badge badge-blue">${p.namaKader || '-'}</span></td>
      <td>${p.umur} thn</td>
      <td style="font-size:12px;color:var(--text3);">${formatDate(p.createdAt)}</td>
      ${showActions ? `
      <td>
        <div class="gap-12">
          <a href="/edit-pemilih?id=${p.id}" class="btn btn-outline btn-xs">✏️ Edit</a>
          <button class="btn btn-danger btn-xs" onclick="konfirmasiHapusPemilih('${p.id}','${p.nama}')">🗑️</button>
        </div>
      </td>` : '<td>—</td>'}
    </tr>
  `).join('');
}

async function konfirmasiHapusPemilih(id, nama) {
  if (!confirm(`Hapus data pemilih "${nama}"?`)) return;
  const res = await PemilihAPI.hapus(id);
  if (res.success) {
    showToast(`${nama} berhasil dihapus.`, '🗑️');
    if (typeof loadPemilih === 'function') loadPemilih();
    if (typeof updateHeaderStats === 'function') updateHeaderStats();
  } else {
    showToast(res.error || 'Gagal menghapus.', '❌');
  }
}

// ── Render duplikat alert ─────────────────────────────
function renderDupAlert(dups, alertId = 'alert-dup', listId = 'dup-list') {
  const alertEl = document.getElementById(alertId);
  const listEl  = document.getElementById(listId);
  if (!alertEl || !listEl) return;

  if (dups.length === 0) { alertEl.classList.remove('show'); return; }

  const ikon = { merah: '🔴', kuning: '🟡', oranye: '🟠' };
  listEl.innerHTML = dups.map(d => `
    <div class="dup-item">
      ${ikon[d.level] || '⚠️'} <strong>${d.reason}</strong>: ${d.pemilih.nama}
      <div class="dup-meta">
        NIK: <span class="nik">${d.pemilih.nik}</span> &nbsp;|&nbsp;
        ${d.pemilih.namaKader} &nbsp;|&nbsp;
        Umur: ${d.pemilih.umur} thn &nbsp;|&nbsp;
        ${formatDate(d.pemilih.createdAt)}
      </div>
    </div>
  `).join('');
  alertEl.classList.add('show');
}
