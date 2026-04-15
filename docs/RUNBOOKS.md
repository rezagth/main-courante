# SaaS Runbooks

## Production Runbooks pour Main Courante

### 1. Database Issues

#### High Database Connection Pool Exhaustion
**Symptoms**: "too many connections" errors, slow queries
**Mitigation**:
```bash
# Check active connections
psql -U postgres -d main_courante -c "SELECT count(*) FROM pg_stat_activity;"

# Kill idle connections (careful!)
psql -U postgres -d main_courante -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < now() - interval '1 hour';"

# Increase pool size in DATABASE_URL or docker-compose
# Restart app pods
docker-compose restart app
```

#### Database Backup Failure
**Check**:
```bash
# Verify backup volume
df -h /backups

# Manual backup
pg_dump -U postgres main_courante | gzip > /backups/db-$(date +%s).sql.gz

# Verify backup integrity
gunzip -t /backups/db-*.sql.gz
```

---

### 2. Application Crashes

#### Out of Memory
**Symptoms**: App pod killed/restarted frequently
**Fix**:
```bash
# Check memory usage
docker stats main-courante-app

# Increase NODE memory limit
# In docker-compose: Add environment NODE_OPTIONS="--max-old-space-size=2048"
# Restart: docker-compose restart app
```

#### High Error Rate in Sentry
**Action**:
1. Go to [Sentry Dashboard](https://sentry.io)
2. Check latest release for regression
3. If critical: rollback last deployment
```bash
git revert <commit-hash>
git push main
# GitHub Actions will auto-redeploy
```

---

### 3. Performance Degradation

#### Slow API Response Times
**Diagnose**:
```bash
# Check Redis
redis-cli PING
redis-cli INFO stats

# Check DB slow queries
psql -U postgres -d main_courante -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check app logs
docker logs main-courante-app | tail -100
```

**Optimize**:
- Add Redis cache for expensive queries
- Enable pgBouncer for connection pooling
- Scale horizontally (add more app instances)

---

### 4. Security Incident

#### Unauthorized API Access / Rate Limit Abuse
**Action**:
```bash
# Check suspicious IP addresses
grep "403\|429" /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -rn

# Block IP (adjust firewall rules)
ufw insert 1 deny from <IP>

# Rotate API keys if compromised
# Via admin dashboard: Settings > API Keys > Regenerate
```

#### Suspected Data Breach
**Immediate**:
1. Isolate affected database
2. Enable read-only mode
```bash
# Notify team + users
# Run audit log scan
```

---

### 5. Deployment

#### Rollback to Previous Version
```bash
# Find previous commit
git log --oneline -10

# Rollback
git revert <commit-hash>
git push main

# Monitor deployment in GitHub Actions
```

#### Zero-Downtime Deployment
1. Deploy new version to staging
2. Run smoke tests
3. Switch traffic gradually (if using load balancer with canary)
4. Monitor error rate
5. If issues: rollback immediately

---

### 6. Monitoring & Alerting Setup

#### Prometheus Metrics (if deployed)
```bash
# Health check
curl http://localhost:3000/api/health

# Custom metrics endpoint (optional)
curl http://localhost:3000/api/metrics
```

#### Alert Rules (Sentry / PagerDuty)
- Error rate > 5% for 5 min
- Response time > 2s p99
- Database connection failures
- API quota exceeded for tenant

---

### 7. Recovery Procedures

#### Full Disaster Recovery
1. **Restore Database**:
   ```bash
   gunzip < /backups/db-latest.sql.gz | psql -U postgres main_courante
   ```

2. **Restore S3 Data** (if using AWS Backup):
   ```bash
   aws s3 sync s3://main-courante-backups/latest s3://main-courante-prod/
   ```

3. **Rebuild App from Docker Image**:
   ```bash
   docker pull ghcr.io/yourorg/main-courante:main
   docker-compose up -d app
   ```

4. **Verify Data Integrity**:
   - Check user counts match
   - Verify latest entries present
   - Test login flow

---

### 8. On-Call Escalation

**Tier 1** (Developer on-call): App logs, basic troubleshooting
**Tier 2** (DevOps): Infrastructure, database, deployments
**Tier 3** (CTO): Critical decisions, data recovery

**Escalation Threshold**:
- P1 (Critical): > 10% error rate, DB down, security issue → Immediate
- P2 (High): 1-10% error rate, slow responses → 15 min response
- P3 (Medium): Degraded feature, minor bug → 1 hour response

---

## Useful Commands

```bash
# SSH into production
ssh -i deploy_key user@prod.main-courante.app

# Check app status
docker-compose ps

# View logs
docker-compose logs -f app

# Database shell
psql -U postgres -d main_courante

# Redis shell
redis-cli

# Backup now
docker exec main-courante-db pg_dump -U postgres main_courante | gzip > /backups/manual-$(date +%s).sql.gz
```

---

**Last Updated**: 2026-04-15
**Maintained By**: DevOps Team
**Escalation**: Page on-call via PagerDuty
