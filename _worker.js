export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API endpoints cho game khi chạy trên Cloudflare
    if (url.pathname.startsWith('/api/')) {
      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      };

      if (request.method === 'OPTIONS') {
        return new Response(null, { headers });
      }

      if (url.pathname === '/api/login' || url.pathname === '/api/register') {
        try {
          const body = await request.json();
          const username = (body.username || 'user').trim();
          const heroName = (body.heroName || username).trim();
          const fac = body.fac || 'shaolin';
          return new Response(JSON.stringify({
            ok: true,
            token: 'cf_' + username.toLowerCase(),
            user: {
              username: username,
              heroName: heroName,
              fac: fac
            },
            state: null
          }), { headers });
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: 'Dữ liệu không hợp lệ' }), { status: 400, headers });
        }
      }

      if (url.pathname === '/api/me') {
        return new Response(JSON.stringify({
          ok: true,
          user: { username: 'Hiệp Khách', heroName: 'Hiệp Khách', fac: 'shaolin' }
        }), { headers });
      }

      if (url.pathname === '/api/save') {
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      if (url.pathname === '/api/logout') {
        return new Response(JSON.stringify({ ok: true }), { headers });
      }

      return new Response(JSON.stringify({ ok: false, error: 'Endpoint not found' }), { status: 404, headers });
    }

    // Phục vụ Static Assets tự động (HTML, JS, CSS, hình ảnh, âm thanh)
    return env.ASSETS.fetch(request);
  }
};
