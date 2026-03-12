# Overhaul Aplikasi Pemilu — Sistem Intelijen Data Politik

## Latar Belakang

Aplikasi pendataan pemilih saat ini memiliki beberapa masalah kritis:
1. **Kolom `umur` TINYINT** — max 127, overflow error untuk umur > 127
2. **NIK duplikat masih bisa tersimpan** — saat NIK sudah ada di kader lain, data tetap masuk dengan flag duplikat (seharusnya **DITOLAK KERAS**)
3. **Input tidak efisien** — untuk 10.000+ data, perlu auto-fill dari NIK
4. **Tidak ada audit log** — tidak bisa melacak siapa yang mencoba memasukkan data duplikat

## User Review Required

> [!IMPORTANT]
> **Breaking Change: Kolom `umur` akan dihapus dan diganti `tanggal_lahir`.**
> Data umur yang sudah ada akan dikonversi ke estimasi tanggal lahir (1 Januari tahun lahir).

> [!CAUTION]
> **Perubahan Logika Duplikat:**
> Sebelumnya: NIK duplikat disimpan dengan flag `is_duplikat = 1`.
> Sesudahnya: NIK duplikat **DITOLAK 100%** (tidak bisa disimpan), dan percobaan duplikat dicatat di tabel `log_duplikat`. Kolom `is_duplikat` dan `duplikat_info` akan dihapus dari tabel `pemilih`.

---

## Proposed Changes

### Fase 1: Database Schema

#### [NEW] [migration.sql](file:///d:/MAINSERVER/laragon/www/Pemilu/migration.sql)
SQL migration script:
- **Tabel `pemilih`**:
  - Tambah kolom `tanggal_lahir DATE`
  - Tambah kolom `jenis_kelamin ENUM('L','P')`
  - Migrasi data `umur` → `tanggal_lahir` (estimasi: 1 Jan, tahun sekarang - umur)
  - Hapus kolom `umur`, `is_duplikat`, `duplikat_info`
  - Hapus index `idx_pemilih_duplikat`
- **Tabel `kader`**:
  - Tambah kolom `target_suara INT DEFAULT 0`
