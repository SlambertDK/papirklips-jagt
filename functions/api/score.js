/**
 * Cloudflare Pages Function: POST /api/score
 * Modtager og gemmer Papirklips Jagt scores med anti-cheat validering
 */

async function hashIP(ip, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { initials, survivalTime, sessionToken, clientId } = body || {};

    // Valider input
    if (!initials || !survivalTime || !sessionToken || !clientId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (typeof initials !== 'string' || initials.length !== 3) {
      return new Response(
        JSON.stringify({ success: false, error: 'Initials must be exactly 3 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const time = parseInt(survivalTime, 10);
    if (isNaN(time) || time < 1 || time > 9999) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid survival time' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Hent IP adresse
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    const ipHash = await hashIP(ip, env.IP_HASH_SALT);

    // Valider session token
    const session = await env.DB.prepare(`
      SELECT client_id, created_at, used FROM sessions WHERE token = ?
    `).bind(sessionToken).first();

    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid session token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (session.client_id !== clientId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Client ID mismatch' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (session.used === 1) {
      return new Response(
        JSON.stringify({ success: false, error: 'Session token already used' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const tokenAge = Date.now() - session.created_at;
    if (tokenAge > 3600000) { // 1 time
      return new Response(
        JSON.stringify({ success: false, error: 'Session token expired' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Tjek rate limiting
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    const recentSubmissions = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM rate_limits 
      WHERE ip_hash = ? AND timestamp > ?
    `).bind(ipHash, oneMinuteAgo).first();

    if (recentSubmissions && recentSubmissions.count >= 5) {
      return new Response(
        JSON.stringify({ success: false, error: 'Too many submissions. Please wait a minute.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Tjek for duplikater (samme score inden for 10 sekunder)
    const tenSecondsAgo = now - 10000;
    const duplicate = await env.DB.prepare(`
      SELECT id FROM leaderboard 
      WHERE ip_hash = ? AND survival_time = ? AND created_at > ?
    `).bind(ipHash, time, tenSecondsAgo).first();

    if (duplicate) {
      return new Response(
        JSON.stringify({ success: false, error: 'Duplicate submission detected' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Gem score
    const result = await env.DB.prepare(`
      INSERT INTO leaderboard (initials, survival_time, ip_hash, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(initials.toUpperCase(), time, ipHash, now).run();

    // Beregn rank - antallet af bedre scores + 1
    const rankResult = await env.DB.prepare(`
      SELECT COUNT(*) + 1 as rank
      FROM leaderboard 
      WHERE survival_time > ?
    `).bind(time).first();

    // Marker session som brugt
    await env.DB.prepare(`
      UPDATE sessions SET used = 1 WHERE token = ?
    `).bind(sessionToken).run();

    // Gem rate limit
    await env.DB.prepare(`
      INSERT INTO rate_limits (ip_hash, timestamp)
      VALUES (?, ?)
    `).bind(ipHash, now).run();

    return new Response(
      JSON.stringify({ success: true, data: result, rank: rankResult.rank }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error submitting score:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
