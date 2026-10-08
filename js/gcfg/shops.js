"use strict";
// Admin config "shops" (server/admin_sections/shops.py, /adminadmin › Cửa hàng) applied to the shop tables:
//   NPC_SHOP_DATA (js/npcshop.js, JX1 merchants), JX.shops (js/shop.js, old town shop), KTC (js/kytran.js).
// Idempotent: the shipped tables are snapshotted once (after every game script ran), each apply restores them and
// lays the current document on top, so a new config version (GCFG.on) or an empty document ({} = reset) is exact.
// Runs when the document arrives / changes, on window load, and right before any shop window opens.
//   NPC price = shops[id].price[gid] ?? round((goods[gid] ?? base) * shops[id].mult * mult), at least 1.
//   A good priced differently in one shop gets a per-shop copy "<gid>@<shopId>" in NPC_SHOP_DATA.goods.
(function () {
  let snap = null,
    last = null,
    hooked = !1;

  function readDoc() {
    const G = window.GCFG;
    if (!G) return null;
    let d;
    try {
      d = G.get("shops");
    } catch {}
    if (d == null || typeof d != "object")
      try {
        d = G.get("shops", "", null);
      } catch {}
    if ((d == null || typeof d != "object") && G.sections) d = G.sections.shops;
    return d && typeof d == "object" ? d : null;
  }
  const hasKTC = () => typeof KTC != "undefined" && Array.isArray(KTC);
  const ready = () => !!(window.NPC_SHOP_DATA && window.JX && JX.shops && hasKTC());

  function takeSnap() {
    const D = NPC_SHOP_DATA,
      s = { goods: {}, shops: {}, town: {}, ktc: [] };
    for (const g in D.goods) s.goods[g] = D.goods[g].price;
    for (const id in D.shops) s.shops[id] = { o: D.shops[id], goods: D.shops[id].goods.slice() };
    for (const t in JX.shops) {
      const items = JX.shops[t].items.slice();
      s.town[t] = { items, price: items.map((x) => x.price) };
    }
    for (const i of KTC) s.ktc.push({ o: i, gold: i.gold, knb: i.knb, lim: i.lim });
    return s;
  }
  const num = (v, d) => (typeof v == "number" && isFinite(v) ? v : d);
  const price = (v) => Math.max(1, Math.round(v));

  function applyNpc(doc) {
    const D = NPC_SHOP_DATA,
      M = num(doc.mult, 1),
      GP = doc.goods || {},
      SH = doc.shops || {};
    for (const g in D.goods) g in snap.goods || delete D.goods[g]; // per-shop copies of the last apply
    for (const g in snap.goods) D.goods[g].price = price(num(GP[g], snap.goods[g]) * M);
    for (const id in snap.shops) {
      const c = SH[id] || {},
        o = snap.shops[id].o,
        rm = new Set((c.remove || []).map(String)),
        list = snap.shops[id].goods.filter((g) => !rm.has(String(g)));
      for (const g of c.add || []) D.goods[g] && !list.some((x) => String(x) === String(g)) && list.push(+g);
      const sm = num(c.mult, 1),
        pp = c.price || {};
      o.goods = list.map((g) => {
        const base = num(GP[g], snap.goods[g]),
          p = pp[g] != null ? price(pp[g]) : price(base * sm * M);
        if (p === D.goods[g].price) return g;
        const k = g + "@" + id;
        D.goods[k] = Object.assign({}, D.goods[g], { price: p });
        return k;
      });
      if (c.off) delete D.shops[id];
      else D.shops[id] = o;
      window.NPC_SHOPS && NPC_SHOPS[id] && (NPC_SHOPS[id].count = o.goods.length);
    }
  }
  function applyTown(doc) {
    const T = doc.town || {};
    for (const t in snap.town) {
      const c = T[t] || {},
        sn = snap.town[t],
        m = num(c.mult, 1),
        pp = c.price || {},
        rm = new Set(c.remove || []),
        key = (x) => `${x.g | 0}.${x.d | 0}.${x.k | 0}.${x.lvl | 0}`;
      sn.items.forEach((x, i) => {
        const k = key(x);
        x.price = pp[k] != null ? price(pp[k]) : sn.price[i] != null && m !== 1 ? price(sn.price[i] * m) : sn.price[i];
      });
      JX.shops[t].items = c.off ? [] : sn.items.filter((x) => !rm.has(key(x)));
    }
  }
  function applyKtc(doc) {
    const K = doc.ktc || {};
    KTC.length = 0;
    for (const s of snap.ktc) {
      const i = s.o,
        c = K[i.k] || {};
      i.gold = s.gold;
      i.knb = s.knb;
      i.lim = s.lim;
      s.gold === void 0 && delete i.gold;
      s.knb === void 0 && delete i.knb;
      s.lim === void 0 && delete i.lim;
      const cur = c.cur || (s.knb ? "knb" : "gold");
      if (c.price != null || c.cur) {
        const p = price(num(c.price, cur === "knb" ? s.knb : s.gold));
        if (cur === "knb") (delete i.gold, (i.knb = p));
        else (delete i.knb, (i.gold = p));
      }
      c.lim != null && (i.lim = c.lim);
      c.off || KTC.push(i);
    }
  }

  function apply(force) {
    if (!ready()) return !1;
    if (!snap && !readDoc()) return !0; // never configured: the shipped tables are not touched at all
    const doc = readDoc() || {},
      key = JSON.stringify(doc);
    if (!force && key === last) return !0;
    snap || (snap = takeSnap());
    try {
      applyNpc(doc);
      applyTown(doc);
      applyKtc(doc);
      last = key;
    } catch (e) {
      console.warn("gcfg/shops:", e);
    }
    return !0;
  }
  // re-check the document right before a shop opens (also covers a config that arrived late)
  function hook() {
    if (hooked || !ready()) return;
    hooked = !0;
    for (const f of ["openNpcShop", "shopModal", "ktcModal"])
      if (typeof window[f] == "function" && !window[f].__gcfgShops) {
        const o = window[f],
          w = function () {
            apply();
            return o.apply(this, arguments);
          };
        w.__gcfgShops = 1;
        window[f] = w;
      }
  }
  function run() {
    apply();
    hook();
  }
  window.GCFG_SHOPS = { apply: () => apply(!0), snapshot: () => snap };
  try {
    window.GCFG && typeof GCFG.on == "function" && GCFG.on("shops", () => apply());
  } catch {}
  document.readyState === "complete" ? run() : window.addEventListener("load", run);
})();
