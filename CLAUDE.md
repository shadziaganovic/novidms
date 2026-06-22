# DMS — Faza 1 — specifikacija za Claude Code

> Ovo je prompt za izgradnju MVP-a. Zalijepi ga u Claude Code kao polaznu specifikaciju.
> **Zlatno pravilo: gradi SAMO ono što je ovdje. Ako ti padne na pamet workflow, prava po dokumentu, pozicije, AI, templateovi — TO NE IDE SADA.** Sve to je Faza 2+.

---

## Što gradimo

Multi-tenant web DMS gdje firma ubaci dokument (PDF/DOCX/slika), sustav ga pročita OCR-om i indeksira, pa ga firma kasnije nađe **pretragom po sadržaju** — ne samo po nazivu datoteke.

Jedna rečenica: **ubaci → nađi.**

---

## Tech stack (drži se ovoga, ne predlaži alternative bez pitanja)

- **Next.js (App Router) + TypeScript** — jedan repo, frontend + API routes. NE odvajaj backend u zaseban servis.
- **PostgreSQL + Prisma** — baza i ORM.
- **Tailwind + shadcn/ui** — UI.
- **NextAuth** — autentikacija (email + lozinka za MVP je dovoljno).
- **S3-kompatibilan storage** — apstrahiraj iza jednog modula `lib/storage.ts` tako da se lako zamijeni provider (lokalni disk u devu, R2/Backblaze u produkciji).
- **Tesseract** (preko `tesseract.js` ili poziva na sustavni `tesseract`) za OCR. Apstrahiraj iza `lib/ocr.ts`.
- **Postgres full-text search** (`tsvector` + GIN indeks) — NE Elasticsearch.

---

## Podatkovni model (Prisma)

```prisma
model Tenant {
  id         String     @id @default(cuid())
  name       String
  plan       Plan       @default(BASIC)
  createdAt  DateTime   @default(now())
  users      User[]
  documents  Document[]
  categories Category[]
}

model User {
  id        String   @id @default(cuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  email     String   @unique
  name      String
  password  String   // hash (bcrypt/argon2)
  role      Role     @default(MEMBER)
  invitedAt DateTime?
  acceptedAt DateTime?
  createdAt DateTime @default(now())
  @@index([tenantId])
}

model Document {
  id           String     @id @default(cuid())
  tenantId     String
  tenant       Tenant     @relation(fields: [tenantId], references: [id])
  title        String
  description  String?
  fileKey      String     // ključ u storageu
  mimeType     String
  sizeBytes    Int
  ocrText      String?    @db.Text
  ocrStatus    OcrStatus  @default(PENDING)
  categoryId   String?
  category     Category?  @relation(fields: [categoryId], references: [id])
  partner      String?
  documentDate DateTime?
  uploadedById String
  createdAt    DateTime   @default(now())
  @@index([tenantId])
  @@index([tenantId, categoryId])
}

model Category {
  id        String     @id @default(cuid())
  tenantId  String
  tenant    Tenant     @relation(fields: [tenantId], references: [id])
  name      String
  documents Document[]
  @@index([tenantId])
}

model AuditEntry {
  id         String   @id @default(cuid())
  tenantId   String
  documentId String?
  userId     String
  action     String   // "UPLOAD" | "VIEW" | "DOWNLOAD" | "DELETE"
  createdAt  DateTime @default(now())
  @@index([tenantId, documentId])
}

enum Plan      { BASIC BUSINESS PROFESSIONAL }
enum Role      { ADMIN MEMBER }
enum OcrStatus { PENDING PROCESSING DONE FAILED }
```

Za full-text: dodaj raw SQL migraciju koja kreira generated `tsvector` kolonu nad `coalesce(title,'') || ' ' || coalesce(ocr_text,'') || ' ' || coalesce(partner,'')` i GIN indeks na nju. Pretraga ide preko `to_tsquery` / `plainto_tsquery`.

---

## NAJVAŽNIJE PRAVILO — tenant izolacija

**Svaki upit prema bazi koji dohvaća dokumente, kategorije ili korisnike MORA filtrirati po `tenantId` trenutno ulogiranog korisnika.** Nikad globalni dohvat. Napravi helper (npr. `getTenantContext()`) koji iz sesije izvuče `tenantId` i koristi ga svuda. Ako jedan upit procuri tuđe podatke, to je kritičan bug.

