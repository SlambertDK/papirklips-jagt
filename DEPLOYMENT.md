# 📎 Deployment Guide - Papirklips Jagt

Production deployment procedures og troubleshooting for Papirklips Jagt.

**Project Configuration:**
- **Staging Port**: 8082 (PM2: papirklips-staging)
- **Production Port**: 8084 (PM2: papirklips-prod)
- **Workspace**: Z:\papirklips-slambert-com-staging
- **Production Path**: Z:\papirklips-jagt

---

## 🚀 Quick Deploy

### Staging Deploy (with Git sync)
```powershell
cd Z:\papirklips-slambert-com-staging
.\deploy.ps1
# OR
npm run deploy:staging
```

### Production Deploy (with Git sync)
```powershell
cd Z:\papirklips-slambert-com-staging
.\deploy-prod.ps1
# OR 
npm run deploy:prod
```

### Skip Git Integration (if needed)
```powershell
# Skip Git commit/push during deployment
.\deploy.ps1 -SkipGit
.\deploy-prod.ps1 -SkipGit

# OR via npm
npm run deploy:staging:nogit
npm run deploy:prod:nogit
```

### Backup & Rollback
```powershell
# Create backup before deployment
.\backup-and-rollback.ps1 backup both

# List available backups
.\backup-and-rollback.ps1 list

# Rollback if needed
.\backup-and-rollback.ps1 rollback production
```

---

## 📋 Full Deployment Procedure

### 1. Pre-Deploy Checklist

- [ ] Test lokalt på http://localhost:8082
- [ ] Check for console errors i browser DevTools
- [ ] Verificer database connection virker
- [ ] Test både desktop og mobile controls
- [ ] Commit alle ændringer til Git
- [ ] Verificer .env fil er opdateret (hvis nødvendigt)
- [ ] **Create backup: `.\backup-and-rollback.ps1 backup both`**

### 2. Deploy til Staging (Phase 1 - Robocopy Method)

```powershell
# Deploy til staging environment (port 8082)
.\deploy.ps1
```

**Hvad sker der:**
- **[0/4] Git Integration**: Commit og push ændringer til GitHub automatisk
- **[1/4] File Sync**: Synkroniserer filer fra Z:\papirklips-slambert-com-staging til NAS
- **[2/4] Dependencies**: Installerer dependencies på NAS
- **[3/4] PM2 Setup**: Genstarter PM2 process "papirklips-staging"
- Kører på port: 8082

### 3. Deploy til Production (Phase 1 - Robocopy Method)

```powershell
# Deploy til production environment (port 8084)
.\deploy-prod.ps1
```

**Hvad sker der:**
- **[0/6] Git Integration**: Commit og push ændringer til GitHub automatisk  
- **[1/6] Directory Setup**: Opretter production directory
- **[2/6] Backup**: Automatisk backup af existing production før deployment
- **[3/6] File Copy**: Robocopy fra staging til Z:\papirklips-jagt (local production copy)
- **[4/6] Dependencies**: Copy node_modules for performance
- **[5/6] NAS Deploy**: Upload til NAS production folder via SSH
- **[6/6] Health Check**: Setup PM2 process "papirklips-prod" + test på http://192.168.86.41:8084

### 4. Verification

**Check staging site:**
- Besøg http://192.168.86.41:8082 (staging)
- Test spillet virker
- Verificer leaderboard vises korrekt
- Test score submission

**Check production site:**
- Besøg http://192.168.86.41:8084 (production)
- Test spillet virker
- Verificer leaderboard vises korrekt
- Test både desktop og mobile

**Check logs:**
```bash
# På NAS via SSH
ssh Familieadmin@192.168.86.41

# Check staging PM2 process
pm2 logs papirklips-staging --lines 50

# Check production PM2 process  
pm2 logs papirklips-prod --lines 50

# Check both processes status
pm2 status
```

---

## 🗃️ Environment Configuration

### Staging .env (Port 8082)
```env
PGHOST=localhost
PGPORT=5432
PGDATABASE=appdb
PGUSER=papirklips_user
PGPASSWORD=secure_password_here
PORT=8082
NODE_ENV=staging
```

### Production .env (Port 8084)
```env
PGHOST=localhost
PGPORT=5432
PGDATABASE=appdb_prod
PGUSER=papirklips_user_prod
PGPASSWORD=secure_password_here
PORT=8084
NODE_ENV=production
```

