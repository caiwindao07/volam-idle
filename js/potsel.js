"use strict";
const BOTH_POTS = [
  {
    n: "Thừa Tiên Mật (tiểu)",
    kind: "both",
    total: 100,
    dur: 5.6,
    mtotal: 60,
    mdur: 5.6,
    price: 80,
    tier: 1,
    ic: "img/i/potb1.png",
  },
  {
    n: "Thừa Tiên Mật (trung)",
    kind: "both",
    total: 250,
    dur: 5.6,
    mtotal: 150,
    mdur: 13.9,
    price: 150,
    tier: 2,
    ic: "img/i/potb1.png",
  },
  {
    n: "Thừa Tiên Mật (đại)",
    kind: "both",
    total: 500,
    dur: 11.1,
    mtotal: 300,
    mdur: 11.1,
    price: 750,
    tier: 3,
    ic: "img/i/potb3.png",
  },
  {
    n: "Thất Xảo Bổ Tâm Đan",
    kind: "both",
    total: 1e3,
    dur: 11.1,
    mtotal: 600,
    mdur: 11.1,
    price: 1500,
    tier: 4,
    ic: "img/i/potb3.png",
  },
  {
    n: "Ngũ Hoa Ngọc Lộ Hoàn",
    kind: "both",
    total: 5e3,
    dur: 5.6,
    mtotal: 5e3,
    mdur: 5.6,
    price: 3e3,
    tier: 5,
    ic: "img/i/potb5.png",
  },
];
if (
  (J.potions.some((o) => o.kind === "both") || J.potions.push(...BOTH_POTS),
  J.shops && J.shops.med && !J.shops.med.items.some((o) => o.g === 1 && o.d === 2))
)
  for (const o of BOTH_POTS) J.shops.med.items.push({ g: 1, d: 2, k: 0, lvl: o.tier, price: o.price });
const potKey = (o) => o.kind + ":" + o.tier,
  potByKey = (o) => J.potions.find((n) => potKey(n) === o) || null,
  potOpen = (o) => S.lvl >= (POT_TIER_LV[o.tier] || 999),
  SLOT_KIND = ["life", "mana"];
function potSlots() {
  return (Array.isArray(S.potSlot) || (S.potSlot = ["auto", "auto"]), S.potSlot);
}
const slotPot = (o) => {
  const n = potSlots()[o];
  return n && n !== "auto" ? potByKey(n) : null;
};
function slotPick(o) {
  const n = SLOT_KIND[o],
    i = slotPot(o);
  if (i) {
    const t = potStock(i.kind);
    if ((t[i.tier] || 0) > 0) return (t[i.tier]--, { p: i, free: !0 });
    if (potOpen(i) && potPrice(i) <= S.gold) return { p: i, free: !1 };
  }
  const s = takeStock(n),
    r = s || bestPotion(n);
  return r ? { p: r, free: !!s } : null;
}
function slotShow(o) {
  const n = slotPot(o),
    i = SLOT_KIND[o];
  if (n) return { ic: n.ic, n: potStock(n.kind)[n.tier] || 0, name: n.n };
  const s = potStock(i),
    r = Math.max(
      0,
      ...Object.keys(s)
        .filter((e) => s[e] > 0)
        .map(Number),
    ),
    t =
      (r && J.potions.find((e) => e.kind === i && e.tier === r)) ||
      bestPotion(i) ||
      J.potions.find((e) => e.kind === i);
  return { ic: t ? t.ic : "", n: stockCount(i), name: "Tự động: " + (t ? t.n : "") };
}
function potSlotModal(o) {
  const n = SLOT_KIND[o],
    i = potSlots()[o],
    s = J.potions
      .filter((t) => t.kind === n || t.kind === "both")
      .sort((t, e) => (t.kind === "both") - (e.kind === "both") || t.tier - e.tier),
    r = (t) => {
      const e = potOpen(t),
        c = potStock(t.kind)[t.tier] || 0;
      return `<button class="shoprow${e ? "" : " bad"}${i === potKey(t) ? " own" : ""}" data-pk="${potKey(t)}" ${e ? "" : "disabled"}><img src="${esc(t.ic)}" alt=""><span><b>${esc(t.n)}</b><small>Hồi ${fmt(t.total)} ${t.kind === "mana" ? "nội lực" : "sinh lực"}${t.kind === "both" ? ` + ${fmt(t.mtotal)} nội lực` : ""} · ${e ? `${fmtL(potPrice(t))} lượng / bình · trong túi ${c}` : `cần cấp ${POT_TIER_LV[t.tier]}`}</small></span></button>`;
    };
  modal(
    `<h3>Ô ${o + 1}: chọn thuốc</h3>
    <div class="shoplist"><button class="shoprow${i === "auto" ? " own" : ""}" data-pk="auto"><span><b>Tự động</b><small>Thuốc ${n === "life" ? "sinh lực" : "nội lực"} tốt nhất mua được</small></span></button>${s.map(r).join("")}</div>`,
    () => {
      document.querySelectorAll("#mBody [data-pk]").forEach(
        (t) =>
          (t.onclick = () => {
            ((potSlots()[o] = t.dataset.pk),
              (R.dirty = !0),
              save(),
              closeModal(!0),
              typeof curTab < "u" && curTab === "more" && refresh(),
              toast(`Ô ${o + 1}: ${t.dataset.pk === "auto" ? "Tự động" : potByKey(t.dataset.pk).n}`));
            const e = o ? $("#bMp") : $("#bHp");
            e && (e._k = "");
          }),
      );
    },
  );
}
