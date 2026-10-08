"use strict";
const MISC_N = Object.assign(
    {
      wc: "Thủy Tinh Trắng",
      mys: "Thần Bí Khoáng Thạch",
      lb: "Lệnh Bài Sát Thủ",
      dtbk: "Đại Thành Bí Kíp",
      ldp: "Lệnh Bài Đổi Phái",
      ldt: "Lệnh Bài Dã Tẩu",
      dgt: "Thẻ Đổi Giới Tính",
      rngua: "Rương Ngựa",
    },
    BOOK_N,
  ),
  miscName = (t) => MISC_N[t] || t,
  DT_LV = 20,
  DT_DAY = 40,
  DT_LDT = 20,
  DT_HK = 2e3,
  DT_CHAIN = [
    [20, "Lệnh Bài Sát Thủ + 1 đá thuộc tính"],
    [50, "rương đồ 5 dòng + 3 Huyền Tinh + 5 Phúc Duyên"],
    [100, "Quế Hoa Tửu 60 phút + 3 KNB + 10 Phúc Duyên"],
    [200, "Mật Tịch 90 (chưa đủ cấp 75: Tiên Thảo Lộ 60 phút)"],
    [500, "1 Rương Ngựa + Thủy Tinh Trắng + Thần Bí Khoáng Thạch + đồ 6 dòng + 5 KNB + 20 Phúc Duyên"],
  ],
  DT_TOTAL = [
    [DT_HK, "Hoàng Kim Môn Phái"],
    [1e3, "Hoàng Kim dùng chung (Kim Phong, An Bang, Định Quốc…)"],
    [500, "Đại Thành Bí Kíp"],
  ];
function DT() {
  const t = S.dt || (S.dt = {});
  return (
    t.n == null && Object.assign(t, { n: 0, chain: 0, best: 0, day: "", today: 0, task: null, auto: !0 }),
    t.day !== today() && ((t.day = today()), (t.today = 0), (t.extra = 0)),
    t.task &&
      (t.task.t === "item" || t.task.t === "mat") &&
      ((t.task = null),
      setTimeout(() => {
        DT().task || dtNew();
      }, 0)),
    t
  );
}
const dtMax = () => DT_DAY + (DT().extra || 0);
function dtUseLdt(t) {
  const n = DT();
  return matHave("misc", "ldt") < 1
    ? (t || toast("Chưa có Lệnh Bài Dã Tẩu (mua ở Kỳ Trân Các)"), !1)
    : (matAdd("misc", "ldt", -1),
      (n.extra = (n.extra || 0) + DT_LDT),
      n.task || dtNew(),
      log(`📜 Dùng Lệnh Bài Dã Tẩu: +${DT_LDT} lượt nhiệm vụ hôm nay (${n.today}/${dtMax()}).`),
      t || toast(`+${DT_LDT} lượt Dã Tẩu`),
      (R.dirty = !0),
      save(),
      typeof refresh == "function" && refresh(),
      !0);
}
const DT_SLOTS = ["weapon", "armor", "helm", "belt", "boot", "cuff", "amulet", "ring", "pendant"],
  dtSlotVi = (t) => (t === "ring" ? "Nhẫn" : SLOT_VI[t]),
  DT_W = { killm: 50, elite: 25, boss: 15, gold: 10 },
  DT_HARD = { boss: 1.5, item: 1.5 },
  DT_ITEM_KILLS = 80,
  DT_ITEM_DROP = 0.06,
  dtBuyCost = () => Math.round((300 + S.lvl * S.lvl * 6) * 3),
  dtMatLv = () => clamp(Math.floor(S.lvl / 15), 1, HT_MAX);
function dtZone() {
  const t = typeof bestZoneIdx == "function" ? bestZoneIdx() : zoneIdx(Math.min(S.stage, STAGES)),
    n = Math.max(0, t - irnd(0, 1)),
    i = [ZONES[n]].concat(ZALT[n] || []),
    s = irnd(0, i.length - 1);
  return { zi: n, za: s, zn: i[s].n, z: i[s] };
}
const dtInZone = (t) =>
  t.zi == null || (zoneIdx(Math.min(S.stage, STAGES)) === t.zi && ((S.zalt || {})[t.zi] || 0) === (t.za || 0));
