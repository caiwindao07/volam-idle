/* ==========================================================================
   VÕ LÂM IDLE - MULTIPLAYER & CLOUD SAVE BRIDGE
   1. Đăng ký / Đăng nhập tài khoản & Lưu đám mây MongoDB Atlas.
   2. Tự động đồng bộ tiến trình (Auto Cloud Save) khi game lưu.
   3. Kết nối WebSocket Multiplayer & Đồng bộ thế giới trực tuyến.
   ========================================================================== */
'use strict';

(function () {
  console.log('[MultiplayerBridge] Khởi động cầu nối Online & Cloud Save...');

  let token = localStorage.getItem('volam_token') || '';
  let currentUser = localStorage.getItem('volam_username') || '';
  let ws = null;
  let otherPlayers = new Map();
  let lastMoveSent = 0;
  let saveTimer = null;
  let isSaving = false;

  // 1. Quản lý Đăng nhập & Đăng ký & Cloud Save
  async function triggerCloudSave() {
    if (!token || !currentUser || isSaving) return;
    const raw = localStorage.getItem('jxidle');
    if (!raw) return;

    isSaving = true;
    updateCloudStatus('Đang lưu...');
    try {
      let stateObj = null;
      try {
        const parsed = JSON.parse(raw);
        stateObj = parsed && parsed.d ? JSON.parse(parsed.d) : parsed;
      } catch (e) {
        stateObj = raw;
      }

      const res = await fetch('/api/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ state: stateObj })
      });
      const d = await res.json();
      if (d.ok) {
        updateCloudStatus('Mây ✓');
      } else {
        updateCloudStatus('Lỗi lưu');
      }
    } catch (e) {
      updateCloudStatus('Mất mạng');
    } finally {
      isSaving = false;
    }
  }

  function queueCloudSave() {
    if (!token) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(triggerCloudSave, 4000); // Debounce 4s
  }

  // Hook localStorage.setItem để tự động phát hiện khi game lưu cục bộ
  try {
    const origSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function (k, v) {
      origSetItem(k, v);
      if (k === 'jxidle' || k === 'jxidle_slot') {
        queueCloudSave();
      }
    };
  } catch (e) {
    console.warn('[Bridge] Không hook được localStorage:', e);
  }

  // Định kỳ sao lưu đám mây mỗi 35 giây
  setInterval(() => {
    if (token && currentUser) triggerCloudSave();
  }, 35000);

  // 2. Giao diện Nút Tài Khoản trên Header
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
      authPill.style.cssText = 'display:inline-flex;align-items:center;gap:5px;background:#18181b;border:1px solid #ca8a04;padding:4px 10px;border-radius:14px;font-size:11px;color:#fef08a;cursor:pointer;margin-right:4px;user-select:none;font-weight:600;box-shadow:0 2px 4px rgba(0,0,0,0.5);';
      authPill.onclick = openAuthModal;
      // Chèn trước nút quà giftBtn
      const giftBtn = document.getElementById('giftBtn');
      if (giftBtn && giftBtn.parentNode) {
        giftBtn.parentNode.insertBefore(authPill, giftBtn);
      } else {
        header.appendChild(authPill);
      }
    }
    updateAuthPill();
  }

  function updateAuthPill() {
    const pill = document.getElementById('bridgeAuthPill');
    if (!pill) return;
    if (currentUser) {
      pill.innerHTML = `🟢 <span>${currentUser}</span> <small style="color:#86efac;font-size:10px" id="cloudStatusTxt">(Mây ✓)</small>`;
      pill.title = `Tài khoản: ${currentUser} (Đang đồng bộ đám mây)`;
    } else {
      pill.innerHTML = `☁️ <span>Đăng nhập</span>`;
      pill.title = `Nhấp để Đăng nhập hoặc Tạo tài khoản lưu đám mây`;
    }
  }

  function updateCloudStatus(txt) {
    const el = document.getElementById('cloudStatusTxt');
    if (el) el.textContent = `(${txt})`;
  }

  function openAuthModal() {
    let modal = document.getElementById('bridgeAuthModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'bridgeAuthModal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;';
      modal.innerHTML = `
        <div style="background:#18181b;border:2px solid #ca8a04;border-radius:8px;padding:22px;width:330px;color:#fff;box-shadow:0 12px 30px rgba(0,0,0,0.9);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <h3 style="margin:0;color:#fef08a;font-size:16px;">Tài Khoản & Lưu Đám Mây</h3>
            <button id="closeBridgeModal" style="background:none;border:none;color:#aaa;font-size:20px;cursor:pointer;padding:0 4px;">✕</button>
          </div>
          <div id="authFormArea">
            <div style="display:flex;gap:6px;margin-bottom:12px;">
              <button id="tabBtnLogin" style="flex:1;padding:6px;background:#ca8a04;color:#fff;border:none;border-radius:4px;font-weight:bold;cursor:pointer;">Đăng nhập</button>
              <button id="tabBtnReg" style="flex:1;padding:6px;background:#27272a;color:#aaa;border:none;border-radius:4px;cursor:pointer;">Tạo tài khoản</button>
            </div>
            <input id="authUsername" type="text" placeholder="Tên tài khoản (viết liền)" style="width:100%;box-sizing:border-box;padding:9px;margin-bottom:8px;background:#27272a;border:1px solid #52525b;color:#fff;border-radius:4px;font-size:12px;outline:none;">
            <input id="authPassword" type="password" placeholder="Mật khẩu" style="width:100%;box-sizing:border-box;padding:9px;margin-bottom:12px;background:#27272a;border:1px solid #52525b;color:#fff;border-radius:4px;font-size:12px;outline:none;">
            <button id="btnSubmitAuth" style="width:100%;padding:10px;background:#ca8a04;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:13px;">⚔ XÁC NHẬN</button>
            <div id="authMsg" style="margin-top:10px;font-size:12px;color:#ef4444;text-align:center;"></div>
          </div>
          <div id="authLoggedInArea" style="display:none;text-align:center;">
            <p style="margin:6px 0 10px;font-size:14px;">Đang đăng nhập: <b id="loggedInName" style="color:#38bdf8;"></b></p>
            <p style="font-size:11.5px;color:#a1a1aa;line-height:1.4;">Tiến trình nhân vật của bạn được tự động sao lưu vào MongoDB Atlas. Khi đổi thiết bị, chỉ cần đăng nhập lại tài khoản này.</p>
            <div style="display:flex;gap:8px;margin-top:14px;">
              <button id="btnManualSaveBridge" style="flex:1;padding:8px;background:#22c55e;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-size:12px;">☁️ Lưu ngay</button>
              <button id="btnLogoutBridge" style="flex:1;padding:8px;background:#ef4444;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;">Đăng xuất</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      let isRegMode = false;
      const tabLogin = document.getElementById('tabBtnLogin');
      const tabReg = document.getElementById('tabBtnReg');
      const submitBtn = document.getElementById('btnSubmitAuth');
      const msg = document.getElementById('authMsg');

      tabLogin.onclick = () => {
        isRegMode = false;
        tabLogin.style.background = '#ca8a04'; tabLogin.style.color = '#fff'; tabLogin.style.fontWeight = 'bold';
        tabReg.style.background = '#27272a'; tabReg.style.color = '#aaa'; tabReg.style.fontWeight = 'normal';
        submitBtn.textContent = '⚔ ĐĂNG NHẬP';
        msg.textContent = '';
      };
      tabReg.onclick = () => {
        isRegMode = true;
        tabReg.style.background = '#ca8a04'; tabReg.style.color = '#fff'; tabReg.style.fontWeight = 'bold';
        tabLogin.style.background = '#27272a'; tabLogin.style.color = '#aaa'; tabLogin.style.fontWeight = 'normal';
        submitBtn.textContent = '⚔ TẠO TÀI KHOẢN MỚI';
        msg.textContent = '';
      };

      submitBtn.onclick = async () => {
        const u = document.getElementById('authUsername').value.trim();
        const p = document.getElementById('authPassword').value.trim();
        if (!u || !p) { msg.textContent = 'Vui lòng nhập đầy đủ tên tài khoản và mật khẩu!'; return; }
        msg.textContent = 'Đang xử lý...';
        msg.style.color = '#eab308';

        try {
          const endpoint = isRegMode ? '/api/register' : '/api/login';
          const bodyData = { username: u, password: p };
          if (isRegMode) {
            const raw = localStorage.getItem('jxidle');
            try {
              const parsed = JSON.parse(raw);
              bodyData.state = parsed && parsed.d ? JSON.parse(parsed.d) : parsed;
            } catch (e) {
              bodyData.state = null;
            }
          }
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
          });
          const d = await res.json();
          if (!d.ok) {
            msg.style.color = '#ef4444';
            msg.textContent = d.error || d.message || 'Thất bại!';
            return;
          }

          token = d.token;
          currentUser = d.user ? d.user.username : u;
          localStorage.setItem('volam_token', token);
          localStorage.setItem('volam_username', currentUser);
          updateAuthPill();
          sendWsAuth();

          // Nếu đăng nhập và trên máy chủ có dữ liệu lưu đám mây
          if (!isRegMode && d.state) {
            let savedStr = '';
            if (typeof d.state === 'string') {
              savedStr = d.state;
            } else if (typeof d.state === 'object') {
              savedStr = JSON.stringify({ d: JSON.stringify(d.state), h: '' });
            }
            if (savedStr) {
              localStorage.setItem('jxidle', savedStr);
            }
            alert(`Chào mừng ${currentUser}! Đã tải tiến trình nhân vật từ Đám Mây.`);
            location.reload();
            return;
          } else {
            // Lưu dữ liệu hiện tại lên đám mây ngay
            await triggerCloudSave();
            alert(`Chào mừng ${currentUser}! Đã kích hoạt lưu đám mây thành công.`);
          }
          modal.style.display = 'none';
        } catch (err) {
          msg.style.color = '#ef4444';
          msg.textContent = 'Lỗi kết nối máy chủ!';
        }
      };

      document.getElementById('closeBridgeModal').onclick = () => modal.style.display = 'none';
      document.getElementById('btnManualSaveBridge').onclick = async () => {
        await triggerCloudSave();
        alert('Đã đồng bộ tiến trình nhân vật lên máy chủ MongoDB thành công!');
      };
      document.getElementById('btnLogoutBridge').onclick = () => {
        token = '';
        currentUser = '';
        localStorage.removeItem('volam_token');
        localStorage.removeItem('volam_username');
        updateAuthPill();
        modal.style.display = 'none';
        alert('Đã đăng xuất tài khoản.');
      };
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

  // 3. WebSocket Multiplayer
  function connectWs() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = location.host || 'localhost:8080';
    try {
      ws = new WebSocket(`${proto}//${host}`);
    } catch (e) {
      return;
    }

    ws.onopen = () => {
      console.log('[MultiplayerBridge] Đã nối WebSocket thành công');
      sendWsAuth();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'players' && Array.isArray(msg.list)) {
          for (const p of msg.list) otherPlayers.set(p.id, p);
        } else if (msg.type === 'player_leave' && msg.id) {
          otherPlayers.delete(msg.id);
        }
      } catch (e) {}
    };

    ws.onclose = () => {
      setTimeout(connectWs, 5000);
    };
  }

  function sendWsAuth() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({
      type: 'auth',
      token: token,
      name: currentUser || 'Hiệp Khách'
    }));
  }

  // Khởi động
  window.addEventListener('DOMContentLoaded', () => {
    setupAccountUI();
    connectWs();
  });
})();
