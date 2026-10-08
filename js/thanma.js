"use strict";
const THAN_MA = [
    [
      "ovan",
      5,
      "Ô Vân Đạp Tuyết",
      "Ô Vân Đạp Tuyết",
      60,
      1,
      [
        ["coldres_p", 15],
        ["lifemax_p", 5],
        ["five_elements_resist_v", 10],
      ],
      "Ngựa đen bốn vó trắng như tuyết, hệ Thủy",
    ],
    [
      "xtho",
      5,
      "Xích Thố",
      "Xích Thố",
      60,
      1,
      [
        ["fireres_p", 15],
        ["attackspeed_v", 6],
        ["deadlystrikeenhance_p", 4],
      ],
      "Ngày đi nghìn dặm, hệ Hỏa",
    ],
    [
      "tanh",
      5,
      "Tuyệt ảnh",
      "Tuyệt Ảnh",
      60,
      1,
      [
        ["physicsres_p", 10],
        ["attackratingenhance_p", 15],
        ["ignoredefense_p", 6],
      ],
      "Nhanh tới mức không thấy bóng, hệ Kim",
    ],
    [
      "dlo",
      5,
      "Đích Lô",
      "Đích Lô",
      60,
      1,
      [
        ["poisonres_p", 15],
        ["steallifeenhance_p", 3],
        ["lifereplenish_v", 25],
      ],
      "Từng cứu chủ nhảy qua suối Đàn Khê, hệ Mộc",
    ],
    [
      "cdsu",
      5,
      "Chiếu Dạ Ngọc Sư Tử",
      "Chiếu Dạ Ngọc Sư Tử",
      60,
      1,
      [
        ["lightingres_p", 15],
        ["lucky_v", 15],
        ["meleedamagereturn_p", 6],
      ],
      "Sáng rực trong đêm, hệ Thổ",
    ],
    [
      "pvan",
      8,
      null,
      "Phi Vân",
      70,
      2,
      [
        ["allres_p", 6],
        ["attackspeed_v", 6],
        ["lifemax_p", 6],
      ],
      "Lướt như mây bay",
    ],
    [
      "btieu",
      6,
      null,
      "Bôn Tiêu",
      70,
      2,
      [
        ["lifemax_p", 8],
        ["steallifeenhance_p", 4],
        ["manamax_p", 6],
      ],
      "Phi nước đại trong đêm",
    ],
    [
      "xlc",
      9,
      null,
      "Xích Long Câu",
      80,
      3,
      [
        ["deadlystrikeenhance_p", 8],
        ["attackspeed_v", 8],
        ["five_elements_enhance_v", 15],
      ],
      "Long câu đỏ rực, chuyên xung trận",
    ],
    [
      "duhuy",
      11,
      null,
      "Du Huy",
      80,
      3,
      [
        ["lifemax_p", 10],
        ["meleedamagereturn_p", 10],
        ["lifereplenish_v", 40],
      ],
      "Ánh sáng lấp lánh trên bờm",
    ],
    [
      "squang",
      13,
      null,
      "Siêu Quang",
      85,
      3,
      [
        ["attackspeed_v", 10],
        ["deadlystrikeenhance_p", 6],
        ["lifemax_p", 6],
      ],
      "Nhanh hơn cả ánh sáng",
    ],
    [
      "pvu",
      7,
      null,
      "Phiên Vũ",
      90,
      4,
      [
        ["allres_p", 8],
        ["steallifeenhance_p", 5],
        ["attackspeed_v", 8],
        ["lifemax_p", 6],
      ],
      "Bay lượn như chim",
    ],
    [
      "hhlc",
      18,
      null,
      "Hãn Huyết Long Câu",
      92,
      4,
      [
        ["lifemax_p", 12],
        ["deadlystrikeenhance_p", 8],
        ["five_elements_enhance_v", 20],
        ["steallifeenhance_p", 4],
      ],
      "Mồ hôi đỏ như máu",
    ],
    [
      "bhv",
      16,
      null,
      "Kim Tinh Bạch Hổ Vương",
      95,
      4,
      [
        ["allres_p", 10],
        ["meleedamagereturn_p", 12],
        ["lifemax_p", 10],
        ["attackspeed_v", 8],
      ],
      "Chúa sơn lâm lông trắng",
    ],
    [
      "pvtm",
      21,
      null,
      "Phong Vân Thần Mã",
      97,
      4,
      [
        ["allres_p", 12],
        ["attackspeed_v", 10],
        ["deadlystrikeenhance_p", 8],
        ["lifemax_p", 10],
      ],
      "Thần mã của Phong Vân hội",
    ],
  ],
  TM_TIER_VI = ["", "Ngũ đại thần mã", "Danh mã", "Bảo mã", "Thần mã tối thượng"],
  TM_COST = { 1: [120, 6e4], 2: [200, 12e4], 3: [320, 25e4], 4: [500, 5e5] },
  TM_ATTR_MAP = { 233: 85, 241: 114 },
  TM_BASE_DROP = new Set([93, 243]),
  tmDef = (t) => THAN_MA.find((e) => e[0] === t),
  isThanMa = (t) => !!(t && t.d === 10 && t.thanma),
  tmCost = (t) => {
    const [e, a] = TM_COST[t[5]];
    return { fd: e, gold: Math.round(a * (1 + S.lvl / 10)) };
  };
