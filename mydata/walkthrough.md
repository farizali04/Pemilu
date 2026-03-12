# Walkthrough: Pemilu Application Overhaul

## Summary
Overhauled the **Pendataan Pemilih** application from a basic CRUD system into a **Sistem Intelijen Data Politik** with hard duplicate rejection, fraud audit logging, NIK auto-parsing, Excel mass import, and kader target tracking.

---

## Key Changes

### 1. Database Schema (Fase 1)
| Perubahan | Sebelum | Sesudah |
|---|---|---|
| Umur pemilih | `TINYINT` (max 127) | `DATE tanggal_lahir` + `ENUM jenis_kelamin` — umur dihitung on-the-fly |
| Duplikat flag | `is_duplikat` + `duplikat_info` kolom | **Dihapus** — diganti hard rejection + `log_duplikat` table |
| Target kader | Tidak ada | `target_suara INT` pada tabel `kader` |
| Audit log | Tidak ada | Tabel `log_duplikat` (nik_target, kader pelaku, kader existing, timestamp) |

### 2. Backend Logic (Fase 2)
- **Hard NIK Rejection**: NIK duplikat → HTTP 409 + auto-insert ke `log_duplikat` 
- **Server-side Pagination**: `GET /api/pemilih?page=1&limit=50` → `{data, total, page, totalPages}`
- **NIK Auto-parse**: Server-side [parseNIK()](file:///d:/MAINSERVER/laragon/www/Pemilu/public/js/form-pemilih.js#8-37) extracts tanggal lahir & jenis kelamin
- **Excel Import**: `POST /api/pemilih/import` — upload via `multer`, parse via `xlsx`, per-row validation
- **Removed**: `similarityScore()`, fuzzy search, `cek-duplikat`, `tandai-aman` endpoints

### 3. Frontend (Fase 3-4)
- **NIK Auto-fill**: Type 16 digits → tanggal lahir, jenis kelamin, umur auto-filled
- **NIK Status Indicator**: Real-time 🟢/🔴 status showing if NIK is available or taken
- **Progress Bars**: Dashboard + Kader page show data collected vs target_suara
- **New Pages**: `/import` (Excel upload with drag & drop) + `/log-duplikat` (fraud audit)
- **Removed**: "Tandai Aman" button, duplikat flag column, fuzzy name matching alerts

---

## Files Modified/Created

| File | Action | Description |
|---|---|---|
| [migration.sql](file:///d:/MAINSERVER/laragon/www/Pemilu/migration.sql) | NEW | Database migration script |
| [database.sql](file:///d:/MAINSERVER/laragon/www/Pemilu/database.sql) | MODIFIED | Fresh install schema v2 |
| [db.js](file:///d:/MAINSERVER/laragon/www/Pemilu/db.js) | MODIFIED | Changed `pool.execute` → `pool.query` |
| [server.js](file:///d:/MAINSERVER/laragon/www/Pemilu/server.js) | REWRITTEN | All new backend logic |
| [package.json](file:///d:/MAINSERVER/laragon/www/Pemilu/package.json) | MODIFIED | Added `multer`, `xlsx` |
| [public/css/style.css](file:///d:/MAINSERVER/laragon/www/Pemilu/public/css/style.css) | REWRITTEN | New styles: progress bars, drop zone, NIK status, etc. |
| [public/js/pemilih.js](file:///d:/MAINSERVER/laragon/www/Pemilu/public/js/pemilih.js) | REWRITTEN | New API module with pagination + import |
| [public/js/form-pemilih.js](file:///d:/MAINSERVER/laragon/www/Pemilu/public/js/form-pemilih.js) | REWRITTEN | NIK auto-parse, hard rejection |
| [public/js/form-kader.js](file:///d:/MAINSERVER/laragon/www/Pemilu/public/js/form-kader.js) | MODIFIED | Added targetSuara support |
| [public/index.html](file:///d:/MAINSERVER/laragon/www/Pemilu/public/index.html) | REWRITTEN | New dashboard with progress bars |
| [public/tambah-pemilih.html](file:///d:/MAINSERVER/laragon/www/Pemilu/public/tambah-pemilih.html) | REWRITTEN | NIK auto-fill form |
| [public/edit-pemilih.html](file:///d:/MAINSERVER/laragon/www/Pemilu/public/edit-pemilih.html) | REWRITTEN | Updated form fields |
| [public/kader.html](file:///d:/MAINSERVER/laragon/www/Pemilu/public/kader.html) | MODIFIED | Added target/progress columns |
| [public/tambah-kader.html](file:///d:/MAINSERVER/laragon/www/Pemilu/public/tambah-kader.html) | MODIFIED | Added target suara field |
| [public/edit-kader.html](file:///d:/MAINSERVER/laragon/www/Pemilu/public/edit-kader.html) | MODIFIED | Added target suara field |
| [public/import.html](file:///d:/MAINSERVER/laragon/www/Pemilu/public/import.html) | NEW | Excel import with drag & drop |
| [public/log-duplikat.html](file:///d:/MAINSERVER/laragon/www/Pemilu/public/log-duplikat.html) | NEW | Fraud audit log page |

---

## API Test Results ✅

| Test | Result |
|---|---|
| POST new pemilih dengan tanggal_lahir | ✅ Created, umur = 36 (calculated) |
| POST duplicate NIK (cross-kader) | ✅ HTTP 409 DITOLAK + logged |
| GET pemilih with pagination | ✅ Returns `{data, total, page, totalPages}` |
| GET log-duplikat | ✅ Returns 1 fraud attempt |
| GET log-duplikat/statistik | ✅ Shows per-kader breakdown |
| GET cek-nik (existing) | ✅ Returns `{exists: true}` |
| GET statistik | ✅ `{total: 7, percobaanDuplikat: 1}` |

---

## Bugs Fixed During Verification
- **`pool.execute` → `pool.query`** in [db.js](file:///d:/MAINSERVER/laragon/www/Pemilu/db.js): MySQL2's prepared statements cannot handle integer LIMIT/OFFSET parameters correctly. Switched to unprepared query mode which resolves this.