- **Tabel baru `log_duplikat`**:
  - [id](file:///d:/MAINSERVER/laragon/www/Pemilu/public/js/form-pemilih.js#107-111) INT AUTO_INCREMENT PRIMARY KEY
  - `nik_target` CHAR(16) — NIK yang dicoba didaftarkan
  - `nama_input` VARCHAR(100) — nama yang diinput
  - `kader_id_pelaku` VARCHAR(20) — kader yang mencoba memasukkan
  - `kader_id_existing` VARCHAR(20) — kader yang sudah punya NIK ini
  - `nama_existing` VARCHAR(100) — nama pemilik NIK asli
  - `created_at` DATETIME DEFAULT NOW()

#### [MODIFY] [database.sql](file:///d:/MAINSERVER/laragon/www/Pemilu/database.sql)
Update schema definisi untuk fresh install agar sesuai struktur baru.

---

### Fase 2: Backend

#### [MODIFY] [server.js](file:///d:/MAINSERVER/laragon/www/Pemilu/server.js)

**POST `/api/pemilih` — Logika Baru:**
- Terima `tanggalLahir` & `jenisKelamin` (bukan `umur`)
- Cek `SELECT * FROM pemilih WHERE nik = ?`
- Jika NIK ada → **INSERT ke `log_duplikat`** + return HTTP 409 "DITOLAK: NIK sudah terdaftar pada Kader X atas nama Y"
- Jika NIK tidak ada → INSERT normal
- Hapus semua logika `duplikatInfo`, `is_duplikat`, [similarityScore](file:///d:/MAINSERVER/laragon/www/Pemilu/server.js#19-29)

**GET `/api/pemilih` — Hitung Umur On-the-fly:**
- `SELECT p.*, TIMESTAMPDIFF(YEAR, p.tanggal_lahir, CURDATE()) AS umur`
- Tambahkan server-side pagination: `LIMIT ? OFFSET ?` + return `{data, total, totalPages, page}`

**Endpoint Baru:**
- `GET /api/log-duplikat` — Daftar percobaan duplikat dengan pagination
- `GET /api/log-duplikat/statistik` — Statistik: total percobaan, kader ter-mencurigakan
- `POST /api/pemilih/import` — Upload Excel (menggunakan `multer` + `xlsx`)
  - Parse Excel row by row, validasi NIK
  - NIK valid → INSERT ke `pemilih`
  - NIK duplikat → INSERT ke `log_duplikat`
  - Return `{berhasil: N, gagal: N, detail: [...]}`
- `PUT /api/kader/:id/target` — Update target suara kader

**Hapus:**
- Fungsi [similarityScore()](file:///d:/MAINSERVER/laragon/www/Pemilu/server.js#19-29)
- Endpoint `POST /api/pemilih/cek-duplikat` (tidak perlu lagi, cek real-time cukup query NIK)
- Endpoint `PUT /api/pemilih/:id/duplikat` (tidak ada lagi status duplikat)

#### [MODIFY] [package.json](file:///d:/MAINSERVER/laragon/www/Pemilu/package.json)
Tambah dependency: `multer`, `xlsx`

---

### Fase 3: Frontend — Form

#### [MODIFY] [tambah-pemilih.html](file:///d:/MAINSERVER/laragon/www/Pemilu/public/tambah-pemilih.html)
- Ganti field "Umur" → "Tanggal Lahir" (auto-filled, readonly) + "Jenis Kelamin" (auto-filled, readonly)
- Tambahkan field "Umur" sebagai display-only, dihitung dari tanggal lahir
- Hapus alert duplikat yang membingungkan, ganti dengan blocking error sederhana

#### [MODIFY] [edit-pemilih.html](file:///d:/MAINSERVER/laragon/www/Pemilu/public/edit-pemilih.html)
- Sama seperti tambah-pemilih: ganti umur → tanggal_lahir + jenis_kelamin

#### [MODIFY] [form-pemilih.js](file:///d:/MAINSERVER/laragon/www/Pemilu/public/js/form-pemilih.js)
- Tambah fungsi `parseNIK(nik)` — extract tanggal lahir & jenis kelamin dari digit 7-12
  - Digit 7-8: tanggal (jika > 40, perempuan → tanggal - 40)
  - Digit 9-10: bulan
  - Digit 11-12: tahun (+ 1900 atau + 2000)
- Event listener pada input NIK: jika length === 16, auto-fill tanggal lahir + jenis kelamin + hitung umur
- Ubah [submitTambahPemilih()](file:///d:/MAINSERVER/laragon/www/Pemilu/public/js/form-pemilih.js#26-60) untuk kirim `tanggalLahir` & `jenisKelamin`
- Hapus duplikat preview, ganti dengan cek NIK real-time sederhana (query backend `/api/pemilih?nik=X`)

#### [MODIFY] [pemilih.js](file:///d:/MAINSERVER/laragon/www/Pemilu/public/js/pemilih.js)
- Ubah `PemilihAPI.getAll()` untuk mendukung parameter pagination (`page`, `limit`)
- Hapus `PemilihAPI.cekDuplikat()`
- Tambah `PemilihAPI.import(formData)` untuk upload Excel

---

### Fase 4: Frontend — Dashboard & Halaman Baru

#### [MODIFY] [index.html](file:///d:/MAINSERVER/laragon/www/Pemilu/public/index.html)
- Tabel: ganti kolom "Umur" display dari `tanggal_lahir` (hitung umur on-the-fly)
- Tabel: hapus kolom "Status" (tidak ada lagi flag duplikat)
- Tabel: hapus tombol "Tandai Aman"
- Kader breakdown: tambahkan progress bar "vs Target Suara"
- Tambah navigasi ke halaman Import dan Log Duplikat

#### [NEW] [import.html](file:///d:/MAINSERVER/laragon/www/Pemilu/public/import.html)
Halaman import Excel:
- Drag & drop zone untuk file Excel
- Pilih kader tujuan
- Preview data sebelum submit
- Hasil import: berapa berhasil, berapa ditolak (duplikat)

#### [NEW] [log-duplikat.html](file:///d:/MAINSERVER/laragon/www/Pemilu/public/log-duplikat.html)
Halaman audit kecurangan:
- Tabel log percobaan duplikat
- Statistik per kader (siapa paling sering coba duplikat)
- Filter berdasarkan kader dan tanggal

#### [MODIFY] [kader.html](file:///d:/MAINSERVER/laragon/www/Pemilu/public/kader.html)
- Tambah kolom "Target Suara" dan progress bar di tabel kader

#### [MODIFY] [tambah-kader.html](file:///d:/MAINSERVER/laragon/www/Pemilu/public/tambah-kader.html) & [edit-kader.html](file:///d:/MAINSERVER/laragon/www/Pemilu/public/edit-kader.html)
- Tambah field "Target Suara" di form kader

#### [MODIFY] [style.css](file:///d:/MAINSERVER/laragon/www/Pemilu/public/css/style.css)
- Tambah styles: progress bar, drop zone, log table, read-only auto-filled indicators

---

## Verification Plan

### Browser Testing
Semua test dilakukan via browser agent ke `http://localhost:3000`:

1. **Test NIK Duplikat Cross-Kader (BLOKIR)**
   - Buka `/tambah-pemilih`, input NIK `3401011501900001` ke Kader 1 → Simpan → Berhasil
   - Buka `/tambah-pemilih`, input NIK yang sama ke Kader 2 → Simpan → **Harus DITOLAK** dengan pesan error
   - Cek di `/log-duplikat` → percobaan duplikat tercatat

2. **Test Auto-Parse NIK**
   - Buka `/tambah-pemilih`, ketik NIK `3401015501900001`
   - Tanggal lahir harus auto-fill: 15-01-1990 (digit tanggal 55 > 40 → perempuan, 55-40=15)
   - Jenis kelamin harus: Perempuan
   - Umur harus dihitung otomatis

3. **Test Import Excel**
   - Buka `/import`, upload file Excel dengan 5 row (3 valid, 2 NIK duplikat)
   - Hasil: 3 berhasil, 2 ditolak
   - Cek dashboard: 3 data baru muncul
   - Cek log duplikat: 2 percobaan tercatat

4. **Test Target Suara Kader**
   - Edit kader, set target 500
   - Cek dashboard: progress bar menunjukkan data terkumpul vs target

5. **Test Umur dari Tanggal Lahir**
   - Cek tabel dashboard: kolom menampilkan umur yg dihitung dari tanggal lahir, bukan field statis
