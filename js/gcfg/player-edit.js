"use strict";
// Admin console commands (section "player-edit", server/admin_sections/player_edit.py, docs/admin-console.md).
//
// The server edits a stored save through its sequence log (ledger + tseq): gold / KNB / items directly, and what has
// to run the game's own code (level, EXP, resetting points, moving a given item into a disciple's bag, taking off a
// worn item) as a *command* queued in the save by a patch op of the same ledger entry:
//     S.admQ = {"<id>": {id, op: "lvl"|"xp"|"reset"|"move"|"rm", ch: 0 | disciple k, t, by, n, …}}
// It reaches the game like every ledger entry: in the downloaded save (reload / another device) or in the `adj.patch`
// of an upload made on an older copy (js/net.js netAdj → GCFG.applyPatch). This file runs the queue through the game's
// code paths (level-up loop + onLevelUp, Tẩy Tủy, withChar for disciples, invGive) once the game is running,
// remembers applied ids in S.admDone (a replayed command never runs twice), empties S.admQ, saves and uploads.
// Load it after js/gameconfig.js and before js/main.js.
(function () {
  const TAG = "[Quản trị]",
    DONE_MAX = 200;
  // ---------- applying
  const ready = () =>
    typeof S != "undefined" && S && S.fac && typeof R != "undefined" && R && R.P && !(typeof PCTX != "undefined" && PCTX) && !(typeof SAVE_LOCK != "undefined" && SAVE_LOCK);
  const inCh = (k, fn) => {
    k = k | 0;
    if (!k) return fn();
    if (typeof withChar != "function" || typeof partyN != "function" || k > partyN()) return null;
    return withChar(k, fn);
  };
  const nm = () => (typeof PCTX != "undefined" && PCTX ? esc(S.name || "") + ": " : "");
  function lvLoop() {
    const cap = typeof levelCap == "function" ? levelCap() : 200;
    let up = 0;
    // same step as gainXp() (js/combat.js) / admLvLoop (js/admin.js), onLevelUp once for the whole jump
    for (; S.lvl < cap && S.xp >= lvNeed(S.lvl); )
      ((S.xp -= lvNeed(S.lvl)), S.lvl++, (S.attrPts += PTS_PER_LEVEL), (S.skPts += SKILL_PTS_PER_LEVEL), up++);
    S.lvl >= cap && (S.xp = 0);
    if (up) ((R.dirty = !0), typeof onLevelUp == "function" && onLevelUp());
    return up;
  }
  // Tẩy Tủy (js/vocong.js tayTuy) without its UI: 90-level book skills keep their level, the rest is refunded
  function resetPts(a, s) {
    if (a) for (const k in S.attr) ((S.attrPts += S.attr[k] | 0), (S.attr[k] = 0));
    if (s) {
      const keep = {},
        bk = S.bkOk || (S.bkOk = {});
      for (const id in S.sk) {
        const t = SK[id];
        t && t.book && (bk[id] = 1);
        t && t.tier === 90 && !(typeof isBr90 == "function" && isBr90(id)) ? (keep[id] = S.sk[id]) : (S.skPts += S.sk[id] | 0);
      }
      ((S.sk = keep), (S.main = 0), (S.mainLock = !1), (S.slots = [0, 0, 0, 0]));
    }
    R.dirty = !0;
  }
  function lvSet(v) {
    const cap = typeof levelCap == "function" ? levelCap() : 200,
      to = clamp(v | 0, 1, cap),
      from = S.lvl;
    if (to > from) {
      let need = -S.xp;
      for (let l = from; l < to; l++) need += lvNeed(l);
      S.xp += Math.max(0, need);
      lvLoop();
      return `${nm()}lên cấp ${from} → <b>${S.lvl}</b>`;
    }
    if (to === from) return `${nm()}đang ở cấp ${from}`;
    // down (the server refused the unsafe cases: faction joined below 10, 90-level skills below 90):
    // refund every point, take away the points of the lost levels, take off gear above the new level
    resetPts(!0, !0);
    const d = from - to;
    ((S.lvl = to), (S.xp = 0), (S.attrPts = Math.max(0, S.attrPts - d * PTS_PER_LEVEL)), (S.skPts = Math.max(0, S.skPts - d * SKILL_PTS_PER_LEVEL)));
    const eqLv = typeof eqLevel == "function" ? eqLevel() : to;
    let off = 0;
    for (const k of Object.keys(S.eq || {})) {
      const it = S.eq[k];
      if (!it || !(it.req || []).some(([n, e]) => n === 36 && e > eqLv)) continue;
      if (S.inv.length >= INV_MAX) break;
      (S.inv.unshift(it), delete S.eq[k], off++);
    }
    R.dirty = !0;
    return `${nm()}giảm cấp ${from} → <b>${to}</b> (tẩy điểm, trừ ${d * PTS_PER_LEVEL} tiềm năng / ${d * SKILL_PTS_PER_LEVEL} kỹ năng${off ? `, tháo ${off} món quá cấp` : ""})`;
  }
  function xpAdd(v) {
    v = +v || 0;
    if (v < 0) return ((S.xp = Math.max(0, (+S.xp || 0) + v)), `${nm()}${fmt(v)} kinh nghiệm`);
    const from = S.lvl;
    S.xp = (+S.xp || 0) + v;
    lvLoop();
    return `${nm()}+${fmt(v)} kinh nghiệm${S.lvl > from ? ` · lên cấp <b>${S.lvl}</b>` : ""}`;
  }
  function rmUid(uid) {
    const owners = [S].concat(Array.isArray(S.party) ? S.party.filter(Boolean) : []);
    for (const o of owners) {
      const i = Array.isArray(o.inv) ? o.inv.findIndex((x) => x && x.uid === uid) : -1;
      if (i >= 0) return o.inv.splice(i, 1)[0];
      for (const k in o.eq || {})
        if (o.eq[k] && o.eq[k].uid === uid) {
          const it = o.eq[k];
          delete o.eq[k];
          return it;
        }
    }
    for (const n of ["stable", "epBox"]) {
      const b = S[n],
        i = Array.isArray(b) ? b.findIndex((x) => x && x.uid === uid) : -1;
      if (i >= 0) return b.splice(i, 1)[0];
    }
    return null;
  }
  function moveTo(uids, k) {
    let n = 0;
    for (const u of uids || []) {
      const it = S.inv.find((x) => x && x.uid === u);
      if (!it) continue;
      if (typeof invGive == "function") invGive(it, k).ok && n++;
    }
    return `chuyển ${n}/${(uids || []).length} món vào hành trang ${esc((typeof charGet == "function" && charGet(k, "name")) || "đồ đệ " + k)}`;
  }
  function run(g) {
    switch (g.op) {
      case "lvl":
        return inCh(g.ch, () => lvSet(g.v));
      case "xp":
        return inCh(g.ch, () => xpAdd(g.v));
      case "reset":
        return inCh(g.ch, () => (resetPts(!!g.a, !!g.s), `${nm()}tẩy ${[g.a && "tiềm năng", g.s && "kỹ năng"].filter(Boolean).join(" + ")}: ${S.attrPts} tiềm năng, ${S.skPts} điểm kỹ năng`));
      case "move":
        return moveTo(g.uids, g.ch | 0);
      case "rm": {
        const it = rmUid(g.uid);
        return it ? `thu hồi <b>${esc(it.n || "")}</b>` : "";
      }
    }
    return "";
  }
  let busy = 0;
  // issue order: q (ns + sequence, set by the server; n is the label); older commands only have t (seconds)
  const cmdOrd = (g) => (typeof g.q == "number" ? g.q : (+g.t || 0) * 1e9);
  // pending commands, oldest first (S.admQ is an object keyed by id)
  const queue = () => {
    const q = S.admQ;
    const list = Array.isArray(q) ? q.slice() : q && typeof q == "object" ? Object.values(q) : [];
    return list.filter((g) => g && typeof g == "object" && g.id).sort((a, b) => cmdOrd(a) - cmdOrd(b));
  };
  function applyQ() {
    if (busy || !ready() || S.admQ == null) return 0;
    busy = 1;
    let n = 0;
    try {
      const q = queue(),
        done = Array.isArray(S.admDone) ? S.admDone : (S.admDone = []);
      delete S.admQ;
      for (const g of q) {
        if (done.includes(g.id)) continue;
        done.push(g.id);
        let msg = "";
        try {
          msg = run(g);
        } catch (e) {
          console.warn("[player-edit]", g, e);
          msg = "lỗi khi áp dụng lệnh " + esc(g.op);
        }
        n++;
        msg && typeof log == "function" && log(`<span class="admlog" style="color:#ff6a5a;font-weight:bold">${TAG}</span> ${msg}`);
      }
      done.length > DONE_MAX && done.splice(0, done.length - DONE_MAX);
      if (n) {
        R.dirty = !0;
        typeof invDirty != "undefined" && (invDirty = !0);
        try {
          recalc();
          typeof fillSlots == "function" && fillSlots();
          typeof renderPad == "function" && renderPad();
          typeof autoEquipAll == "function" && autoEquipAll();
        } catch (e) {
          console.warn(e);
        }
        typeof toast == "function" && toast("Nhận thay đổi từ quản trị viên");
      }
      save();
      n && typeof refresh == "function" && refresh();
      n && typeof netUploadSoon == "function" && typeof NET != "undefined" && NET.user && typeof netOn == "function" && netOn() && netUploadSoon();
    } finally {
      busy = 0;
    }
    return n;
  }
  const tick = () => {
    try {
      applyQ();
    } catch (e) {
      console.warn(e);
    }
  };
  window.peApply = applyQ; // tests / console
  setInterval(tick, 1000);
})();
