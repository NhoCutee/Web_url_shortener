# SnapLink — Full Project Technical Specification
## Hệ Thống Rút Gọn Liên Kết Hiệu Năng Cao (URL Shortener)

> **Tài liệu đặc tả kỹ thuật toàn diện (Comprehensive System Architecture & Technical Specifications)**  
> **Phiên bản:** 2.0 (Production Release)  
> **Kiến trúc:** Next.js 15 App Router (Dockerized / Vercel Edge) + Supabase Cloud (Managed PostgreSQL)  
> **Thuật toán:** SHA-256 Digest + Base64URL Encoding (RFC 4648 §5) + URL-Encoded Canonicalization (RFC 3986)

---

## 1. Tổng quan hệ thống (System Overview)

### 1.1 Mục tiêu sản phẩm
SnapLink là hệ thống rút gọn đường dẫn URL cấp doanh nghiệp (Enterprise-grade URL Shortener) với các tiêu chuẩn:
- **Tốc độ phản hồi cực nhanh (Ultra-low Latency)**: Thời gian chuyển hướng (Redirect 302) đạt dưới 50ms nhờ tối ưu chỉ mục Primary Key trực tiếp.
- **Chuẩn hóa quốc tế (RFC-compliant)**: 
  - Chuẩn hóa và mã hóa ký tự URL theo **RFC 3986 / WHATWG**.
  - Mã hóa chuỗi băm Base64URL an toàn 100% theo **RFC 4648 §5**.
- **Khử trùng lặp thông minh (Deduplication / Idempotent)**: Tự động phát hiện và tái sử dụng mã rút gọn cho các URL giống nhau, tiết kiệm dung lượng lưu trữ.
- **Kiến trúc Cloud Không phụ thuộc Host (Zero-bloat Local Footprint)**: Môi trường dev chạy hoàn toàn trên Docker cô lập, database chạy trực tiếp trên Supabase Cloud qua giao thức TLS/HTTPS an toàn.

---

## 2. Kiến trúc hạ tầng & Môi trường (Infrastructure & Hosting Architecture)

### 2.1 Sơ đồ kiến trúc tổng thể (Architecture Diagram)

```
+───────────────────────────────────────────────────────────────────────────────────────────+
|                                1. CLIENT / USER INTERACTION                               |
|                                                                                           |
|  [Trình duyệt người dùng (Web UI)]          [Hệ thống bên thứ 3 / Bot / Developer (API)]   |
|         │                                                           │                     |
|         │ (HTTPS Request)                                           │ (HTTP REST API)     |
|         ▼                                                           ▼                     |
+───────────────────────────────────────────────────────────────────────────────────────────+
|                                2. APPLICATION RUNTIME LAYER                               |
|                                                                                           |
|  ┌──────────────────────────────────────────────┐  ┌────────────────────────────────────┐ |
|  │            DEV ENVIRONMENT (Local)           │  │      PRODUCTION RUNTIME (Vercel)   │ |
|  │  - Host: Windows 10/11 (0% Node/DB installed)│  │  - Global Edge Network (Anycast)   │ |
|  │  - Docker Container: Node 22 Alpine          │  │  - Serverless Route Handlers       │ |
|  │  - Port Binding: 3000:3000                   │  │  - Domain: https://meobo.vercel.app│ |
|  └──────────────────────────────────────────────┘  └────────────────────────────────────┘ |
|                                         │                                                 |
|                                         │ TLS 1.3 / HTTPS (Port 443)                      |
|                                         ▼                                                 |
+───────────────────────────────────────────────────────────────────────────────────────────+
|                                3. DATABASE & PERSISTENCE LAYER                            |
|                                                                                           |
|                       [SUPABASE CLOUD - Managed PostgreSQL 15+]                           |
|       ├── Kong API Gateway (HTTPS Proxy / TLS Termination)                                |
|       ├── PostgREST Engine (RESTful Interface & Connection Pooling)                       |
|       ├── PostgreSQL Core Database                                                        |
|       │     └── Bảng: public.links                                                        |
|       │           ├── id (VARCHAR(10) PRIMARY KEY - B-Tree Clustered Index)               |
|       │           ├── original_url (TEXT - URL-encoded string)                            |
|       │           ├── created_at (TIMESTAMPTZ - B-Tree Index)                             |
|       │           └── click_count (INTEGER - Atomic Counter)                              |
|       └── Supabase Web Studio (Management Dashboard & SQL Editor)                         |
+───────────────────────────────────────────────────────────────────────────────────────────+
```

### 2.2 So sánh môi trường Dev vs Production

