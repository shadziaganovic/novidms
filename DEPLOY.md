# Deploy — živi link za testiranje (Vercel + Neon + Vercel Blob)

NOVIDMS se deploya na **Vercel** iz GitHub repoa (`shadziaganovic/novidms`).
Baza = **Neon** (Postgres), datoteke = **Vercel Blob**. Svaki `git push` na `main`
automatski radi novi deploy. Dobiveni URL šalješ kolegama na test.

## Što trebaš (jednokratno)
- Neon račun (već ga imaš za event-portal)
- Vercel račun (već ga imaš)
- (tek za korak 3 / AI) Anthropic API ključ

## Koraci

### 1. Neon baza
Neon → **New Project** (ili nova baza u postojećem projektu) → kopiraj
**connection string** (oblik `postgresql://...neon.tech/...?sslmode=require`).

### 2. Vercel projekt
Vercel → **Add New → Project** → **Import Git Repository** → odaberi
`shadziaganovic/novidms`. Framework se prepozna kao Next.js. **Ne klikaj Deploy
još** — prvo dodaj env varijable (korak 4).

### 3. Vercel Blob (storage za datoteke)
U Vercel projektu → **Storage → Create Database → Blob → Connect**.
Time se **automatski** doda varijabla `BLOB_READ_WRITE_TOKEN` (ne moraš je ručno
upisivati).

### 4. Env varijable (Vercel → Settings → Environment Variables)
| Ključ | Vrijednost |
|---|---|
| `DATABASE_URL` | Neon connection string iz koraka 1 |
| `AUTH_SECRET` | generiraj: `openssl rand -base64 32` |
| `STORAGE_PROVIDER` | `blob` |
| `OCR_LANGS` | `hrv+eng` |
| `NEXT_PUBLIC_APP_URL` | URL Vercel projekta (npr. `https://novidms.vercel.app`) |
| `BLOB_READ_WRITE_TOKEN` | (dodano automatski u koraku 3) |
| `ANTHROPIC_API_KEY` | (tek za korak 3 — AI) |

### 5. Deploy
Klikni **Deploy**. Build automatski pokreće `prisma migrate deploy` (kreira sve
tablice na Neonu) i `next build`. Kad završi, otvori URL → **Registriraj firmu** →
koristi.

## Pozivanje kolega na test
- Pošalji im URL. Svaki kolega može **registrirati svoju firmu** (potpuno izolirano),
  ILI ih **ti pozoveš** kao korisnike svoje firme: *Korisnici → Pozovi korisnika* →
  proslijediš im pozivni link.

## Napomene
- **Privatnost datoteka:** Blob datoteke se serviraju samo kroz prijavljene rute
  (`/api/documents/[id]/raw` i `/download`); blob URL se nikad ne otkriva korisnicima.
- **OCR:** PDF i DOCX rade brzo na serverlessu. Slikovni OCR (tesseract) može biti
  spor / na granici timeouta na Vercel **Hobby** planu — za skenirane slike koristi Pro.
- **Veličina uploada:** Vercel serverless ima limit veličine zahtjeva (~4.5 MB na
  Hobby planu). Tipični računi (~250 KB) su OK; za veće datoteke treba Pro plan.
- **Migracije:** kreću automatski na svakom deployu (`build` skripta). Lokalni dev i
  dalje koristi `disk` storage i Docker Postgres — ništa se ne mijenja.
