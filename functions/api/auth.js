export async function onRequest(context) {
  const { request, env } = context

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const { password } = await request.json()
    const adminPassword = env.ADMIN_PASSWORD

    if (!adminPassword) {
      return new Response(JSON.stringify({ error: 'Admin password not configured' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      })
    }

    if (password !== adminPassword) {
      return new Response(JSON.stringify({ error: 'Password salah' }), {
        status: 401, headers: { 'Content-Type': 'application/json' }
      })
    }

    const token = btoa(JSON.stringify({
      p: adminPassword,
      t: Date.now()
    }))

    return new Response(JSON.stringify({ token }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    })
  }
}
