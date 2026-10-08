"use strict";
const GOLD_EXT = 2;
function geValue(n, t) {
  const e = J.ge[n];
  return e
    ? { a: e.a, p: e.p.map(([s, h]) => (s === -1 && h === -1 ? -1 : Math.round(s + ((h - s) * t) / 10))), pre: 1 }
    : null;
}
function geValueJX(n) {
  const t = J.ge[n];
  return t
    ? {
        a: t.a,
        p: t.p.map(([e, s]) =>
          e === -1 && s === -1 ? -1 : Math.min(e, s) + Math.floor(Math.random() * (Math.abs(s - e) + 1)),
        ),
        pre: 1,
      }
    : null;
}
const PLAT_TAG = "[Bạch Kim] ";
var bareName = window.bareName = window.bareName || ((n) => String(n || "").replace(/^\[[^\]]*\]\s*/, ""));
const platName = (n) => (/^\[/.test(n) ? n : PLAT_TAG + n);
function makeSetItem(n, t, e) {
  const s = Math.min(6, e | 0),
    h = () => clamp(Math.round(s + (10 - s) * Math.pow(Math.random(), SET_LINE_SKEW)), 0, 10),
    c = {
      uid: S.uid++,
      d: t.d,
      k: t.k,
      n: n === "platina" ? platName(t.n) : t.n,
      ic: t.ic || "",
      lvl: t.lvl,
      s: t.s,
      price: t.price,
      base: t.base.map((i) => i.slice()),
      req: t.req.map((i) => i.slice()),
      r: n === "gold" ? 4 : 5,
      set: { kind: n, grp: t.grp, n1: t.n1 || 99, n2: t.n2 || 99, sid: t.sid },
    },
    l = n === "gold" ? geValueJX : (i) => geValue(i, h());
  return ((c.mag = t.mag.map(l).filter(Boolean)), (c.ext = t.ext.map(l).filter(Boolean)), c);
}
const VER_INFO = {
    1: {
      n: "Phiên bản 1 · Sơ khai",
      d: "Hoàng Kim chung (An Bang, Định Quốc, Hiệp Cốt, Nhu Tình, Kim Phong, Thiên Hoàng, Động Sát…) và Hoàng Kim môn phái. Không có đồ Tím, không có Bạch Kim.",
    },
    2: {
      n: "Phiên bản 2 · Đồ Tím",
      d: "Như phiên bản 1, thêm hệ thống đồ Tím: Huyền Tinh, khoáng thạch rơi ra; hợp, khảm, tách đồ Tím.",
    },
    3: {
      n: "Phiên bản 3 · Lộ trình Hoàng Kim",
      d: "Như phiên bản 2, đồ Hoàng Kim rơi theo lộ trình cấp của JX1: Thanh Câu (50) → Vân Lộc (80) → Thương Lang (100) → Tử Mãng, Kim Ô, Bạch Hổ, Xích Lân, Minh Phượng, Huyền Viên, Tinh Sương, Tống Kim (120) → Đằng Long (180); thêm Bạch Kim.",
    },
  },
  gameVer = () => 3,
  verVio = () => gameVer() >= 2,
  verPlat = () => !1,
  GOLD_RARE3 = { drop: 0.05, shard: 0.15, grant: 0.1 },
  goldMul = (n) => (gameVer() >= 3 ? GOLD_RARE3[n] : 1),
  SET_ROUTE = {
    "Thanh Câu": [50, 80],
    "Vân Lộc": [80, 100],
    "Thương Lang": [100, 120],
    "Tử Mãng": [120, 180],
    "Kim Ô": [120, 180],
    "Bạch Hổ": [120, 180],
    "Xích Lân": [120, 180],
    "Minh Phượng": [120, 180],
    "Huyền Viên": [120, 180],
    "Tinh Sương": [120, 180],
    "Tống Kim": [120, 999],
    "Đằng Long": [180, 999],
  },
  rowFam = (n) => n.fam || (n.fam = setFamily({ set: 1, n: n.n, req: n.req }));
function setVerOk(n, t) {
  const e = rowFam(n);
  if (gameVer() < 3) return e === "Bộ chung" || e === "Môn phái";
  const s = SET_ROUTE[e];
  return !s || (t >= s[0] && t < s[1]);
}
const SET_KEEP = ["Bộ chung", "Môn phái"],
  setRowOk = (n) => {
    const t = (n.req.find((e) => e[0] === 39) || [0, -1])[1];
    return (
      n.d <= 10 &&
      n.mag.length > 0 &&
      !n.fixed &&
      (t < 0 || FACTIONS.some((e) => e.id === t)) &&
      SET_KEEP.includes(rowFam(n))
    );
  },
  eqRemoved = (n) =>
    !!n && (n.r === 5 || n.plv != null || (n.set && (n.set.kind === "platina" || !SET_KEEP.includes(setFamily(n)))));
function rollSetDrop(n) {
  const t =
    (n.cls === "boss"
      ? 0.02 + zoneIdx(Math.min(S.stage, STAGES)) * 0.0015
      : n.cls === "elite"
        ? 0.003
        : 15e-5 * densK(n)) *
    dropMul() *
    goldMul("drop") *
    dropCfg("setK", SET_DROP_K) * dropCfg("mul.set", 1) * dropCfg("cls." + n.cls + ".set", 1) *
    (typeof VIP_DROP_RATE == "number" ? dropCfg("vip", VIP_DROP_RATE) : 1);
  if (Math.random() >= t) return null;
  const e =
      verPlat() && n.L >= 90 && Math.random() < (n.cls === "boss" ? (n.L >= 120 ? 0.2 : 0.1) : 0.06)
        ? "platina"
        : "gold",
    s = Math.max(S.lvl, n.L) + 10,
    h = FAC[S.fac] ? FAC[S.fac].id : -1,
    c = (o, r) => (o.req.find((a) => a[0] === r) || [0, -1])[1],
    l = Math.max(S.lvl, n.L);
  let i = J.sets[e].filter((o) => c(o, 36) <= s && sexReqOk(o.req) && setRowOk(o) && setVerOk(o, l));
  if (e === "gold") {
    const o = (g) => c(g, 39) >= 0 || c(g, 36) >= 90,
      r = i.filter(o),
      a = i.filter((g) => !o(g)),
      u = n.cls === "boss" ? SET_XIN_P.boss : n.cls === "elite" ? SET_XIN_P.elite : SET_XIN_P.normal;
    i = r.length && (!a.length || Math.random() < u) ? r : a;
  }
  if (e === "gold") {
    const o = i.filter((a) => c(a, 39) >= 0),
      r = i.filter((a) => c(a, 39) < 0);
    i = o.length && (!r.length || Math.random() < HKMP_DROP) ? o : r;
  }
  const m = i.filter((o) => c(o, 39) === h);
  return (
    m.length && Math.random() < SET_MINE_P && (i = m),
    i.length ? makeSetItem(e, pick(i), R.P ? Math.min(10, Math.floor(R.P.lucky / 10)) : 0) : null
  );
}
const SET_LINE_SKEW = 2.5,
  SET_DROP_K = 0.2,
  SET_MINE_P = 0.2,
  HKMP_DROP = 0.05,
  HKMP_GRANT = 0.05,
  HKMP_SHARD = 0.1,
  SET_XIN_P = { boss: 0.25, elite: 0.12, normal: 0.06 };
function setCounts(n) {
  const t = {};
  for (const e in n) {
    const s = n[e];
    !s ||
      !s.set ||
      e === "horse" ||
      (e === "ring1" && n.ring2 && n.ring2.set && n.ring2.set.grp === s.set.grp && n.ring2.set.sid === s.set.sid) ||
      (t[s.set.grp] = (t[s.set.grp] || 0) + 1);
  }
  return t;
}
function enoughToActive(n) {
  const t = setCounts(n);
  for (const e in n) {
    const s = n[e];
    if (s && s.set && t[s.set.grp] >= s.set.n2) return !0;
  }
  return !1;
}
function goldEnhance(n, t) {
  const e = slotOfEquipped(n, t);
  return e
    ? e === "horse" || enoughToActive(t)
      ? 2
      : Math.min(2, Math.floor((setCounts(t)[n.set.grp] || 0) / Math.max(1, n.set.n1)))
    : 0;
}
function setMembers(n) {
  return J.sets[n.set.kind].filter((t) => t.grp === n.set.grp);
}

// Global compatibility exports
if (typeof window !== "undefined") {
  window.verVio = verVio;
  window.verPlat = verPlat;
  window.gameVer = gameVer;
  window.GOLD_EXT = GOLD_EXT;
  window.geValue = geValue;
  window.geValueJX = geValueJX;
  window.makeSetItem = makeSetItem;
  window.rollSetDrop = rollSetDrop;
  window.setCounts = setCounts;
  window.enoughToActive = enoughToActive;
  window.goldEnhance = goldEnhance;
  window.setMembers = setMembers;
}
