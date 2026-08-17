-- Migration: 20240101000000_create_links_table.sql
-- Thiet ke toi uu: `id` (VARCHAR(10)) la PRIMARY KEY truc tiep

CREATE TABLE IF NOT EXISTS links (
  id           VARCHAR(10) PRIMARY KEY,     -- Primary Key truc tiep chua ma short code (7-10 ky tu)
  original_url TEXT NOT NULL,               -- URL goc (da URL-encoded)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  click_count  INTEGER NOT NULL DEFAULT 0   -- So luot click
);

-- Index ho tro sap xep danh sach link gan day
CREATE INDEX IF NOT EXISTS idx_links_created_at ON links (created_at DESC);

-- Cap quyen cho cac roles trong Supabase
GRANT ALL ON TABLE links TO postgres, anon, authenticated, service_role;

COMMENT ON TABLE links IS 'Bang luu URL rut gon voi cot `id` la Primary Key toi uu';
COMMENT ON COLUMN links.id           IS 'Primary Key 7-10 ky tu Base64URL';
COMMENT ON COLUMN links.original_url IS 'URL goc day du can redirect den';
COMMENT ON COLUMN links.click_count  IS 'So lan link duoc click/redirect';