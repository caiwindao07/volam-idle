"use strict";
// Admin console section "exp" (Kinh nghiệm) — game side. docs/admin-console.md, server/admin_sections/exp.py.
//
// The EXP code reads the document at its use sites through expCfg(key, builtInConstant) (js/combat.js), so a
// missing / default document changes nothing:
//   killRate  → KILL_XP_RATE (killXp)          event   → XP_EVENT (gainXp, login banner)
//   over      → XP_OVER (killXp, offline)       monRewP → EXP-only exponent of MON_HP_K (gold keeps monRewK)
//   classXp.* → CLS[*].xp (killXp)             zones.<map id> → multiplier of the zone being farmed (killXp, offline)
//   newbie.on / bonus / maxLv → newbieXp (js/stats.js)   penalty.near/nearK/far/farK → xpPenK (killXp, offline)
//   offlineMul → offline EXP (js/save.js)       questMul → quest / gift EXP (js/rewards.js grant)
// This file only reacts to a config change while the game runs (GCFG.on): it announces a new event multiplier and
// refreshes the UI. Script tag: after js/gameconfig.js.
(function () {
  if (!self.GCFG || typeof GCFG.on != "function") return;
  let ev = GCFG.get("exp", "event", 5);
  GCFG.on("exp", function () {
    const n = GCFG.get("exp", "event", 5);
    if (typeof S == "undefined" || !S || !S.fac) return void (ev = n);
    if (n !== ev && typeof log == "function")
      log(
        n > 1
          ? `<b style="color:#ffd24a">🎉 Sự kiện toàn máy chủ: x${n} kinh nghiệm!</b>`
          : `<b style="color:#ffd24a">Sự kiện nhân kinh nghiệm đã kết thúc.</b>`,
      );
    ev = n;
    typeof R != "undefined" && R && (R.dirty = !0);
  });
})();
