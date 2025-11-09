// Papirklips Jagt - Server
// Port 8082

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8082;

// Database connection
const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

console.log('Connecting to Postgres with:', {
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src')));

// Game session tokens for anti-cheat
const gameSessions = new Map();
const SESSION_TIMEOUT = 600000; // 10 minutes

function generateSessionToken() {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// Cleanup expired sessions
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of gameSessions.entries()) {
    if (now - session.created > SESSION_TIMEOUT) {
      gameSessions.delete(token);
    }
  }
}, 60000);

// Rate limiting
const userSubmissions = new Map();
const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW = 60000;

function checkRateLimit(clientId) {
  const now = Date.now();
  
  if (!userSubmissions.has(clientId)) {
    userSubmissions.set(clientId, []);
  }
  
  const submissions = userSubmissions.get(clientId);
  const recentSubmissions = submissions.filter(time => now - time < RATE_LIMIT_WINDOW);
  userSubmissions.set(clientId, recentSubmissions);
  
  if (recentSubmissions.length >= RATE_LIMIT) {
    return false;
  }
  
  recentSubmissions.push(now);
  return true;
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

// Start game session
app.post('/api/start-game', (req, res) => {
  const token = generateSessionToken();
  
  gameSessions.set(token, {
    created: Date.now(),
    used: false
  });
  
  res.json({ success: true, token });
});

// Submit score
app.post('/api/submit-score', async (req, res) => {
  try {
    const { initials, time, token, clientId } = req.body || {};

    if (!initials || typeof initials !== 'string') {
      return res.status(400).json({ success: false, error: "Manglende initialer" });
    }

    const cleanInitials = initials.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (cleanInitials.length < 1) {
      return res.status(400).json({ success: false, error: "Ugyldige initialer" });
    }

    // Rate limiting
    if (clientId && !checkRateLimit(clientId)) {
      return res.status(429).json({ 
        success: false, 
        error: "For mange forsøg. Prøv igen om et minut." 
      });
    }

    // Validate time
    if (!Number.isInteger(time) || time < 0) {
      return res.status(400).json({ success: false, error: "Ugyldig tid" });
    }
    
    const MAX_REALISTIC_TIME = 9999;
    if (time > MAX_REALISTIC_TIME) {
      return res.status(400).json({ 
        success: false, 
        error: `Tid kan ikke være højere end ${MAX_REALISTIC_TIME} sekunder. Nice try! 😏` 
      });
    }

    // Session token validation
    if (!token || !gameSessions.has(token)) {
      return res.status(400).json({ 
        success: false, 
        error: "Ugyldig spil-session. Start spillet igen." 
      });
    }

    const session = gameSessions.get(token);
    if (session.used) {
      return res.status(400).json({ 
        success: false, 
        error: "Session token allerede brugt" 
      });
    }

    session.used = true;

    // Check for duplicate
    const duplicateCheck = await pool.query(
      `SELECT COUNT(*) as count FROM leaderboard 
       WHERE initials = $1 AND survival_time = $2 AND created_at > NOW() - INTERVAL '1 minute'`,
      [cleanInitials, time]
    );

    if (parseInt(duplicateCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Denne score er allerede indsendt" 
      });
    }

    // Insert score
    const result = await pool.query(
      "INSERT INTO leaderboard(initials, survival_time) VALUES ($1, $2) RETURNING *", 
      [cleanInitials, time]
    );

    // Get rank
    const rankResult = await pool.query(
       `SELECT COUNT(*) as rank 
       FROM leaderboard 
       WHERE survival_time > $1 
       OR (survival_time = $1 AND created_at < $2)`,
       [time, result.rows[0].created_at]
    );

    const rank = parseInt(rankResult.rows[0].rank) + 1;

    res.json({ 
      success: true, 
      rank, 
      message: `Godt klaret! Du er nr. ${rank} på leaderboardet! 🎉` 
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ success: false, error: "Server fejl" });
  }
});

// Get leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT initials, survival_time FROM leaderboard ORDER BY survival_time DESC LIMIT 10"
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: "Server fejl" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🎮 Papirklips Jagt running on http://localhost:${PORT}`);
});
