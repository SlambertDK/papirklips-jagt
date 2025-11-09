#  Development Guide - Papirklips Jagt

Daglig udviklings-workflow og best practices for Papirklips Jagt projektet.

---

##  Daily Workflow

### 1. Start Development Server
```powershell
cd z:\papirklips-jagt-staging
npm run dev
```

Server kører med **auto-reload** på http://localhost:8082

### 2. Foretag Ændringer
Rediger filer i src/ mappen:
- src/index.html - Game UI og struktur
- src/game.js - Game logik og mechanics
- src/css/styles.css - Styling
- server.js - Backend API

### 3. Test Lokalt
- Åbn http://localhost:8082 i browser
- Test desktop (mouse) controls
- Test mobile (touch) controls med DevTools
- Check browser console for fejl

### 4. Deploy til Production
```powershell
# Kør deployment script
.\deploy.ps1
```

Eller manuelt:
```powershell
robocopy ".\src" "\\192.168.86.41\web\papirklips_com\src" /MIR
ssh user@192.168.86.41 'pm2 restart papirklips-website'
```

### 5. Verificer Live
Tjek http://papirklips.slambert.com:8082

---

##  Game Development

### Tilføj Ny Item Type

**1. Definer item i game.js:**
```javascript
function spawnItem() {
    const itemTypes = [
        { class: 'good-item', effect: 'slow', emoji: '', color: '#4CAF50' },
        { class: 'bad-item', effect: 'fast', emoji: '', color: '#f44336' },
        // NY ITEM HER:
        { class: 'shield-item', effect: 'shield', emoji: '', color: '#2196F3' }
    ];
    
    // ... spawn logik
}
```

**2. Tilføj effekt i collectItem():**
```javascript
function collectItem(item) {
    const effect = item.dataset.effect;
    
    if (effect === 'shield') {
        playerHasShield = true;
        showNotification(' Shield Aktiveret!', 3000);
        setTimeout(() => { playerHasShield = false; }, 5000);
    }
}
```

**3. Implementer shield logik i collision detection**

### Juster Sværhedsgrad

Find updateSpeed() funktionen i game.js:
```javascript
function updateSpeed() {
    if (gameTime < 30) speed = 1.0;
    else if (gameTime < 60) speed = 1.5;
    else if (gameTime < 90) speed = 2.0;
    else if (gameTime < 120) speed = 2.5;
    else speed = 3.0;  // Juster max speed her
}
```

### Tilføj Nye Animationer

Rediger src/css/styles.css:
```css
@keyframes new-animation {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
}

.animated-element {
    animation: new-animation 1s ease-in-out infinite;
}
```

---

##  Backend Development

### Tilføj Ny API Endpoint

Rediger server.js:
```javascript
// Ny GET endpoint
app.get('/api/stats', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT COUNT(*) as total_games, AVG(survival_time) as avg_time FROM leaderboard'
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Server fejl' });
    }
});
```

### Juster Rate Limiting

Find konstanter i server.js:
```javascript
const RATE_LIMIT = 5;              // Antal submissions
const RATE_LIMIT_WINDOW = 60000;   // Per minut (ms)
```

### Database Queries

Tilføj nye queries i API endpoints:
```javascript
// Hent top scores for dagens dato
const todayScores = await pool.query(
    SELECT initials, survival_time 
    FROM leaderboard 
    WHERE DATE(created_at) = CURRENT_DATE 
    ORDER BY survival_time DESC 
    LIMIT 10
);
```

---

##  Testing

### Manual Testing Checklist

**Desktop:**
- [ ] Mouse movement følger præcist
- [ ] Collision detection virker
- [ ] Power-ups spawner og forsvinder
- [ ] HUD opdateres korrekt
- [ ] Game Over screen vises
- [ ] Score submission virker

**Mobile:**
- [ ] Touch teleportation virker
- [ ] Touch indicator vises korrekt
- [ ] Responsive layout
- [ ] Performance er god (60 FPS)

