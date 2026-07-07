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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
}

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() })
  }

  if (request.method === 'GET') {
    try {
      const result = await env.DB.prepare(
        'SELECT id, title, description, latitude, longitude, imgur_url, region, created_at FROM photos ORDER BY created_at DESC'
      ).all()

      return new Response(JSON.stringify(result.results), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      })
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      })
    }
  }

  if (request.method === 'POST') {
    if (!verifyToken(request, env)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      })
    }

    try {
      const formData = await request.formData()
      const title = formData.get('title')
      const description = formData.get('description') || ''
      const region = formData.get('region') || ''
      const latitude = parseFloat(formData.get('latitude'))
      const longitude = parseFloat(formData.get('longitude'))
      const image = formData.get('image')

      if (!title || !image || isNaN(latitude) || isNaN(longitude)) {
        return new Response(JSON.stringify({ error: 'Title, image, and location required' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
        })
      }

      const apiKey = env.IMGBB_API_KEY
      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'ImgBB API key not configured' }), {
          status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
        })
      }

      const imgbbForm = new FormData()
      imgbbForm.append('image', image)

      const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: imgbbForm
      })

      const imgbbData = await imgbbRes.json()

      if (!imgbbData.success) {
        return new Response(JSON.stringify({ error: imgbbData.error?.message || 'ImgBB upload failed' }), {
          status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
        })
      }

      const imageUrl = imgbbData.data.url
      const deleteUrl = imgbbData.data.delete_url

      await env.DB.prepare(
        `INSERT INTO photos (title, description, latitude, longitude, imgur_url, deletehash, region)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(title, description, latitude, longitude, imageUrl, deleteUrl, region).run()

      return new Response(JSON.stringify({ success: true, url: imageUrl }), {
        status: 201, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      })
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      })
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
  })
}
