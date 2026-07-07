export async function onRequest(context) {
  const { request, env } = context

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const { message, historyMsgs, sysPrompt } = await request.json()
    const apiKey = env.OPENROUTER_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured on server' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      })
    }

    const openRouterModel = 'openai/gpt-oss-20b:free'
    const body = {
      model: openRouterModel,
      messages: [
        { role: 'system', content: sysPrompt },
        ...historyMsgs,
        { role: 'user', content: message }
      ],
      temperature: 0.85,
      max_tokens: 120
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const errText = await res.text()
      return new Response(JSON.stringify({ error: 'OpenRouter error: ' + errText }), {
        status: res.status, headers: { 'Content-Type': 'application/json' }
      })
    }

    const data = await res.json()
    const reply = data?.choices?.[0]?.message?.content || ''

    return new Response(JSON.stringify({ reply }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid request: ' + err.message }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }
}
