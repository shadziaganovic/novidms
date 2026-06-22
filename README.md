# NOVIDMS

Multi-tenant web DMS — **ubaci → nađi**. Firma ubaci dokument (PDF/DOCX/slika),
sustav ga pročita OCR-om i indeksira, pa ga firma nađe pretragom po sadržaju.

Stack: Next.js 16 (App Router) · TypeScript · PostgreSQL + Prisma 6 · Tailwind 4 ·
vlastiti cookie-session auth · S3-kompatibilan storage (lokalni disk u devu) ·
tesseract.js / mammoth / unpdf za OCR · Postgres full-text search.

## Lokalni development

Node se koristi iz lokalne instalacije:

```bash
export PATH="$HOME/.local/node-v24.16.0-darwin-arm64/bin:$PATH"
```

### 1. Baza (Postgres u Dockeru)

```bash
docker run -d --name novidms-postgres \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=novidms \
  -p 5433:5432 postgres:16
```

### 2. Env

Kopiraj `.env.example` u `.env` i postavi `AUTH_SECRET` (`openssl rand -base64 32`).

### 3. Instalacija + migracije

```bash
npm install
npm run db:migrate
npm run dev
```

App: http://localhost:3000

## Faza 1 — opseg

Vidi `CLAUDE.md`. Gradi se SAMO ono što je tamo navedeno.
