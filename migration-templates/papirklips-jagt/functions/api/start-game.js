/**
 * Cloudflare Pages Function: POST /api/start-game
 * Genererer session token for Papirklips Jagt anti-cheat
 */

function generateSessionToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { clientId } = body || {};

    if (!clientId || typeof clientId !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing client ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = generateSessionToken();
    const created = Date.now();

    await env.DB.prepare(`
      INSERT INTO sessions (token, client_id, created_at, used)
      VALUES (?, ?, ?, 0)
    `).bind(token, clientId, created).run();

    return new Response(
      JSON.stringify({ success: true, token }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in start-game:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