function makeThanMa(t) {
  const e = tmDef(t),
    a = J.items[10];
  if (!e || !a) return null;
  const n = a.list.filter((l) => l.k === e[1] && (!e[2] || l.n === e[2]));
  if (!n.length) return null;
  const s = n.reduce((l, c) => (c.lvl > l.lvl ? c : l)),
    i = [];
  for (const [l, c, u] of s.base) {
    if (TM_BASE_DROP.has(l)) continue;
    const h = TM_ATTR_MAP[l] || l,
      m = attrName(h) === "adddefense_v" ? Math.abs(c) : c,
      g = attrName(h) === "adddefense_v" ? Math.abs(u) : u,
      o = i.find((p) => p[0] === h);
    o ? ((o[1] += m), (o[2] += g)) : i.push([h, m, g]);
  }
  return {
    uid: S.uid++,
    d: 10,
    k: e[1],
    p: s.p,
    n: e[3],
    ic: s.ic || "",
    lvl: 10,
    s: -1,
    price: s.price,
    base: i,
    req: [[36, e[4]]],
    r: 4,
    thanma: e[0],
    lock: !0,
    mag: e[6].filter(([l]) => ATTR_ID[l] !== void 0).map(([l, c]) => ({ a: ATTR_ID[l], p: [c, 0, 0], n: "", pre: 1 })),
  };
}
function thanMaRoll() {
  const t = THAN_MA.filter((n) => n[4] <= S.lvl || (RW().stat.reborn > 0 && n[5] <= 2));
  if (!t.length) return null;
  const e = Math.max(...t.map((n) => n[5])),
    a = t.filter((n) => n[5] >= e - 1);
  return makeThanMa(wpick(a, (n) => (n[5] === e ? 1 : 2))[0]);
}
function rareHorse() {
  return thanMaRoll() || horseRoll(!1);
}
function tmBuy(t) {
  const e = tmDef(t);
  if (!e) return { ok: !1, msg: "Không có ngựa này" };
  if (S.lvl < e[4] && !RW().stat.reborn) return { ok: !1, msg: `Cần cấp ${e[4]}` };
  const a = tmCost(e),
    n = RW();
  if (n.fd < a.fd) return { ok: !1, msg: `Cần ${a.fd} Phúc Duyên (có ${n.fd})` };
  if (S.gold < a.gold) return { ok: !1, msg: "Không đủ ngân lượng" };
  if (S.inv.length >= INV_MAX) return { ok: !1, msg: "Hành trang đầy" };
  const s = makeThanMa(t);
  return s
    ? ((n.fd -= a.fd),
      (S.gold -= a.gold),
      S.inv.unshift(s),
      (invDirty = !0),
      recItem(s),
      log(`🐎 Đổi được thần mã <b style="color:${RAR_COL[4]}">${esc(s.n)}</b>`),
      save(),
      { ok: !0, msg: "Nhận " + s.n, it: s })
    : { ok: !1, msg: "Lỗi dữ liệu ngựa" };
}
function tmLines(t) {
  return t[6]
    .map(([e, a]) =>
      attrText(e, [a, 0, a])
        .split("<enter>")[0]
        .replace(/\.\s*$/, ""),
    )
    .join(" · ");
}
function thanMaBody() {
  const t = RW(),
    e = new Set(
      S.inv
        .concat(Object.values(S.eq))
        .filter(isThanMa)
        .map((n) => n.thanma),
    );
  let a = 0;
  return `<p class="desc">không phạt né tránh, có 2–4 dòng thần lực luôn hiệu lực, tự khóa 🔒. Rơi ở phó bản, rương Boss tuần hạng S, Trùm Hoàng Kim; hoặc đổi tại đây bằng Phúc Duyên (đang có <b>${t.fd}</b>) + ngân lượng. Thuần dưỡng như ngựa thường.</p>
    ${THAN_MA.map((n) => {
      const s =
          n[5] !== a ? `<h4 class="rech">${TM_TIER_VI[(a = n[5])]} <small class="dim">cấp ${n[4]}+</small></h4>` : "",
        i = tmCost(n),
        r = S.lvl >= n[4] || RW().stat.reborn > 0,
        l = J.items[10].list.find((c) => c.k === n[1] && (!n[2] || c.n === n[2]));
      return `${s}<div class="qrow tmrow${r ? "" : " lock"}">${l && l.ic ? `<img src="${esc(l.ic)}" alt="">` : ""}<span><b style="color:${RAR_COL[4]}">${esc(n[3])}</b>${e.has(n[0]) ? ' <small class="cp">✔ đã có</small>' : ""}<small>${esc(n[7])}<br>${esc(tmLines(n))}</small></span>
        <button class="btn sm" data-tm="${n[0]}" ${r && t.fd >= i.fd && S.gold >= i.gold ? "" : "disabled"}>${r ? `${i.fd} PD<br>${fmtL(i.gold)}` : `Cấp ${n[4]}`}</button></div>`;
    }).join("")}`;
}
function bindThanMa(t) {
  document.querySelectorAll("#mBody [data-tm]").forEach(
    (e) =>
      (e.onclick = () => {
        const a = tmBuy(e.dataset.tm);
        (toast(a.msg), a.ok && uiSfx("learn"), t());
      }),
  );
}
