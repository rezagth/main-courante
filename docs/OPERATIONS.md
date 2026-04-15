# Operations Guide

## Architecture Overview

Main Courante is a cloud-native multi-tenant SaaS with the following stack:

- **Frontend**: Next.js 16 + React 19
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL 16+ (managed)
- **Cache**: Redis 7+
- **Storage**: AWS S3 + CloudFront CDN
- **Monitoring**: Sentry + custom JSON logs
- **Payments**: Stripe
- **Authentication**: NextAuth.js v5

---

## Tenant Onboarding
- API: `POST /api/onboarding/tenant`
- Payload: `name`, `domain`, `adminEmail`, `tempPassword`, `inviteEmails[]`
- Provisioning automatique:
  - tenant + admin initial
  - quotas par defaut
  - policy retention par defaut
  - checklist onboarding
  - types d'evenements par defaut (ronde, alarme, anomalie, observation, intervention)
  - invitation magic-link 24h

## Quotas SaaS
- API Super Admin: `GET/PATCH /api/admin/quotas`
- Enforcement:
  - creation d'entree -> quota `entries_month`
  - upload photo -> quota `storage_gb`
- Erreur de depassement: HTTP `402` + message explicite

## Retention / Archivage
- Job quotidien: `npm run ops:jobs`
- Logique:
  - entrees au-dela de `active_years` -> copie `archived_entries` + soft delete
  - purge physique archive uniquement via action explicite Super Admin (a implementer en procedure)

## Backup / Restore
- Backup PostgreSQL quotidien (03:00): `pg_dump` vers S3 (`S3_BACKUP_BUCKET`)
- Retention:
  - quotidien: 7 jours
  - hebdo: 4 semaines (strategie a completer selon prefixes weekly)
- Restore:
  - `.\scripts\restore-db.ps1 -DumpFile ".\backup.sql" -DatabaseUrl "$env:DATABASE_URL"`

## S3 backup
- Activer le versioning bucket:
  - `aws s3api put-bucket-versioning --bucket <bucket> --versioning-configuration Status=Enabled`

## Monitoring & observability
- Sentry front/back: `sentry.client.config.ts`, `sentry.server.config.ts`
- Logs structures JSON: `src/lib/logger.ts`
- Status public: `/status` et `/api/status`
- Alerting thresholds:
  - erreur rate > 1%
  - latence p95 > 2000 ms

## API externe read-only
- Endpoint: `GET /api/v1/entries`
- Auth: header `x-api-key`
- Filtres: `site_id`, `date_from`, `date_to`, `type`
- Rate limit: `100 req/min` par cle
- OpenAPI: `GET /api/v1/openapi`
- Swagger UI: `npm run ops:swagger` puis `http://localhost:4001/docs`
