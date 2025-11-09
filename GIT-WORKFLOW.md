#  Git Workflow Guide - Papirklips Jagt

Professionel Git workflow for dagligt arbejde med GitHub på Papirklips Jagt projektet.

---

##  Start Arbejdsdag

### 1. Pull Seneste Ændringer
```powershell
cd z:\papirklips-jagt-staging

# Hent seneste ændringer fra GitHub
git pull origin main
```

### 2. Check Status
```powershell
# Se hvilke filer der er ændret
git status

# Se forskelle
git diff
```

### 3. Start Development Server
```powershell
npm run dev
```

Spillet kører på http://localhost:8082 

---

##  Under Udvikling

### Løbende Status Check
```powershell
# Hurtig status
git status

# Se ændringer i game logic
git diff src/game.js

# Se alle ændringer
git diff
```

### Test Dine Ændringer
```powershell
# Test lokalt
Start-Process "http://localhost:8082"

# Test checklist:
#  Spillet starter
#  Mouse/touch controls virker
#  Items spawner korrekt
#  Power-ups har effekt
#  Collision detection præcis
#  Leaderboard loader
#  Score submission virker
```

---

##  Gem Dit Arbejde (Commit)

### Stage Filer

**Stage game files:**
```powershell
# Game logic
git add src/game.js

# Styling
git add src/css/styles.css

# Backend
git add server.js

# Alt
git add .
```

### Commit Med Beskrivende Message

**Game Development Commits:**
```powershell
# Ny feature
git commit -m "feat: Add freeze power-up that stops paperclip for 3 seconds"

# Bug fix
git commit -m "fix: Collision detection now accurate on mobile touch"

# Game balance
git commit -m "balance: Reduce speed increase rate for better difficulty curve"

# Styling
git commit -m "style: Update game over screen with better animations"

# Performance
git commit -m "perf: Optimize item spawn rate to reduce lag"

# Level design
git commit -m "level: Add new obstacle type at 2 minute mark"
```

**Commit Types for Game Development:**
- `feat:` - Ny game feature (power-ups, items, mechanics)
- `fix:` - Bug fixes (collision, scoring, spawning)
- `balance:` - Game balancing (difficulty, speeds, timers)
- `style:` - Visual changes (UI, animations, colors)
- `perf:` - Performance improvements (FPS, lag fixes)
- `level:` - Level design changes
- `audio:` - Sound effects or music
- `docs:` - Documentation updates

---

##  Push til GitHub

### Push Dine Commits
```powershell
git push origin main
```

### Verificer på GitHub
1. Gå til https://github.com/SlambertDK/papirklips-jagt
2. Check commits under "Commits"
3. Verificer ændringer

---

##  Dag-til-Dag Workflow

### Morgen
```powershell
cd z:\papirklips-jagt-staging
git pull origin main
git status
npm run dev
```

### Under Arbejde
```powershell
# Arbejd på game.js eller andre filer
# Test ofte på http://localhost:8082

# Check ændringer
git diff src/game.js

# Små commits undervejs
git add src/game.js
git commit -m "feat: Add shield power-up visual indicator"
```

### Før Pause
```powershell
# Push for backup
git push origin main
```

### Slut på Dagen
```powershell
git add .
git commit -m "balance: Adjust item spawn rates for better gameplay"
git push origin main

# Verificer på GitHub
Start-Process "https://github.com/SlambertDK/papirklips-jagt/commits/main"
```

---

##  Game-Specific Git Tips

### Commit After Testing
```powershell
# Test ny feature grundigt FØR commit
npm run dev
# Play test for 5+ minutes
# Test edge cases

# Hvis det virker, commit
git add .
git commit -m "feat: New power-up tested and working"
git push origin main
```

### Balance Changes (Iterative)
```powershell
# Game balancing kræver ofte flere commits
git commit -m "balance: Increase paperclip speed to 1.2x at 60s"
# Test...
git commit -m "balance: Reduce speed to 1.1x - previous was too hard"
# Test...
git commit -m "balance: Final speed 1.15x feels perfect"
```

### Save WIP (Work In Progress)
```powershell
# Hvis du skal stoppe midt i noget
git add .
git commit -m "wip: Working on new enemy type (not finished)"
git push origin main

# Næste dag
git pull origin main
# Fortsæt arbejde
git add .
git commit -m "feat: Complete new enemy type with AI"
git push origin main
```

---

