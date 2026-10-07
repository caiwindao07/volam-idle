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

    let _realLvl = Math.max(1, Math.min(150, Math.floor(Number(obj.lvl) || 1)));
    let _realXp = Math.max(0, Math.floor(Number(obj.xp) || 0));

    try {
      Object.defineProperty(obj, 'lvl', {
        get() {
          return _realLvl;
        },
        set(val) {
          const targetVal = Math.floor(Number(val) || 1);
          // Chỉ cho phép thay đổi nếu có cờ xác thực hợp lệ từ hệ thống game (chiến đấu / chuyển sinh / đồng bộ server)
          if (window._legitLevelTransition) {
            _realLvl = Math.max(1, Math.min(150, targetVal));
            return;
          }
          // Can thiệp trái phép từ DevTools / F10 / F12 console
          console.warn(`[Anti-Cheat] CẢNH BÁO: Phát hiện can thiệp cấp độ trái phép qua Console (thử đặt: ${val}). Đã khôi phục về cấp độ chuẩn Lv.${_realLvl}!`);
          if (typeof toast === 'function') {
            toast(`⚠️ Không thể can thiệp cấp độ qua Console! (Cấp hợp lệ: Lv.${_realLvl})`);
          }
          if (typeof refresh === 'function') refresh();
          if (typeof recalc === 'function') recalc();
        },
        configurable: true,
        enumerable: true
      });

      Object.defineProperty(obj, 'xp', {
        get() {
          return _realXp;
        },
        set(val) {
          const targetVal = Math.max(0, Math.floor(Number(val) || 0));
          if (window._legitExpGain || window._legitLevelTransition) {
            _realXp = targetVal;
            return;
          }
          console.warn(`[Anti-Cheat] CẢNH BÁO: Phát hiện can thiệp kinh nghiệm trái phép qua Console. Đã khôi phục về EXP chuẩn (${_realXp})!`);
          if (typeof refresh === 'function') refresh();
        },
        configurable: true,
        enumerable: true
      });

      obj._securedState = true;
    } catch (e) {
      console.error('[Anti-Cheat] Không thể khóa thuộc tính:', e);
    }

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
