# Papirklips Jagt - Cloudflare Migration Guide

Dette er en komplet migrationsguide til at flytte Papirklips Jagt fra Synology NAS + Express + PostgreSQL til Cloudflare Pages + Functions + D1.

## 📋 Forudsætninger

- [ ] Cloudflare konto oprettet
- [ ] Wrangler CLI installeret: `npm install -g wrangler`
- [ ] Logget ind på Cloudflare: `wrangler login`
- [ ] GitHub repository til papirklips-jagt

## 🚀 Migrations Steps

### 1. Kopier Cloudflare filer til dit projekt

Fra denne `migration-templates/papirklips-jagt/` mappe, kopier følgende til dit papirklips-jagt projekt:

```powershell
# I dit papirklips-jagt projekt directory
# Kopier functions/ mappen
# Kopier database/ mappen  
# Kopier wrangler.toml
# Kopier .env.example
```

### 2. Opret D1 Databases

```powershell
# I dit papirklips-jagt projekt directory
wrangler d1 create papirklips-prod
wrangler d1 create papirklips-staging
```

**VIGTIGT:** Noter database IDs fra output. Du skal bruge dem i næste step.

### 3. Opdater wrangler.toml med Database IDs

Åbn `wrangler.toml` og erstat:
- `INDSÆT_PROD_DATABASE_ID_HER` med production database ID
- `INDSÆT_STAGING_DATABASE_ID_HER` med staging database ID

### 4. Eksekver Database Schema

```powershell
# Production database
wrangler d1 execute papirklips-prod --remote --file=database/schema-d1.sql

# Staging database  
wrangler d1 execute papirklips-staging --remote --file=database/schema-d1.sql
```

Verificer:
```powershell
# Tjek production tabeller
wrangler d1 execute papirklips-prod --remote --command="SELECT name FROM sqlite_master WHERE type='table'"

# Tjek staging tabeller
wrangler d1 execute papirklips-staging --remote --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### 5. Opret Cloudflare Pages Projekt

1. Gå til Cloudflare Dashboard → Pages
2. Klik "Create a project" → "Connect to Git"
3. Vælg dit papirklips-jagt GitHub repository
4. Build settings:
   - **Framework preset:** None
   - **Build command:** (lad stå tom)
   - **Build output directory:** `/` eller `src`
   - **Root directory:** (lad stå tom)
5. Klik "Save and Deploy"

### 6. Konfigurer Environment Variables

I Cloudflare Pages projekt:
1. Gå til **Settings → Environment variables**
2. Tilføj følgende variabler (både Production og Preview):

```
SESSION_SECRET = [generer med: openssl rand -base64 32]
IP_HASH_SALT = [generer med: openssl rand -base64 32]
ENVIRONMENT = production (eller preview for Preview env)
```

### 7. Tilføj D1 Database Bindings

I samme Settings menu:
1. Gå til **Settings → Functions → D1 database bindings**
2. **Production environment:**
   - Variable name: `DB`
   - D1 database: `papirklips-prod`
3. **Preview environment:**
   - Variable name: `DB`
   - D1 database: `papirklips-staging`
4. Klik "Save"

### 8. Tilføj Custom Domain

1. Gå til **Custom domains** tab
2. Klik "Set up a custom domain"
3. Indtast: `papirklips.slambert.com`
4. Cloudflare tilføjer automatisk DNS record hvis du bruger Cloudflare DNS

### 9. Opdater Frontend API Calls

I dit `game.js` eller `src/js/game.js`, sørg for API endpoints peger på:
- `/api/start-game` (POST)
- `/api/score` (POST)
- `/api/leaderboard` (GET)

Hvis du har hardcoded localhost URLs, fjern dem - Cloudflare Pages serverer automatisk fra samme domain.

### 10. Deploy og Test

```powershell
# Commit og push ændringerne
git add .
git commit -m "Migrate to Cloudflare Pages + D1"
git push origin main
```

Cloudflare deployer automatisk ved push til main.

Test dine endpoints:
```powershell
# Test start-game
$body = @{clientId="test123"} | ConvertTo-Json
Invoke-RestMethod -Uri "https://papirklips.slambert.com/api/start-game" -Method POST -Body $body -ContentType "application/json"

# Test leaderboard
Invoke-RestMethod -Uri "https://papirklips.slambert.com/api/leaderboard"
```

## 🎯 Verification Checklist

- [ ] D1 databases oprettet og schema eksekvert
- [ ] wrangler.toml indeholder korrekte database IDs
- [ ] Cloudflare Pages projekt oprettet og connected til GitHub
- [ ] Environment variables sat (SESSION_SECRET, IP_HASH_SALT)
- [ ] D1 bindings konfigureret (DB → databases)
- [ ] Custom domain tilføjet (papirklips.slambert.com)
- [ ] Første deployment succeeded
- [ ] `/api/start-game` returnerer session token
- [ ] `/api/leaderboard` returnerer tom array (ny database)
- [ ] Spillet kan submit scores succesfuldt

## 🔧 Troubleshooting

### "Server error" på API endpoints
- Tjek at D1 bindings er sat korrekt i Cloudflare UI
- Tjek at environment variables er sat
- Tjek Cloudflare deployment logs

### "Invalid session token"
- Tjek at SESSION_SECRET er sat samme værdi i prod og preview
- Tjek at database bindings peger på korrekte databases

### DNS issues
- Vent 1-4 timer på DNS propagation
- Tjek DNS records i Cloudflare Dashboard

### Rate limiting fejl
- IP_HASH_SALT skal være sat
- Tjek at cleanup middleware kører (se logs)

## 💰 Omkostninger

**$0/måned** på Cloudflare Free Tier:
- Pages: Unlimited requests
- D1: 5GB storage, 5M reads/dag, 100K writes/dag  
- Functions: 100K requests/dag

## 📚 Næste Steps

Efter papirklips-jagt virker:
1. Gentag samme proces for **clippys-revenge** (revenge.slambert.com)
2. Gentag for **pepsimax** (pepsimax.slambert.com)
3. Deaktiver Synology NAS backend når alle sites er migreret

## 🆘 Hjælp

Hvis du støder på problemer:
1. Tjek Cloudflare deployment logs
2. Tjek browser console for frontend fejl
3. Verificer database schema er eksekvert korrekt
4. Sammenlign med working slambert.com setup
