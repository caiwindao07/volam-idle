/* ==========================================================================
   VÕ LÂM IDLE - MULTIPLAYER BRIDGE (CẦU NỐI ONLINE CHO BẢN CHUẨN VINARPG)
   - Giữ nguyên 100% gameplay, combat, loot, exp, map của bản chuẩn.
   - Thêm tính năng:
     1. Đồng bộ người chơi khác & BOT cùng chạy trên bãi quái qua WebSocket.
     2. Chat thế giới thời gian thực kết nối với server.
     3. Tài khoản Đám mây (Đăng nhập / Đăng ký / Cloud Save MongoDB).
   ========================================================================== */
'use strict';

(function () {
  console.log('[MultiplayerBridge] Khởi tạo cầu nối Online...');

  // 1. Quản lý Phiên & Tài khoản
  let token = localStorage.getItem('volam_token') || '';
  let currentUser = localStorage.getItem('volam_username') || '';
  let ws = null;
  let otherPlayers = new Map(); // id -> playerObj
  let lastMoveSent = 0;

  // Tiền nạp ảnh kỵ mã dự phòng
  const riderImgs = {};
  function getRiderImg(key) {
    if (!riderImgs[key]) {
      const im = new Image();
      im.src = 'img/horse/' + key + '.png';
      riderImgs[key] = im;
    }
    return riderImgs[key];
  }

  // 2. Kết nối WebSocket
  function connectWs() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = location.host || 'localhost:8080';
    try {
      ws = new WebSocket(`${proto}//${host}`);
    } catch (e) {
      console.warn('[MultiplayerBridge] Lỗi tạo WebSocket:', e);
      return;
    }

    ws.onopen = () => {
      console.log('[MultiplayerBridge] Đã kết nối máy chủ WebSocket');
      updateOnlineStatus(true);
      sendAuth();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
      } catch (e) {
        console.error('[MultiplayerBridge] Lỗi parse tin nhắn:', e);
      }
    };

    ws.onclose = () => {
      console.log('[MultiplayerBridge] Mất kết nối, thử kết nối lại sau 3s...');
      updateOnlineStatus(false);
      otherPlayers.clear();
      setTimeout(connectWs, 3000);
    };

    ws.onerror = () => {
      try { ws.close(); } catch (e) {}
    };
  }

  function sendAuth() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const s = window.S || {};
    ws.send(JSON.stringify({
      type: 'auth',
      token: token,
      name: s.name || 'Hiệp Khách',
      fac: s.fac || 'shaolin',
      lvl: s.lvl || 1,
      zoneId: (window.R && window.R.stage) || 1
    }));
  }

  function handleServerMessage(msg) {
    switch (msg.type) {
      case 'players':
        // Danh sách người chơi trong zone
        if (Array.isArray(msg.list)) {
          const newMap = new Map();
          for (const p of msg.list) {
            const existing = otherPlayers.get(p.id) || p;
            existing.targetX = p.x;
            existing.targetY = p.y;
            existing.x = existing.x != null ? existing.x : p.x;
            existing.y = existing.y != null ? existing.y : p.y;
            existing.act = p.act || 'st';
            existing.dir = p.dir || 0;
            existing.name = p.name || 'Người chơi';
            existing.fac = p.fac || 'shaolin';
            existing.lvl = p.lvl || 1;
            existing.mounted = !!p.mounted;
            existing.vip = p.vip || 0;
            existing.actT = (existing.actT || 0);
            newMap.set(p.id, existing);
          }
          otherPlayers = newMap;
        }
        break;

      case 'player_move':
        if (msg.id) {
          const p = otherPlayers.get(msg.id) || {};
          p.id = msg.id;
          p.targetX = msg.x;
          p.targetY = msg.y;
          if (p.x == null) p.x = msg.x;
          if (p.y == null) p.y = msg.y;
          p.act = msg.act || 'st';
          p.dir = msg.dir || 0;
          p.face = msg.face || 1;
          p.mounted = !!msg.mounted;
          if (msg.name) p.name = msg.name;
          if (msg.lvl) p.lvl = msg.lvl;
          if (msg.fac) p.fac = msg.fac;
          otherPlayers.set(msg.id, p);
        }
        break;

      case 'player_leave':
        if (msg.id) otherPlayers.delete(msg.id);
        break;

      case 'chat':
        appendChatMessage(msg);
        break;

      case 'online_count':
        updateOnlineBadge(msg.count);
        break;

      case 'banned':
      case 'kicked':
        alert(msg.reason || msg.message || 'Bạn đã bị ngắt kết nối khỏi máy chủ!');
        break;
    }
  }

  // 3. Gửi tọa độ di chuyển
  function sendMove() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const now = Date.now();
    if (now - lastMoveSent < 90) return; // ~11 lần / giây
    lastMoveSent = now;

    const H = window.H;
    const S = window.S;
    const R = window.R;
    if (!H || !S) return;

    ws.send(JSON.stringify({
      type: 'move',
      x: Math.round(H.x * 10) / 10,
      y: Math.round(H.y * 10) / 10,
      act: H.act || 'st',
      dir: H.dir || 0,
      face: H.face || 1,
      mounted: !!S.mounted,
      name: S.name || 'Hiệp Khách',
      fac: S.fac || 'shaolin',
      lvl: S.lvl || 1,
      stage: R ? (R.stage || 1) : 1
    }));
  }

  // 4. Vẽ người chơi khác trên bản đồ
  function drawOtherPlayers(dt) {
    const c = window.CX;
    if (!c || otherPlayers.size === 0) return;

    const dpr = window.DPR || 1;
    const cam = window.CAM || { x: 0, y: 0 };
    c.save();
    c.setTransform(dpr, 0, 0, dpr, -Math.round(cam.x + (cam.sx || 0)) * dpr, -Math.round(cam.y + (cam.sy || 0)) * dpr);

    const W = window.W || {};
    const heroes = W.hero || {};

    for (const p of otherPlayers.values()) {
      // Nội suy tọa độ (Lerp)
      if (p.targetX != null && p.targetY != null) {
        p.x += (p.targetX - p.x) * Math.min(1, dt * 10);
        p.y += (p.targetY - p.y) * Math.min(1, dt * 10);
      }
      p.actT = (p.actT || 0) + dt;

      const px = Math.round(p.x);
      const py = Math.round(p.y);

      // A. Bóng dưới chân
      c.fillStyle = '#0007';
      c.beginPath();
      c.ellipse(px, py, 14, 5, 0, 0, Math.PI * 2);
      c.fill();

      // B. Hoạt ảnh nhân vật
      const hCfg = heroes[p.fac] || heroes['shaolin'];
      const animKey = hCfg ? hCfg.anim : 'pl_shaolin';
      let drawn = false;

      if (p.mounted) {
        // Kỵ mã: vẽ thân kỵ mã ngồi
        const sexKey = (p.fac === 'emei' || p.fac === 'cuiyan') ? 'lady' : 'man';
        const actKey = p.act === 'run' ? 'run' : 'st';
        const rImg = getRiderImg(`rider_body_${sexKey}_${actKey}`);
        if (rImg && rImg.complete && rImg.naturalWidth) {
          const fps = actKey === 'run' ? 12 : 6;
          const frameIdx = Math.floor(p.actT * fps) % 8;
          const dirIdx = (((p.dir || 0) % 8) + 8) % 8;
          c.drawImage(rImg, frameIdx * 128, dirIdx * 128, 128, 128, px - 64, py - 74, 128, 128);
          drawn = true;
        }
      }

      if (!drawn && typeof window.drawAnim === 'function') {
        drawn = window.drawAnim(animKey, p.act || 'st', p.dir || 0, p.actT, px, py, 1.35, 1);
      }
      if (!drawn) {
        c.fillStyle = '#ffd700';
        c.beginPath();
        c.arc(px, py - 20, 12, 0, Math.PI * 2);
        c.fill();
      }

      // C. Tên & Đẳng cấp & VIP trên đầu
      c.font = '11px "IBM Plex Mono", monospace';
      c.textAlign = 'center';
      const labelY = py - 46;
      const vipTag = p.vip > 1 ? `[VIP${p.vip}] ` : '';
      const nameText = `${vipTag}${p.name} · Lv${p.lvl}`;

      c.fillStyle = '#000a';
      c.fillRect(px - 45, labelY - 11, 90, 14);
      c.fillStyle = p.vip > 1 ? '#fbbf24' : '#93c5fd';
      c.fillText(nameText, px, labelY);
    }

    c.restore();
  }

  // Hook vào hàm render chính của game
  function hookGameLoop() {
    const checkTimer = setInterval(() => {
      if (typeof window.draw === 'function' && !window.draw.__bridged) {
        const origDraw = window.draw;
        const wrappedDraw = function (dt) {
          origDraw.apply(this, arguments);
          try {
            sendMove();
            drawOtherPlayers(dt);
          } catch (err) {}
        };
        wrappedDraw.__bridged = true;
        window.draw = wrappedDraw;
        clearInterval(checkTimer);
        console.log('[MultiplayerBridge] Đã hook thành công vào vòng lặp vẽ đồ họa game!');
      }
    }, 200);

    // Hook Cloud Save vào hàm window.save()
    let saveTimeout = null;
    const saveCheckTimer = setInterval(() => {
      if (typeof window.save === 'function' && !window.save.__bridged) {
        const origSave = window.save;
        const wrappedSave = function () {
          const res = origSave.apply(this, arguments);
          if (token && currentUser) {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(syncCloudSave, 1500); // Debounce 1.5s
          }
          return res;
        };
        wrappedSave.__bridged = true;
        window.save = wrappedSave;
        clearInterval(saveCheckTimer);
        console.log('[MultiplayerBridge] Đã hook thành công vào tính năng Lưu Đám Mây!');
      }
    }, 200);
  }

  // 5. Cloud Save API
  async function syncCloudSave() {
    if (!token || !window.S) return;
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          state: window.S
        })
      });
      const data = await res.json();
      if (data.ok) {
        updateCloudStatus('Đã đồng bộ');
      }
    } catch (e) {
      console.warn('[MultiplayerBridge] Không thể đồng bộ đám mây:', e);
    }
  }

  // 6. Giao diện Chat Thế Giới kết nối thật
  function hookWorldChat() {
    const chatForm = document.querySelector('.wc-form');
    const chatInput = document.querySelector('.wc-input');
    if (!chatForm || !chatInput) {
      setTimeout(hookWorldChat, 500);
      return;
    }

    chatForm.onsubmit = (e) => {
      e.preventDefault();
      const text = (chatInput.value || '').trim();
      if (!text) return;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        alert('Chưa kết nối máy chủ!');
        return;
      }
      const s = window.S || {};
      ws.send(JSON.stringify({
        type: 'chat',
        text: text,
        name: s.name || 'Hiệp Khách',
        fac: s.fac || 'shaolin',
        vip: s.vip || 0
      }));
      chatInput.value = '';
    };
  }

  function appendChatMessage(msg) {
    const list = document.querySelector('.wc-list');
    if (!list) return;
    const item = document.createElement('div');
    item.className = 'wc-item';
    const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const vipTag = msg.vip > 1 ? `<span style="color:#fbbf24">[VIP${msg.vip}]</span> ` : '';
    item.innerHTML = `<small style="color:#888">${time}</small> ${vipTag}<b style="color:#38bdf8">${msg.name || 'Hiệp Khách'}:</b> <span>${escapeHtml(msg.text || '')}</span>`;
    list.appendChild(item);
    list.scrollTop = list.scrollHeight;
  }

  function updateOnlineBadge(count) {
    const badge = document.querySelector('.wc-online');
    if (badge) badge.textContent = `Online ${count}`;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // 7. Nút Tài Khoản & Modal Đăng nhập / Đăng ký
  function setupAccountUI() {
    const header = document.getElementById('top');
    if (!header) {
      setTimeout(setupAccountUI, 300);
      return;
    }

    let authPill = document.getElementById('bridgeAuthPill');
    if (!authPill) {
      authPill = document.createElement('div');
      authPill.id = 'bridgeAuthPill';
      authPill.style.cssText = 'position:absolute;top:6px;right:70px;z-index:99;background:rgba(15,23,42,0.85);border:1px solid #eab308;padding:3px 8px;border-radius:12px;font-size:11px;color:#fef08a;cursor:pointer;display:flex;align-items:center;gap:4px;';
      authPill.onclick = openAuthModal;
      header.appendChild(authPill);
    }
    updateAuthPill();
  }

  function updateAuthPill() {
    const pill = document.getElementById('bridgeAuthPill');
    if (!pill) return;
    if (currentUser) {
      pill.innerHTML = `🟢 <b>${currentUser}</b> <small style="color:#86efac" id="cloudStatusTxt">(Mây ✓)</small>`;
    } else {
      pill.innerHTML = `☁️ <b>Đăng nhập</b>`;
    }
  }

  function updateCloudStatus(txt) {
    const el = document.getElementById('cloudStatusTxt');
    if (el) el.textContent = `(${txt})`;
  }

  function updateOnlineStatus(online) {
    const pill = document.getElementById('bridgeAuthPill');
    if (pill && !currentUser) {
      pill.innerHTML = online ? `🟢 <b>Online</b> · Đăng nhập` : `🔴 <b>Mất kết nối</b>`;
    }
  }

  function openAuthModal() {
    let modal = document.getElementById('bridgeAuthModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'bridgeAuthModal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;';
      modal.innerHTML = `
        <div style="background:#18181b;border:2px solid #eab308;border-radius:8px;padding:20px;width:320px;color:#fff;font-family:sans-serif;box-shadow:0 10px 25px rgba(0,0,0,0.8);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <h3 style="margin:0;color:#fef08a;font-size:16px;">Tài Khoản & Lưu Đám Mây</h3>
            <button id="closeBridgeModal" style="background:none;border:none;color:#aaa;font-size:18px;cursor:pointer;">✕</button>
          </div>
          <div id="authFormArea">
            <input id="authUsername" type="text" placeholder="Tên đăng nhập" style="width:100%;box-sizing:border-box;padding:8px;margin-bottom:8px;background:#27272a;border:1px solid #52525b;color:#fff;border-radius:4px;">
            <input id="authPassword" type="password" placeholder="Mật khẩu" style="width:100%;box-sizing:border-box;padding:8px;margin-bottom:12px;background:#27272a;border:1px solid #52525b;color:#fff;border-radius:4px;">
            <div style="display:flex;gap:8px;">
              <button id="btnLoginBridge" style="flex:1;padding:8px;background:#ca8a04;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Đăng nhập</button>
              <button id="btnRegBridge" style="flex:1;padding:8px;background:#3f3f46;color:#fff;border:none;border-radius:4px;cursor:pointer;">Đăng ký</button>
            </div>
            <div id="authMsg" style="margin-top:10px;font-size:12px;color:#ef4444;text-align:center;"></div>
          </div>
          <div id="authLoggedInArea" style="display:none;text-align:center;">
            <p>Đang đăng nhập: <b id="loggedInName" style="color:#38bdf8;"></b></p>
            <p style="font-size:12px;color:#a1a1aa;">Tiến trình nhân vật tự động đồng bộ lên MongoDB sau mỗi lần lưu.</p>
            <button id="btnLogoutBridge" style="padding:6px 16px;background:#ef4444;color:#fff;border:none;border-radius:4px;cursor:pointer;margin-top:8px;">Đăng xuất</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('closeBridgeModal').onclick = () => modal.style.display = 'none';
      document.getElementById('btnLoginBridge').onclick = handleLogin;
      document.getElementById('btnRegBridge').onclick = handleRegister;
      document.getElementById('btnLogoutBridge').onclick = handleLogout;
    }

    const formArea = document.getElementById('authFormArea');
    const loggedArea = document.getElementById('authLoggedInArea');
    const nameEl = document.getElementById('loggedInName');
    if (currentUser) {
      formArea.style.display = 'none';
      loggedArea.style.display = 'block';
      nameEl.textContent = currentUser;
    } else {
      formArea.style.display = 'block';
      loggedArea.style.display = 'none';
    }
    modal.style.display = 'flex';
  }

  async function handleLogin() {
    const u = document.getElementById('authUsername').value.trim();
    const p = document.getElementById('authPassword').value.trim();
    const msg = document.getElementById('authMsg');
    if (!u || !p) { msg.textContent = 'Vui lòng nhập đầy đủ thông tin!'; return; }
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
      });
      const data = await res.json();
      if (!data.ok) { msg.textContent = data.message || 'Đăng nhập thất bại!'; return; }
      token = data.token;
      currentUser = data.username;
      localStorage.setItem('volam_token', token);
      localStorage.setItem('volam_username', currentUser);
      // Nạp tiến trình đám mây nếu có
      if (data.state && typeof data.state === 'object') {
        window.S = Object.assign(window.S || {}, data.state);
        if (typeof window.save === 'function') window.save();
      }
      updateAuthPill();
      sendAuth();
      document.getElementById('bridgeAuthModal').style.display = 'none';
      alert(`Đăng nhập thành công! Chào mừng ${currentUser}.`);
    } catch (e) {
      msg.textContent = 'Lỗi kết nối máy chủ!';
    }
  }

  async function handleRegister() {
    const u = document.getElementById('authUsername').value.trim();
    const p = document.getElementById('authPassword').value.trim();
    const msg = document.getElementById('authMsg');
    if (!u || !p) { msg.textContent = 'Vui lòng nhập đầy đủ thông tin!'; return; }
    try {
      const s = window.S || {};
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: u,
          password: p,
          heroName: s.name || u,
          fac: s.fac || 'shaolin',
          state: s
        })
      });
      const data = await res.json();
      if (!data.ok) { msg.textContent = data.message || 'Đăng ký thất bại!'; return; }
      token = data.token;
      currentUser = data.username;
      localStorage.setItem('volam_token', token);
      localStorage.setItem('volam_username', currentUser);
      updateAuthPill();
      sendAuth();
      document.getElementById('bridgeAuthModal').style.display = 'none';
      alert(`Đăng ký thành công! Đã tạo tài khoản ${currentUser} và đồng bộ nhân vật.`);
    } catch (e) {
      msg.textContent = 'Lỗi kết nối máy chủ!';
    }
  }

  function handleLogout() {
    token = '';
    currentUser = '';
    localStorage.removeItem('volam_token');
    localStorage.removeItem('volam_username');
    updateAuthPill();
    document.getElementById('bridgeAuthModal').style.display = 'none';
    alert('Đã đăng xuất.');
  }

  // Khởi động khi trang nạp xong
  window.addEventListener('DOMContentLoaded', () => {
    connectWs();
    hookGameLoop();
    hookWorldChat();
    setupAccountUI();
  });
})();
