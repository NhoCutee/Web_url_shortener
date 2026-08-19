-- Migration: 20240101000000_create_links_table.sql
-- Thiet ke toi uu: `id` (VARCHAR(10)) la PRIMARY KEY truc tiep

    CREATE TABLE IF NOT EXISTS links (
        id VARCHAR(10) PRIMARY KEY,     -- Primary Key chứa mã short code
        original_url TEXT NOT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        click_count  INTEGER NOT NULL DEFAULT 0
    );

-- Index ho tro sap xep danh sach link gan day
    CREATE INDEX IF NOT EXISTS idx_links_created_at ON links (created_at DESC);

-- Cap quyen cho cac roles trong Supabase
    GRANT ALL ON TABLE links TO postgres, anon, authenticated, service_role;

    COMMENT ON TABLE public.links IS 'Bảng lưu trữ URL rút gọn với id là Primary Key tối ưu hóa bộ nhớ';
    COMMENT ON COLUMN public.links.id           IS 'Primary Key: 7 đến 10 ký tự chuẩn Base64URL (RFC 4648 §5)';
    COMMENT ON COLUMN public.links.original_url IS 'Đường dẫn URL đích đầy đủ (theo chuẩn RFC 3986)';
    COMMENT ON COLUMN public.links.created_at   IS 'Thời gian tạo bản ghi';
    COMMENT ON COLUMN public.links.click_count  IS 'Tổng số lượt người dùng click chuyển hướng';