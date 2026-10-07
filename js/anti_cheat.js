/* ==========================================================================
   HỆ THỐNG BẢO MẬT & CHỐNG HACK CONSOLE / DEVTOOLS
   (Đã vô hiệu hóa mọi watchdog và rollback gây gián đoạn người chơi)
   ========================================================================== */
'use strict';

(function () {
  window._updateLastAuthoritativeState = function () {};
  window.reportLegitGoldGain = function () {};
  window.secSync = function () {};
})();

