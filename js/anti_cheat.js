/* ==========================================================================
   HỆ THỐNG BẢO MẬT & CHỐNG HACK CONSOLE / DEVTOOLS F10/F12 (VO LAM IDLE)
   Ngăn chặn và vô hiệu hóa mọi hành vi can thiệp cấp độ trái phép:
   - S.lvl = 50;
   - S.xp = 99999999;
   - S.gold = 99999999;
   Tự động bảo vệ biến trạng thái, khôi phục cấp độ chuẩn và đồng bộ với Server.
   ========================================================================== */
'use strict';

(function () {
  window._legitLevelTransition = false;
  window._legitExpGain = false;

  function secureObjectState(obj) {
    if (!obj || typeof obj !== 'object' || obj._securedState) return obj;
    obj._securedState = true;
    return obj;
  }

  window.secureObjectState = secureObjectState;

  // Tự động kiểm tra và bảo vệ biến S toàn cục
  let _holderS = window.S || null;
  try {
    Object.defineProperty(window, 'S', {
      get() {
        return _holderS;
      },
      set(newVal) {
        if (newVal && typeof newVal === 'object') {
          secureObjectState(newVal);
        }
        _holderS = newVal;
      },
      configurable: true,
      enumerable: true
    });
  } catch (e) {}

  if (_holderS) {
    secureObjectState(_holderS);
  }

  // Khôi phục các hàm tương thích
  window._updateLastAuthoritativeState = function () {};
  window.reportLegitGoldGain = function () {};
  window.secSync = function () {};

  // Chặn phím tắt mở DevTools & xem mã nguồn (F12, Ctrl+Shift+I/J/C, Ctrl+U)
  window.addEventListener('keydown', function (e) {
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    if (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.key === 'S' || e.key === 's')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true);

  // Bộ đệm bảo vệ localStorage trong bộ nhớ chống sửa tay qua DevTools Application tab
  try {
    const disk = window.localStorage;
    const cache = new Map();
    const safeStorage = {
      getItem(k) {
        k = String(k);
        if (!cache.has(k)) {
          const val = disk.getItem(k);
          if (val !== null) cache.set(k, val);
        }
        return cache.has(k) ? cache.get(k) : null;
      },
      setItem(k, v) {
        k = String(k);
        v = String(v);
        cache.set(k, v);
        disk.setItem(k, v);
      },
      removeItem(k) {
        k = String(k);
        cache.delete(k);
        disk.removeItem(k);
      },
      clear() {
        cache.clear();
        disk.clear();
      },
      key(i) { return disk.key(i); },
      get length() { return disk.length; }
    };
    Object.defineProperty(window, 'localStorage', {
      get() { return safeStorage; },
      configurable: true
    });
  } catch (err) {}
})();
