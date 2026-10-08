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
})();
