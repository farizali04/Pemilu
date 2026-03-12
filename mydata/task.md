# Pemilu Application Overhaul — Task Checklist

## Fase 1: Rombak Database ✅
- [x] Ubah kolom `umur` (TINYINT) → `tanggal_lahir` (DATE) di tabel `pemilih`
- [x] Tambahkan kolom `jenis_kelamin` ENUM('L','P') di tabel `pemilih`
- [x] Tambahkan kolom `target_suara` (INT) di tabel `kader`
- [x] Buat tabel `log_duplikat` untuk audit kecurangan
- [x] Buat migration SQL script

## Fase 2: Backend — Perbaiki Logika Inti ✅
- [x] Ubah endpoint POST `/api/pemilih` — NIK duplikat DITOLAK KERAS
- [x] Tambahkan auto-log ke `log_duplikat` saat NIK duplikat terdeteksi
- [x] Ubah semua endpoint untuk mendukung `tanggal_lahir` & `jenis_kelamin`
- [x] Hitung umur on-the-fly dari `tanggal_lahir` saat response
- [x] Tambahkan endpoint import massal Excel (POST `/api/pemilih/import`)
- [x] Tambahkan endpoint GET `/api/log-duplikat` untuk dasbor audit
- [x] Perbaiki server-side pagination di GET `/api/pemilih`

## Fase 3: Frontend — Form & Auto-fill ✅
- [x] Auto-parse NIK: extract tanggal lahir & jenis kelamin dari digit ke-7-12
- [x] Ganti field `umur` → `tanggal_lahir` & `jenis_kelamin` (auto-filled)
- [x] Form BLOKIR penyimpanan jika NIK duplikat
- [x] Hapus tombol "Tandai sebagai AMAN" dan logika duplikat flag

## Fase 4: Frontend — Dashboard & Efisiensi ✅
- [x] Tambahkan progress bar target suara per kader di dashboard
- [x] Tambahkan halaman import Excel dengan drag & drop
- [x] Tambahkan halaman/section log duplikat (audit kecurangan)
- [x] Perbaiki tampilan tabel untuk menampilkan tanggal lahir bukan umur

## Fase 5: Verifikasi ✅
- [x] Test server restart & basic pages load
- [x] Test NIK duplikat cross-kader → DITOLAK ✅
- [x] Test umur dihitung otomatis dari tanggal_lahir ✅
- [x] Test server-side pagination ✅
- [x] Test log duplikat tercatat ✅
- [x] Test statistik endpoint ✅
- [x] Fix: `pool.execute` → `pool.query` untuk LIMIT/OFFSET params
