export async function onRequest(context) {
  const { request, env } = context

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const { message, historyMsgs, sysPrompt } = await request.json()
    if (!env.AI) {
      return new Response(JSON.stringify({ error: 'Cloudflare Workers AI binding not configured' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      })
    }

    // Call Cloudflare Workers AI directly (free tier)
    const aiResponse = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
      messages: [
        { role: 'system', content: sysPrompt },
        ...historyMsgs,
        { role: 'user', content: message }
      ],
      max_tokens: 120,
      temperature: 0.85
    })

    const reply = aiResponse.response || ''

    return new Response(JSON.stringify({ reply }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Workers AI error: ' + err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
}
