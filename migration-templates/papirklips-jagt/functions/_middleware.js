/**
 * Cloudflare Pages Middleware
 * Kører på alle requests - håndterer CORS, security headers, og cleanup
 */

// Cleanup kører asynkront kun på 5% af requests
async function cleanupOldRecords(env) {
  if (Math.random() > 0.05) return; // Kun 5% af requests

  const oneHourAgo = Date.now() - 3600000;
  const oneDayAgo = Date.now() - 86400000;

  try {
    // Cleanup gamle sessions (over 1 time)
    await env.DB.prepare(`
      DELETE FROM sessions WHERE created_at < ?
    `).bind(oneHourAgo).run();

    // Cleanup gamle rate limits (over 24 timer)
    await env.DB.prepare(`
      DELETE FROM rate_limits WHERE timestamp < ?
    `).bind(oneDayAgo).run();
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

export async function onRequest(context) {
  const { request, next, env } = context;

  // CORS headers for alle requests
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };

  // Håndter preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Asynkron cleanup (blokerer ikke request)
  context.waitUntil(cleanupOldRecords(env));

  // Få response fra handler
  const response = await next();

  // Tilføj security og CORS headers
  const newResponse = new Response(response.body, response);
  
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newResponse.headers.set(key, value);
  });

  newResponse.headers.set('X-Content-Type-Options', 'nosniff');
  newResponse.headers.set('X-Frame-Options', 'DENY');
  newResponse.headers.set('X-XSS-Protection', '1; mode=block');
  newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  newResponse.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"
  );

  return newResponse;
}
