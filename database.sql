-- ════════════════════════════════════════════════════
--  PENDATAAN PEMILIH — Setup Database MySQL
--  Jalankan file ini sekali sebelum menjalankan server
-- ════════════════════════════════════════════════════

-- 1. Buat database (jika belum ada)
CREATE DATABASE IF NOT EXISTS pendataan_pemilih
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pendataan_pemilih;

-- ── Tabel Kader ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS kader (
  id          VARCHAR(20)   PRIMARY KEY,
  nama        VARCHAR(100)  NOT NULL,
  nomor       INT           NOT NULL,
  created_at  DATETIME      DEFAULT NOW(),

  UNIQUE KEY uq_kader_nomor (nomor)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Tabel Pemilih ────────────────────────────────────
CREATE TABLE IF NOT EXISTS pemilih (
  id              VARCHAR(20)   PRIMARY KEY,
  nama            VARCHAR(100)  NOT NULL,
  nik             CHAR(16)      NOT NULL,
  kader_id        VARCHAR(20)   NOT NULL,
  umur            TINYINT       NOT NULL,

  -- Kolom duplikat: 0 = aman, 1 = terindikasi duplikat
  is_duplikat     TINYINT(1)    DEFAULT 0,
  -- Keterangan duplikat: NIK identik / nama mirip / dll
  duplikat_info   VARCHAR(255)  DEFAULT NULL,

  created_at      DATETIME      DEFAULT NOW(),

  -- NIK tetap unik (tidak boleh ada 2 NIK sama persis)
  UNIQUE KEY uq_pemilih_nik (nik),

  -- FULLTEXT untuk pencarian nama cepat di data ribuan
  FULLTEXT KEY ft_pemilih_nama (nama),

  -- Index untuk filter duplikat di dashboard
  KEY idx_pemilih_duplikat (is_duplikat),
  KEY idx_pemilih_kader    (kader_id),

  CONSTRAINT fk_pemilih_kader
    FOREIGN KEY (kader_id) REFERENCES kader(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ════════════════════════════════════════════════════
--  Jika tabel sudah ada sebelumnya, jalankan ALTER ini
--  untuk menambah kolom duplikat:
--
--  ALTER TABLE pemilih
--    ADD COLUMN is_duplikat   TINYINT(1)   DEFAULT 0    AFTER umur,
--    ADD COLUMN duplikat_info VARCHAR(255) DEFAULT NULL AFTER is_duplikat,
--    ADD KEY idx_pemilih_duplikat (is_duplikat);
--
-- ════════════════════════════════════════════════════
--  Selesai! Jalankan: node server.js
-- ════════════════════════════════════════════════════