##  Branching for Features

### Større Game Features
```powershell
# Ny major feature (f.eks. multiplayer mode)
git checkout -b feature/multiplayer

# Arbejd på feature
git add .
git commit -m "feat: Add player 2 controls"
git commit -m "feat: Add collision between players"
git commit -m "feat: Add multiplayer UI"

# Test grundigt
# Merge når klar
git checkout main
git merge feature/multiplayer
git push origin main

# Slet branch
git branch -d feature/multiplayer
```

**Hvornår bruge branches?**
-  Nye game modes
-  Major mechanics changes
-  Redesigns
-  Små balance tweaks
-  Bug fixes
-  Visual updates

---

##  Debug Med Git

###Find Når Bug Blev Introduceret
```powershell
# Se sidste 10 commits
git log --oneline -10

# Test specifik commit
git checkout abc123
npm run dev
# Test spillet

# Tilbage til seneste
git checkout main
```

### Se Ændringer i Game Logic
```powershell
# Se hvad der blev ændret i sidste commit
git show HEAD:src/game.js

# Sammenlign med 3 commits tilbage
git diff HEAD~3 src/game.js
```

---

##  Problem Løsning

### Fortryd Balance Change
```powershell
# Hvis sidste balance tweak var for meget
git revert HEAD
git push origin main

# Eller ændre værdier manuelt og commit
git add src/game.js
git commit -m "balance: Revert speed change, was too difficult"
```

### Test Tidligere Version
```powershell
# Gem nuværende arbejde
git stash

# Test ældre version
git checkout abc123
npm run dev

# Tilbage til seneste
git checkout main
git stash pop
```

---

##  Best Practices for Game Development

###  DO

- **Test efter hver ændring** - Play test hver feature
- **Balance iterativt** - Små justeringer, test, commit
- **Commit working features** - Kun commit når det virker
- **Document game changes** - Forklar balance decisions
- **Push dagligt** - Backup dit game progress
- **Save configurations** - Commit alle konstanter (speeds, timers)

###  DON'T

- **Commit broken game** - Test altid først
- **Change multiple things** - Én ændring ad gangen for balance
- **Commit .env** - Database passwords stays local
- **Skip playtesting** - Test hver feature grundigt
- **Vague messages** - "Update game" er ikke nyttigt

---

##  Game Development Commit Examples

### Good Commits 
```powershell
git commit -m "feat: Add triple-shot power-up lasting 5 seconds"
git commit -m "fix: Bullets no longer spawn inside player on mobile"
git commit -m "balance: Reduce enemy spawn rate from 3s to 4s intervals"
git commit -m "perf: Limit max bullets on screen to 100 for better FPS"
git commit -m "style: Add particle effects on item collection"
```

### Bad Commits 
```powershell
git commit -m "Update"                    # Hvad blev opdateret?
git commit -m "Fix stuff"                 # Hvilken bug?
git commit -m "asdf"                      # Ikke beskrivende
git commit -m "Changes to game"           # Hvilke changes?
git commit -m "WIP"                       # Hvad arbejdes der på?
```

---

##  Quick Reference

### Daily Commands
```powershell
git pull origin main          # Hent seneste
git status                    # Check status
git add .                     # Stage alt
git commit -m "msg"           # Commit
git push origin main          # Push
```

### Game Development Flow
```powershell
# 1. Pull seneste
git pull origin main

# 2. Arbejd på feature
# Edit src/game.js

# 3. Test grundigt
npm run dev
# Play test for 5+ minutes

# 4. Commit hvis det virker
git add src/game.js
git commit -m "feat: New enemy type with homing behavior"

# 5. Push
git push origin main
```

### Quick Fixes
```powershell
# Fix bug
git add src/game.js
git commit -m "fix: Collision detection now pixel-perfect"
git push origin main

# Balance tweak
git add src/game.js
git commit -m "balance: Reduce power-up spawn rate by 20%"
git push origin main
```

---

##  Deployment Workflow

### Test  Commit  Deploy
```powershell
# 1. Test lokalt
npm run dev
# Grundig testing

# 2. Commit
git add .
git commit -m "feat: Add new boss enemy at level 5"
git push origin main

# 3. Deploy til production
.\deploy.ps1

# 4. Test live
Start-Process "http://papirklips.slambert.com:8082"
```

---

**Happy Game Development! **

*Husk: Git track dine game iterations - brug det til at eksperimentere!*
