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

function corsHeaders(methods = 'GET, POST, DELETE, OPTIONS') {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    // 1. Route /api/chat (POST)
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const { message, historyMsgs, sysPrompt } = await request.json();
        if (!env.AI) {
          return new Response(JSON.stringify({ error: 'AI binding not configured' }), {
            status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
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
          status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
        });
      }
    }

    // 2. Route /api/auth (POST)
    if (url.pathname === '/api/auth' && request.method === 'POST') {
      try {
        const { password } = await request.json()
        const adminPassword = env.ADMIN_PASSWORD
        if (!adminPassword) {
          return new Response(JSON.stringify({ error: 'Admin password not configured' }), {
            status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
          })
        }
        if (password !== adminPassword) {
          return new Response(JSON.stringify({ error: 'Password salah' }), {
            status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
          })
        }
        const token = btoa(JSON.stringify({
          p: adminPassword,
          t: Date.now()
        }))
        return new Response(JSON.stringify({ token }), {
          status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
        })
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
        })
      }
    }

    // 3. Route /api/photos (GET or POST)
    if (url.pathname === '/api/photos') {
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
    }

    // 4. Route /api/photos/:id (DELETE)
    const photoIdMatch = url.pathname.match(/^\/api\/photos\/([^/]+)$/);
    if (photoIdMatch && request.method === 'DELETE') {
      if (!verifyToken(request, env)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders() }
        })
      }
      try {
        const id = photoIdMatch[1]
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

    // Fallback to static assets
    return env.ASSETS.fetch(request);
  }
}