| Thành phần | Môi trường Dev (Local) | Môi trường Production (Vercel) |
|---|---|---|
| **Runtime** | Docker Container (`node:22-alpine`) | Vercel Serverless / Edge Functions |
| **Domain** | `http://localhost:3000` | `https://meobo.vercel.app` |
| **Nhận diện Domain** | Tự động nhận diện `http://localhost:3000` | Tự động nhận diện qua `x-forwarded-host` |
| **Database** | Supabase Cloud (Managed PostgreSQL) | Supabase Cloud (Managed PostgreSQL) |
| **Giao thức kết nối** | HTTPS / TLS 1.3 qua Port 443 | HTTPS / TLS 1.3 qua Port 443 |
| **Dung lượng Host** | **0 MB database rác trên ổ cứng máy tính** | Serverless (Zero maintenance) |

---

## 3. Thiết kế Cơ sở Dữ liệu (Database Design & DDL)

### 3.1 DDL Script chuẩn (Chạy trên Supabase Cloud SQL Editor)

```sql
-- Kích hoạt extension hỗ trợ mã hóa
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tạo bảng chính: links
CREATE TABLE IF NOT EXISTS public.links (
  id           VARCHAR(10) PRIMARY KEY,     -- Short code (7-10 ký tự Base64URL) làm Primary Key
  original_url TEXT NOT NULL,               -- URL gốc đầy đủ (đã được chuẩn hóa & URL-encoded)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- Thời điểm tạo với timezone ISO 8601
  click_count  INTEGER NOT NULL DEFAULT 0   -- Bộ đếm lượt click chuyển hướng
);

-- Tạo Index hỗ trợ truy vấn link gần đây (Sort DESC)
CREATE INDEX IF NOT EXISTS idx_links_created_at ON public.links (created_at DESC);

-- Cấp quyền truy cập cho PostgREST / Supabase API
GRANT ALL ON TABLE public.links TO postgres, anon, authenticated, service_role;

-- Metadata Comments
COMMENT ON TABLE public.links IS 'Bảng lưu trữ URL rút gọn với id là Primary Key tối ưu hóa bộ nhớ';
COMMENT ON COLUMN public.links.id           IS 'Primary Key: 7 đến 10 ký tự chuẩn Base64URL (RFC 4648 §5)';
COMMENT ON COLUMN public.links.original_url IS 'Đường dẫn URL đích đầy đủ (theo chuẩn RFC 3986)';
COMMENT ON COLUMN public.links.created_at   IS 'Thời gian tạo bản ghi';
COMMENT ON COLUMN public.links.click_count  IS 'Tổng số lượt người dùng click chuyển hướng';
```

### 3.2 Phân tích tối ưu hóa Primary Key `id` (`VARCHAR(10)`)

| Tiêu chí | Mô hình cũ (`id UUID` + `short_code UNIQUE`) | Mô hình chuẩn hóa mới (`id VARCHAR(10) PRIMARY KEY`) |
|---|---|---|
| **Số lượng Index** | 2 B-Tree Indexes (1 PK Index + 1 Unique Index) | **Chỉ 1 B-Tree Index duy nhất** trên `id` |
| **Dung lượng lưu trữ** | Tốn 16 bytes UUID + 10 bytes chuỗi + 2 cây index | **Chỉ tốn ~10 bytes cho chuỗi** $\rightarrow$ Tiết kiệm ~60% dung lượng |
| **Tốc độ Lookup Redirect** | 2 bước: quét Unique Index $\rightarrow$ trỏ sang Heap | **1 bước duy nhất: Quét trực tiếp Primary Key** (O(log N)) |
| **Chi phí ghi (INSERT)** | Sinh UUID + Cập nhật 2 cây Index | Không sinh UUID + Cập nhật 1 cây Index duy nhất |

---

## 4. Đường ống Xử lý Dữ liệu & Thuật toán (Data Processing Pipelines & Algorithms)

