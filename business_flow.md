# SnapLink — Luồng Nghiệp Vụ & Cách Hoạt Động

> Cập nhật: 2026-08-17 | Chuẩn hóa: **RFC 3986 (URL-Encoded Format)** | Thuật toán: **SHA-256 + Base64URL (RFC 4648 §5)**

---

## 1. Kiến trúc tổng thể hệ thống

```
Trình duyệt / Client (React App)
    │
    │  [1] fetch POST /api/shorten  (Tạo short link)
    │  [2] GET /:shortCode          (Click chuyển hướng)
    ▼
Next.js Server (Containerized Runtime)
    ├── src/lib/utils.ts               → Chuẩn hóa URL-encode & Thuật toán SHA-256 + Base64URL
    ├── src/app/api/shorten/route.ts   → API tạo, encode & deduplicate link
    ├── src/app/[shortCode]/route.ts   → API redirect 302 & tăng click
    └── src/lib/supabase.ts            → Supabase client factory
         │
         │ HTTPS / TLS (Port 443)
         ▼
    Supabase Cloud (Managed PostgreSQL)
         └── Bảng: public.links (short_code VARCHAR(10))
```

---

## 2. Cơ sở dữ liệu (PostgreSQL)

### Schema bảng `links`

```sql
CREATE TABLE links (
  
  id           VARCHAR(10) PRIMARY KEY,     -- Primary Key truc tiep chua ma short code        -- 7 đến 10 ký tự Base64URL
  original_url TEXT NOT NULL,               -- URL gốc đã được chuẩn hóa & URL-encoded
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  click_count  INTEGER NOT NULL DEFAULT 0,  -- Số lần click
  
);

-- short_code da la PRIMARY KEY nen da tu dong co clustered B-Tree index   -- Tối ưu hot-path redirect
CREATE INDEX idx_links_created_at ON links (created_at DESC);
```

---

## 3. Quy trình Chuẩn hóa & URL-Encoding (RFC 3986 / WHATWG)

Trước khi tính toán mã băm SHA-256 hoặc lưu vào cơ sở dữ liệu, `original_url` bắt buộc phải đi qua hàm `normalizeAndEncodeUrl`:

```
Input thô của người dùng
(ví dụ: "  https://github.com/NhoCutee/Web_url_shortener/  " hoặc "example.com/sản phẩm/tìm kiếm?q=hà nội")
               │
               ├─ [1] .trim() xóa sạch khoảng trắng ở 2 đầu và ký tự điều khiển (\r, \n, \t)
               ├─ [2] Tự động bổ sung "https://" nếu người dùng quên nhập protocol
               ├─ [3] Chuẩn hóa hostname về chữ thường (lowercase)
               ├─ [4] Encode to URL-encoded format: Percent-encoding (chuyển space thành %20, 
               │      tiếng Việt có dấu thành %C3%A0..., giữ nguyên cấu trúc query/path)
               │
               ▼
URL chuẩn hóa đầu ra (Canonical URL-Encoded Format)
(ví dụ: "https://github.com/NhoCutee/Web_url_shortener/" hoặc "https://example.com/s%E1%BA%A3n%20ph%E1%BA%A9m/t%C3%ACm%20ki%E1%BA%BFm?q=h%C3%A0%20n%E1%BB%99i")
```

### Lợi ích:
1. **Redirect 302 không bao giờ lỗi**: Khi chuyển hướng, trình duyệt nhận được chuỗi URL-encoded chuẩn mực và mở chính xác tài nguyên đích mà không bị 404 hoặc corrupt query.
2. **Khử trùng lặp chính xác (Deduplication)**: Dù người dùng gõ `github.com/...`, `https://github.com/...` hay thêm khoảng trắng thừa ở 2 đầu, hệ thống đều chuẩn hóa về cùng một chuỗi trước khi băm SHA-256 $\rightarrow$ cùng sinh ra 1 short code duy nhất.

---

## 4. Thuật toán tạo mã Short Code (SHA-256 + Base64URL RFC 4648 §5)

### 4.1 Bảng ký tự chuẩn Base64URL

