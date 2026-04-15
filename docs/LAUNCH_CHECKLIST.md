# Production Launch Checklist

## Pre-Launch (2 weeks before)

### Infrastructure
- [ ] Database: PostgreSQL 16+ on managed service (RDS, Neon, Supabase)
- [ ] Redis: Redis 7+ deployed (or ElastiCache/Upstash)
- [ ] S3: AWS S3 bucket created + lifecycle policies configured
- [ ] CDN: CloudFront or equivalent configured for static assets
- [ ] Load Balancer: Set up if scaling horizontally
- [ ] SSL Certificates: Valid SSL cert for main domain

### Security
- [ ] Secrets: All env vars stored in secret manager (GitHub Secrets, AWS Secrets Manager)
- [ ] API Keys: Stripe, Sentry, AWS keys generated and rotated
- [ ] CORS: Whitelist domains configured
- [ ] HTTPS: Enforce HTTPS across all endpoints
- [ ] Rate Limiting: Configured per tenant/IP
- [ ] WAF: Web Application Firewall enabled (if using AWS)

### Monitoring & Alerting
- [ ] Sentry: Project created, DSN configured
- [ ] Logs: Centralized logging (CloudWatch, DataDog)
- [ ] Metrics: Prometheus scraping configured
- [ ] Uptime: Healthchecks.io or similar configured
- [ ] PagerDuty: On-call escalation setup

### Documentation
- [ ] API Docs: Swagger/OpenAPI published
- [ ] Runbooks: Ops runbooks written and reviewed
- [ ] Deployment Docs: Deployment procedures documented
- [ ] SLA: Service level agreements defined

### Testing
- [ ] Load Testing: Tested for target throughput (100+ req/s)
- [ ] Failover Testing: Database failover tested
- [ ] Backup Restore: Restore from backup tested
- [ ] Security Audit: Penetration test completed

---

## Week Before Launch

### Code
- [ ] Freeze code: Only hotfixes allowed
- [ ] Dependencies: All deps updated and audited
- [ ] Build: Production build tested locally
- [ ] Docker: Docker image built and tested

### Database
- [ ] Schema: Final schema reviewed
- [ ] Migrations: All migrations tested on prod-like DB
- [ ] Backups: Automated backup configured
- [ ] Monitoring: DB monitoring alerts configured

### Billing
- [ ] Stripe: Test keys replaced with live keys
- [ ] Plans: All pricing plans created in Stripe
- [ ] Webhooks: Stripe webhooks registered
- [ ] Receipts: Email receipt templates tested

---

## Launch Day (24 hours before)

### Final Checks
- [ ] Feature flags: Disable beta features via feature flags
- [ ] Rate limits: Configured to prevent abuse
- [ ] Auth: MFA enforced for admin accounts
- [ ] Logs: Log retention policies configured
- [ ] Analytics: Event tracking verified

### Team
- [ ] On-call: Assign on-call engineer + backup
- [ ] Comms: Slack/Discord channel set up for incidents
- [ ] Runbooks: Team trained on runbooks
- [ ] Emergency Contacts: List of emergency contacts ready

### Communication
- [ ] Status Page: Created on status.main-courante.app
- [ ] Blog: Launch announcement drafted
- [ ] Email: Launch email campaign ready
- [ ] Support: Support email monitored (support@main-courante.app)

---

## Launch (Go-Live)

### Pre-Launch (30 min before)
- [ ] Final DB backup: Take manual backup
- [ ] System checks: All health checks green
- [ ] Team ready: Eng + Support on standby
- [ ] Monitoring: Open dashboards for app, DB, errors

### Launch
1. **Deploy**:
   ```bash
   git push main
   # Monitor GitHub Actions → Production deployment
   ```

2. **Verify**:
   - [ ] App loads at https://main-courante.app
   - [ ] Login works
   - [ ] Create test tenant
   - [ ] Create test entry
   - [ ] Export to PDF works
   - [ ] API health check: `/api/health`

3. **Monitor** (first 30 minutes):
   - [ ] Error rate < 1%
   - [ ] Response time < 500ms p99
   - [ ] No database errors
   - [ ] No auth failures
   - [ ] No Sentry alerts

### Post-Launch (First 24 hours)

**Monitoring Schedule**:
- Every 15 min: Check error rate, response times
- Hourly: Check Sentry alerts, customer feedback
- 4x daily: Review analytics, usage patterns

**Be Ready To**:
- Roll back deployment if critical issues
- Scale up database if needed
- Enable emergency maintenance mode

---

## Post-Launch (First Week)

### Monitoring
- [ ] Zero critical errors in Sentry
- [ ] All payment webhooks processed
- [ ] All user registrations successful
- [ ] No database performance issues

### Feedback
- [ ] Collect user feedback via email
- [ ] Monitor support requests
- [ ] Track key metrics (signups, DAU, feature usage)

### Optimization
- [ ] Database: Slow queries optimized
- [ ] Caching: Add Redis caching where needed
- [ ] Assets: Optimize image sizes, bundle size

---

## Post-Launch (First Month)

### Stability
- [ ] Uptime: > 99.5%
- [ ] Error rate: < 0.5%
- [ ] Payment success rate: > 99%

### Growth
- [ ] Signups: Monitor conversion funnel
- [ ] Retention: Track day-7 and day-30 retention
- [ ] NPS: Collect Net Promoter Score

### Operations
- [ ] Backup integrity: Verify weekly backups
- [ ] Security: Review audit logs
- [ ] Compliance: Check GDPR/compliance requirements

---

## Sign-Off

**Prepared By**: _________________________ Date: _________
**Reviewed By**: _________________________ Date: _________
**Approved By**: _________________________ Date: _________

**Launch Status**: [ ] GREEN (Ready) [ ] YELLOW (Minor issues) [ ] RED (Not ready)
