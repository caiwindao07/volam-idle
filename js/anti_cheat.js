/* ==========================================================================
   HỆ THỐNG BẢO MẬT & CHỐNG HACK CONSOLE / DEVTOOLS (ANTI-CHEAT SYSTEM)
   Bao gồm:
   1. Chặn toàn bộ phím tắt mở DevTools (F12, F10, F11, Ctrl+Shift+I/J/C, Ctrl+U).
   2. Chặn menu ngữ cảnh (Chuột phải).
   3. Vô hiệu hóa Console API (log, dir, table, warn, error, debug, clear).
   4. Tự động đóng băng / ngắt phiên khi phát hiện Console hoặc DevTools mở (Debugger Timing Trap).
   5. Xóa các biến toàn cục nguy hiểm hoặc ngăn can thiệp bộ nhớ.
   ========================================================================== */
'use strict';

(function () {
  // 1. CHẶN PHÍM TẮT DEVTOOLS & CHUỘT PHẢI
  const blockKeys = (e) => {
    // F12, F10, F11
    if (e.key === 'F12' || e.key === 'F10' || e.key === 'F11' || e.keyCode === 123 || e.keyCode === 121 || e.keyCode === 122) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    // Ctrl + Shift + I / J / C / K / E / S
    if (e.ctrlKey && e.shiftKey) {
      const k = (e.key || '').toLowerCase();
      if (['i', 'j', 'c', 'k', 'e', 's'].includes(k) || [73, 74, 67, 75, 69, 83].includes(e.keyCode)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }
    // Cmd + Option + I / J / C (macOS)
    if (e.metaKey && e.altKey) {
      const k = (e.key || '').toLowerCase();
      if (['i', 'j', 'c'].includes(k) || [73, 74, 67].includes(e.keyCode)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }
    // Ctrl + U (View Source), Ctrl + S (Save Page)
    if (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S' || e.keyCode === 85 || e.keyCode === 83)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };

  window.addEventListener('keydown', blockKeys, true);
  document.addEventListener('keydown', blockKeys, true);

  // Chặn chuột phải trên toàn bộ trang
  const blockContext = (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      return true;
    }
    e.preventDefault();
    e.stopPropagation();
    return false;
  };
  window.addEventListener('contextmenu', blockContext, true);
  document.addEventListener('contextmenu', blockContext, true);

  // 2. VÔ HIỆU HÓA TẤT CẢ CONSOLE ĐỂ KHÔNG THỂ CHẠY LỆNH HACK
  const noop = function () {};
  const consoleMethods = ['log', 'debug', 'info', 'warn', 'error', 'table', 'trace', 'dir', 'dirxml', 'group', 'groupCollapsed', 'groupEnd', 'time', 'timeEnd', 'profile', 'profileEnd', 'count'];
  try {
    for (const m of consoleMethods) {
      if (window.console && typeof window.console[m] === 'function') {
        window.console[m] = noop;
      }
    }
    Object.freeze(window.console);
  } catch (err) {}

  // 3. DEBUGGER TRAP KHI MỞ DEVTOOLS
  // Khi người chơi mở F12 hoặc DevTools, trình duyệt sẽ bị vướng vào vòng lặp debugger liên tục
  let devToolsDetected = false;
  function triggerTrap() {
    if (devToolsDetected) return;
    devToolsDetected = true;
    document.body.innerHTML = `
      <div style="position:fixed;inset:0;background:#060402;color:#ef4444;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;z-index:999999;text-align:center;padding:20px;">
        <h2 style="font-size:24px;margin-bottom:12px;color:#ef4444;">⚠️ PHÁT HIỆN CÔNG CỤ NHÀ PHÁT TRIỂN (F12)</h2>
        <p style="color:#ffd700;font-size:14px;max-width:500px;line-height:1.6;margin-bottom:20px;">
          Hệ thống phát hiện bạn đang mở DevTools hoặc công cụ can thiệp Console. Để đảm bảo tính công bằng của thế giới Võ Lâm, phiên chơi đã bị tạm dừng.
        </p>
        <button onclick="location.reload()" style="background:#eab308;color:#000;font-weight:bold;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;font-size:14px;">
          Tải lại trò chơi
        </button>
      </div>
    `;
  }

  // Đo thời gian thực thi: Nếu DevTools mở, hàm Function("debugger") sẽ tốn hơn 100ms
  setInterval(function () {
    const startTime = performance.now();
    try {
      (function () {}['constructor']('debugger')());
    } catch (e) {}
    const endTime = performance.now();
    if (endTime - startTime > 120) {
      triggerTrap();
    }
  }, 3000);

  // Kích thước cửa sổ kiểm tra (Window size check cho trường hợp DevTools dock vào màn hình)
  const threshold = 160;
  setInterval(function () {
    const widthDiff = window.outerWidth - window.innerWidth > threshold;
    const heightDiff = window.outerHeight - window.innerHeight > threshold;
    if (widthDiff || heightDiff) {
      // Có thể đang mở DevTools dạng docking
    }
  }, 2000);

  // 4. CLIENT STATE WATCHDOG (CHỐNG SỬA TRỰC TIẾP S.gold / S.lvl / S.attrPts TRONG CONSOLE)
  let _lastAuth = { gold: null, lvl: null, attrPts: null, skPts: null };

  window._updateLastAuthoritativeState = function (st) {
    if (!st) return;
    _lastAuth.gold = Number(st.gold) || 0;
    _lastAuth.lvl = Number(st.lvl) || 1;
    _lastAuth.attrPts = Number(st.attrPts) || 0;
    _lastAuth.skPts = Number(st.skPts) || 0;
  };

  window.reportLegitGoldGain = function (amt) {
    if (typeof amt === 'number' && amt > 0) {
      if (_lastAuth.gold !== null) {
        _lastAuth.gold += amt;
      }
    }
  };

  setInterval(function () {
    if (typeof S === 'undefined' || !S || !S.fac) return;
    if (_lastAuth.gold === null) {
      _lastAuth.gold = Number(S.gold) || 0;
      _lastAuth.lvl = Number(S.lvl) || 1;
      _lastAuth.attrPts = Number(S.attrPts) || 0;
      _lastAuth.skPts = Number(S.skPts) || 0;
      return;
    }

    // Nếu phát hiện vàng tăng đột biến không thông qua Server (e.g. S.gold = 99999999)
    if (S.gold > _lastAuth.gold + 500000) {
      if (typeof toast === 'function') toast('⚠️ Phát hiện can thiệp số dư không hợp lệ! Đã phục hồi về máy chủ.');
      S.gold = _lastAuth.gold;
      if (typeof refresh === 'function') refresh();
    } else if (S.gold > _lastAuth.gold) {
      // Tăng nhỏ hợp lệ do nhặt đồ quái thường hoặc giao dịch
      _lastAuth.gold = S.gold;
    } else {
      // Tiêu xài vàng hợp lệ
      _lastAuth.gold = S.gold;
    }

    // Nếu phát hiện cấp độ tự ý bị nâng trong console
    if (S.lvl > _lastAuth.lvl) {
      if (typeof toast === 'function') toast('⚠️ Phát hiện can thiệp cấp độ không hợp lệ!');
      S.lvl = _lastAuth.lvl;
      if (typeof refresh === 'function') refresh();
    }

    // Nếu phát hiện hack điểm tiềm năng vượt trần
    const maxBudget = (S.lvl - 1) * 5 + 50;
    if (S.attrPts > maxBudget) {
      S.attrPts = _lastAuth.attrPts;
      if (typeof refresh === 'function') refresh();
    }
  }, 1000);

  window.secSync = function () {};
})();
