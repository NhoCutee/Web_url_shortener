# SnapLink - URL Shortener

> Rut gon URL nhanh chong, theo doi luot click, chay 100% tren Docker khi dev.

---

## Kien truc tong quan

```
+------------------------------------------+     +------------------------------------------+
|          DEV (Local Docker)              |     |       PROD (Cloud)                       |
|                                          |     |                                          |
|  [Browser]                               |     |  [Browser]                               |
|      |                                   |     |      |                                   |
|      v                                   |     |      v                                   |
|  localhost:3000                           |     |  vercel.app (Next.js Serverless)         |
|  [Next.js Container - Docker]            |     |      |                                   |
|      |                                   |     |      v                                   |
|      | host.docker.internal:54321        |     |  Supabase Cloud                          |
|      v                                   |     |  (Postgres managed + API + Auth)         |
|  [Supabase Local Stack - Docker]         |     |                                          |
|      |- API Gateway (Kong): 54321        |     +------------------------------------------+
|      |- Postgres DB:        54322        |
|      |- Supabase Studio UI: 54323        |
|                                          |
+------------------------------------------+

Stack:
  Frontend + Backend : Next.js 15 (App Router, TypeScript)
  Database           : Supabase (Postgres)
  Dev DB             : Supabase CLI (chay local qua Docker)
  Prod               : Vercel + Supabase Cloud
```

---

## Schema Database

```sql
-- Bang chinh: links
CREATE TABLE links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code   VARCHAR(7) NOT NULL UNIQUE,  -- 7 ky tu base62, ~3.5 ty combination
  original_url TEXT NOT NULL,               -- URL goc day du
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  click_count  INTEGER NOT NULL DEFAULT 0   -- tang moi khi redirect
);

-- Indexes
CREATE INDEX idx_links_short_code ON links (short_code);  -- hot path redirect
CREATE INDEX idx_links_created_at ON links (created_at DESC);  -- recent links query
```

---

## Cau truc thu muc

```
url-shortener/
├── supabase/
│   ├── config.toml              # Cau hinh Supabase local
│   └── migrations/
│       └── 20240101000000_create_links_table.sql
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Trang chu (UI chinh)
│   │   ├── globals.css          # Design system CSS
│   │   ├── [shortCode]/
│   │   │   └── route.ts         # GET /:shortCode -> redirect
│   │   ├── api/shorten/
│   │   │   └── route.ts         # POST /api/shorten
│   │   └── not-found/
│   │       └── page.tsx         # Trang 404
│   ├── lib/
│   │   ├── supabase.ts          # Supabase client (client + server)
│   │   └── utils.ts             # generateShortCode, isValidUrl, ...
│   └── types/
│       └── database.ts          # TypeScript types cho Supabase schema
├── Dockerfile                   # Next.js Docker image
├── docker-compose.yml           # Dev stack
├── .env.local                   # Bien moi truong dev (KHONG commit)
├── .env.example                 # Template bien moi truong
├── package.json
└── tsconfig.json
```

---

## Huong dan Setup Local (tu dau)

### Yeu cau
- Docker Desktop da cai va dang chay
- Git

### Buoc 1: Clone project

```bash
git clone <repo-url>
cd url-shortener
```

### Buoc 2: Cai Supabase CLI va khoi dong Supabase local

**Cach 1: Dung npx (KHONG can cai global, khuyen dung)**

```bash
# Kiem tra phien ban
npx supabase --version

# Khoi tao (neu chua co supabase/config.toml)
npx supabase init

# Khoi dong toan bo Supabase stack tren Docker
npx supabase start
```

**Cach 2: Dung Docker truc tiep (neu khong co npx)**

```bash
docker run --rm -v //var/run/docker.sock:/var/run/docker.sock \
  -v $(pwd):/workdir \
  supabase/cli:latest supabase start
```

**Cac port duoc expose khi Supabase start:**

| Port  | Service              | Dung de                                    |
|-------|----------------------|--------------------------------------------|
| 54321 | API Gateway (Kong)   | NEXT_PUBLIC_SUPABASE_URL trong .env.local  |
| 54322 | Postgres DB          | Ket noi DB truc tiep (psql, DBeaver, ...)  |
| 54323 | Supabase Studio      | GUI quan ly DB (mo browser: localhost:54323) |
| 54324 | Inbucket (email)     | Test email auth local                      |

Sau khi start, chay `npx supabase status` de xem cac key:

```
         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
  S3 Storage URL: http://127.0.0.1:54321/storage/v1/s3
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323         <-- Mo cai nay trong browser
    Inbucket URL: http://127.0.0.1:54324
        anon key: eyJhbGc...  <-- NEXT_PUBLIC_SUPABASE_ANON_KEY
service_role key: eyJhbGc...  <-- SUPABASE_SERVICE_ROLE_KEY
```

### Buoc 3: Chay migration

