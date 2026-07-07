function verifyToken(request, env) {
  const auth = request.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) return false
  try {
    const token = JSON.parse(atob(auth.slice(7)))
    return token.p === env.ADMIN_PASSWORD
  } catch {
    return false
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
}

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() })
  }

  if (request.method !== 'DELETE') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    })
  }

  if (!verifyToken(request, env)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    })
  }

  try {
    const id = context.params.id
    const photo = await env.DB.prepare('SELECT id FROM photos WHERE id = ?').bind(id).first()

    if (!photo) {
      return new Response(JSON.stringify({ error: 'Photo not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      })
    }

    await env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(id).run()

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    })
  }
}