**Anti-Cheat:**
- [ ] Session token valideres
- [ ] Rate limiting stopper spam
- [ ] Duplicate scores afvises
- [ ] Unrealistic scores afvises (>9999s)

### Browser Console Testing

```javascript
// Test i browser console:

// Check game state
console.log('Game Running:', gameRunning);
console.log('Current Speed:', speed);
console.log('Survival Time:', gameTime);

// Force spawn item
spawnItem();

// Force speed increase
speed = 5.0;
```

### Database Testing

```sql
-- Hent alle scores fra i dag
SELECT * FROM leaderboard 
WHERE DATE(created_at) = CURRENT_DATE 
ORDER BY created_at DESC;

-- Find gennemsnitlig overlevelsestid
SELECT AVG(survival_time) as avg_time FROM leaderboard;

-- Ryd test-data
DELETE FROM leaderboard WHERE initials = 'TST';
```

---

##  Debugging

### Common Issues

**Problem: Papirklips bevæger sig ikke**
```javascript
// Check i game.js:
console.log('Paperclip Position:', paperclipX, paperclipY);
console.log('Player Position:', playerX, playerY);
console.log('Speed:', speed);
```

**Problem: Items spawner ikke**
```javascript
// Check spawn interval:
console.log('Item Spawn Interval Active:', itemSpawnInterval);

// Force spawn:
spawnItem();
```

**Problem: Score submitter ikke**
```javascript
// Check network tab i DevTools
// Kig efter 400/429/500 fejl
// Check session token:
console.log('Session Token:', sessionToken);
```

### Performance Profiling

Brug Chrome DevTools:
1. **Performance tab**  Record  Play game  Stop
2. Kig efter lange frame times (>16ms = <60 FPS)
3. Optimer tunge funktioner (collision detection, rendering)

---

##  Code Style

### JavaScript Conventions
```javascript
// Brug camelCase for variabler
let gameRunning = false;
let paperclipSpeed = 1.0;

// Brug PascalCase for konstanter
const MAX_SPEED = 3.0;
const ITEM_SPAWN_RATE = 5000;

// Brug descriptive function names
function calculateDistance(x1, y1, x2, y2) { }
function showNotification(message, duration) { }
```

### CSS Conventions
```css
/* BEM-lignende naming */
.game-container { }
.game-container__item { }
.game-container__item--active { }

/* Descriptive class names */
.good-item { }  /* Power-up */
.bad-item { }   /* Obstacle */
```

---

##  Git Workflow

### Før Du Committer
```powershell
# Check ændringer
git status
git diff

# Stage filer
git add src/game.js
git add server.js

# Commit med beskrivende message
git commit -m "feat: Add shield power-up item"
```

### Commit Message Conventions
- eat: - Ny feature
- ix: - Bug fix  
- docs: - Documentation
- style: - CSS/styling ændringer
- efactor: - Code refactoring
- perf: - Performance forbedring

**Eksempler:**
```
feat: Add freeze power-up that stops paperclip for 3 seconds
fix: Collision detection now works correctly on mobile
docs: Update README with new item types
style: Improve game over screen design
perf: Optimize item spawn interval
```

---

##  Optimization Tips

### Performance
- Brug equestAnimationFrame() for smooth animations
- Begræns antal aktive items på skærmen (max 5-10)
- Debounce touch events på mobile
- Cleanup intervals ved game over

### Mobile
- Test på rigtige devices (ikke kun emulator)
- Brug touch events i stedet for mouse på mobile
- Optimer canvas rendering for lavere-end devices

### Database
- Brug indices på survival_time column
- Cleanup gamle sessions regelmæssigt
- Begræns leaderboard queries (kun top 10)

---

##  Resources

### Game Development
- [MDN Game Development Guide](https://developer.mozilla.org/en-US/docs/Games)
- [HTML5 Canvas Tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial)

### Express.js
- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Node.js Guide](https://node-postgres.com/)

### Testing
- [Playwright Documentation](https://playwright.dev/)

---

**Happy Coding! **
