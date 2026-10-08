"use strict";
const SET_BAN =
    /^(Hắc thần|Thương Khung Thiên Khởi|Long Tương Chi Lân|Độc Cô Cầu Bại|Thuần Tịnh Chi Giới|Thế Túc Toàn Giới|Thiên Hà Giới|Thiên tử chi giới|Đế hoàng chi giới|Hưng Bang Giới|Trấn Nhạc Giới|Thương Phương Giới|Lãnh Bá Nguyên Mộng|Vũ Liệt Chi)/i,
  SET_VARIANT =
    /^\s*\[|\((\s*mới\s*|kỳ hạn)\)|[ÄĐẫãệđ´óằð]{4}|^Dương Thần|^(Định Quốc Thanh sa Trường sam|An Bang Cúc hoa Thạch chỉ hoàn|An Bang Điền Hoàng thạch ngọc bội)$/,
  setBanned = (t) => (
    (t = String(t || "")),
    SET_BAN.test(t.replace(/^\[[^\]]*\]\s*/, "")) || SET_VARIANT.test(t.replace(/^\[Bạch Kim\]\s*/, ""))
  ),
  eqBanned = (t) => !!t && typeof t == "object" && !!t.set && t.set.kind !== "platina" && setBanned(t.n);
if (typeof JX !== "undefined" && JX && JX.sets) {
  if (Array.isArray(JX.sets.gold)) JX.sets.gold = JX.sets.gold.filter((t) => !setBanned(t.n));
  if (Array.isArray(JX.sets.platina)) JX.sets.platina = JX.sets.platina.filter((t) => !SET_BAN.test(String(t.n || "").replace(/^\[[^\]]*\]\s*/, "")));
}
if (typeof RCP !== "undefined" && RCP && RCP.shards) {
  for (const t of Object.keys(RCP.shards)) if (setBanned(t)) delete RCP.shards[t];
}
(function () {
  if (typeof JX === "undefined" || !JX || !JX.sets || !Array.isArray(JX.sets.gold)) return;
  const t = JX.sets.gold,
    a = JX.sets.platina || [],
    f = JX.ge || {},
    r = (n, s) => (n.req.find((e) => e[0] === s) || [0, -1])[1],
    l = (n) => String(n).replace(/^\[[^\]]*\]\s*/, "");
  let u = 1e5;
  const p = (n, s) => {
      const e = f[n];
      if (!e) return null;
      if (Math.abs(s - 1) < 0.01) return n;
      const g = e.p.map(([i, d]) => (i === -1 && d === -1 ? [i, d] : [Math.round(i * s), Math.round(d * s)]));
      return ((f[++u] = { a: e.a, p: g }), u);
    },
    m = (n) => n.mag.length && n.mag.every((s) => f[s]),
    x = t.filter(m);
  for (const n of t) {
    if (m(n)) continue;
    const s = r(n, 36),
      e = r(n, 39),
      i =
        x.filter((o) => o.d === n.d && r(o, 39) === e && r(o, 36) <= s).sort((o, c) => r(c, 36) - r(o, 36))[0] ||
        x.filter((o) => o.d === n.d).sort((o, c) => r(c, 36) - r(o, 36))[0];
    if (!i) continue;
    const d = 1 + Math.max(0, s - r(i, 36)) / 400,
      M = n.mag.length ? n.mag : i.mag.map(() => -1);
    ((n.mag = M.map((o, c) => (f[o] ? o : p(i.mag[c % i.mag.length], d))).filter((o) => o != null)),
      (!n.ext || !n.ext.length) && (n.ext = (i.ext || []).map(() => -1)),
      (n.ext = (n.ext || [])
        .map((o, c) => (f[o] ? o : i.ext && i.ext.length ? p(i.ext[c % i.ext.length], d) : null))
        .filter((o) => o != null)),
      (n.fixed = 1));
  }
  const T = new Set(t.filter((n) => n.fixed).map((n) => n.grp));
  for (const n of t) T.has(n.grp) && (n.fixed = 1);
  for (const n of a) T.has(n.grp) && (n.fixed = 1);
  const h = {};
  for (const n of t) (h[n.grp] = h[n.grp] || []).push(n);
  for (const n in h) {
    const s = h[n],
      e = s.find((g) => g.n2 > 0 && g.n2 < 99);
    for (const g of s)
      (g.n2 > 0 && g.n2 < 99) ||
        ((g.n1 = e ? e.n1 : Math.max(2, Math.round(s.length * 0.4))),
        (g.n2 = e ? e.n2 : Math.max(2, Math.round(s.length * 0.7))),
        (g.sid = g.sid || (e && e.sid) || 1));
  }
  const B = {};
  for (const n of t) B[l(n.n)] = n;
  for (const n of a) {
    const s = B[l(n.n)] || (h[n.grp] || []).find((e) => e.d === n.d);
    if (
      (s &&
        (!n.mag.length || !n.mag.every((e) => f[e])) &&
        ((n.mag = s.mag.map((e) => p(e, 1.15)).filter((e) => e != null)),
        (!n.ext || !n.ext.length || !n.ext.every((e) => f[e])) &&
          (n.ext = (s.ext || []).map((e) => p(e, 1.15)).filter((e) => e != null)),
        (n.fixed = 1)),
      !(n.n2 > 0 && n.n2 < 99))
    ) {
      const e = (h[n.grp] || [])[0];
      ((n.n1 = e ? e.n1 : 3), (n.n2 = e ? e.n2 : 5), (n.sid = n.sid || (e && e.sid) || 1));
    }
  }
})();
function setRowOf(t) {
  const a = JX.sets[t.set.kind] || [],
    f = String(t.n).replace(/^\[(Bạch Kim)\]\s*/, "");
  return a.find((r) => r.n === f || r.n === t.n) || a.find((r) => r.grp === t.set.grp && r.d === t.d) || null;
}
function setNoData(t) {
  if (!t || !t.set) return !1;
  const a = setRowOf(t);
  return !!a && (!!a.fixed || a.d > 10);
}
function setRepair(t) {
  if (!t || !t.set) return !1;
  const a = setRowOf(t);
  if (!a) return !1;
  let f = !1;
  if (
    ((t.set.n2 > 0 && t.set.n2 < 99) ||
      ((t.set.n1 = a.n1), (t.set.n2 = a.n2), (t.set.sid = t.set.sid || a.sid), (f = !0)),
    (t.mag || []).length < a.mag.length)
  ) {
    const r = () => 5 + Math.floor(Math.random() * 6);
    ((t.mag = a.mag.map((l) => geValue(l, r())).filter(Boolean)),
      (t.ext = (a.ext || []).map((l) => geValue(l, r())).filter(Boolean)),
      (f = !0));
  }
  return f;
}
