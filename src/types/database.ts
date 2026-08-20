/**
 * database.ts - Dinh nghia kieu du lieu cho bang `links` trong PostgreSQL
 *
 * Muc dich: Dung de TypeScript hieu cau truc du lieu khi query tu pg Pool,
 * giup code an toan kieu (type-safe).
 */

/**
 * Kieu du lieu cua 1 ban ghi trong bang `links`
 * Tuong ung voi cac column trong PostgreSQL:
 *   id           VARCHAR(10) PRIMARY KEY  -- Short code (SHA256 Base64URL)
 *   original_url TEXT NOT NULL            -- URL goc can rut gon
 *   created_at   TIMESTAMPTZ DEFAULT NOW() -- Thoi diem tao link
 */
export interface Link {
  id: string;
  original_url: string;
  created_at: string;
}

/**
 * Kieu du lieu khi INSERT ban ghi moi vao bang `links`
 * created_at co gia tri mac dinh nen khong bat buoc
 */
export interface LinkInsert {
  id: string;
  original_url: string;
  created_at?: string;
}