function dtItemSpec() {
  const t = pick(DT_SLOTS),
    n = DETAIL_SLOT.map((e, o) => (e === t ? o : -1)).filter((e) => e >= 0 && e <= 9),
    i = clamp(Math.ceil(S.lvl / 12), 1, 10),
    s = LOOT_ATTR_GROUPS.map(() => 0);
  for (let e = 0; e < 40; e++) {
    const o = pick(n),
      c = makeItem(o, sexPart(o, irnd(0, 5)), i, 2);
    c &&
      (S.uid--,
      LOOT_ATTR_GROUPS.forEach((l, r) => {
        (c.mag || []).some((d) => l[1].includes(attrReal(attrName(d.a)))) && s[r]++;
      }));
  }
  const a = s.map((e, o) => [o, e]).filter((e) => e[1] >= 10);
  return { slot: t, grp: a.length ? pick(a)[0] : -1 };
}
function dtNew() {
  const t = DT();
  if (t.today >= dtMax()) {
    t.task = null;
    return;
  }
  const n = Object.entries(DT_W).filter(([a]) => (a !== "boss" || S.lvl >= 30) && (a !== "mat" || verVio())),
    i = wpick(n, (a) => a[1])[0],
    s = { t: i, have: 0 };
  if (i === "killm" || i === "elite" || i === "boss") {
    const a = dtZone();
    if ((Object.assign(s, { zi: a.zi, za: a.za, zn: a.zn }), i === "killm")) {
      const e = a.z.m.filter((o) => MON[o]);
      Object.assign(s, { tid: pick(e.length ? e : zoneOf(S.stage).m), need: 25 + irnd(0, 15) });
    }
    (i === "elite" && (s.need = 5 + irnd(0, 3)), i === "boss" && Object.assign(s, { tid: a.z.boss, need: 1 }));
  }
  (i === "mat" && Object.assign(s, { lv: dtMatLv(), cnt: 2 + irnd(0, 2) }),
    i === "gold" && (s.cost = Math.round((300 + S.lvl * S.lvl * 6) * 4)),
    i === "item" && Object.assign(s, dtItemSpec(), { minR: S.lvl >= 40 ? 2 : 1 }),
    (t.task = s));
}
function dtText(t) {
  if (!t) return "—";
  const n = t.zn ? ` ở ${t.zn}` : "";
  switch (t.t) {
    case "kill":
      return `Hạ ${t.need} quái (cấp ≥ ${t.minL})`;
    case "killm":
      return `Săn ${t.need} ${MON[t.tid] ? MON[t.tid].n : "quái"}${n}`;
    case "elite":
      return `Diệt ${t.need} quái tinh anh${n}`;
    case "boss":
      return `Hạ trùm ${bossName(t.tid, t.zn)}${n}`;
    case "mat":
      return `Thu thập ${t.cnt} Huyền Tinh Khoáng Thạch cấp ${t.lv} (có ${Math.min(t.cnt, matHave("ht", t.lv))})`;
    case "gold":
      return `Nộp ${fmtL(t.cost)} lượng`;
    case "item":
      return `Tìm ${dtSlotVi(t.slot)} ${RAR_VI[t.minR]} trở lên${t.grp >= 0 ? ` có dòng ${LOOT_ATTR_GROUPS[t.grp][0]}` : ""}`;
  }
  return "?";
}
const dtProg = (t) => (t && t.need ? `${Math.min(t.have, t.need)}/${t.need}` : ""),
  dtItemOk = (t, n) =>
    t &&
    !t.set &&
    !t.vio &&
    !t.plv &&
    !t.lock &&
    !t.thanma &&
    (t.r || 0) >= n.minR &&
    DETAIL_SLOT[t.d] === n.slot &&
    (n.grp == null ||
      n.grp < 0 ||
      (t.mag || []).some((i) => LOOT_ATTR_GROUPS[n.grp][1].includes(attrReal(attrName(i.a))))),
  // Dã Tẩu items are handed in from the main character's bag (each character has its own bag: js/party.js)
  dtBag = () => (typeof charInv == "function" && charInv(0)) || S.inv,
  dtItemPick = (t) => dtBag().filter((n) => dtItemOk(n, t)).sort((n, i) => itemPower(n) - itemPower(i))[0];
