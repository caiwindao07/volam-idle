"use strict";
// Admin console section "drops" (Rớt đồ): applies the "drops" config document to the built-in drop tables.
// Item / jewellery / set / money / event rates are read at their use sites (GCFG.get("drops", …) in js/loot.js,
// js/sets.js, js/combat.js, js/rewards.js); this file applies what lives in mutable tables:
//   - pools:  J.drop["npcdroprate<band>.ini"].items  ("d:k" -> weight; 0 removes the item, a new key adds it)
//   - mat:    DROP (js/recipes.js) ore / Huyền Tinh / Mảnh HK / Thủy Tinh Trắng / Thần Bí × mat.<m> × mul.material
//   - horse:  HB_DROP.boss / HB_DROP.gb (js/horse.js)
// Built-in values are snapshotted once, so a new config version (GCFG.on) re-applies from the originals.
(function () {
  const BANDS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 110, 119];
  let base = null;

  // [[0, d, k, w], …] + {"d:k": w} -> new item list (other genres / non-equipment rows are kept as they are)
  function dropsPool(orig, edits) {
    const out = orig.map((a) => a.slice());
    if (!edits) return out;
    for (const key in edits) {
      const m = /^(\d+):(\d+)$/.exec(key);
      if (!m) continue;
      const d = +m[1],
        k = +m[2],
        w = Math.max(0, +edits[key] || 0),
        hit = (a) => a[0] === 0 && a[1] === d && a[2] === k,
        i = out.findIndex(hit);
      if (i < 0) {
        w > 0 && out.push([0, d, k, w]);
        continue;
      }
      for (let j = out.length - 1; j > i; j--) hit(out[j]) && out.splice(j, 1);
      w > 0 ? (out[i][3] = w) : out.splice(i, 1);
    }
    return out;
  }

  // throws ReferenceError while the game scripts declaring DROP / HB_DROP have not run yet
  function snapshot() {
    if (base) return base;
    const b = { pools: {}, mat: JSON.parse(JSON.stringify(DROP)), hb: { boss: HB_DROP.boss, gb: HB_DROP.gb } };
    for (const L of BANDS) {
      const f = J.drop["npcdroprate" + L + ".ini"];
      f && (b.pools[L] = f.items.map((a) => a.slice()));
    }
    return (base = b);
  }

  function apply() {
    const b = snapshot(),
      g = (p, fb) => GCFG.get("drops", p, fb),
      mm = +g("mul.material", 1);
    for (const m in b.mat) {
      const k = +g("mat." + m, 1) * mm;
      for (const c in b.mat[m]) DROP[m][c] = b.mat[m][c] * (isFinite(k) ? k : 1);
    }
    HB_DROP.boss = +g("horse.boss", b.hb.boss);
    HB_DROP.gb = +g("horse.gb", b.hb.gb);
    const pools = g("pools", null) || {};
    for (const L of BANDS) {
      const f = J.drop["npcdroprate" + L + ".ini"];
      f && b.pools[L] && (f.items = dropsPool(b.pools[L], pools[L]));
    }
    window.DROPS_CFG_V = GCFG.v;
  }

  function tryApply() {
    // never configured: the built-in tables are not touched at all (no snapshot, no rebuilt pools)
    if (!base && !(self.GCFG && (typeof GCFG.doc != "function" || GCFG.doc("drops")))) return true;
    try {
      apply();
      return true;
    } catch (e) {
      if (e instanceof ReferenceError) return false;
      console.warn("gcfg/drops:", e);
      return true;
    }
  }

  window.dropsPool = dropsPool;
  window.dropsApply = tryApply;
  if (typeof GCFG !== "object" || !GCFG) return; // no config loader: built-in tables stay as they are
  GCFG.on && GCFG.on("drops", tryApply);
  tryApply() || document.addEventListener("DOMContentLoaded", tryApply, { once: true });
})();
