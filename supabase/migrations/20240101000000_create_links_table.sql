-- Migration: 20240101000000_create_links_table.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code   VARCHAR(10) NOT NULL,
  original_url TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  click_count  INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT links_short_code_unique UNIQUE (short_code)
);

CREATE INDEX IF NOT EXISTS idx_links_short_code ON links (short_code);
CREATE INDEX IF NOT EXISTS idx_links_created_at ON links (created_at DESC);

-- Cap quyen cho cac roles trong Supabase
GRANT ALL ON TABLE links TO postgres, anon, authenticated, service_role;

COMMENT ON TABLE links IS 'Bang luu cac URL rut gon theo chuan SHA-256 Base64URL (7-10 ky tu)';
COMMENT ON COLUMN links.short_code   IS '7-10 ky tu Base64URL (RFC 4648), la path trong short URL';
COMMENT ON COLUMN links.original_url IS 'URL goc day du can redirect den';
COMMENT ON COLUMN links.click_count  IS 'So lan link duoc click/redirect';