function dtNeed(t) {
  const n = S.dt && S.dt.task;
  if (!n || n.t !== "item" || !S.fac || S.lvl < DT_LV || !t || !dtItemOk(t, n) || Object.values(S.eq).includes(t))
    return !1;
  const i = dtItemPick(n);
  return !i || i === t;
}
function dtItemGot(t) {
  const n = S.dt,
    i = n && n.task;
  !i ||
    i.t !== "item" ||
    !n.auto ||
    !dtItemOk(t, i) ||
    !dtBag().includes(t) ||
    (log(`📜 Dã Tẩu: nhặt được <b>${esc(t.n)}</b> để nộp.`), dtComplete(!0));
}
function dtReady(t) {
  return t
    ? t.t === "gold"
      ? S.gold >= t.cost
      : t.t === "item"
        ? !!t.bought || !!dtItemPick(t)
        : t.t === "mat"
          ? !!t.bought || matHave("ht", t.lv) >= t.cnt
          : t.have >= t.need
    : !1;
}
function dtWant(t) {
  if (t && (t.sat || t.satG)) return !0;
  const n = S.dt && S.dt.task;
  return !n || !n.need || n.have >= n.need || !t || !dtInZone(n)
    ? !1
    : n.t === "killm"
      ? t.tid === n.tid
      : n.t === "elite"
        ? t.cls === "elite"
        : n.t === "boss"
          ? t.cls === "boss" && t.tid === n.tid
          : !1;
}
function dtOnKill(t) {
  if (!S.fac || S.lvl < DT_LV) return;
  const n = DT(),
    i = n.task;
  if (
    i &&
    i.t === "item" &&
    !dtItemPick(i) &&
    !R.ground.some((a) => dtItemOk(a.it, i)) &&
    Math.random() < DT_ITEM_DROP
  ) {
    const a = DETAIL_SLOT.map((o, c) => (o === i.slot ? c : -1)).filter((o) => o >= 0 && o <= 9),
      e = clamp(Math.ceil(Math.min(t.L, S.lvl) / 12), 1, 10);
    for (let o = 0; o < 40; o++) {
      const c = pick(a),
        l = makeItem(c, sexPart(c, irnd(0, 5)), e, 2);
      if (l && dtItemOk(l, i)) {
        (dropToGround(l, t), log(`📜 Dã Tẩu: <b>${esc(l.n)}</b> rơi ra (vật phẩm cần tìm).`));
        break;
      }
    }
  }
  if (i && i.t === "mat" && n.auto && dtReady(i)) {
    dtComplete(!0);
    return;
  }
  !i ||
    !i.need ||
    i.have >= i.need ||
    !dtWant(t) ||
    (i.have++,
    i.have >= i.need &&
      (n.auto
        ? dtComplete(!0)
        : (toast("Dã Tẩu: nhiệm vụ hoàn thành, về trả!"),
          log("📜 Dã Tẩu: <b>hoàn thành</b> " + esc(dtText(i)) + " — về trả nhiệm vụ."))));
}
function dtComplete(t) {
  const n = DT(),
    i = n.task;
  if (!dtReady(i)) return !1;
  if ((i.t === "gold" && (S.gold -= i.cost), i.t === "item" && !i.bought)) {
    const e = dtItemPick(i);
    (dtBag().splice(dtBag().indexOf(e), 1), (invDirty = !0));
  }
  (i.t === "mat" && !i.bought && matAdd("ht", i.lv, -i.cnt),
    n.n++,
    n.chain++,
    n.today++,
    (n.best = Math.max(n.best, n.chain)));
  const s = n.chain,
    a = DT_HARD[i.t] || 1;
  if (
    (grant(
      {
        gold: Math.round(120 * a),
        xp: Math.min(0.05, 0.02 + s * 6e-4) * a,
        fd: a > 1 ? 2 : 1,
        knb: Math.random() < 0.08 * a ? 1 : 0,
      },
      `Dã Tẩu #${s}`,
    ),
    verVio() && (Math.random() < 0.35 || s % 50 === 0))
  ) {
    const e = clamp(Math.floor(S.lvl / 15) + (s % 50 === 0 ? 1 : 0), 1, HT_MAX),
      o = s % 50 === 0 ? 3 : 1;
    (matAdd("ht", e, o), log(`📜 Dã Tẩu: nhận ${o} Huyền Tinh cấp ${e}`));
  }
  return (
    s % 20 === 0 &&
      (grant({ misc: { lb: 1 } }, `Dã Tẩu chuỗi ${s}`), verVio() && log(`📜 Dã Tẩu chuỗi ${s}: ${forceOre(S.lvl)}`)),
    s % 500 === 0 && typeof horseBoxGive == "function" && horseBoxGive(1, `Mốc Dã Tẩu ${s}`),
    questTick("dt"),
    s % 50 === 0 && grant({ item: 5, fd: 5 }, `Rương Dã Tẩu ${s}`),
    dtMilestone(s, n.n),
    dtNew(),
    t
      ? ((n.task && n.task.t === "gold" && S.gold >= n.task.cost * 20) ||
          (n.task && ((n.task.t === "item" && dtItemPick(n.task)) || (n.task.t === "mat" && dtReady(n.task))))) &&
        dtComplete(!0)
      : dtRefresh(),
    !0
  );
}
function dtMilestone(t, n) {
  const i = (s, a) => {
    s && (addItem(s, !0, !0, !0), log(`📜 ${a}: <b style="color:${RAR_COL[s.r]}">${esc(s.n)}</b>`));
  };
  (t % 200 === 0 &&
    (S.lvl >= 75
      ? grant({ misc: { bk90: 1 } }, `Mốc Dã Tẩu ${t}`)
      : grant({ buff: { tt: [0.5, 60] } }, `Mốc Dã Tẩu ${t}`)),
    t % 100 === 0 &&
      (grant({ knb: 3, fd: 10 }, `Mốc Dã Tẩu ${t}`),
      typeof addBuff == "function" &&
        (addBuff("luck", 20, 60), log(`📜 Mốc Dã Tẩu ${t}: Quế Hoa Tửu +20 may mắn 60 phút`))),
    t % 500 === 0 && grant({ knb: 5, fd: 20, item: 6, misc: { wc: 1, mys: 1 } }, `Mốc Dã Tẩu ${t}`),
    n % DT_HK === 0
      ? i(forceSetItem(!1, !0), `Dã Tẩu ${n} nhiệm vụ — Hoàng Kim Môn Phái`)
      : n % 1e3 === 0
        ? i(forceSetItem(!0), `Dã Tẩu ${n} nhiệm vụ — Hoàng Kim`)
        : n % 500 === 0 && grant({ misc: { dtbk: 1 } }, `Dã Tẩu ${n} nhiệm vụ`));
}
const dtNextTotal = (t) => {
  const n = DT_TOTAL.map(([a, e]) => [Math.ceil((t + 1) / a) * a, e]).sort((a, e) => a[0] - e[0] || 0),
    i = n[0][0],
    s = DT_TOTAL.find(([a]) => i % a === 0);
  return [i, s ? s[1] : n[0][1]];
};
function dtSwap() {
  const t = DT();
  return matHave("misc", "ldt") < 1
    ? !1
    : (matAdd("misc", "ldt", -1),
      dtNew(),
      log("📜 Dùng Lệnh Bài Dã Tẩu đổi nhiệm vụ (giữ chuỗi)."),
      dtRefresh(),
      save(),
      !0);
}
function dtCancel() {
  if (dtSwap()) return;
  const t = DT();
  ((t.chain = 0), dtNew(), log("📜 Hủy nhiệm vụ Dã Tẩu, chuỗi liên tiếp về 0."), dtRefresh(), save());
}
function dtRefresh() {
  refresh();
}
function dtBody() {
  if (S.lvl < DT_LV) return `<p class="desc">Dã Tẩu giao nhiệm vụ từ cấp ${DT_LV}.</p>`;
  const t = DT();
  !t.task && t.today < dtMax() && dtNew();
  const n = t.task,
    i = dtReady(n),
    s = DT_CHAIN.map((o) => o[0] - (t.chain % o[0])).sort((o, c) => o - c)[0],
    [a, e] = dtNextTotal(t.n);
  return `<p class="desc">Mốc chuỗi liên tiếp: ${DT_CHAIN.map(([o, c]) => `<b>${o}</b>: ${c}`).join(" · ")}. Mốc tổng nhiệm vụ: <b>500</b>: Đại Thành Bí Kíp · <b>1000</b>: Hoàng Kim dùng chung · <b class="gold">${DT_HK} / ${DT_HK * 2} / ${DT_HK * 3}…</b>: <b style="color:#ffd24a">Hoàng Kim Môn Phái</b> (chắc chắn). Đổi nhiệm vụ: tốn 1 Lệnh Bài Dã Tẩu (giữ chuỗi); không có lệnh bài thì hủy = mất chuỗi. ${DT_DAY} nhiệm vụ / ngày + ${DT_LDT} mỗi lệnh bài (mua tối đa ${LDT_BUY_DAY} / ngày).</p>
    <div class="card"><div class="stats"><span>Chuỗi liên tiếp</span><span><b>${t.chain}</b> (kỷ lục ${t.best})</span><span>Hôm nay</span><span>${t.today}/${dtMax()}${t.extra ? ` <small class="cp">(+${t.extra} lệnh bài)</small>` : ""}</span><span>Mốc chuỗi kế</span><span>còn ${s}</span><span>Tổng</span><span>${t.n}</span><span>Mốc tổng kế</span><span>${a}: ${e} <small class="dim">(còn ${a - t.n})</small></span></div></div>
    <div class="card"><b>📜 ${n ? esc(dtText(n)) : "Hết nhiệm vụ hôm nay"}</b> <small class="dim">${n ? dtProg(n) : ""}</small>
      ${n && n.t === "item" ? `<div class="dim small">${dtItemPick(n) ? "Sẽ nộp: " + esc(dtItemPick(n).n) + " (đang giữ 📜)" : `Chưa có món phù hợp: món rơi phù hợp sẽ được tự nhặt và giữ lại. Tự trả: sau ${DT_ITEM_KILLS} quái chưa có thì mua ở tiệm (${fmtL(dtBuyCost())} lượng) · đã hạ ${n.kw || 0}`}</div>` : ""}
      <div class="dim small">${n && n.zn && !dtInZone(n) ? `Auto sẽ dịch chuyển tới ${esc(n.zn)}. ` : ""}Thưởng${n && DT_HARD[n.t] ? " ×1,5" : ""}: ${Math.round(Math.min(0.05, 0.02 + (t.chain + 1) * 6e-4) * ((n && DT_HARD[n.t]) || 1) * 1e3) / 10}% kinh nghiệm cấp, ${fmtL(120 * ((n && DT_HARD[n.t]) || 1) * (1 + S.lvl / 10))} lượng, ${n && DT_HARD[n.t] ? 2 : 1} Phúc Duyên, <b style="color:#ffd24a">${n && DT_HARD[n.t] ? 12 : 8}% 1 KNB</b>${verVio() ? ", 35% Huyền Tinh (mỗi 10 nhiệm vụ: 3 viên)" : ""}</div>
      <div class="btnrow"><button class="btn" id="dtDo" ${i ? "" : "disabled"}>${n && (n.t === "gold" || n.t === "item" || n.t === "mat") ? "Nộp" : "Trả nhiệm vụ"}</button><button class="btn red" id="dtCancel" ${n ? "" : "disabled"}>${matHave("misc", "ldt") ? "Đổi (1 Lệnh Bài)" : "Hủy (mất chuỗi)"}</button>
      <label class="chk"><input type="checkbox" id="dtAuto" ${t.auto ? "checked" : ""}> Tự trả / nhận</label></div></div>
    <div class="card small"><img src="img/ep/ldt.png" alt="" style="height:20px;vertical-align:middle;image-rendering:pixelated"> <b>Lệnh Bài Dã Tẩu</b>: có ${matHave("misc", "ldt")} · mỗi lệnh bài +${DT_LDT} lượt hôm nay (mua ở Kỳ Trân Các)
      <div class="btnrow"><button class="btn sm${t.today >= dtMax() ? " on" : ""}" id="dtLdt" ${matHave("misc", "ldt") ? "" : "disabled"}>Dùng Lệnh Bài (+${DT_LDT} lượt)</button>
      <label class="chk"><input type="checkbox" id="dtLdtAuto" ${S.autoLdt === !1 ? "" : "checked"}> Tự dùng khi hết lượt (chế độ Làm nhiệm vụ)</label></div></div>`;
}
function bindDt() {
  const t = (s, a) => {
    const e = $(s);
    e && (e.onclick = a);
  };
  (t("#dtDo", () => {
    (dtComplete(!1), save());
  }),
    t("#dtCancel", dtCancel));
  const n = $("#dtAuto");
  (n &&
    (n.onchange = () => {
      ((DT().auto = n.checked), save());
    }),
    t("#dtLdt", () => dtUseLdt(!1)));
  const i = $("#dtLdtAuto");
  i &&
    (i.onchange = () => {
      ((S.autoLdt = i.checked), save());
    });
}
const ST_TIERS = [20, 30, 40, 50, 60, 70, 80, 90],
  ST_TIME = 150,
  ST_FREE = 3;
