#  Papirklips Jagt

**Survival game** hvor spilleren undgår en papirklips så længe som muligt. Enkelt koncept med stigende sværhedsgrad og strategiske power-ups.

---

##  Gameplay

### Mål
Overlev så længe som muligt uden at blive ramt af den jagtende papirklips!

### Controls
- ** Desktop**: Flyt musen for at bevæge dig rundt
- ** Mobile**: Tryk på skærmen for at teleportere til touchpunktet

### Items
- ** Grønne items**: Sænker papirklipsens hastighed midlertidigt
- ** Røde items**: Øger papirklipsens hastighed (undgå dem!)
- Items spawner tilfældigt og forsvinder efter kort tid

### Sværhedsgrad
Spillet bliver gradvist sværere:
- **0-30s**: Speed 1.0x
- **30-60s**: Speed 1.5x  
- **60-90s**: Speed 2.0x
- **90-120s**: Speed 2.5x
- **120s+**: Speed 3.0x (maksimum)

---

##  Quick Start

### Installation
```powershell
npm install
```

### Development
```powershell
npm run dev    # Nodemon auto-reload
```

Spillet kører på: **http://localhost:8082**

### Production
```powershell
npm start
```

---

##  Tech Stack

### Frontend
- **HTML5** - Game container og UI
- **CSS3** - Styling og animationer  
- **Vanilla JavaScript** - Game loop og logik (878 linjer)

### Backend
- **Node.js + Express** - Server og API
- **PostgreSQL** - Leaderboard database
- **CORS** - Cross-origin requests

### Anti-Cheat
- Session tokens (10 min udløb)
- Rate limiting (5 submissions/minut)
- Input validation
- Duplicate score detection

---

##  Projekt Struktur

```
papirklips-jagt/
 src/
    index.html          # Game HTML med HUD og UI
    game.js             # Game loop og logik (878 linjer)
    css/
       styles.css      # Game styling
    favicon.png
 server.js               # Express server + leaderboard API
 .env                    # Database credentials (IKKE i Git)
 .env.example            # Template til .env
 .gitignore              # Sikkerhed
 package.json
 deploy.ps1              # Deployment script
 README.md
```

---

##  API Endpoints

### POST /api/start-game
Start ny spil-session og modtag session token.

**Response:**
```json
{
  "success": true,
  "token": "session_1699520000000_abc123"
}
```

### POST /api/submit-score
Indsend score med session token.

**Request:**
```json
{
  "initials": "ABC",
  "time": 120,
  "token": "session_1699520000000_abc123",
  "clientId": "unique-client-id"
}
```

**Response:**
```json
{
  "success": true,
  "rank": 5,
  "message": "Godt klaret! Du er nr. 5 på leaderboardet! "
}
```

**Fejl-responses:**
- 400 - Ugyldig input, ugyldig session, duplikat score
- 429 - Rate limit overskredet (5/minut)
- 500 - Server fejl

### GET /api/leaderboard
Hent top 10 scores.

**Response:**
```json
[
  {
    "initials": "ABC",
    "survival_time": 245
  },
  {
    "initials": "XYZ",
    "survival_time": 198
  }
]
```

---

##  Database

### Schema
```sql
CREATE TABLE leaderboard (
    id SERIAL PRIMARY KEY,
    initials VARCHAR(3) NOT NULL,
    survival_time INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_survival_time ON leaderboard(survival_time DESC);
```

### Environment Variables
Se .env.example for påkrævede variabler:
```env
PGHOST=localhost
PGPORT=5432
PGDATABASE=appdb
PGUSER=your_user
PGPASSWORD=your_password
PORT=8082
```

---

##  Deployment

### Development  Production
```powershell
# 1. Deploy filer til NAS
robocopy ".\src" "\\192.168.86.41\web\papirklips_com\src" /MIR

# 2. Genstart PM2 process
ssh user@192.168.86.41
cd /volume2/web/papirklips_com
pm2 restart papirklips-website
pm2 save
```

### Production URL
- **Live site**: http://papirklips.slambert.com:8082
- **Landing page**: http://slambert.com:8080

### PM2 Process
```bash
pm2 start server.js --name papirklips-website
pm2 startup
pm2 save
```

---

##  Features

###  Implementeret
- Mouse og touch controls
- Progressive sværhedsgrad
- Power-up system (grønne/røde items)
- PostgreSQL leaderboard
- Session-based anti-cheat
- Rate limiting
- Responsive design
- Mobile touch indicator
- Game HUD (tid, speed, status)

###  Fremtidige Idéer
- Flere item-typer (shield, freeze, etc.)
- Achievements system
- Daily challenges
- Multiplayer mode
- Custom skins for papirklips

---

##  Links

- **Landing Page**: http://slambert.com:8080
- **Clippy's Revenge**: http://revenge.slambert.com:8083
- **PepsiMax Indexet**: https://pepsimax.slambert.com

---

##  License

MIT License - Henrik Lambert  2025

---

##  Debugging

### Common Issues

**Database connection fejl:**
```powershell
# Check .env credentials
cat .env

# Test PostgreSQL connection
psql -h localhost -U your_user -d appdb
```

**Port allerede i brug:**
```powershell
# Find process på port 8082
netstat -ano | findstr :8082

# Stop process
taskkill /PID <process-id> /F
```

**Session token expired:**
- Sessions udløber efter 10 minutter
- Start nyt spil for at få ny token
- Check browser console for fejlmeddelelser

---

**Lavet med  og  af Henrik Lambert**
