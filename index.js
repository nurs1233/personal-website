export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Route /api/chat to Cloudflare Workers AI
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const { message, historyMsgs, sysPrompt } = await request.json();
        
        if (!env.AI) {
          return new Response(JSON.stringify({ error: 'AI binding not configured' }), {
            status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const aiResponse = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
          messages: [
            { role: 'system', content: sysPrompt },
            ...historyMsgs,
            { role: 'user', content: message }
          ],
          max_tokens: 120,
          temperature: 0.85
        });

        const reply = aiResponse.response || '';
        return new Response(JSON.stringify({ reply }), {
          status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // CORS preflight request handling for API
    if (url.pathname === '/api/chat' && request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    // Otherwise, fallback and serve the static assets
    return env.ASSETS.fetch(request);
  }
}
