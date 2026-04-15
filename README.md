# Main Courante Electronique

Application SaaS multi-tenant pour la main courante d'agents de securite incendie.

## Fonctionnalites principales

- Authentification Credentials (Auth.js v5) + RBAC dynamique par tenant/site/equipe
- Dashboards par role:
  - Agent: saisie rapide, upload photo S3, offline queue/sync
  - Chef d'equipe: supervision equipe, stats, alertes inactivite, live polling
  - Client: analytics read-only, heatmap, exports CSV/PDF
  - Super Admin: multi-tenant, quotas, feature flags, operations
- Onboarding tenant (seed types evenement, invitations magic-link, checklist)
- API externe read-only (`/api/v1/entries`) avec API key + rate limiting
- Ops de base: status page, logs JSON, scripts cron backup/archivage

## Stack

- Next.js (App Router), React, Tailwind
- Prisma 7 + PostgreSQL
- Redis (optionnel en dev, fallback memoire)
- S3 (presigned URLs)
- Dexie + Workbox (offline/PWA)
- Recharts, TanStack Table, jsPDF, PapaParse

## Prerequis

- Node.js 20+
- PostgreSQL accessible (Neon ou local)
- (Optionnel) Redis pour sessions/rate-limit distribues

## Installation

```bash
npm install
```

## Configuration environnement

Copier l'exemple:

```bash
cp .env.example .env
```

Variables minimales:

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_URL`

Optionnelles selon usage:

- `REDIS_URL`
- `AWS_REGION`
- `S3_BUCKET_NAME`
- `S3_BACKUP_BUCKET`
- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`

## Initialisation base de donnees

```bash
npx prisma migrate dev -n "init"
npx prisma generate
```

## Bootstrap donnees de test

```bash
npm run bootstrap:dev
```

Comptes crees:

- Super Admin: `admin@demo.local` / `Admin1234!`
- Patron: `patron@demo.local` / `Patron1234!`
- Chef d'equipe: `chef@demo.local` / `Chef1234!`
- Agent: `agent@demo.local` / `Agent1234!`
- Client: `client@demo.local` / `Client1234!`

## Lancer l'application

```bash
npm run dev
```

- Login: `http://localhost:3000/login`
- Status: `http://localhost:3000/status`

## Scripts utiles

- `npm run bootstrap:dev` - seed complet tenant/roles/comptes
- `npm run db:wipe` - purge complete de la base
- `npm run ops:jobs` - jobs ops (archivage/backup)
- `npm run ops:swagger` - Swagger UI pour API externe

## Routes role-based

- Agent: `/agent/dashboard`
- Chef: `/chef/dashboard`
- Client: `/client/dashboard`
- Patron: `/patron/dashboard`
- Admin: `/admin/dashboard`
- Admin Ops: `/admin/operations`
- Admin Onboarding: `/admin/onboarding`

## API externe

- Endpoint: `GET /api/v1/entries`
- Auth: header `x-api-key`
- Filtres: `site_id`, `date_from`, `date_to`, `type`, `page`, `take`
- OpenAPI: `GET /api/v1/openapi`

## Documentation ops

Voir `docs/OPERATIONS.md` pour:

- onboarding tenant
- quotas SaaS
- retention/archivage
- backup/restore
- monitoring/alerting