---

## 🚨 Troubleshooting

### Problem: Site viser ikke opdateringer

**Løsning 1: Hard refresh browser**
```
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

**Løsning 2: Check deployment**
```powershell
# Verificer filer blev deployed
ssh Familieadmin@192.168.86.41 'ls -lah /volume1/@appdata/ContainerManager/all_shares/web/papirklips_com/src'
ssh Familieadmin@192.168.86.41 'ls -lah /volume1/@appdata/ContainerManager/all_shares/web/papirklips_com_prod/src'
```

### Problem: PM2 Process Crashed

```bash
# Check status
pm2 status

# Check specific process logs
pm2 logs papirklips-staging --err --lines 100
pm2 logs papirklips-prod --err --lines 100

# Restart specific process
pm2 restart papirklips-staging
pm2 restart papirklips-prod

# If issues persist, recreate
pm2 delete papirklips-staging
pm2 start ecosystem.config.js
pm2 save
```

### Problem: Port Conflicts

```bash
# Find process using ports
netstat -tulpn | grep 8082
netstat -tulpn | grep 8084

# Kill conflicting processes
kill -9 <PID>

# Restart PM2 processes
pm2 restart papirklips-staging
pm2 restart papirklips-prod
```

### Problem: Database Connection Error

**Check connections:**
```bash
# På NAS - test staging database
psql -h localhost -U papirklips_user -d appdb

# På NAS - test production database  
psql -h localhost -U papirklips_user_prod -d appdb_prod
```

**Fix permissions:**
```sql
-- Grant permissions til staging user
GRANT ALL PRIVILEGES ON DATABASE appdb TO papirklips_user;
GRANT ALL PRIVILEGES ON TABLE leaderboard TO papirklips_user;

-- Grant permissions til production user
GRANT ALL PRIVILEGES ON DATABASE appdb_prod TO papirklips_user_prod;
GRANT ALL PRIVILEGES ON TABLE leaderboard TO papirklips_user_prod;
```

---

## 📊 Monitoring

### Health Checks

**Manual staging check:**
```powershell
Invoke-RestMethod -Uri "http://192.168.86.41:8082/api/leaderboard" -Method Get
```

**Manual production check:**
```powershell
Invoke-RestMethod -Uri "http://192.168.86.41:8084/api/leaderboard" -Method Get
```

**Automated monitoring script:**
```powershell
# health-check.ps1
$stagingResponse = Invoke-WebRequest -Uri "http://192.168.86.41:8082" -UseBasicParsing
$productionResponse = Invoke-WebRequest -Uri "http://192.168.86.41:8084" -UseBasicParsing

if ($stagingResponse.StatusCode -eq 200) {
    Write-Host "✅ Staging is UP (port 8082)" -ForegroundColor Green
} else {
    Write-Host "❌ Staging is DOWN (port 8082)" -ForegroundColor Red
}

if ($productionResponse.StatusCode -eq 200) {
    Write-Host "✅ Production is UP (port 8084)" -ForegroundColor Green
} else {
    Write-Host "❌ Production is DOWN (port 8084)" -ForegroundColor Red
}
```

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Process status
pm2 status

# Memory usage
pm2 status | grep -E "(papirklips-staging|papirklips-prod)"

# Log monitoring
pm2 logs papirklips-staging --lines 0  # Follow staging logs
pm2 logs papirklips-prod --lines 0     # Follow production logs
```

---

## 🔄 Rollback Procedure

Hvis deployment går galt:

### 1. Quick Rollback
```powershell
# Rollback production to previous backup
.\backup-and-rollback.ps1 rollback production

# Rollback staging to previous backup  
.\backup-and-rollback.ps1 rollback staging
```

### 2. Manual Rollback via SSH

```bash
# SSH til NAS
ssh Familieadmin@192.168.86.41

# Stop problematic processes
pm2 stop papirklips-staging
pm2 stop papirklips-prod

# Restore previous version fra Git (if needed)
cd /volume1/@appdata/ContainerManager/all_shares/web/papirklips_com
git checkout HEAD~1 .

cd /volume1/@appdata/ContainerManager/all_shares/web/papirklips_com_prod  
git checkout HEAD~1 .

# Restart processes
pm2 start papirklips-staging
pm2 start papirklips-prod
```

---

## 💾 Backup Strategy

### Automated Backup Schedule

