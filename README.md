# Training Unit Management — หนึ่งหมู่บ้าน หนึ่งเชฟอาหารไทย

เว็บแอปบริหารจัดการหน่วยฝึกอบรม หลักสูตร รุ่นฝึกอบรม วิทยากร ผู้เรียนรายบุคคล ผลการทดสอบมาตรฐาน
และ Dashboard สำหรับโครงการ "หนึ่งหมู่บ้าน หนึ่งเชฟอาหารไทย" (MHESI/อว.)

Planning/design docs (Phase A + Phase B review, 13 files + ERD/RBAC artifact) live at
`../../docs/planning/` relative to this folder (i.e. `D:\Claude\docs\planning\`) — read those
before changing architecture, RBAC, or data-model decisions here. This repo is the Phase C
(Implementation) output of that plan; do not duplicate planning content into this README.

## Status

- **M1 (Foundation)** — in progress. Next.js (TypeScript, App Router) skeleton scaffolded,
  local git repo initialized. Remote GitHub repo and staging-hosting provider not yet created —
  pending explicit confirmation from the project owner (per the Master Prompt's resource-creation
  approval rule, §17.4) before any external account/resource is created.
- **M2 (Database & Auth)** onward — not started.

## Stack (per `docs/planning/04-architecture-options.md`, approved in Phase B)

- Next.js (TypeScript, App Router) — frontend + backend API routes in one deploy
- PostgreSQL via a managed free-tier provider (Supabase/Neon — not yet chosen/created)
- Auth provider tied to the same DB service, with MFA for Web Master/Central Staff
- Object storage free-tier (Supabase Storage/Cloudflare R2 — not yet chosen) for unit photos (≤ 6/unit)
- Resend (or equivalent) for transactional email ("Generate User" credential delivery) — domain
  is `mhesi.go.th`, DNS (SPF/DKIM) access not yet confirmed; fallback is the provider's test domain

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
