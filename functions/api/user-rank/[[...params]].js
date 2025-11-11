/**
 * Cloudflare Pages Function: GET /api/user-rank/[gamertag]/[time]
 * Henter brugerens placering i leaderboard
 */

export async function onRequestGet(context) {
  const { params, env } = context;
  
  try {
    const gamertag = decodeURIComponent(params[0]); // First path segment after /api/user-rank/
    const time = parseFloat(params[1]); // Second path segment
    
    if (!gamertag || !time) {
      return new Response(
        JSON.stringify({ error: 'Missing gamertag or time' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find user's rank based on their score
    const rankResult = await env.DB.prepare(`
      SELECT COUNT(*) + 1 as rank
      FROM leaderboard 
      WHERE survival_time > ?
    `).bind(time).first();

    const userRank = rankResult.rank || 1;

    return new Response(
      JSON.stringify({ rank: userRank }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching user rank:', error);
    return new Response(
      JSON.stringify({ error: 'Server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}