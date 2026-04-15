# Deployment Guide

## Quick Start

### Local Development

```bash
# 1. Clone and setup
git clone https://github.com/yourorg/main-courante.git
cd main-courante

# 2. Use Docker Compose for full stack
docker-compose up -d

# 3. App will be available at http://localhost:3000
# Database admin: http://localhost:5050 (pgAdmin)
# Redis: localhost:6379
```

### Production Deployment

#### Prerequisites
- Docker & Docker Compose installed
- GitHub Account for CI/CD
- AWS Account (for S3)
- PostgreSQL 16+
- Redis 7+
- Sentry account
- Stripe account (for billing)

#### Environment Setup

1. **Create secrets in GitHub**:
   - Go to Settings > Secrets and variables > Actions
   - Add:
     - `DEPLOY_KEY` (SSH private key)
     - `DEPLOY_HOST` (production server IP)
     - `DEPLOY_USER` (SSH user)

2. **Server Setup**:
```bash
# SSH into production server
ssh user@prod-server

# Create app directory
sudo mkdir -p /app
sudo chown $(whoami):$(whoami) /app

# Install Docker & Docker Compose
curl -sSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Create .env file with production values
nano /app/.env.production
# Copy from .env.production template and fill in secrets
```

3. **Deploy**:
```bash
cd /app
git clone <repo>
cp .env.production .env
docker-compose up -d
```

#### CI/CD Pipeline

GitHub Actions workflow (`ci.yml`) automatically:
1. **Lint** — ESLint checks
2. **Test** — Run test suite with coverage
3. **Build** — Compile Next.js + Docker image
4. **Security** — Trivy vulnerability scan
5. **Deploy** — SSH into prod server and redeploy

Trigger: Push to `main` branch

#### Scaling

**Horizontal Scaling**:
```bash
# Use Docker Swarm or Kubernetes
# Example with Docker Swarm:
docker swarm init
docker stack deploy -c docker-compose.yml app
```

**Database Scaling**:
- Use managed PostgreSQL (AWS RDS, Neon, Supabase)
- Enable read replicas for read-heavy workloads
- Use PgBouncer for connection pooling

#### Monitoring & Alerts

1. **Sentry** — Error tracking
2. **Prometheus** — Metrics (optional)
3. **DataDog** — Full observability (optional)
4. **Healthchecks.io** — Uptime monitoring

## Troubleshooting

### Common Issues

#### Build fails: "Cannot find module"
```bash
# Clear node_modules and reinstall
rm -rf node_modules
pnpm install --frozen-lockfile
pnpm build
```

#### Database migration fails
```bash
# Reset database (DEV ONLY!)
pnpm exec prisma migrate reset

# For production, manually run migration:
psql -U postgres -d main_courante -f migration.sql
```

#### Out of memory during build
```bash
# Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" pnpm build
```

## Backup & Recovery

### Automated Backups
- Database: Daily at 2 AM UTC
- S3: Continuous sync to backup bucket
- Location: `/backups/` on prod server

### Manual Backup
```bash
pg_dump -U postgres main_courante | gzip > backup-$(date +%s).sql.gz
```

### Restore
```bash
gunzip < backup-*.sql.gz | psql -U postgres main_courante
```

## Security Checklist

- [ ] Rotate AUTH_SECRET every quarter
- [ ] Update Docker images weekly
- [ ] Review Sentry alerts daily
- [ ] Audit database logs monthly
- [ ] Test disaster recovery quarterly
- [ ] Update CORS allowlist for new domains
- [ ] Review & rotate API keys monthly
- [ ] Enable MFA for all admin accounts

## Performance Tuning

### PostgreSQL
```sql
-- Increase shared_buffers (25% of RAM)
ALTER SYSTEM SET shared_buffers = '8GB';

-- Enable query cache
ALTER SYSTEM SET work_mem = '256MB';

-- Restart: sudo systemctl restart postgresql
```

### Redis
```bash
# Monitor memory usage
redis-cli INFO memory

# Enable persistence
# In redis.conf: appendonly yes
```

### Application
- Enable Redis caching for queries
- Implement pagination for list endpoints
- Use CDN for static assets
- Enable gzip compression
- Optimize images

## Support & Escalation

**Documentation**: https://docs.main-courante.app
**Status Page**: https://status.main-courante.app
**Support Email**: support@main-courante.app
**Emergency**: page-oncall@main-courante.app
