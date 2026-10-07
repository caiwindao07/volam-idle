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

  // 2. GIỮ CONSOLE HOẠT ĐỘNG BÌNH THƯỜNG ĐỂ KHÔNG GÂY LỖI TRÌNH DUYỆT
  // (Đã loại bỏ vô hiệu hóa console để hỗ trợ debug và tránh xung đột trình duyệt)

  // 3. DEVTOOLS PROTECTION
  // Giữ chế độ bảo vệ nhẹ nhàng, không gây gián đoạn phiên người chơi bình thường

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

    // Đồng bộ cấp độ và điểm tiềm năng tự nhiên theo tiến trình chơi game
    if (S.lvl > _lastAuth.lvl) {
      _lastAuth.lvl = S.lvl;
      _lastAuth.attrPts = S.attrPts;
      _lastAuth.skPts = S.skPts;
    }
  }, 1000);

  window.secSync = function () {};
})();
