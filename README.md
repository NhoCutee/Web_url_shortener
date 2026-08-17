# SnapLink — URL Shortener (SHA-256 + Base64URL RFC 4648)

> Web URL Shortener hiệu năng cao, xây dựng với **Next.js 15 (App Router, TypeScript)**, **Supabase Cloud (PostgreSQL)**, chạy **100% trong môi trường Docker**, sử dụng thuật toán băm chuẩn quốc tế **SHA-256 + Base64URL (7 - 10 ký tự)**.

---

## 1. Kiến trúc tổng quan

```
+───────────────────────────────────────────────────────────+
|                  MÔI TRƯỜNG DEV (Local)                   |
|                                                           |
|  [Trình duyệt] ──► http://localhost:3000                  |
|      │                                                    |
|      ▼                                                    |
|  [Next.js App Container - Docker]                         |
|      │                                                    |
|      │ HTTPS / TLS (Port 443)                             |
|      ▼                                                    |
|  [Supabase Cloud - Managed PostgreSQL]                    |
|      ├── PostgreSQL Database (Bảng links)                 |
|      ├── PostgREST API                                    |
|      └── Supabase Cloud Dashboard                         |
+───────────────────────────────────────────────────────────+
|               MÔI TRƯỜNG PRODUCTION (Vercel)              |
|                                                           |
|  [Trình duyệt] ──► https://<your-app>.vercel.app          |
|      │                                                    |
|      ▼                                                    |
|  [Vercel Serverless / Edge Network]                       |
|      │                                                    |
|      │ HTTPS / TLS (Port 443)                             |
|      ▼                                                    |
|  [Supabase Cloud - Managed PostgreSQL]                    |
+───────────────────────────────────────────────────────────+

Stack công nghệ:
  Frontend & Backend : Next.js 15 (App Router, React 19, TypeScript)
  Database           : Supabase (PostgreSQL managed)
  Thuật toán         : SHA-256 + Base64URL (RFC 4648 §5, 7 - 10 ký tự)
  Môi trường Dev     : Docker & Docker Compose
  Production         : Vercel + Supabase Cloud
```

---

## 2. Thuật toán tạo mã Short Code (SHA-256 + Base64URL)

Hệ thống sử dụng quy trình băm và mã hóa chuẩn quốc tế theo **RFC 4648 §5**:

```
[Original URL: "https://google.com"]
               │
               ▼
[SHA-256 Digest]    ──► 32 bytes nhị phân (256-bit entropy)
               │
               ▼
[Base64URL Encode]  ──► 43 ký tự an toàn URL: "BQRvJsg-jIe8w6..."
               │        (Tập ký tự: A-Z, a-z, 0-9, '-', '_')
               ▼
[Slice 7 - 10 chars]──► Short Code: "BQRvJsg" (7 chars) hoặc "BQRvJsg-jI" (10 chars)
```

### Điểm nổi bật của thuật toán:
- **Chuẩn quốc tế (RFC 4648 §5)**: Tuyệt đối không chứa ký tự đặc biệt hay ký tự bị escape `%20`, `%2B`, an toàn tuyệt đối trên mọi trình duyệt.
- **Khử trùng lặp (Deduplication / Idempotent)**: Cùng 1 URL khi rút gọn nhiều lần sẽ cho ra cùng short code $\rightarrow$ tự động tái sử dụng, tối ưu dung lượng DB.
- **Xử lý va chạm thông minh (Collision Resolution)**: Nếu 2 URL khác nhau trùng tiền tố hash, thuật toán tự động trượt offset cửa sổ băm (`offset = attempt * 2`) và thêm salt để sinh mã mới.

---

## 3. Schema Database (PostgreSQL)

```sql
-- Kích hoạt extension pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tạo bảng links
CREATE TABLE IF NOT EXISTS links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code   VARCHAR(10) NOT NULL,        -- 7 đến 10 ký tự Base64URL
  original_url TEXT NOT NULL,               -- URL gốc đầy đủ
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  click_count  INTEGER NOT NULL DEFAULT 0,  -- Số lần redirect
  CONSTRAINT links_short_code_unique UNIQUE (short_code)
);

-- Indexes tối ưu hiệu năng
CREATE INDEX IF NOT EXISTS idx_links_short_code ON links (short_code);   -- Hot path redirect
CREATE INDEX IF NOT EXISTS idx_links_created_at ON links (created_at DESC); -- Link gần đây

-- Cấp quyền truy cập cho Supabase API
GRANT ALL ON TABLE links TO postgres, anon, authenticated, service_role;
```

---

## 4. Cấu trúc thư mục dự án