```bash
# Ap dung tat ca migration files len Supabase local
npx supabase db reset

# Hoac chi ap migration moi (khong reset data)
npx supabase migration up
```

### Buoc 4: Cau hinh bien moi truong

Sao chep file template:
```bash
copy .env.example .env.local   # Windows
cp .env.example .env.local     # Mac/Linux
```

Chinh sua `.env.local` voi gia tri lay tu `npx supabase status`:

```env
# Quan trong: tu DOCKER CONTAINER goi Supabase, phai dung host.docker.internal
# khong phai localhost (localhost trong container tro den chinh container do)
NEXT_PUBLIC_SUPABASE_URL=http://host.docker.internal:54321

NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key tu supabase status>
SUPABASE_SERVICE_ROLE_KEY=<service_role key tu supabase status>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Buoc 5: Build va chay Next.js container

```bash
# Lan dau (hoac khi thay doi Dockerfile/package.json)
docker compose up --build

# Lan sau (khong can build lai)
docker compose up

# Chay background
docker compose up -d

# Xem log real-time
docker compose logs -f nextjs

# Vao shell ben trong container de debug
docker compose exec nextjs sh

# Dung lai
docker compose down
```

Mo browser: **http://localhost:3000**

---

## Tao Supabase Cloud Project va Migrate Schema

1. Dang ky tai https://supabase.com
2. Tao project moi (chon region gan nhat)
3. Sau khi project ready, vao **Project Settings > API** de lay:
   - `Project URL` → dung lam `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

4. Ap dung schema len cloud:
   ```bash
   # Link CLI voi cloud project
   npx supabase link --project-ref <project-ref-tu-dashboard>

   # Push tat ca migrations len cloud
   npx supabase db push
   ```

5. Hoac copy-paste noi dung `supabase/migrations/20240101000000_create_links_table.sql`
   vao **SQL Editor** tren Supabase Dashboard va bam Run.

---

## Deploy Vercel

### Buoc 1: Push code len GitHub

```bash
git add .
git commit -m "feat: initial url shortener"
git push origin main
```

### Buoc 2: Import project tren Vercel

1. Vao https://vercel.com/new
2. Import tu GitHub repository
3. Framework Preset: **Next.js** (tu dong detect)
4. Giu cai dat mac dinh, bam **Deploy**

### Buoc 3: Set Environment Variables tren Vercel

Vao **Project Settings > Environment Variables**, them 4 bien:

| Key                           | Value                             | Environment  |
|-------------------------------|-----------------------------------|--------------|
| NEXT_PUBLIC_SUPABASE_URL      | https://<project-ref>.supabase.co | Production   |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | <anon key tu Supabase cloud>      | Production   |
| SUPABASE_SERVICE_ROLE_KEY     | <service_role key - PRIVATE>      | Production   |
| NEXT_PUBLIC_APP_URL           | https://<your-app>.vercel.app     | Production   |

> [!IMPORTANT]
> `SUPABASE_SERVICE_ROLE_KEY` phai duoc set la **Sensitive** (encrypt) tren Vercel.
> Tuyet doi khong commit key nay vao git.

### Buoc 4: Redeploy

Sau khi set env vars, bam **Redeploy** de ap dung.

---

## Lenh tham khao nhanh

```bash
# Supabase
npx supabase start              # Khoi dong Supabase local
npx supabase stop               # Dung Supabase (giu data)
npx supabase stop --backup      # Dung va backup data
npx supabase status             # Xem URL + API keys
npx supabase db reset           # Reset DB + chay lai tat ca migrations
npx supabase migration new <name>  # Tao migration file moi
npx supabase gen-types typescript --local > src/types/database.ts  # Sinh types tu schema

# Docker / Next.js
docker compose up --build       # Build va chay
docker compose up -d            # Chay background
docker compose logs -f nextjs   # Xem log
docker compose exec nextjs sh   # Vao shell container
docker compose down             # Dung tat ca containers
docker compose down -v          # Dung + xoa volumes (mat build cache)
```

---

## FAQ

**Q: `supabase start` bao loi "Docker is not running"?**
> Mo Docker Desktop truoc, doi cho bieu tuong Docker tren taskbar doi mau (dang chay), roi thu lai.

**Q: Next.js container khong ket noi duoc Supabase?**
> Kiem tra `.env.local`: phai dung `host.docker.internal:54321`, khong phai `localhost:54321`.
> Tren Linux: them `extra_hosts: ["host.docker.internal:host-gateway"]` vao docker-compose.yml.

**Q: Thay doi code khong thay refresh?**
> Docker volume mount dang hoat dong. Thu refresh tay hoac kiem tra Next.js Fast Refresh cai console.

**Q: Muon xem du lieu trong DB?**
> Mo http://localhost:54323 (Supabase Studio) -> chon bang `links` -> xem/sua du lieu truc tiep.