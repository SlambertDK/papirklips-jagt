#  Deployment Guide - Papirklips Jagt

Production deployment procedures og troubleshooting for Papirklips Jagt.

---

##  Quick Deploy

### One-Command Deploy
```powershell
cd z:\papirklips-jagt-staging
.\deploy.ps1
```

Dette script:
1. Synkroniserer src/ filer til production server
2. Genstarter PM2 process
3. Verificerer deployment

---

##  Full Deployment Procedure

### 1. Pre-Deploy Checklist

- [ ] Test lokalt på http://localhost:8082
- [ ] Check for console errors i browser DevTools
- [ ] Verificer database connection virker
- [ ] Test både desktop og mobile controls
- [ ] Commit alle ændringer til Git
- [ ] Verificer .env fil er opdateret (hvis nødvendigt)

### 2. Deploy Frontend

```powershell
# Synkroniser filer til production
robocopy "z:\papirklips-jagt-staging\src" "\\192.168.86.41\web\papirklips_com\src" /MIR

# /MIR = Mirror (sletter filer der ikke findes i source)
```

**Hvad deployes:**
- index.html - Game UI
- game.js - Game logik
- css/styles.css - Styling
- avicon.png - Icon

### 3. Deploy Backend (hvis ændret)

```powershell
# Copy server.js til production
robocopy "z:\papirklips-jagt-staging" "\\192.168.86.41\web\papirklips_com" server.js

# Copy package.json (hvis dependencies ændret)
robocopy "z:\papirklips-jagt-staging" "\\192.168.86.41\web\papirklips_com" package.json
```

### 4. SSH til NAS og Genstart

```bash
# SSH til production server
ssh user@192.168.86.41

# Naviger til projekt
cd /volume2/web/papirklips_com

# Hvis package.json ændret, installer dependencies
npm install

# Genstart PM2 process
pm2 restart papirklips-website

# Verificer process kører
pm2 status

# Se logs
pm2 logs papirklips-website --lines 50

# Save PM2 configuration
pm2 save
```

### 5. Verification

**Check live site:**
- Besøg http://papirklips.slambert.com:8082
- Test spillet virker
- Verificer leaderboard vises korrekt
- Test score submission
- Check både desktop og mobile

**Check logs:**
```bash
# På NAS via SSH
pm2 logs papirklips-website --lines 100

# Kig efter fejl:
#  Database connection errors
#  Port conflicts
#  Missing dependencies
```

---

##  Database Deployment

### Initial Setup (kun én gang)

```sql
-- Connect til PostgreSQL
psql -h localhost -U your_user -d appdb

-- Kør schema
\i database/schema.sql

-- Verificer tabel eksisterer
\dt leaderboard

-- Check indices
\di
```

### Database Migrations

Hvis du ændrer database schema:

```sql
-- Backup existing data
pg_dump -h localhost -U your_user -d appdb -t leaderboard > backup_leaderboard.sql

-- Run migration
ALTER TABLE leaderboard ADD COLUMN difficulty VARCHAR(10) DEFAULT 'normal';

-- Verify
\d leaderboard
```

### Database Maintenance

```sql
-- Ryd gamle scores (behold kun top 1000)
DELETE FROM leaderboard 
WHERE id NOT IN (
    SELECT id FROM leaderboard 
    ORDER BY survival_time DESC 
    LIMIT 1000
);

-- Vacuum table for performance
VACUUM ANALYZE leaderboard;
```

---

##  Environment Configuration

### Production .env

**På NAS:**
```bash
# Edit .env fil
cd /volume2/web/papirklips_com
nano .env
```

**Required variables:**
```env
PGHOST=localhost
PGPORT=5432
PGDATABASE=appdb
PGUSER=papirklips_user
PGPASSWORD=secure_password_here
PORT=8082
NODE_ENV=production
```

**Security checklist:**
- [ ] .env fil har korrekte permissions (600)
- [ ] Password er strong (16+ chars)
- [ ] Database user har kun nødvendige permissions
- [ ] .gitignore excluder .env

---

##  Troubleshooting

### Problem: Site viser ikke opdateringer

**Løsning 1: Hard refresh browser**
```
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

**Løsning 2: Clear cache og check deployment**
```powershell
# Verificer filer blev deployed
ssh user@192.168.86.41 'ls -lah /volume2/web/papirklips_com/src'

# Check timestamps - skal matche deployment tid
```

### Problem: PM2 Process Crashed

```bash
# Check status
pm2 status

# Hvis crashed, check logs
pm2 logs papirklips-website --err --lines 100

# Restart process
pm2 restart papirklips-website

# Hvis stadig problemer, delete og recreate
pm2 delete papirklips-website
pm2 start server.js --name papirklips-website
pm2 save
```

### Problem: Database Connection Error

**Check connection:**
```bash
# På NAS
psql -h localhost -U papirklips_user -d appdb

