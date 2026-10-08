// Admin config "monsters" (server/admin_sections/monsters.py, docs/admin-console.md) applied to the game's monster
// templates. Loaded after js/gameconfig.js; works whether it runs before or after the game scripts:
//   - renames (n) are written into MON (and undone when the document changes);
//   - a disabled template (off) is swapped by makeEnemy for another enabled monster of the current zone (a
//     disabled zone boss for another zone's boss); the zones' lists stay as js/gcfg/maps.js left them;
//   - stat multipliers (global x class x template) are applied by wrapping makeEnemy (every spawn path: waves,
//     field, dungeons, boat, giang hồ, gold boss), kill EXP by wrapping killXp, money by moneyDrop, item rolls by
//     rollDrops. Wrappers are installed once, as soon as those functions exist, and read the live document.
(function () {
  "use strict";
  const SEC = "monsters",
    KEYS = ["hp", "dmg", "def", "ar", "spd", "xp", "money", "drop"],
    EMPTY = { global: {}, cls: {}, mon: {} };
  let doc = EMPTY,
    applied = null; // backups of what apply() changed: { names: {tid: old}, zm: [[zone, oldM, oldBoss]] }

  const JWo = () => window.JW || null,
    num = (v) => (typeof v == "number" && isFinite(v) ? v : 1);

  function readDoc(arg) {
    let d = arg && typeof arg == "object" && (arg.mon || arg.global || arg.cls) ? arg : null;
    const G = window.GCFG;
    if (!d && G) {
      try {
        d = typeof G.get == "function" ? G.get(SEC, "", null) || G.get(SEC) : null;
      } catch {}
      if (!d || typeof d != "object") d = (G.sections && G.sections[SEC]) || (G.data && G.data.sections && G.data.sections[SEC]) || null;
    }
    d = d && typeof d == "object" ? d : EMPTY;
    return { global: d.global || {}, cls: d.cls || {}, mon: d.mon || {} };
  }

  // multiplier of key k for template tid spawned as class cls (tid may be undefined: offline / fake enemies)
  function mul(k, tid, cls) {
    const m = tid != null ? doc.mon[String(tid)] : null;
    return num(doc.global[k]) * num(doc.cls[cls] && doc.cls[cls][k]) * num(m && m[k]);
  }
  const isOff = (tid) => {
    const m = doc.mon[String(tid)];
    return !!(m && m.off);
  };

  function restore() {
    if (!applied) return;
    const W = JWo();
    if (W && W.mon)
      for (const t in applied.names) {
        const [old, set] = applied.names[t];
        W.mon[t] && W.mon[t].n === set && (W.mon[t].n = old);
      }
    applied = null;
  }

  function zonesAll(W) {
    const out = (W.zones || []).slice();
    for (const k in W.zalt || {}) for (const z of W.zalt[k] || []) out.push(z);
    return out;
  }

  // a stand-in for a disabled template: another enabled monster of the zone, else of any zone
  function substitute(tid) {
    const W = JWo();
    if (!W) return tid;
    let z = null;
    try {
      z = typeof zoneOf == "function" && typeof S != "undefined" && S ? zoneOf(Math.min(S.stage, STAGES)) : null;
    } catch {}
    const ok = (t) => W.mon[t] && !isOff(t) && String(t) !== String(tid),
      boss = z && String(z.boss) === String(tid);
    let pool = z ? (boss ? [] : (z.m || []).filter(ok)) : [];
    if (!pool.length) {
      const all = zonesAll(W);
      pool = (boss ? all.map((o) => o.boss) : all.flatMap((o) => o.m || [])).filter(ok);
    }
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : tid;
  }

  function apply() {
    const W = JWo();
    if (!W || !W.mon) return false;
    restore();
    applied = { names: {} };
    for (const t in doc.mon) {
      const o = doc.mon[t],
        m = W.mon[t];
      if (m && o && typeof o.n == "string" && o.n) ((applied.names[t] = [m.n, o.n]), (m.n = o.n));
    }
    // disabled templates: the zones' lists are left alone (js/gcfg/maps.js owns them); makeEnemy swaps them out
    // no document (never configured): the game functions are left untouched; once wrapped they stay (identity = 1)
    (wrapped || Object.keys(doc.global).length || Object.keys(doc.cls).length || Object.keys(doc.mon).length) && install();
    return true;
  }

  let wrapped = false;
  function install() {
    if (wrapped || typeof makeEnemy != "function" || typeof killXp != "function") return wrapped;
    wrapped = true;
    const mk = makeEnemy,
      kx = killXp,
      md = typeof moneyDrop == "function" ? moneyDrop : null,
      rd = typeof rollDrops == "function" ? rollDrops : null;
    window.makeEnemy = makeEnemy = function (tid, L, cls, x, y) {
      isOff(tid) && (tid = substitute(tid));
      const e = mk.call(this, tid, L, cls, x, y);
      if (!e) return e;
      const k = (key) => mul(key, tid, cls),
        hp = k("hp");
      ((e.hp *= hp), (e.max *= hp), (e.dmg *= k("dmg")), (e.def *= k("def")), (e.ar *= k("ar")), (e.spd *= k("spd")));
      ((e.gcXp = k("xp")), (e.gcMoney = k("money")), (e.gcDrop = k("drop")));
      return e;
    };
    window.killXp = killXp = function (t) {
      return kx.call(this, t) * (t && t.gcXp != null ? t.gcXp : mul("xp", t && t.tid, t && t.cls));
    };
    md &&
      (window.moneyDrop = moneyDrop = function (t) {
        return Math.round(md.call(this, t) * (t && t.gcMoney != null ? t.gcMoney : mul("money", t && t.tid, t && t.cls)));
      });
    rd &&
      (window.rollDrops = rollDrops = function (t) {
        const k = t && t.gcDrop != null ? t.gcDrop : mul("drop", t && t.tid, t && t.cls);
        if (k === 1) return rd.call(this, t);
        let out = [],
          n = Math.floor(k),
          f = k - n;
        if (k < 1) return rd.call(this, t).filter(() => Math.random() < k);
        for (let i = 0; i < n; i++) out = out.concat(rd.call(this, t));
        return f > 0 && Math.random() < f ? out.concat(rd.call(this, t)) : out;
      });
    return true;
  }

  function refresh(arg) {
    doc = readDoc(arg);
    apply();
  }

  // public for the admin preview / tests
  window.GCFG_MONSTERS = { refresh, mul: (k, tid, cls) => mul(k, tid, cls), isOff, doc: () => doc, installed: () => wrapped };

  const G = window.GCFG;
  if (G && typeof G.on == "function")
    try {
      G.on(SEC, refresh);
    } catch {}
  refresh();
  // when this file runs before the game scripts: apply again once they exist (before the first frame)
  if (!wrapped) {
    document.addEventListener("DOMContentLoaded", () => refresh());
    window.addEventListener("load", () => refresh());
  }
})();