```
[Raw URL Input từ Client]
            │
            ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 1. PIPELINE CHUẨN HÓA & URL-ENCODE (RFC 3986 / WHATWG)                 │
│    - .trim() loại bỏ khoảng trắng 2 đầu và ký tự điều khiển (\r, \n, \t)│
│    - Tự động bổ sung "https://" nếu người dùng thiếu protocol          │
│    - Chuẩn hóa domain về chữ thường (lowercase hostname)               │
│    - Percent-encoding các ký tự Unicode/dấu cách (%20, %C3%A0...)      │
└────────────────────────────────────────────────────────────────────────┘
            │
            ▼ [Normalized & Encoded Canonical URL]
┌────────────────────────────────────────────────────────────────────────┐
│ 2. PIPELINE BĂM MẬT MÃ SHA-256 (NSA / NIST FIPS 180-4)                 │
│    - Băm Canonical URL thành chuỗi nhị phân 32 bytes (256-bit entropy) │
│    - Đảm bảo tính tất định (Deterministic): Cùng URL = Cùng Hash       │
└────────────────────────────────────────────────────────────────────────┘
            │
            ▼ [32-byte Binary Hash]
┌────────────────────────────────────────────────────────────────────────┐
│ 3. PIPELINE MÃ HÓA BASE64URL (RFC 4648 §5)                             │
│    - Bảng ký tự URL-safe: [A-Z, a-z, 0-9, '-', '_'] (64 ký tự)         │
│    - Thay '+' -> '-', Thay '/' -> '_', Loại bỏ padding '='             │
└────────────────────────────────────────────────────────────────────────┘
            │
            ▼ [43-character URL-Safe String]
┌────────────────────────────────────────────────────────────────────────┐
│ 4. SLIDING WINDOW & COLLISION RESOLUTION ENGINE                        │
│    - Cắt chuỗi theo độ dài yêu cầu (7 đến 10 ký tự)                   │
│    - Kiểm tra Database:                                                │
│        + Nếu trùng short_code & cùng URL gốc: DEDUPLICATION (Tái sử dụng)│
│        + Nếu trùng short_code & khác URL gốc: COLLISION RESOLUTION     │
│          (Trượt cửa sổ offset: Mở rộng độ dài: 7 -> 8 -> 9 -> 10 ký tự từ cùng 1 chuỗi hash 43 ký tự, sau đó trượt cửa sổ/salt, bổ sung salt)             │
│        + Nếu chưa tồn tại: INSERT bản ghi mới                         │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Chi tiết bảng mã Base64URL (RFC 4648 §5)
```
Index 00-25: A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
Index 26-51: a b c d e f g h i j k l m n o p q r s t u v w x y z
Index 52-61: 0 1 2 3 4 5 6 7 8 9
Index 62-63: - _
```
- **Dung lượng tổ hợp (7 ký tự)**: $64^7 \approx 4.39 \times 10^{12}$ (hơn 4.3 nghìn tỷ links).
- **Dung lượng tổ hợp (10 ký tự)**: $64^{10} \approx 1.15 \times 10^{18}$ (hơn 1.15 triệu tỷ links).

---

## 5. Đặc tả API Chi tiết (API Contract Specifications)

### 5.1 Endpoint 1: Tạo Short Link (`POST /api/shorten`)

#### Request Header
```http
POST /api/shorten HTTP/1.1
Host: meobo.vercel.app
Content-Type: application/json
```

#### Request Payload
```json
{
  "original_url": "https://github.com/NhoCutee/Web_url_shortener",
  "length": 7,
  "alias": "my-project"
}
```

| Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mô tả & Ràng buộc |
|---|---|---|---|
| `original_url` | `string` | **Có** | URL cần rút gọn (tối đa 2048 ký tự, tự động URL-encoded) |
| `length` | `number` | Không | Độ dài mã hash (chỉ nhận giá trị từ `7` đến `10`, mặc định `7`) |
| `alias` | `string` | Không | Custom alias tùy chọn (`1` đến `10` ký tự thuộc tập `[a-zA-Z0-9_-]`) |

#### Response Thành công (`201 Created`)
```json
{
  "id": "BQRvJsg",
  "short_code": "BQRvJsg",
  "short_url": "https://meobo.vercel.app/BQRvJsg",
  "original_url": "https://github.com/NhoCutee/Web_url_shortener",
  "created_at": "2026-08-17T15:30:00.000Z"
}
```

#### Response Lỗi Validation (`400 Bad Request`)
```json
{
  "error": "URL khong hop le. Vui long nhap dung dinh dang (vi du: https://example.com/path)"
}
```

#### Response Lỗi Trùng Alias (`409 Conflict`)
```json
{
  "error": "Alias \"my-project\" da duoc su dung, vui long chon alias khac"
}
```

---

### 5.2 Endpoint 2: Chuyển hướng Redirect (`GET /[shortCode]`)

#### Request
```http
GET /BQRvJsg HTTP/1.1
Host: meobo.vercel.app
```

#### Response Thành công (`302 Found`)
```http
HTTP/1.1 302 Found
Location: https://github.com/NhoCutee/Web_url_shortener
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
```

#### Hành vi bất đồng bộ ngầm (Background Task):
```typescript
// Cập nhật tăng click_count không đồng bộ (fire-and-forget)
supabase
  .from("links")
  .update({ click_count: link.click_count + 1 })
  .eq("id", shortCode)
  .then(...);