```
url-shortener/
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout + Google Fonts (Inter, JetBrains Mono)
│   │   ├── page.tsx               # Giao diện chính (Client Component)
│   │   ├── globals.css            # Design system CSS
│   │   ├── [shortCode]/
│   │   │   └── route.ts           # Route chuyển hướng (GET /:shortCode -> 302 Redirect)
│   │   ├── api/shorten/
│   │   │   └── route.ts           # API rút gọn URL (POST /api/shorten)
│   │   └── not-found/
│   │       └── page.tsx           # Giao diện 404 thân thiện
│   ├── lib/
│   │   ├── supabase.ts            # Supabase client (Client & Server factory)
│   │   └── utils.ts               # Hàm băm SHA-256, Base64URL, validation URL
│   └── types/
│       └── database.ts            # TypeScript definitions cho database
├── supabase/
│   └── migrations/
│       └── 20240101000000_create_links_table.sql # Migration SQL
├── Dockerfile                     # Dockerfile Next.js (Node 22 Alpine)
├── docker-compose.yml             # Cấu hình Docker dev container
├── .env.local                     # Biến môi trường (KHÔNG commit lên Git)
├── .env.example                   # Template biến môi trường
├── business_flow.md               # Tài liệu chi tiết luồng nghiệp vụ
└── README.md                      # Hướng dẫn dự án
```

---

## 5. Hướng dẫn cài đặt & Chạy Local

### Yêu cầu tiên quyết
- **Docker Desktop** đã được cài đặt và đang chạy.
- Tài khoản miễn phí tại [supabase.com](https://supabase.com).

### Bước 1: Chuẩn bị Database trên Supabase Cloud (Mất 1 phút)
1. Đăng nhập vào [supabase.com/dashboard](https://supabase.com/dashboard) và tạo 1 Project mới.
2. Vào mục **SQL Editor** ở thanh menu bên trái ➡️ Bấm **New query**.
3. Dán đoạn mã SQL ở **Mục 3 (Schema Database)** vào và bấm **Run**.

### Bước 2: Cấu hình biến môi trường
1. Vào **Project Settings ⚙️** (góc dưới bên trái) ➡️ **API**.
2. Copy **Project URL**, **anon key** và **service_role key**.
3. Tạo/chỉnh sửa file `.env.local` tại thư mục gốc của dự án:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Bước 3: Khởi động ứng dụng qua Docker
Mở PowerShell tại thư mục dự án và chạy:

```powershell
# Build image và khởi chạy container
docker compose up -d --build
```

Mở trình duyệt: **http://localhost:3000** để sử dụng ứng dụng!

---

## 6. Hướng dẫn Deploy lên Vercel

### Bước 1: Đẩy mã nguồn lên GitHub
```powershell
git init
git add .
git commit -m "feat: url shortener with sha256 base64url"
git remote add origin https://github.com/<username>/<repo-name>.git
git push -u origin main
```

### Bước 2: Import vào Vercel
1. Truy cập [vercel.com/new](https://vercel.com/new) và chọn repository của bạn.
2. Framework Preset: **Next.js** (tự động nhận diện).
3. Tại phần **Environment Variables**, thêm 4 biến môi trường từ Supabase Cloud:

| Key | Value | Môi trường |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxxxxxxxxxxxxx.supabase.co` | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOi...` (anon key) | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` (service_role - đánh dấu Sensitive) | Production |
| `NEXT_PUBLIC_APP_URL` | `https://<ten-ung-dung>.vercel.app` | Production |

4. Bấm **Deploy**. Vercel sẽ tự động build và cung cấp domain production miễn phí!

---

## 7. Các lệnh Docker hữu ích

```powershell
# Khởi động app
docker compose up -d

# Xem logs real-time
docker compose logs -f nextjs

# Restart app sau khi đổi .env.local
docker compose restart nextjs

# Dừng app
docker compose down
```

---

## 8. API Documentation

### `POST /api/shorten` — Tạo Short URL

**Request Body:**
```json
{
  "original_url": "https://example.com/very/long/path",
  "length": 7,       // Tùy chọn: 7, 8, 9 hoặc 10 (mặc định 7)
  "alias": "my-link" // Tùy chọn: Custom alias (1-10 ký tự)
}
```

**Response `201 Created`:**
```json
{
  "short_code": "BQRvJsg",
  "short_url": "http://localhost:3000/BQRvJsg",
  "original_url": "https://example.com/very/long/path",
  "created_at": "2026-08-17T04:57:09.633Z"
}
```

---

## 9. License

Dự án được phân phối dưới giấy phép **MIT**.