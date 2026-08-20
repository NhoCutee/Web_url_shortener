-- Migration: Tao bang links cho SnapLink
-- Chay 1 lan duy nhat de khoi tao database PostgreSQL (Docker)
-- Thiet ke toi uu: `id` (VARCHAR(10)) la PRIMARY KEY truc tiep chua ma short code

CREATE TABLE IF NOT EXISTS links (
    id           VARCHAR(10)  PRIMARY KEY,                  -- Primary Key: 7-10 ky tu chuan Base64URL (RFC 4648 §5)
    original_url TEXT         NOT NULL,                     -- Duong dan URL dich day du (theo chuan RFC 3986)
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),       -- Thoi gian tao ban ghi
    click_count  INTEGER      NOT NULL DEFAULT 0            -- Tong so luot nguoi dung click chuyen huong
);

-- Index ho tro query xoa link cu (cron cleanup) va sap xep theo thoi gian tao
CREATE INDEX IF NOT EXISTS idx_links_created_at ON links (created_at DESC);

-- Mo ta bang va tung column de de hieu khi doc schema
COMMENT ON TABLE  public.links              IS 'Bang luu tru URL rut gon, id la Primary Key toi uu hoa bo nho';
COMMENT ON COLUMN public.links.id           IS 'Primary Key: 7 den 10 ky tu chuan Base64URL (RFC 4648 §5)';
COMMENT ON COLUMN public.links.original_url IS 'Duong dan URL dich day du (theo chuan RFC 3986)';
COMMENT ON COLUMN public.links.created_at   IS 'Thoi gian tao ban ghi';
COMMENT ON COLUMN public.links.click_count  IS 'Tong so luot nguoi dung click chuyen huong';