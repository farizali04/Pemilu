// ════════════════════════════════════════
//  server.js — Express + MySQL
// ════════════════════════════════════════
require('dotenv').config();
const express = require('express');
const path    = require('path');
const { query, testConnection } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function similarityScore(a, b) {
  a = a.toLowerCase().replace(/\s+/g, ' ').trim();
  b = b.toLowerCase().replace(/\s+/g, ' ').trim();
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;
  const wa = a.split(' '), wb = b.split(' ');
  const common = wa.filter(w => wb.includes(w) && w.length > 2);
  if (common.length > 0) return 0.6 + (common.length / Math.max(wa.length, wb.length)) * 0.3;
  return 0;
}

// ══════ API KADER ══════════════════════════════════════

app.get('/api/kader', async (req, res) => {
  try {
    const rows = await query(`
      SELECT k.*, COUNT(p.id) AS jumlahPemilih
      FROM kader k LEFT JOIN pemilih p ON p.kader_id = k.id
      GROUP BY k.id ORDER BY k.nomor ASC
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/kader/:id', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM kader WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Kader tidak ditemukan' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/kader', async (req, res) => {
  try {
    const { nama, nomor } = req.body;
    if (!nama || !nomor) return res.status(400).json({ error: 'Nama dan nomor wajib diisi' });
    const dup = await query('SELECT id FROM kader WHERE nomor = ?', [parseInt(nomor)]);
    if (dup.length) return res.status(400).json({ error: `Kader ${nomor} sudah terdaftar` });
    const id = genId();
    await query('INSERT INTO kader (id, nama, nomor) VALUES (?, ?, ?)', [id, nama.trim(), parseInt(nomor)]);
    const [kader] = await query('SELECT * FROM kader WHERE id = ?', [id]);
    res.status(201).json(kader);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/kader/:id', async (req, res) => {
  try {
    const { nama, nomor } = req.body;
    const dup = await query('SELECT id FROM kader WHERE nomor = ? AND id != ?', [parseInt(nomor), req.params.id]);
    if (dup.length) return res.status(400).json({ error: `Nomor kader ${nomor} sudah dipakai` });
    await query('UPDATE kader SET nama = ?, nomor = ? WHERE id = ?', [nama.trim(), parseInt(nomor), req.params.id]);
    const [kader] = await query('SELECT * FROM kader WHERE id = ?', [req.params.id]);
    res.json(kader);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/kader/:id', async (req, res) => {
  try {
    const punya = await query('SELECT id FROM pemilih WHERE kader_id = ? LIMIT 1', [req.params.id]);
    if (punya.length) return res.status(400).json({ error: 'Kader masih memiliki data pemilih' });
    await query('DELETE FROM kader WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════ API PEMILIH ════════════════════════════════════

app.get('/api/pemilih', async (req, res) => {
  try {
    const { q, kaderId, duplikat } = req.query;
    let sql = `
      SELECT p.*, CONCAT('Kader ', k.nomor, ' — ', k.nama) AS namaKader
      FROM pemilih p JOIN kader k ON k.id = p.kader_id WHERE 1=1
    `;
    const params = [];
    if (kaderId)          { sql += ' AND p.kader_id = ?';              params.push(kaderId); }
    if (q)                { sql += ' AND (p.nama LIKE ? OR p.nik LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
    if (duplikat === '1') { sql += ' AND p.is_duplikat = 1'; }
    sql += ' ORDER BY k.nomor ASC, p.created_at ASC';
    res.json(await query(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/pemilih/statistik', async (req, res) => {
  try {
    const [total]    = await query('SELECT COUNT(*) AS n FROM pemilih');
    const [duplikat] = await query('SELECT COUNT(*) AS n FROM pemilih WHERE is_duplikat = 1');
    res.json({ total: total.n, duplikat: duplikat.n, aman: total.n - duplikat.n });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/pemilih/:id', async (req, res) => {
  try {
    const rows = await query(`
      SELECT p.*, CONCAT('Kader ', k.nomor, ' — ', k.nama) AS namaKader
      FROM pemilih p JOIN kader k ON k.id = p.kader_id WHERE p.id = ?
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Pemilih tidak ditemukan' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/pemilih/cek-duplikat', async (req, res) => {
  try {
    const { nama, nik } = req.body;
    const dups = [];

    // Cek NIK identik
    if (nik && nik.length >= 4) {
      const rows = await query(`
        SELECT p.*, CONCAT('Kader ', k.nomor, ' — ', k.nama) AS namaKader
        FROM pemilih p JOIN kader k ON k.id = p.kader_id WHERE p.nik = ?
      `, [nik]);
      rows.forEach(p => dups.push({ pemilih: p, reason: 'NIK identik', level: 'merah' }));
    }

    // Cek nama mirip dengan FULLTEXT
    if (nama && nama.length >= 3) {
      const words = nama.trim().split(/\s+/).filter(w => w.length > 2).join(' ');
      let kandidat = [];
      if (words) {
        kandidat = await query(`
          SELECT p.*, CONCAT('Kader ', k.nomor, ' — ', k.nama) AS namaKader
          FROM pemilih p JOIN kader k ON k.id = p.kader_id
          WHERE MATCH(p.nama) AGAINST(? IN BOOLEAN MODE) LIMIT 50
        `, [words + '*']);
      }
      if (!kandidat.length) {
        kandidat = await query(`
          SELECT p.*, CONCAT('Kader ', k.nomor, ' — ', k.nama) AS namaKader
          FROM pemilih p JOIN kader k ON k.id = p.kader_id
          WHERE p.nama LIKE ? LIMIT 50
        `, [`%${nama.trim().split(' ')[0]}%`]);
      }
      kandidat.forEach(p => {
        if (dups.find(d => d.pemilih.id === p.id)) return;
        const score = similarityScore(nama, p.nama);
        if (score >= 0.85) dups.push({ pemilih: p, reason: 'Nama hampir sama', level: score === 1 ? 'merah' : 'kuning' });
        else if (score >= 0.6) dups.push({ pemilih: p, reason: 'Nama memiliki kesamaan kata', level: 'oranye' });
      });
    }
    res.json(dups);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/pemilih', async (req, res) => {
  try {
    const { nama, nik, kaderId, umur, duplikatInfo } = req.body;
    if (!nama || !nik || !kaderId || !umur) return res.status(400).json({ error: 'Semua field wajib diisi' });
    if (nik.length !== 16 || isNaN(nik)) return res.status(400).json({ error: 'NIK harus 16 digit angka' });
    if (parseInt(umur) < 17) return res.status(400).json({ error: 'Umur minimal 17 tahun' });

    const kaderAda = await query('SELECT id FROM kader WHERE id = ?', [kaderId]);
    if (!kaderAda.length) return res.status(400).json({ error: 'Kader tidak ditemukan' });

    // Cek apakah NIK sudah ada (duplikat keras — NIK benar-benar sama)
    const nikDup = await query('SELECT id, nama FROM pemilih WHERE nik = ?', [nik]);
    if (nikDup.length) {
      // NIK sama persis = tolak, karena 1 NIK hanya boleh 1 orang
      return res.status(400).json({ error: `NIK sudah terdaftar atas nama ${nikDup[0].nama}` });
    }

    // Tentukan flag duplikat berdasarkan info dari frontend
    const isDuplikat  = duplikatInfo ? 1 : 0;
    const infoSimpan  = duplikatInfo || null;

    const id = genId();
    await query(
      'INSERT INTO pemilih (id, nama, nik, kader_id, umur, is_duplikat, duplikat_info) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, nama.trim(), nik, kaderId, parseInt(umur), isDuplikat, infoSimpan]
    );

    // Tandai juga data LAMA yang mirip sebagai duplikat (jika belum ditandai)
    if (isDuplikat && infoSimpan) {
      // Ambil ID data lama yang terlibat dari duplikatInfo
      try {
        const infoObj = JSON.parse(infoSimpan);
        if (infoObj.idTerkait && infoObj.idTerkait.length) {
          for (const idLama of infoObj.idTerkait) {
            await query(
              `UPDATE pemilih SET is_duplikat = 1,
               duplikat_info = JSON_SET(COALESCE(duplikat_info, '{}'), '$.tandaiOleh', ?)
               WHERE id = ? AND is_duplikat = 0`,
              [id, idLama]
            );
          }
        }
      } catch (_) { /* abaikan jika parse gagal */ }
    }

    const [p] = await query(`
      SELECT p.*, CONCAT('Kader ', k.nomor, ' — ', k.nama) AS namaKader
      FROM pemilih p JOIN kader k ON k.id = p.kader_id WHERE p.id = ?
    `, [id]);
    res.status(201).json(p);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'NIK sudah terdaftar' });
    res.status(500).json({ error: e.message });
  }
});

// PUT tandai/hapus status duplikat manual
app.put('/api/pemilih/:id/duplikat', async (req, res) => {
  try {
    const { isDuplikat, info } = req.body;
    await query(
      'UPDATE pemilih SET is_duplikat = ?, duplikat_info = ? WHERE id = ?',
      [isDuplikat ? 1 : 0, info || null, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/pemilih/:id', async (req, res) => {
  try {
    const { nama, nik, kaderId, umur } = req.body;
    const nikDup = await query('SELECT nama FROM pemilih WHERE nik = ? AND id != ?', [nik, req.params.id]);
    if (nikDup.length) return res.status(400).json({ error: `NIK sudah dipakai oleh ${nikDup[0].nama}` });
    await query('UPDATE pemilih SET nama = ?, nik = ?, kader_id = ?, umur = ? WHERE id = ?',
      [nama.trim(), nik, kaderId, parseInt(umur), req.params.id]);
    const [p] = await query(`
      SELECT p.*, CONCAT('Kader ', k.nomor, ' — ', k.nama) AS namaKader
      FROM pemilih p JOIN kader k ON k.id = p.kader_id WHERE p.id = ?
    `, [req.params.id]);
    res.json(p);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/pemilih/:id', async (req, res) => {
  try {
    await query('DELETE FROM pemilih WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── HTML pages ────────────────────────────────────────
app.get('/',               (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/tambah-pemilih', (req, res) => res.sendFile(path.join(__dirname, 'public', 'tambah-pemilih.html')));
app.get('/tambah-kader',   (req, res) => res.sendFile(path.join(__dirname, 'public', 'tambah-kader.html')));
app.get('/kader',          (req, res) => res.sendFile(path.join(__dirname, 'public', 'kader.html')));
app.get('/edit-pemilih',   (req, res) => res.sendFile(path.join(__dirname, 'public', 'edit-pemilih.html')));
app.get('/edit-kader',     (req, res) => res.sendFile(path.join(__dirname, 'public', 'edit-kader.html')));

// ── Start ─────────────────────────────────────────────
async function start() {
  await testConnection();
  app.listen(PORT, () => console.log(`✅ Server berjalan di http://localhost:${PORT}`));
}
start();