function ST() {
  const t = S.st || (S.st = { day: "", kills: 0, fails: 0, best: 0 });
  return (
    t.day !== today() && ((t.day = today()), matAdd("misc", "lb", Math.max(0, ST_FREE - matHave("misc", "lb")))),
    t
  );
}
const stTierMax = () => Math.max(20, Math.min(90, Math.floor(S.lvl / 10) * 10));
function stBossPool(t) {
  const n = [...new Set(ZONES.map((i) => i.boss))].filter(
    (i) => MON[i] && monSeries(i) === t && !/boss/i.test(MON[i].n),
  );
  return n.length ? n : [...new Set(ZONES.map((i) => i.boss))];
}
function stStart(t) {
  if ((ST(), R.sat)) {
    toast("Đang có Sát Thủ trên bản đồ");
    return;
  }
  if (R.dg || R.tower || R.town) {
    toast("Ra bãi luyện công để gọi Sát Thủ");
    return;
  }
  if (t > stTierMax()) return;
  if (matHave("misc", "lb") < 1) {
    toast("Cần Lệnh Bài Sát Thủ");
    return;
  }
  matAdd("misc", "lb", -1);
  const n = irnd(0, 4),
    i = pick(stBossPool(n)),
    s = t + 5;
  if (typeof gotoZone == "function") {
    const l = zoneIdxForLevel(s);
    zoneIdx(Math.min(S.stage, STAGES)) !== l && gotoZone(l, `Sát Thủ cấp ${t} xuất hiện`);
  }
  const a = zoneOf(Math.min(S.stage, STAGES)),
    e = (l, r) => {
      const d = rnd(0, Math.PI * 2),
        h = rnd(l, r);
      return inWorld(H.x + Math.cos(d) * h, H.y + Math.sin(d) * h);
    },
    o = e(200, 240),
    c = makeEnemy(i, s, "boss", o[0], o[1]);
  ((c.hp = c.max = c.max * 2.2),
    (c.dmg *= 1.2),
    (c.sat = t),
    (c.series = n),
    (c.n = `${SERIES[n]} Sát Thủ · ${MON[i].n}`),
    R.enemies.push(c));
  for (let l = 0; l < 2; l++) {
    const r = e(150, 220),
      d = makeEnemy(pick(a.m), s, "elite", r[0], r[1]);
    ((d.satG = 1), (d.n = "Hộ vệ · " + d.n), R.enemies.push(d));
  }
  ((R.sat = { t: ST_TIME, tier: t, id: c.id }),
    closeModal(!0),
    (R.banner = { t: 2.6, text: `${SERIES[n]} Sát Thủ cấp ${t}`, sub: `Hạ trong ${ST_TIME} giây` }),
    log(`🗡 <b style="color:${SERIES_COL[n]}">${esc(c.n)}</b> (cấp ${s}) xuất hiện!`),
    save());
}
function stTick(t) {
  const n = R.sat;
  if (!n) return;
  n.t -= t;
  const i = R.enemies.find((s) => s.id === n.id && !s.dead);
  if (n.done) {
    R.sat = null;
    return;
  }
  (!i || n.t <= 0) &&
    ((R.enemies = R.enemies.filter((s) => !(s.sat || s.satG) || s.dead)),
    ST().fails++,
    (R.sat = null),
    log('<span class="bad">🗡 Sát Thủ đã trốn thoát.</span>'),
    (R.banner = { t: 2, text: "Sát Thủ trốn thoát", sub: "" }));
}
function stOnKill(t) {
  if (!t.sat) return;
  const n = t.sat,
    i = ST();
  (i.kills++, (i.best = Math.max(i.best, n)), R.sat && R.sat.id === t.id && (R.sat.done = !0));
  const s = { wc: n >= 40 && Math.random() < 0.1 ? 1 : 0, mys: n >= 60 && Math.random() < 0.05 ? 1 : 0 };
  n >= 90 && Math.random() < 0.08 && (s.bk90 = 1);
  for (const e in s) s[e] || delete s[e];
  grant({ gold: n * 25, xp: 0.01 + (n / 90) * 0.03, item: 5, misc: s }, `Hạ Sát Thủ cấp ${n}`);
  const a = clamp(Math.floor(n / 10) - 1, 1, 10);
  (matAdd("ht", a),
    log(`🗡 Nhận Huyền Tinh cấp ${a}${verVio() && n >= 50 ? ", " + forceOre(n) : ""}`),
    R.enemies.forEach((e) => {
      e.satG && (e.satG = 0);
    }));
}
function stBody() {
  const t = ST(),
    n = stTierMax(),
    i = matHave("misc", "lb");
  return `<p class="desc">Sát Thủ Đường: dùng 1 Lệnh Bài gọi Sát Thủ (5 hệ) kèm 2 hộ vệ ngay tại bãi luyện công, hạ trong ${ST_TIME} giây. Mỗi ngày nhận ${ST_FREE} lệnh bài miễn phí; thêm từ Dã Tẩu (mỗi 5 nhiệm vụ) và trùm. Thưởng: kinh nghiệm, Thủy Tinh Trắng, Thần Bí Khoáng Thạch, Huyền Tinh (Sát Thủ cấp 50+: thêm 1 đá thuộc tính), đồ 5 dòng; Sát Thủ 90 có cơ hội rơi Mật Tịch.</p>
    <div class="card stats"><span>Lệnh Bài Sát Thủ</span><span><b>${i}</b></span><span>Đã hạ</span><span>${t.kills} (cao nhất cấp ${t.best || "—"})</span><span>Trốn thoát</span><span>${t.fails}</span></div>
    ${R.sat ? `<div class="card"><b>🗡 Đang truy sát Sát Thủ cấp ${R.sat.tier}</b> <small class="dim">còn ${Math.ceil(R.sat.t)} giây</small></div>` : ""}
    <div class="stgrid">${ST_TIERS.map((s) => `<button class="btn" data-st="${s}" ${s <= n && i && !R.sat ? "" : "disabled"}>Cấp ${s}${s > n ? ` <small>(cần cấp ${s})</small>` : ""}</button>`).join("")}</div>`;
}
function ghOnKill(t) {
  if (S.fac) {
    if ((dtOnKill(t), stOnKill(t), t.cls === "boss")) {
      const n = t.goldBoss || t.wb;
      if (Math.random() < (n ? 0.5 : 0.1)) {
        const i = n ? irnd(1, 2) : 1;
        ((S.knb = (S.knb || 0) + i),
          addText(t.x, t.y - 76, `+${i} Kim Nguyên Bảo`, "#ffd700", 13),
          log(`💰 Nhặt được <b style="color:#ffd700">${i} Kim Nguyên Bảo</b>`));
      }
    }
    if (t.cls === "boss") {
      const n = t.L,
        i = (t.goldBoss || t.wb ? 4 : 1) * dropMul(),
        s = [];
      (n >= 75 && Math.random() < 0.03 * i && s.push("bk90"), !t.sat && Math.random() < 0.06 && s.push("lb"));
      for (const a of s)
        (matAdd("misc", a, 1),
          addText(t.x, t.y - 60, "+1 " + miscName(a), "#ffd24a", 12),
          log(`Nhặt được <b style="color:#ffd24a">${miscName(a)}</b>`));
    }
  }
}
function ghTick(t) {
  (stTick(t), typeof questPilot == "function" && questPilot(t), typeof dgPilot == "function" && dgPilot(t));
}
function ghTodo(t) {
  if (!S.fac || S.lvl < DT_LV) return;
  ST();
  const n = DT(),
    i = n.task;
  (i && dtReady(i) && !n.auto
    ? t.push({ k: "dt", t: "📜 Trả nhiệm vụ Dã Tẩu", go: () => openQuest("dt") })
    : i && i.need && t.push({ k: "dtp", t: `📜 ${dtText(i)} ${dtProg(i)}`, go: () => openQuest("dt") }),
    matHave("misc", "lb") > 0 &&
      !R.sat &&
      S.lvl >= 20 &&
      S.st &&
      S.st.kills < 1 &&
      t.push({ k: "st", t: "🗡 Có Lệnh Bài Sát Thủ", go: () => openQuest("st") }));
}
