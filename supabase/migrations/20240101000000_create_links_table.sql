-- ============================================================
-- Migration: 20240101000000_create_links_table.sql
-- Mo ta: Tao bang `links` cho URL shortener
--
-- Ly do thiet ke:
--   - short_code: varchar(7) vi base62^7 = ~3.5 ty combination, du cho production
--   - click_count: dung INTEGER, tang bang UPDATE atomic
--   - created_at: default NOW() de app khong can truyen timestamp thu cong
--   - INDEX tren short_code de query redirect cuc nhanh (day la hot path)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code   VARCHAR(7) NOT NULL,
  original_url TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  click_count  INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT links_short_code_unique UNIQUE (short_code)
);

CREATE INDEX IF NOT EXISTS idx_links_short_code ON links (short_code);
CREATE INDEX IF NOT EXISTS idx_links_created_at ON links (created_at DESC);

COMMENT ON TABLE links IS 'Bang luu cac URL rut gon';
COMMENT ON COLUMN links.short_code   IS '7-ky-tu base62, la phan path trong short URL';
COMMENT ON COLUMN links.original_url IS 'URL goc day du can redirect den';
COMMENT ON COLUMN links.click_count  IS 'So lan link duoc click/redirect';
