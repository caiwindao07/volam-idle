"use strict";
// JX1 NPC shops (Sale(id) merchants), data = shopdata.js (tools/jxmap/shops.py: \settings\buysell.txt +
// \settings\goods.txt as loaded by the cocos client, KBuySell.cpp).
//   openNpcShop(shopId[, {town}])  JX1-like shop window: 5x6 pages of goods, item tooltip, quantity for
//                                  stackables, buy for lượng, sell from the bag at the JX1 sell-back price.
//   window.NPC_SHOPS               id -> {n, kind, maps} for NPC scripts (js/npc.js).
//   npcTownShop([kind])            the current town's merchant (town bar "Cửa hàng"; old shop stays one tab away).
// JX1 rules (cocos server KBuySell::Buy / Sell): buy = goods price x quantity (stackables only), money check
// first; sell = item price / 4 (at least 1). Goods -> this game:
//   equipment (genre 0)  makeItem(detail, particular, level, 0 magic lines, goods series): white item,
//                        price = goods price (so it sells back for price / 4 like in JX1)
//   medicine 0/1/2       potStock life / mana / both, tier = JX1 level (same heal values: potion.txt)
//   medicine 4 (giải độc) S.mats.misc.jxgd<lv>: auto-used when poisoned, cuts poison by the JX1 value %
//   medicine 3 (thể lực) shown but not sold: this game has no stamina
//   Thổ Địa Phù (genre 5) S.mats.misc.jxtdp: one use skips the town-portal cooldown
(function () {
  const D = window.NPC_SHOP_DATA;
  if (!D) return;
  const SELL = D.sell || 4,
    PAGE = 30, // ui\shop\shopbox.spr: 5 x 6 cells
    QTY_MAX = 999,
    GD_PCT = [0, 10, 20, 30, 50, 100], // potion.txt Giải độc: attrib value -10 .. -100
    GD_TIME = 200 / 18, // 200 game loops
    MISC_GD = (l) => "jxgd" + l,
    MISC_TDP = "jxtdp",
    POT_KIND = ["life", "mana", "both"];
  const NS = { id: 0, page: 0, sel: -1, town: null, tab: "buy", qty: 1, sellSel: null };

  window.NPC_SHOPS = {};
  for (const id in D.shops) {
    const s = D.shops[id];
    window.NPC_SHOPS[id] = { n: s.n, kind: s.kind, maps: s.maps.slice(), count: s.goods.length };
  }

  // ---- goods -> game objects ----
  const good = (gid) => D.goods[gid];
  const potOfGood = (g) =>
    g.g === 1 && g.d <= 2 ? J.potions.find((p) => p.kind === POT_KIND[g.d] && p.tier === g.lvl) || null : null;
  const stackable = (g) => g.g !== 0;
  const sellable = (g) => !(g.g === 1 && g.d === 3); // no stamina in this game
  const prevCache = {};
  function preview(gid) {
    const g = good(gid);
    if (!g || g.g !== 0) return null;
    if (prevCache[gid]) return prevCache[gid];
    const uid = S.uid,
      it = makeItem(g.d, g.k, g.lvl, 0, g.s);
    S.uid = uid;
    if (!it) return null;
    it.uid = -1;
    g.s >= 0 && (it.s = g.s);
    it.price = g.price;
    return (prevCache[gid] = it);
  }
  const usable = (gid) => {
    const g = good(gid);
    if (!g) return !1;
    if (g.g === 0) {
      const it = preview(gid);
      return !!it && reqOk(it);
    }
    return sellable(g);
  };
  const sfxUi = (k) => {
    try {
      typeof uiSfx == "function" && uiSfx(k);
    } catch {}
  };
  const misc = (k) => (typeof matHave == "function" ? matHave("misc", k) : 0);

  // JX1 price text (KuiItemdescVN: < 1 vạn -> "N lượng", else "N vạn M lượng")
  function jxPrice(n) {
    n = Math.max(0, Math.round(n));
    if (n < 1e4) return `${n} lượng`;
    const v = Math.floor(n / 1e4),
      l = n % 1e4;
    return l ? `${v} vạn ${l} lượng` : `${v} vạn lượng`;
  }
  const sellPriceOf = (it) => {
    let p = it.price;
    if (!(p > 0) && typeof baseRow == "function") {
      const b = baseRow(it.d, it.k, it.lvl);
      p = b ? b.price : 0;
    }
    return Math.max(1, Math.floor((p || 0) / SELL));
  };

  const goodName = (g) => g.n;
  function potText(g) {
    const p = potOfGood(g);
    if (p)
      return `Hồi ${fmt(p.total)} ${p.kind === "mana" ? "nội lực" : "sinh lực"}${p.kind === "both" ? ` + ${fmt(p.mtotal)} nội lực` : ""} trong ${p.dur}s${p.n !== g.n ? ` · trong game: ${p.n}` : ""} · đang có ${potStock(p.kind)[p.tier] || 0}`;
    if (g.g === 1 && g.d === 4)
      return `Giải độc: giảm ${GD_PCT[g.lvl]}% độc đang trúng và độc trúng thêm trong ${GD_TIME.toFixed(1)}s · tự dùng khi trúng độc · đang có ${misc(MISC_GD(g.lvl))}`;
    if (g.g === 1 && g.d === 3) return "Hồi thể lực · bản idle không có Thể lực nên không bán";
    if (g.g === 5)
      return `Dùng 1 lần: về thành ngay, bỏ qua thời gian hồi của Thổ Địa Phù · đang có ${misc(MISC_TDP)}`;
    return "";
  }

  // ---- buy ----
  function buy(gid, qty) {
    const g = good(gid);
    if (!g || !S || !S.fac) return;
    if (!sellable(g)) {
      toast("Vật phẩm này không dùng được trong bản idle");
      return;
    }
    qty = stackable(g) ? clamp(Math.floor(qty) || 1, 1, QTY_MAX) : 1;
    const cost = g.price * qty;
    if (S.gold < cost) {
      toast("Ngân lượng không đủ!");
      sfxUi("click");
      return;
    }
    if (g.g === 0) {
      if (S.inv.length >= INV_MAX) {
        toast("Hành trang không đủ chỗ!");
        return;
      }
      const it = makeItem(g.d, g.k, g.lvl, 0, g.s);
      if (!it) return;
      g.s >= 0 && (it.s = g.s);
      it.price = g.price;
      S.gold -= cost;
      // straight into the bag (addItem would route white gear to the Đồ phổ box / loot filter)
      S.inv.unshift(it);
      typeof invDirty != "undefined" && (invDirty = !0);
      typeof recItem == "function" && recItem(it);
      log(`Mua <b>${esc(it.n)}</b> (-${fmtL(cost)} lượng)`);
    } else if (g.g === 1 && g.d <= 2) {
      const p = potOfGood(g);
      if (!p) return;
      S.gold -= cost;
      const st = potStock(p.kind);
      st[p.tier] = (st[p.tier] || 0) + qty;
    } else if (g.g === 1 && g.d === 4) {
      S.gold -= cost;
      matAdd("misc", MISC_GD(g.lvl), qty);
    } else if (g.g === 5) {
      S.gold -= cost;
      matAdd("misc", MISC_TDP, qty);
    } else return;
    toast(`Mua ${qty > 1 ? qty + " " : ""}${goodName(g)} (-${jxPrice(cost)})`);
    sfxUi(g.g === 0 ? "dropOther" : "use");
    save();
    typeof refresh == "function" && refresh();
    render();
  }

  // ---- sell ----
  function sellItem(it) {
    if (!it || !S.inv.includes(it)) return;
    if (typeof sellProtected == "function" && sellProtected(it)) {
      toast("Món này được bảo vệ (khóa / đồ bộ / tím…), không bán ở đây");
      return;
    }
    const v = sellPriceOf(it);
    S.inv = S.inv.filter((x) => x !== it);
    S.gold += v;
    typeof invDirty != "undefined" && (invDirty = !0);
    log(`Bán <b>${esc(it.n)}</b> (+${fmtL(v)} lượng)`);
    toast(`Bán ${it.n} +${jxPrice(v)}`);
    sfxUi("use");
    NS.sellSel = null;
    save();
    typeof refresh == "function" && refresh();
    render();
  }
  // potions / JX consumables kept as counters
  function stockRows() {
    const r = [];
    for (const p of J.potions) {
      const n = potStock(p.kind)[p.tier] || 0;
      n > 0 && r.push({ key: "p:" + p.kind + ":" + p.tier, n: p.n, ic: p.ic, cnt: n, unit: Math.max(1, Math.floor(p.price / SELL)) });
    }
    for (let l = 1; l <= 5; l++) {
      const n = misc(MISC_GD(l));
      if (!n) continue;
      const g = Object.values(D.goods).find((x) => x.g === 1 && x.d === 4 && x.lvl === l);
      r.push({ key: "g:" + l, n: g ? g.n : "Giải độc " + l, ic: g ? g.ic : "", cnt: n, unit: Math.max(1, Math.floor((g ? g.price : 4) / SELL)) });
    }
    const t = misc(MISC_TDP);
    if (t) {
      const g = Object.values(D.goods).find((x) => x.g === 5);
      r.push({ key: "t", n: g ? g.n : "Thổ địa phù", ic: g ? g.ic : "", cnt: t, unit: Math.max(1, Math.floor((g ? g.price : 500) / SELL)) });
    }
    return r;
  }
  function sellStock(key, qty) {
    const row = stockRows().find((x) => x.key === key);
    if (!row) return;
    qty = clamp(Math.floor(qty) || 1, 1, row.cnt);
    if (key[0] === "p") {
      const [, kind, tier] = key.split(":");
      potStock(kind)[tier] -= qty;
    } else if (key[0] === "g") matAdd("misc", MISC_GD(+key.split(":")[1]), -qty);
    else matAdd("misc", MISC_TDP, -qty);
    S.gold += row.unit * qty;
    toast(`Bán ${qty} ${row.n} +${jxPrice(row.unit * qty)}`);
    sfxUi("use");
    save();
    typeof refresh == "function" && refresh();
    render();
  }

  // ---- window ----
  function siblings() {
    const t = NS.town && D.town[NS.town];
    if (!t) return [];
    return ["weapon", "general", "med", "horse"].filter((k) => t[k] && D.shops[t[k]]).map((k) => [k, t[k]]);
  }
  function cellHTML(gid, i) {
    const g = good(gid);
    const it = g.g === 0 ? preview(gid) : null,
      ok = usable(gid),
      ic = it ? it.ic : g.ic,
      s5 = it && it.s >= 0 ? `<b class="s5" style="background:${SERIES_COL[it.s]}"></b>` : "";
    return `<button class="nsc${ok ? "" : " bad"}${i === NS.sel ? " on" : ""}" data-i="${i}" title="${esc(goodName(g) + " · " + jxPrice(g.price))}">${ic ? `<img src="${esc(ic)}" alt="">` : ""}${s5}<em>${fmtL(g.price)}</em></button>`;
  }
  function detailHTML(gid) {
    const g = good(gid);
    if (!g) return `<p class="desc">Bấm vào một món để xem và mua.</p>`;
    const it = g.g === 0 ? preview(gid) : null,
      st = stackable(g),
      qty = st ? NS.qty : 1,
      cost = g.price * qty,
      can = sellable(g) && S.gold >= cost;
    const head = it
      ? itemHTML(it)
      : `<div class="idet"><div class="pic">${g.ic ? `<img src="${esc(g.ic)}" alt="">` : ""}</div><div><h4>${esc(goodName(g))}</h4><small class="dim">${potText(g)}</small></div></div>`;
    return `<div class="nsdet">${head}
      <div class="nsprice">Giá mua: <b>${jxPrice(g.price)}</b>${st ? " / 1" : ""} · bán lại: ${jxPrice(Math.max(1, Math.floor(g.price / SELL)))}</div>
      ${
        sellable(g)
          ? `<div class="btnrow nsbuy">${
              st
                ? `<button class="btn sm" data-q="-10">−10</button><button class="btn sm" data-q="-1">−</button><input id="nsQty" type="number" min="1" max="${QTY_MAX}" value="${qty}"><button class="btn sm" data-q="1">+</button><button class="btn sm" data-q="10">+10</button><button class="btn sm" data-q="max">Tối đa</button>`
                : ""
            }<button class="btn${can ? " on" : ""}" id="nsBuy" ${can ? "" : "disabled"}>Mua ${st && qty > 1 ? qty + " · " : ""}${jxPrice(cost)}</button></div>${S.gold < cost ? `<p class="nswarn">Ngân lượng không đủ (đang có ${jxPrice(S.gold)})</p>` : ""}`
          : `<p class="nswarn">Không bán trong bản idle.</p>`
      }</div>`;
  }
  function sellHTML() {
    const inv = S.inv,
      sel = NS.sellSel && inv.includes(NS.sellSel) ? NS.sellSel : null;
    const cells = inv
      .map((it) => {
        const prot = typeof sellProtected == "function" && sellProtected(it);
        return `<button class="nsc${prot ? " bad" : ""}${it === sel ? " on" : ""}" data-uid="${it.uid}" title="${esc(it.n + " · bán " + jxPrice(sellPriceOf(it)))}">${it.ic ? `<img src="${esc(it.ic)}" alt="">` : ""}${it.s >= 0 ? `<b class="s5" style="background:${SERIES_COL[it.s]}"></b>` : ""}<em>${fmtL(sellPriceOf(it))}</em></button>`;
      })
      .join("");
    const det = sel
      ? `<div class="nsdet">${itemHTML(sel)}<div class="nsprice">Giá bán (JX1 = giá ÷ ${SELL}): <b>${jxPrice(sellPriceOf(sel))}</b></div>
         <div class="btnrow">${typeof sellProtected == "function" && sellProtected(sel) ? `<span class="nswarn">Món được bảo vệ — không bán ở đây</span>` : `<button class="btn red" id="nsSell">Bán ${jxPrice(sellPriceOf(sel))}</button>`}</div></div>`
      : `<p class="desc">Bấm vào món trong hành trang để bán (giá JX1: giá gốc ÷ ${SELL}).</p>`;
    const rows = stockRows()
      .map(
        (r) =>
          `<div class="shoprow nsstk"><img src="${esc(r.ic)}" alt=""><span><b>${esc(r.n)}</b><small>Có ${r.cnt} · bán ${jxPrice(r.unit)} / 1</small></span><span class="btnrow"><button class="btn sm" data-sk="${r.key}" data-n="1">Bán 1</button><button class="btn sm" data-sk="${r.key}" data-n="${r.cnt}">Bán hết</button></span></div>`,
      )
      .join("");
    return `<div class="nsbox"><div class="nsgrid">${cells || '<p class="desc">Hành trang trống.</p>'}</div></div>${det}${rows ? `<h4 class="nsh">Dược phẩm · vật phẩm</h4><div class="shoplist">${rows}</div>` : ""}`;
  }
  // redraw only while our window is the one on screen
  function render() {
    !$("#modal").classList.contains("hidden") && $("#mBody .nshop") && draw();
  }
  function draw() {
    const sh = D.shops[NS.id];
    if (!sh) return;
    const sib = siblings(),
      pages = Math.max(1, Math.ceil(sh.goods.length / PAGE));
    NS.page = clamp(NS.page, 0, pages - 1);
    const from = NS.page * PAGE,
      list = sh.goods.slice(from, from + PAGE);
    const tabs =
      (sib.length > 1 ? sib : [[sh.kind, NS.id]])
        .map(([k, id]) => `<button data-ns="${id}" class="${NS.tab === "buy" && +id === +NS.id ? "on" : ""}">${D.kinds[k] || k}</button>`)
        .join("") +
      `<button data-nt="sell" class="${NS.tab === "sell" ? "on" : ""}">Bán đồ</button>` +
      (NS.town != null && typeof shopModal == "function" ? `<button data-nt="old">Cửa hàng cũ</button>` : "");
    let body;
    if (NS.tab === "sell") body = sellHTML();
    else {
      const cells = list.map((gid, j) => cellHTML(gid, from + j)).join("");
      body = `<div class="nsbox"><div class="nsgrid">${cells}</div>${
        pages > 1
          ? `<div class="nspg"><button class="btn sm" data-pg="-1" ${NS.page ? "" : "disabled"}>‹ Trang trước</button><span>${NS.page + 1}/${pages}</span><button class="btn sm" data-pg="1" ${NS.page < pages - 1 ? "" : "disabled"}>Trang sau ›</button></div>`
          : ""
      }</div>${detailHTML(sh.goods[NS.sel])}`;
    }
    modal(
      `<div class="nshop"><h3>${esc(sh.n)} <small>${fmtL(S.gold)} lượng</small></h3><div class="dtabs">${tabs}</div>${body}</div>`,
      bind,
    );
  }
  function bind() {
    const q = (s) => document.querySelectorAll("#mBody " + s);
    q("[data-ns]").forEach(
      (b) =>
        (b.onclick = () => {
          NS.id = +b.dataset.ns;
          NS.tab = "buy";
          NS.page = 0;
          NS.sel = -1;
          NS.qty = 1;
          draw();
        }),
    );
    q("[data-nt]").forEach(
      (b) =>
        (b.onclick = () => {
          if (b.dataset.nt === "old") {
            shopModal();
            return;
          }
          NS.tab = b.dataset.nt;
          draw();
        }),
    );
    q("[data-pg]").forEach(
      (b) =>
        (b.onclick = () => {
          NS.page += +b.dataset.pg;
          NS.sel = -1;
          draw();
        }),
    );
    q(".nsgrid .nsc[data-i]").forEach(
      (b) =>
        (b.onclick = () => {
          const i = +b.dataset.i;
          NS.sel === i || (NS.qty = 1);
          NS.sel = i;
          draw();
        }),
    );
    q(".nsgrid .nsc[data-uid]").forEach(
      (b) =>
        (b.onclick = () => {
          NS.sellSel = S.inv.find((x) => x.uid === +b.dataset.uid) || null;
          draw();
        }),
    );
    const qi = $("#nsQty");
    qi &&
      (qi.onchange = () => {
        NS.qty = clamp(Math.floor(+qi.value) || 1, 1, QTY_MAX);
        draw();
      });
    q("[data-q]").forEach(
      (b) =>
        (b.onclick = () => {
          const g = good(D.shops[NS.id].goods[NS.sel]);
          if (!g) return;
          const v = b.dataset.q;
          NS.qty =
            v === "max"
              ? clamp(Math.floor(S.gold / Math.max(1, g.price)), 1, QTY_MAX)
              : clamp(NS.qty + +v, 1, QTY_MAX);
          draw();
        }),
    );
    const bb = $("#nsBuy");
    bb && (bb.onclick = () => buy(D.shops[NS.id].goods[NS.sel], NS.qty));
    const sb = $("#nsSell");
    sb && (sb.onclick = () => sellItem(NS.sellSel));
    q("[data-sk]").forEach((b) => (b.onclick = () => sellStock(b.dataset.sk, +b.dataset.n)));
  }

  // ---- public ----
  function openNpcShop(id, o) {
    id = +id;
    if (!D.shops[id]) {
      typeof toast == "function" && toast("Cửa hàng này chưa mở");
      return !1;
    }
    if (typeof S != "object" || !S || !S.fac) return !1;
    NS.id = id;
    NS.town = o && o.town != null ? o.town : null;
    NS.tab = o && o.tab === "sell" ? "sell" : "buy";
    NS.page = 0;
    NS.sel = -1;
    NS.qty = 1;
    NS.sellSel = null;
    draw();
    return !0;
  }
  // shop id of the current town's merchant (kind: weapon / general / med / horse), 0 = none known
  function npcTownShopId(kind, mapId) {
    const m = mapId != null ? mapId : typeof W == "object" && W.town ? W.town.id : null,
      t = m != null && D.town[m];
    if (!t) return 0;
    return t[kind || "general"] || t.general || t.weapon || t.med || 0;
  }
  function npcTownShop(kind) {
    const m = typeof W == "object" && W.town ? W.town.id : null,
      id = npcTownShopId(kind, m);
    return id ? openNpcShop(id, { town: m }) : !1;
  }
  window.openNpcShop = openNpcShop;
  window.npcTownShopId = npcTownShopId;
  window.npcTownShop = npcTownShop;
  window.jxPriceText = jxPrice;

  // Town bar "Cửa hàng": the current town's JX1 general store (capture phase, before control.js's onclick).
  document.addEventListener(
    "click",
    (e) => {
      const b = e.target && e.target.closest && e.target.closest("#bShop");
      if (!b || !npcTownShopId()) return;
      e.stopPropagation();
      e.preventDefault();
      npcTownShop("general");
    },
    !0,
  );

  // Thổ Địa Phù (JX1 consumable): skip the town-portal cooldown once.
  if (typeof goTown == "function") {
    const o = goTown;
    goTown = function () {
      if (!R.town && !R.dg && (R.tpCd || 0) > 0 && misc(MISC_TDP) > 0) {
        matAdd("misc", MISC_TDP, -1);
        R.tpCd = 0;
        toast(`Dùng Thổ Địa Phù (còn ${misc(MISC_TDP)})`);
      }
      return o.apply(this, arguments);
    };
  }
  // Giải độc (JX1 medicine 4): auto-used while poisoned.
  setInterval(() => {
    try {
      if (typeof S != "object" || !S || !S.fac || typeof R != "object" || !R) return;
      const a = R.jxAnti,
        now = Date.now();
      if (a && a.until > now) {
        R.hpDot > a.last && (R.hpDot = a.last + (R.hpDot - a.last) * (1 - a.p / 100));
        a.last = R.hpDot || 0;
        return;
      }
      if (!(R.hpDotT > 0.3 && R.hpDot > 0)) return;
      let l = 0;
      for (let i = 1; i <= 5 && !l; i++) misc(MISC_GD(i)) > 0 && (l = i);
      if (!l) return;
      matAdd("misc", MISC_GD(l), -1);
      const p = GD_PCT[l];
      R.hpDot *= 1 - p / 100;
      R.hpDotT *= 1 - p / 100;
      R.jxAnti = { p, until: now + GD_TIME * 1e3, last: R.hpDot };
    } catch {}
  }, 250);

  // styles (JX1 shopbox: 5 columns of dark cells on grey, green item tint, red when not usable)
  const css = document.createElement("style");
  css.textContent = `
.nshop h3{padding-right:30px}
.nshop h3 small{color:var(--gold);font-weight:normal;margin-left:6px}
.nsbox{background:#5f5f5f;border:2px solid #8a7d55;border-radius:4px;padding:8px;margin:6px 0}
.nsgrid{display:grid;grid-template-columns:repeat(5,minmax(0,52px));gap:6px;justify-content:center;max-height:56vh;overflow:auto}
.nsc{position:relative;aspect-ratio:1;background:#262626;border:1px solid #111;display:grid;place-items:center;padding:0;overflow:hidden}
.nsc::before{content:"";position:absolute;inset:1px;background:rgba(0,93,57,.47)}
.nsc.bad::before{background:rgba(97,2,0,.55)}
.nsc.on{outline:2px solid var(--gold);outline-offset:-1px}
.nsc img{position:relative;max-width:88%;max-height:80%;object-fit:contain}
.nsc em{position:absolute;left:1px;right:1px;bottom:0;font-style:normal;font-size:10px;line-height:12px;color:#ffe48a;text-shadow:0 0 2px #000,0 0 2px #000;text-align:right}
.nsc .s5{position:absolute;left:2px;top:2px;width:6px;height:6px;border-radius:50%}
.nspg{display:flex;justify-content:center;align-items:center;gap:10px;margin-top:6px;color:#eee;font-size:12px}
.nsdet{border:1px solid var(--line2);border-radius:6px;padding:8px;background:var(--panel2)}
.nsprice{margin:6px 0;font-size:13px}.nsprice b{color:var(--gold)}
.nsbuy{align-items:center;flex-wrap:wrap}
.nsbuy input{width:64px;text-align:center}
.nswarn{color:#ff8a7a;font-size:12px;margin:4px 0}
.nsh{margin:8px 0 4px}
.nsstk .btnrow{gap:4px}`;
  document.head.appendChild(css);
})();