**Før hver deployment (automatic):**
- `deploy-prod.ps1` creates automatic backup
- Backups stored in: `Z:\backups\papirklips-jagt\`

**Manual backup commands:**
```powershell
# Backup begge environments
.\backup-and-rollback.ps1 backup both

# Backup kun staging
.\backup-and-rollback.ps1 backup staging

# Backup kun production  
.\backup-and-rollback.ps1 backup production

# Se alle backups
.\backup-and-rollback.ps1 list
```

### Database Backup

```bash
# Manual database backup på NAS
ssh Familieadmin@192.168.86.41

# Backup staging database
pg_dump -h localhost -U papirklips_user appdb -t leaderboard > staging_backup_$(date +%Y%m%d).sql

# Backup production database
pg_dump -h localhost -U papirklips_user_prod appdb_prod -t leaderboard > production_backup_$(date +%Y%m%d).sql
```

---

## 🛡️ Security Checklist

Før production deployment:

- [ ] .env filer er IKKE committed til Git
- [ ] Database passwords er strong (16+ chars)
- [ ] Staging og production har separate databases
- [ ] PM2 processes kører med korrekte ports
- [ ] Rate limiting er aktiveret på API endpoints
- [ ] CORS er konfigureret korrekt for begge environments
- [ ] SSL certificates er opdaterede (hvis applicable)

---

## 🚀 Performance Optimization

### Production Settings

I `server.js` for optimeret production:
```javascript
if (process.env.NODE_ENV === 'production') {
    // Compression middleware
    app.use(compression());
    
    // Cache static files (1 day)
    app.use(express.static('src', { maxAge: '1d' }));
    
    // Production error handling
    app.use((err, req, res, next) => {
        console.error('Production error:', err);
        res.status(500).json({ error: 'Internal server error' });
    });
}
```

### Database Optimization

```sql
-- Add indices for faster queries (begge databases)
CREATE INDEX IF NOT EXISTS idx_survival_time ON leaderboard(survival_time DESC);
CREATE INDEX IF NOT EXISTS idx_created_at ON leaderboard(created_at DESC);

-- Cleanup old scores (behold top 1000)
DELETE FROM leaderboard 
WHERE id NOT IN (
    SELECT id FROM leaderboard 
    ORDER BY survival_time DESC 
    LIMIT 1000
);

-- Optimize tables
VACUUM ANALYZE leaderboard;
```

---

## 🌐 Multi-Environment Overview

### Staging Environment
- **URL**: http://192.168.86.41:8082
- **Purpose**: Testing og udvikling
- **PM2**: papirklips-staging  
- **Database**: appdb (staging data)
- **Workspace**: Z:\papirklips-slambert-com-staging

### Production Environment  
- **URL**: http://192.168.86.41:8084
- **Purpose**: Live production site
- **PM2**: papirklips-prod
- **Database**: appdb_prod (production data)
- **Local Copy**: Z:\papirklips-jagt

### Deployment Flow
```
Developer Changes
       ↓
Staging Deploy (.\deploy.ps1)
       ↓  
Test på http://192.168.86.41:8082
       ↓
Production Deploy (.\deploy-prod.ps1)  
       ↓
Live på http://192.168.86.41:8084
```

---

## ✅ Deployment Completion Checklist

**Efter successful deployment:**

- [ ] ✅ Staging site loads (http://192.168.86.41:8082)
- [ ] ✅ Production site loads (http://192.168.86.41:8084)  
- [ ] ✅ Game spiller korrekt på begge environments
- [ ] ✅ Leaderboard displays på begge environments
- [ ] ✅ Score submission virker på begge
- [ ] ✅ Mobile controls fungerer
- [ ] ✅ PM2 processes kører stabilt
- [ ] ✅ Ingen errors i PM2 logs
- [ ] ✅ Database connections er healthy
- [ ] ✅ Backup er completed og verified

**Du er klar! 🎉**

---

**Quick Commands Reference:**
```powershell
# Deploy staging
.\deploy.ps1

# Deploy production  
.\deploy-prod.ps1

# Create backup
.\backup-and-rollback.ps1 backup both

# Rollback if needed
.\backup-and-rollback.ps1 rollback production

# Check health
Invoke-RestMethod http://192.168.86.41:8082/api/leaderboard
Invoke-RestMethod http://192.168.86.41:8084/api/leaderboard
```
