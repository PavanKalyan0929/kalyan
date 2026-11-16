# Andhra Student Hub (ASH) — Deployment & Operations Guide

## 1. Architecture Summary
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 (`src/`)
- **Backend**: Node.js 22 + Express (`server.ts`, `server/`)
- **Database**: Cloud SQL for PostgreSQL (`asia-southeast1`) via Drizzle ORM (`src/db/index.ts`, `src/db/schema.ts`, `drizzle-kit`)
- **Authentication**: Firebase Authentication (Google Sign-In ID tokens verified server-side by `firebase-admin`)
- **Private Uploads**: Local/persistent filesystem (`storage/uploads/`) served exclusively via authenticated, role-and-tenant-authorized `/api/files/*` routes
- **Local AI (Optional)**: Ollama (`llama3.2:3b` or `qwen2.5:3b`) with deterministic offline rule-based fallback
- **Proposed Domain**: `www.ashstudenthub.com`

---

## 2. Environment Variables
Copy `.env.example` to `.env` and configure:
- `NODE_ENV=production`
- `PORT=3000`
- `APP_BASE_URL=https://www.ashstudenthub.com`
- `ASH_PROPOSED_DOMAIN=www.ashstudenthub.com`
- `ALLOWED_ORIGINS=https://www.ashstudenthub.com`
- **Cloud SQL PostgreSQL** (automatically injected in AI Studio / Cloud Run):
  - `SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD`
- `UPLOAD_DIR=./storage/uploads`
- **Optional Local AI**:
  - `OLLAMA_BASE_URL=http://127.0.0.1:11434`
  - `OLLAMA_MODEL=llama3.2:3b`
- **Optional SMS OTP Gateway** (leave empty if unconfigured; returns honest `503`):
  - `SMS_PROVIDER_ID`, `SMS_PROVIDER_API_KEY`, `SMS_SENDER_ID`
- **Optional SMTP Email Alerts** (leave empty if unconfigured):
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- **Optional Payment Gateway & Signed Webhook** (leave empty if unconfigured; returns honest `503`):
  - `PAYMENT_PROVIDER`, `PAYMENT_PROVIDER_KEY_ID`, `PAYMENT_PROVIDER_KEY_SECRET`, `PAYMENT_WEBHOOK_SECRET`

---

## 3. Schema Migration, Seeding & Startup Commands
```bash
npm install
npx drizzle-kit push --config=src/db/drizzle.config.ts   # Apply Drizzle schema to Cloud SQL PostgreSQL
npm run seed          # Seeds verifiable public AP colleges, scholarships, exams, NPTEL tracks
npm run lint          # TypeScript check (tsc --noEmit)
npm test              # Automated integration tests (Cloud SQL + Firebase test token verifier)
npm run build         # Builds production React bundle into dist/
npm run dev           # Starts Express + Vite dev server on port 3000
npm start             # Starts production Express server serving dist/ on port 3000
```

First-time State Administrator initialization:
1. Sign in with Google at `/setup` (active only when zero `state_admin` users exist in Cloud SQL).
2. Confirm State Administrator initialization — the bootstrap endpoint permanently locks (`403`) once the first `state_admin` is created.
3. State Administrators then provision College Administrators by official email in `/state-admin` without temporary passwords.

---

## 4. Custom Domain (`www.ashstudenthub.com`) & HTTPS Setup
1. Provision a Cloud Run / Compute Engine / reverse-proxy deployment behind TLS (Google-managed SSL certificates on Cloud Run Custom Domain Mapping or Caddy/Nginx with Let's Encrypt).
2. Point DNS `A` / `CNAME` records for `www.ashstudenthub.com` and apex `ashstudenthub.com` (redirecting apex -> `https://www.ashstudenthub.com`).
3. Add `www.ashstudenthub.com` to Firebase Console -> Authentication -> Settings -> Authorized Domains so Google Sign-In works cleanly.
4. Set `APP_BASE_URL=https://www.ashstudenthub.com` and `ALLOWED_ORIGINS=https://www.ashstudenthub.com`.

---

## 5. Database Backups & Persistent Storage
- Enable automated daily Cloud SQL backups and point-in-time recovery (PITR) on PostgreSQL instance `ai-studio-a276a6a7`.
- Mount persistent disk storage or Cloud Storage FUSE for `UPLOAD_DIR` (`storage/uploads/`) so student verification IDs, grievance attachments, and approved institutional photos survive container restarts.

---

## 6. Optional Local AI Setup (Ollama)
```bash
ollama pull llama3.2:3b
ollama serve
```
When Ollama is unavailable, ASH automatically runs its built-in rule-based fallback for both the Student AI Assistant and Grievance Advisory Triage without errors or paid API costs.
