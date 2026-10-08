"use strict";
// Admin console section "maps" (server/admin_sections/maps.py): applies the config document "maps" to the
// built-in tables before / while the game uses them. Mirror of maps.py effective().
//   doc.zones[mapId] = {lo, hi, m: [[tid, weight], ...], boss}   zone (JW.zones) or ZALT sub-map (JW.zalt)
//   doc.dest[mapId]  = {off: true}                               Thần Hành Phù destination hidden
//   doc.migu         = {price, hours, minLv, mlv: [lo, hi]}      Mật Cốc pass + levels (js/migu.js, window.MIGU_CFG)
// Objects are changed in place (ZONES / ZALT / TH_DEST keep their identity) and every call starts from the
// built-in values, so a new document (or none) cleanly replaces the previous one.
(function () {
  const W = window.JW;
  if (!W || !Array.isArray(W.zones)) return;
  let O = null; // built-in values, captured on first use
  const F = ["lo", "hi", "boss"];
  function snap() {
    if (O) return;
    O = {
      zones: W.zones.map((z) => ({
        z,
        lo: z.lo,
        hi: z.hi,
        boss: z.boss,
        m: (z.m || []).slice(),
      })),
      alt: {},
      dest: null,
    };
    for (const k in W.zalt || {})
      O.alt[k] = (W.zalt[k] || [])
        .filter((a) => !a.thv)
        .map((a) => ({
          a,
          lo: a.lo,
          hi: a.hi,
          boss: a.boss,
          m: (a.m || []).slice(),
        }));
  }
  const expand = (l) => {
    const out = [];
    for (const e of l) {
      const [t, w] = Array.isArray(e) ? [e[0], e[1] == null ? 1 : e[1]] : [e, 1];
      if (W.mon && W.mon[t] == null) continue; // unknown template: skip, never spawn undefined
      for (let i = 0; i < Math.max(1, Math.min(20, w | 0)); i++) out.push(t);
    }
    return out;
  };
  function apply(doc) {
    snap();
    doc = doc && typeof doc == "object" ? doc : {};
    const zo = (doc.zones && typeof doc.zones == "object" && doc.zones) || {},
      ok = (o, k) => o && Object.prototype.hasOwnProperty.call(o, k) && o[k] != null;
    O.zones.forEach((b, i) => {
      const z = b.z,
        o = zo[String(z.id)];
      for (const k of F) z[k] = ok(o, k) && (k !== "boss" || !W.mon || W.mon[o[k]]) ? o[k] : b[k];
      const m = ok(o, "m") && Array.isArray(o.m) ? expand(o.m) : null;
      z.m = m && m.length ? m : b.m.slice();
      // sub-maps inherit lo / hi / boss from their zone unless they had their own
      for (const s of O.alt[i] || []) {
        const a = s.a,
          ao = zo[String(a.id)];
        for (const k of F)
          a[k] = ok(ao, k) && (k !== "boss" || !W.mon || W.mon[ao[k]]) ? ao[k] : s[k] === b[k] ? z[k] : s[k];
        const am = ok(ao, "m") && Array.isArray(ao.m) ? expand(ao.m) : null;
        a.m = am && am.length ? am : s.m.slice();
      }
    });
    // a Thần Hành Phù visit map borrows its zone's values when entered; refresh one already registered
    for (const k in W.zalt || {})
      for (const a of W.zalt[k] || [])
        if (a.thv && !a.migu && W.zones[k]) for (const f of ["lo", "hi", "boss", "m"]) a[f] = W.zones[k][f]; // Mật Cốc: miguRefresh
    // Mật Cốc settings (validated by the server: server/admin_sections/maps.py validate_migu)
    const mg = doc.migu && typeof doc.migu == "object" ? doc.migu : {},
      mc = {};
    for (const k of ["price", "hours", "minLv"]) Number.isFinite(mg[k]) && mg[k] >= (k === "price" ? 0 : 1) && (mc[k] = mg[k]);
    Array.isArray(mg.mlv) && mg.mlv.length === 2 && mg.mlv.every(Number.isFinite) && mg.mlv[0] <= mg.mlv[1] && (mc.mlv = mg.mlv.slice());
    window.MIGU_CFG = mc;
    typeof miguRefresh == "function" && miguRefresh();
    const TD = window.TH_DEST;
    if (TD && Array.isArray(TD.dest)) {
      O.dest || (O.dest = TD.dest.slice());
      const off = (doc.dest && typeof doc.dest == "object" && doc.dest) || {},
        keep = O.dest.filter((d) => !(off[String(d.id)] && off[String(d.id)].off));
      TD.dest.length = 0;
      TD.dest.push(...keep);
    }
    window.GCFG_MAPS_V = (window.GCFG && GCFG.v) || 0;
  }
  window.gcfgMapsApply = apply;
  if (window.GCFG && typeof GCFG.on == "function") GCFG.on("maps", apply);
  else if (window.GCFG && typeof GCFG.get == "function") apply(GCFG.get("maps", "", null));
})();
