# SnapLink — Luồng Nghiệp Vụ & Cách Hoạt Động

> Cập nhật: 2026-08-17 | Phiên bản thuật toán: **SHA-256 + Base64URL (RFC 4648 §5)**

---

## 1. Kiến trúc tổng thể hệ thống

```
Trình duyệt / Client (React App)
    │
    │  [1] fetch POST /api/shorten  (Tạo short link)
    │  [2] GET /:shortCode          (Click chuyển hướng)
    ▼
Next.js Server (Containerized Runtime)
    ├── src/lib/utils.ts               → Thuật toán SHA-256 + Base64URL (RFC 4648)
    ├── src/app/api/shorten/route.ts   → API tạo & deduplicate link
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
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code   VARCHAR(10) NOT NULL,        -- 7 đến 10 ký tự Base64URL
  original_url TEXT NOT NULL,               -- URL gốc đầy đủ
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  click_count  INTEGER NOT NULL DEFAULT 0,  -- Số lần click
  CONSTRAINT links_short_code_unique UNIQUE (short_code)
);

CREATE INDEX idx_links_short_code ON links (short_code);   -- Tối ưu hot-path redirect
CREATE INDEX idx_links_created_at ON links (created_at DESC);
```

### Giải thích thiết kế

| Cột | Kiểu | Ý nghĩa thiết kế |
|---|---|---|
| `id` | UUID | Khóa chính tự sinh ngẫu nhiên, bảo mật |
| `short_code` | `VARCHAR(10)` | Lưu mã hash 7-10 ký tự hoặc custom alias (1-10 ký tự) |
| `original_url` | `TEXT` | Không giới hạn độ dài URL đầu vào (tối đa 2048 ký tự theo chuẩn RFC) |
| `created_at` | `TIMESTAMPTZ` | Thời điểm tạo có múi giờ chuẩn ISO |
| `click_count` | `INTEGER` | Bộ đếm lượt click, cập nhật nguyên tử (atomic increment) |

---

## 3. Thuật toán tạo mã Short Code (SHA-256 + Base64URL RFC 4648 §5)

### 3.1 Bảng ký tự chuẩn Base64URL

Sử dụng bộ 64 ký tự chuẩn quốc tế theo **RFC 4648 §5** (tương tự chuẩn mã hóa JWT/OAuth):
```
A B C D E F G H I J K L M N O P Q R S T U V W X Y Z  (26 chữ hoa)
a b c d e f g h i j k l m n o p q r s t u v w x y z  (26 chữ thường)
0 1 2 3 4 5 6 7 8 9                                  (10 chữ số)
- _                                                  (2 ký tự an toàn URL)
= 64 ký tự (Không chứa dấu gạch chéo '/', cộng '+', hay padding '=')
```

### 3.2 Sơ đồ chuyển đổi dữ liệu

```
[Original URL: "https://google.com"]
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

### 3.3 Không gian mẫu & Khả năng chịu tải

$$\text{Dung lượng tối thiểu (7 ký tự)} = 64^7 \approx 4,398,046,511,104 \text{ (hơn 4.3 nghìn tỷ combination)}$$
$$\text{Dung lượng tối đa (10 ký tự)} = 64^{10} \approx 1,152,921,504,606,846,976 \text{ (1.15 triệu tỷ combination)}$$

---

## 4. Luồng 1 — Tạo & Khử trùng lặp URL (POST /api/shorten)

### 4.1 Request Contract

```json
POST /api/shorten
Content-Type: application/json