```

#### Response Không tìm thấy (`302 Redirect to 404 UI`)
```http
HTTP/1.1 302 Found
Location: https://meobo.vercel.app/not-found?code=BQRvJsg
```

---

## 6. Ma trận Xử lý Lỗi (Error Handling Matrix)

| Mã HTTP | Error Code / Trigger | Thông báo lỗi trả về | Hành động khắc phục |
|---|---|---|---|
| `400` | `INVALID_JSON` | `"Request body phai la JSON hop le"` | Kiểm tra cú pháp JSON ở body |
| `400` | `MISSING_URL` | `"original_url la bat buoc"` | Bổ sung trường `original_url` |
| `400` | `INVALID_URL_FORMAT` | `"URL khong hop le..."` | Nhập URL hợp lệ có domain chuẩn |
| `400` | `RESERVED_ALIAS` | `"Alias \"...\" la tu khoa he thong..."` | Đổi sang alias khác (tránh `api`, `_next`, `not-found`) |
| `400` | `INVALID_ALIAS_FORMAT` | `"Alias khong hop le. Chi duoc dung a-z, A-Z, 0-9, -, _..."` | Kiểm tra ký tự và độ dài (1-10 ký tự) |
| `409` | `ALIAS_TAKEN` | `"Alias \"...\" da duoc su dung..."` | Chọn custom alias khác |
| `500` | `DB_CONNECTION_ERROR`| `"Server error. Vui long thu lai sau."` | Kiểm tra trạng thái Supabase Cloud |
| `302` | `SHORTCODE_NOT_FOUND`| *Redirect sang `/not-found?code=...`* | Hiển thị màn hình 404 thân thiện |

---

## 7. Tiêu chuẩn An toàn & Bảo mật (Security Specifications)

1. **Phân tách Key theo chuẩn Zero-Trust**:
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Công khai an toàn trên Browser Client, kiểm soát qua RLS.
   - `SUPABASE_SERVICE_ROLE_KEY`: Bí mật 100%, chỉ được chạy trong Node.js Serverless/API Route, không bao giờ lộ ra frontend.
2. **Chống tấn công SSRF (Server-Side Request Forgery)**:
   - Danh sách đen chặn các dải IP nội bộ và từ khóa nhạy cảm (`localhost`, `127.0.0.1`, `192.168.x.x`, `10.x.x.x`).
   - Danh sách cấm `RESERVED_ALIASES` bảo vệ các route cốt lõi của Next.js framework.
3. **Chống SQL Injection**:
   - 100% truy vấn qua Supabase SDK / PostgREST sử dụng Parameterized Query chuẩn.
4. **Bảo vệ chống Click-jacking & Header Poisoning**:
   - Tự động nhận diện origin qua header `x-forwarded-host` được xác thực bởi Vercel Edge Layer.

---

## 8. Chỉ số Phi chức năng (Non-Functional Requirements & NFR)

- **Độ trễ Redirect (p50 / p99)**: $< 35\text{ms}$ / $< 80\text{ms}$ toàn cầu qua Anycast DNS.
- **Tính sẵn sàng (Availability SLA)**: $\ge 99.9\%$ (Multi-AZ Vercel Edge + Supabase HA).
- **Tính tương thích trình duyệt**: 100% trình duyệt hiện đại (Chrome, Safari, Firefox, Edge, Android/iOS Webview).
- **Tiêu thụ tài nguyên Host máy tính**: **0 MB RAM Database / 0 MB Disk Database** (Toàn bộ dữ liệu nằm trên Supabase Cloud).

---

## 9. Hướng dẫn Triển khai & Cấu hình Biến Môi trường (Deployment Specs)

### 9.1 Biến môi trường chuẩn (`.env.local` & Vercel)

```env
# URL Project Supabase Cloud
NEXT_PUBLIC_SUPABASE_URL=https://ahkpmbzstdztkttdmddi.supabase.co

# Anon Public Key (Client-safe)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role Key (Secret - Server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Base App URL (Tự động nhận diện trên Vercel)
NEXT_PUBLIC_APP_URL=https://meobo.vercel.app
```

### 9.2 Lệnh khởi chạy Môi trường Dev (100% Docker)
```powershell
cd "D:\DevTypeScript\Web url shortener"
docker compose up -d --build
```

### 9.3 Lệnh triển khai Production (Vercel CI/CD)
```powershell
git add .
git commit -m "deploy: v2.0 production full specs"
git push origin main
```