---

## Funkcije Faze 1 (točno ovo, ništa više)

1. **Auth + registracija firme.** Novi korisnik se registrira → kreira se Tenant + prvi User (ADMIN). Login/logout. Pozvani korisnici postavljaju lozinku preko invite linka.

2. **Pozivanje korisnika.** Admin upiše email → kreira se User (MEMBER, `invitedAt`) → (za MVP smije generirati invite link koji admin ručno proslijedi; slanje maila je opcionalno). Admin može: promijeniti ulogu (MEMBER↔ADMIN), ukloniti korisnika. Admin ne može ukloniti sebe.

3. **Upload dokumenta.** Drag-and-drop ili file picker. Prihvati PDF, DOCX, PNG, JPG. Spremi u storage, kreiraj Document (`ocrStatus = PENDING`). Pokreni OCR asinkrono (background job/route): izvuci tekst → spremi u `ocrText`, postavi `DONE` (ili `FAILED`). Za DOCX izvuci tekst direktno (mammoth), za PDF/slike Tesseract.

4. **Lista + pretraga dokumenata.** Lista dokumenata firme. Search bar koji radi full-text nad sadržajem (`ocrText`), naslovom i partnerom. Highlight pogotka u rezultatu. Filter po kategoriji.

5. **Detalj dokumenta.** Metapodaci (kategorija, partner, datum, veličina, tko dodao), prikaz izvučenog OCR teksta, status OCR-a, preuzimanje, jednostavna povijest (iz AuditEntry: tko dodao, tko otvorio). Admin može urediti metapodatke i obrisati dokument; member samo gleda i preuzima.

6. **Kategorije.** Admin CRUD kategorija (samo unutar svoje firme).

### Prava — samo dvije uloge, bez tablice dozvola
- **ADMIN:** sve unutar svoje firme (upload, brisanje, kategorije, korisnici, uređivanje metapodataka).
- **MEMBER:** pregled, pretraga, upload, preuzimanje. NE: brisanje, kategorije, korisnici.
- Provjera je trivijalna: `if (user.role !== 'ADMIN') return 403`. Nemoj graditi permission engine.

---

## ŠTO NE GRADITI U FAZI 1 (eksplicitno zabranjeno)

Ne implementiraj, ni djelomično, ni "za svaki slučaj":
- ❌ Workflow / odobravanja / statusi dokumenta (Draft, Na odobrenju...)
- ❌ Prava po dokumentu ili folderu / klasifikacije / security grupe
- ❌ Pozicije, hijerarhija, "reports to", acting, delegacije
- ❌ Email-in (punjenje dokumenata mailom)
- ❌ Kreiranje dokumenata iz templatea / generiranje PDF-a
- ❌ AI asistent / auto-prepoznavanje tipa dokumenta / inbox princip
- ❌ Verzije dokumenata, komentari
- ❌ Digitalni potpis
- ❌ Naprednu statistiku / izvoz

Ako misliš da nešto od ovoga "ide skupa" s nečim iz Faze 1 — NE. Pitaj prije nego dodaš.

---

## Redoslijed implementacije (predloženi)

1. Setup: Next.js + Prisma + Postgres, schema, migracije.
2. Tenant izolacija helper + auth (NextAuth) + registracija firme.
3. Storage modul + upload + spremanje Documenta (bez OCR-a još).
4. OCR modul + asinkrona obrada + `ocrText`.
5. Full-text migracija + lista + pretraga + highlight.
6. Detalj dokumenta + AuditEntry + povijest.
7. Kategorije CRUD.
8. Pozivanje korisnika + uloge.

Nakon svake cjeline: kratko provjeri da tenant izolacija nigdje ne curi.

---

## Definicija "gotovo" za Fazu 1

- Dvije firme mogu postojati istovremeno i NE vide međusobno ništa.
- Korisnik ubaci PDF, OCR ga pročita, i nađe ga pretragom po riječi koja je unutar dokumenta a NE u nazivu datoteke.
- Admin pozove člana, član se prijavi i radi u istoj firmi.
- Member ne može obrisati dokument ni dirati korisnike.