{
  "original_url": "https://example.com/duong-dan-rat-dai",
  "length": 7,        // Tùy chọn: 7, 8, 9 hoặc 10 (mặc định 7)
  "alias": "my-link"  // Tùy chọn: Custom alias (1-10 ký tự)
}
```

### 4.2 Sơ đồ luồng xử lý

```
Nhận Request
  │
  ├─ [1] Parse & Validate JSON
  │        ├─ Body không hợp lệ → 400 "Request body phải là JSON hợp lệ"
  │        └─ original_url rỗng / không phải string → 400 "original_url là bắt buộc"
  │
  ├─ [2] Validate URL Format
  │        ├─ new URL(url) lỗi / Protocol != http(s) → 400 "URL không hợp lệ"
  │        └─ Length > 2048 ký tự → 400 "URL vượt quá 2048 ký tự"
  │
  ├─ [3] Nhánh A: Có Custom Alias
  │        ├─ Trùng từ khóa hệ thống (api, not-found, ...) → 400 "Alias là từ khóa hệ thống"
  │        ├─ Sai định dạng /^[a-zA-Z0-9_-]{1,10}$/ → 400 "Alias không hợp lệ"
  │        ├─ Query DB kiểm tra alias:
  │        │    ├─ Đã tồn tại & cùng URL gốc → 201 (Tái sử dụng)
  │        │    ├─ Đã tồn tại & khác URL gốc → 409 "Alias đã được sử dụng"
  │        │    └─ Chưa tồn tại → INSERT → 201 Created
  │
  └─ [4] Nhánh B: Sinh tự động qua SHA-256 + Base64URL
           │
           Loop tối đa attempt = 0 .. 4 (5 lần):
             ├─ Sinh short_code = generateHashShortCode(url, length, attempt)
             ├─ Query DB kiểm tra short_code:
             │    ├─ Tồn tại & CÙNG URL gốc:
             │    │    └──► [Deduplication] Trả về link đã có sẵn (201) ✅
             │    ├─ Tồn tại & KHÁC URL gốc (Collision):
             │    │    └──► Trượt offset hash (+2) & thêm salt → thử lại vòng lặp 🔄
             │    └─ Chưa tồn tại:
             │         └──► INSERT vào DB → Trả về kết quả mới (201) ✅
             └─ Sau 5 lần vẫn trùng (xác suất ~0) → 500 "Không thể tạo short code"
```

### 4.3 Cơ chế Khử trùng lặp (Deduplication / Idempotent)
- Nhờ tính chất tất định (deterministic) của SHA-256, cùng 1 URL khi người dùng bấm rút gọn nhiều lần sẽ luôn cho ra cùng 1 short code.
- Hệ thống phát hiện link đã tồn tại và trả về ngay kết quả cũ mà không tạo thêm bản ghi rác, giúp tối ưu dung lượng lưu trữ database.

---

## 5. Luồng 2 — Chuyển hướng Redirect (GET /[shortCode])

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
  │          └─ 302 Redirect → original_url (Ví dụ: https://google.com)
```

---

## 6. Xử lý lỗi & Bảng mã phản hồi (Error Matrix)

| Endpoint | HTTP Status | Error Message / Code | Nguyên nhân |
|---|---|---|---|
| `POST /api/shorten` | `400` | `Request body phai la JSON hop le` | Body gửi lên không đúng định dạng JSON |
| `POST /api/shorten` | `400` | `original_url la bat buoc` | Thiếu trường `original_url` |
| `POST /api/shorten` | `400` | `URL khong hop le...` | URL sai cú pháp hoặc không phải http/https |
| `POST /api/shorten` | `400` | `Alias "..." la tu khoa he thong...` | Alias trùng `api`, `not-found`, `_next`, `static`, ... |
| `POST /api/shorten` | `400` | `Alias khong hop le...` | Alias chứa ký tự lạ hoặc dài hơn 10 ký tự |
| `POST /api/shorten` | `409` | `Alias "..." da duoc su dung...` | Alias đã bị link khác đăng ký trước |
| `POST /api/shorten` | `500` | `Server error. Vui long thu lai sau.` | Lỗi kết nối Supabase Cloud |
| `GET /[shortCode]` | `302` | *Redirect to `/not-found`* | shortCode không tồn tại trong hệ thống |
| `GET /[shortCode]` | `302` | *Redirect to `original_url`* | Chuyển hướng thành công sang trang đích |

---

## 7. Giao diện người dùng (Client Component - `page.tsx`)

1. **Nhập URL**: Hỗ trợ dán đường dẫn dài với autofocus và validation tức thì.
2. **Tùy chọn độ dài (7 - 10 chars)**: Dropdown cho phép chọn độ dài chuỗi băm (7, 8, 9 hoặc 10 ký tự).
3. **Custom Alias**: Hộp nhập alias tùy chỉnh (tối đa 10 ký tự Base64URL).
4. **Hộp kết quả**:
   - Hiển thị Short URL đầy đủ kèm đường dẫn gốc rút gọn.
   - Nút **Sao chép (Copy to Clipboard)** với phản hồi visual ("✓ Đã sao chép") trong 2 giây.
5. **Danh sách gần đây (Recent Links)**:
   - Hiển thị các link vừa tạo trong phiên làm việc.
   - Mỗi link có nút sao chép độc lập và badge hiển thị độ dài ký tự (`7 chars`, `10 chars`).
