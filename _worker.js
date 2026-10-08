export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const backend = (env.BACKEND_URL || 'https://volam-idle.onrender.com').replace(/\/+$/, '');

    // 1. Chuyển tiếp toàn bộ API và kết nối WebSocket về máy chủ backend Node.js (MongoDB Atlas + WebSocket Server)
    if (url.pathname.startsWith('/api/') || request.headers.get('Upgrade') === 'websocket') {
      const targetUrl = new URL(url.pathname + url.search, backend);
      const newHeaders = new Headers(request.headers);
      try {
        newHeaders.set('Host', new URL(backend).host);
      } catch (e) {}

      try {
        return await fetch(targetUrl.toString(), {
          method: request.method,
          headers: newHeaders,
          body: (request.method !== 'GET' && request.method !== 'HEAD') ? request.body : null,
          redirect: 'follow'
        });
      } catch (err) {
        return new Response(JSON.stringify({
          ok: false,
          error: `Máy chủ Online hiện đang bảo trì hoặc chưa khởi động (${err.message || 'Backend Offline'}). Vui lòng thử lại sau!`
        }), {
          status: 502,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // 2. Phục vụ Static Assets tự động qua Cloudflare Edge (HTML, JS, CSS, 11.000 Sprite doll, Âm thanh MP3)
    return env.ASSETS.fetch(request);
  }
};
