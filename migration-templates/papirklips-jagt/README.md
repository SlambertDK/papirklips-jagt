# Papirklips Jagt - Cloudflare Migration Template

Komplet Cloudflare Pages migration bundle for Papirklips Jagt.

## 📦 Indhold

```
migration-templates/papirklips-jagt/
├── functions/
│   ├── _middleware.js          # CORS, security headers, cleanup
│   └── api/
│       ├── start-game.js        # Session token generation
│       ├── score.js             # Score submission med anti-cheat
│       └── leaderboard.js       # Top 10 leaderboard
├── database/
│   └── schema-d1.sql            # SQLite schema for D1
├── wrangler.toml                # Cloudflare config (opdater database IDs!)
├── .env.example                 # Environment variables template
└── MIGRATION-GUIDE.md           # Step-by-step guide
```

## 🚀 Quick Start

1. **Kopier alle filer** til dit papirklips-jagt projekt
2. **Følg MIGRATION-GUIDE.md** step-by-step
3. **Deploy** med git push

## ⚠️ Vigtige Noter

- **wrangler.toml:** Skal opdateres med dine database IDs efter du kører `wrangler d1 create`
- **Environment variables:** Generer nye random secrets for SESSION_SECRET og IP_HASH_SALT
- **D1 Bindings:** Skal sættes manuelt i Cloudflare UI (ikke kun i wrangler.toml)
- **Custom Domain:** papirklips.slambert.com skal tilføjes i Cloudflare Pages

## 🔄 Samme Process for Andre Sites

Denne template kan genbruges til:
- **clippys-revenge** → revenge.slambert.com
- **pepsimax** → pepsimax.slambert.com

Bare opdater navne i wrangler.toml og skift database navne.

## 💾 Database Struktur

4 tabeller:
- `leaderboard` - Papirklips Jagt scores (initials, survival_time, ip_hash, created_at)
- `sessions` - Anti-cheat session tokens
- `rate_limits` - Rate limiting records (5/minut per IP)
- SQLite indexes for performance

## 🛡️ Anti-Cheat Features

✅ Session tokens (single-use, 1-time expiry)  
✅ Rate limiting (5 submissions/minut)  
✅ IP hashing (privacy-preserving)  
✅ Duplicate detection (10 sekunder window)  
✅ Client ID validation  
✅ Realistic bounds checking (max 9999 sekunder)

## 📊 API Endpoints

- `POST /api/start-game` - Generer session token
- `POST /api/score` - Submit score
- `GET /api/leaderboard` - Hent top 10

## 🆘 Support

Se MIGRATION-GUIDE.md for detaljeret troubleshooting.