# Hvis fejl, check:
# 1. .env credentials er korrekte
# 2. PostgreSQL service kører
# 3. Database eksisterer
# 4. User har permissions
```

**Fix permissions:**
```sql
-- Grant permissions til user
GRANT ALL PRIVILEGES ON DATABASE appdb TO papirklips_user;
GRANT ALL PRIVILEGES ON TABLE leaderboard TO papirklips_user;
GRANT USAGE, SELECT ON SEQUENCE leaderboard_id_seq TO papirklips_user;
```

### Problem: Port 8082 Already in Use

```bash
# Find process using port
netstat -tulpn | grep 8082

# Kill process
kill -9 <PID>

# Eller stop alle node processes
pkill -9 node

# Restart PM2
pm2 restart papirklips-website
```

### Problem: High Memory Usage

```bash
# Check PM2 memory
pm2 status

# If høj memory, restart process
pm2 restart papirklips-website

# Check for memory leaks i logs
pm2 logs papirklips-website | grep -i memory
```

---

##  Monitoring

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Process status
pm2 status

# Logs (last 100 lines)
pm2 logs papirklips-website --lines 100

# Follow logs real-time
pm2 logs papirklips-website --lines 0
```

### Health Checks

**Manual check:**
```powershell
# Test API endpoints
Invoke-RestMethod -Uri "http://papirklips.slambert.com:8082/api/leaderboard" -Method Get

# Test game loads
Start-Process "http://papirklips.slambert.com:8082"
```

**Automated monitoring script:**
```powershell
# health-check.ps1
 = Invoke-WebRequest -Uri "http://papirklips.slambert.com:8082" -UseBasicParsing
if (.StatusCode -eq 200) {
    Write-Host " Site is UP" -ForegroundColor Green
} else {
    Write-Host " Site is DOWN" -ForegroundColor Red
    # Send alert (email, SMS, etc.)
}
```

---

##  Rollback Procedure

Hvis deployment går galt:

### 1. Rollback Frontend

```powershell
# Restore fra backup (hvis du lavede en)
robocopy "z:\papirklips-jagt-staging-backup\src" "\\192.168.86.41\web\papirklips_com\src" /MIR
```

### 2. Rollback Backend

```bash
# SSH til NAS
ssh user@192.168.86.41
cd /volume2/web/papirklips_com

# Restore previous version fra Git
git checkout HEAD~1 server.js

# Restart
pm2 restart papirklips-website
```

### 3. Rollback Database

```bash
# Restore fra backup
psql -h localhost -U papirklips_user -d appdb < backup_leaderboard.sql
```

---

##  Backup Strategy

### Automated Backup Script

```powershell
# backup-papirklips.ps1
 = Get-Date -Format "yyyy-MM-dd_HHmm"
 = "z:\backups\papirklips-jagt\"

# Backup source code
robocopy "z:\papirklips-jagt-staging" "" /MIR /XD node_modules

# Backup database
ssh user@192.168.86.41 "pg_dump -h localhost -U papirklips_user appdb -t leaderboard" > "\leaderboard.sql"

Write-Host " Backup completed: "
```

**Kør backup før hver major deployment!**

---

##  Security Checklist

Før production deployment:

- [ ] .env fil er IKKE committed til Git
- [ ] Database passwords er strong
- [ ] Session tokens har timeout (10 min)
- [ ] Rate limiting er aktiveret (5 req/min)
- [ ] Input validation på alle API endpoints
- [ ] CORS er konfigureret korrekt
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized input)

---

##  Performance Optimization

### Production Settings

```javascript
// I server.js for production:
if (process.env.NODE_ENV === 'production') {
    // Compression middleware
    app.use(compression());
    
    // Cache static files
    app.use(express.static('src', { maxAge: '1d' }));
}
```

### Database Optimization

```sql
-- Add indices for faster queries
CREATE INDEX IF NOT EXISTS idx_survival_time ON leaderboard(survival_time DESC);
CREATE INDEX IF NOT EXISTS idx_created_at ON leaderboard(created_at DESC);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM leaderboard ORDER BY survival_time DESC LIMIT 10;
```

---

##  Multi-Environment Setup

### Development (Port 8082)
- Local database
- Debug logging enabled
- Hot reload with nodemon

### Production (Port 8082)
- Production database
- Error logging only
- PM2 process manager

### Staging (Optional - Port 8092)
- Separate staging database
- Same as production setup
- For testing before live deploy

---

**Deployment Completed? **

Verify checklist:
-  Site loads at http://papirklips.slambert.com:8082
-  Game plays correctly (desktop + mobile)
-  Leaderboard displays
-  Score submission works
-  PM2 process running stable
-  No errors in logs

**You're all set! **
