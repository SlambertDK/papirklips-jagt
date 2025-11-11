/**
 * Cloudflare Pages Function: GET /api/leaderboard
 * Henter top 10 Papirklips Jagt scores
 */

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const result = await env.DB.prepare(`
      SELECT initials, survival_time, created_at
      FROM leaderboard
      ORDER BY survival_time DESC
      LIMIT 10
    `).all();

    return new Response(
      JSON.stringify(result.results || []),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return new Response(
      JSON.stringify({ error: 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