Sử dụng bộ 64 ký tự chuẩn quốc tế theo **RFC 4648 §5** (chuẩn URL-safe không cần escape):
```
A B C D E F G H I J K L M N O P Q R S T U V W X Y Z  (26 chữ hoa)
a b c d e f g h i j k l m n o p q r s t u v w x y z  (26 chữ thường)
0 1 2 3 4 5 6 7 8 9                                  (10 chữ số)
- _                                                  (2 ký tự an toàn URL)
= 64 ký tự (Không chứa dấu gạch chéo '/', cộng '+', hay padding '=')
```

### 4.2 Sơ đồ chuyển đổi dữ liệu

```
[Normalized & URL-Encoded URL]
               │
               ▼
[SHA-256 Hash Digest] ──► 32 bytes nhị phân (256-bit entropy)
               │
               ▼
[Base64URL Encode]    ──► Chuỗi 43 ký tự an toàn URL: "BQRvJsg-jIe8w6..."
               │
               ▼
[Sliding Window Slice]──► Cắt lấy 7 đến 10 ký tự: "BQRvJsg" hoặc "BQRvJsg-jI"
```

---

## 5. Luồng 1 — Tạo & Khử trùng lặp URL (POST /api/shorten)

### 5.1 Request Contract

```json
POST /api/shorten
Content-Type: application/json

{
  "original_url": "https://example.com/san pham?q=dien thoai",
  "length": 7,        // Tùy chọn: 7, 8, 9 hoặc 10 (mặc định 7)
  "alias": "my-link"  // Tùy chọn: Custom alias (1-10 ký tự)
}
```

### 5.2 Sơ đồ luồng xử lý

```
Nhận Request
  │
  ├─ [1] Parse & Validate JSON Body
  │
  ├─ [2] Chuyển đổi qua normalizeAndEncodeUrl()
  │        ├─ Lỗi định dạng / Hostname không hợp lệ → 400 "URL không hợp lệ"
  │        └─ Thành công → Có chuỗi normalizedUrl chuẩn RFC 3986
  │
  ├─ [3] Nhánh A: Có Custom Alias
  │        ├─ Trùng từ khóa hệ thống (api, not-found, ...) → 400
  │        ├─ Sai định dạng /^[a-zA-Z0-9_-]{1,10}$/ → 400
  │        ├─ Query DB kiểm tra alias:
  │        │    ├─ Đã tồn tại & cùng normalizedUrl → 201 (Tái sử dụng)
  │        │    ├─ Đã tồn tại & khác normalizedUrl → 409 "Alias đã được sử dụng"
  │        │    └─ Chưa tồn tại → INSERT → 201 Created
  │
  └─ [4] Nhánh B: Sinh tự động qua SHA-256 + Base64URL
           │
           Loop tối đa attempt = 0 .. 4 (5 lần):
             ├─ Sinh short_code = generateHashShortCode(normalizedUrl, length, attempt)
             ├─ Query DB kiểm tra short_code:
             │    ├─ Tồn tại & CÙNG normalizedUrl:
             │    │    └──► [Deduplication] Trả về link đã có sẵn (201) ✅
             │    ├─ Tồn tại & KHÁC normalizedUrl (Collision):
             │    │    └──► Trượt offset hash (+2) & thêm salt → thử lại vòng lặp 🔄
             │    └─ Chưa tồn tại:
             │         └──► INSERT vào DB → Trả về kết quả mới (201) ✅
             └─ Sau 5 lần vẫn trùng → 500 "Không thể tạo short code"
```

---

## 6. Luồng 2 — Chuyển hướng Redirect (GET /[shortCode])

### Sơ đồ luồng xử lý

```
Người dùng truy cập: http://localhost:3000/BQRvJsg
                                         ^^^^^^^
                                     shortCode = "BQRvJsg"
  │
  ├─ [Guard] Độ dài shortCode > 10 ký tự → Redirect /not-found
  │
  ├─ [Query DB] SELECT id, original_url, click_count 
  │             FROM links WHERE short_code = 'BQRvJsg'
  │     │
  │     ├─ Không tìm thấy (Error / null)
  │     │    └──► 302 Redirect → /not-found?code=BQRvJsg
  │     │
  │     └─ Tìm thấy bản ghi:
  │          │
  │          ├─ [Async Fire-and-Forget] 
  │          │    UPDATE links SET click_count = click_count + 1 WHERE id = link.id
  │          │    (Chạy ngầm, không await để tối đa hóa tốc độ phản hồi)
  │          │
  │          └─ 302 Redirect → original_url (URL đã được URL-encoded chuẩn)
```
