"use strict";
function renderForge() {
  const n = forgeReadyCounts(),
    e = Object.keys(mats().ore).reduce((t, s) => t + matHave("ore", s), 0),
    o = Object.keys(mats().ht).reduce((t, s) => t + matHave("ht", s), 0),
    a = S.inv.concat(epBox(), Object.values(S.eq)).filter((t) => t && typeof isPhoi == "function" && isPhoi(t)).length,
    c = Object.keys(mats().shard).filter((t) => SHARDS[t] && matHave("shard", t) >= SHARDS[t]).length,
    d = Object.values(S.eq)
      .filter((t) => t && canPlatBase(t))
      .concat(S.inv.filter(canPlatBase))
      .filter((t) => !platReady(t)).length,
    l = SLOTS.map(([t]) => S.eq[t]).filter(Boolean);
  (($("#t-forge").innerHTML = `
    <div class="card fcard"><div class="fic"><img src="img/ep/ht.png" alt=""></div><div><b>💎 Lò Ép Đồ</b> <small class="dim">tinh luyện Huyền Tinh · lấy thuộc tính · chế tạo phôi · khảm nạm đồ Tím</small>
      ${
        verVio()
          ? `<div class="small">Huyền Tinh <b>${o}</b> · đá thuộc tính <b>${e}</b> · phôi <b>${a}</b> · Kho Rèn <b>${epBox().length}</b>/${EP_BOX_MAX}${n.ench ? ' · <span class="cp">có thể khảm</span>' : ""}${n.up ? ' · <span class="cp">thăng cấp được</span>' : ""}</div>
      <div class="btnrow"><button class="btn sm" data-ep="kham">Khảm nạm</button><button class="btn sm" data-ep="hut">Lấy thuộc tính</button><button class="btn sm" data-ep="phoi">Chế phôi</button><button class="btn sm" data-ep="tl">Tinh luyện</button><button class="btn sm" data-ep="box">Kho Rèn</button></div>`
          : ""
      }</div></div>
    <div class="card fcard"><div class="fic"><img src="img/ep/mys.png" alt=""></div><div><b>🔥 Lò Hoàng Kim</b> <small class="dim">ghép mảnh Hoàng Kim (Bộ chung · Môn phái)</small>
      <div class="small">Mảnh đủ ghép <b>${c}</b> · Thủy Tinh Trắng ${matHave("misc", "wc")} · Thần Bí Khoáng Thạch ${matHave("misc", "mys")}</div>
      <div class="btnrow"><button class="btn" id="fgHt">Mở Lò Hoàng Kim</button></div></div></div>
    <div class="card"><b>⚒ Cường hóa</b> <small class="dim">+1…+${ENH_MAX}, mỗi cấp +${Math.round(ENH_STEP * 100)}% thuộc tính gốc, +${Math.round(ENH_LINE_STEP * 100)}% các dòng thuộc tính · chạm món đang mặc để rèn riêng (cường hóa, tẩy luyện)</small>
      <div class="invgrid">${l.map((t) => itemCell(t).replace("</button>", `${t.enh ? `<em class="fenh">+${t.enh}</em>` : ""}</button>`)).join("")}</div></div>
    <div class="card"><label><input type="checkbox" id="fgFuse" ${S.autoFuse === !1 ? "" : "checked"}> 💎 Tự hợp Huyền Tinh từ nhẫn / dây chuyền / ngọc bội thừa (3 món → 1 Huyền Tinh, ${fmtL(fuseCost())} lượng; mỗi 30 giây)</label>
      <div class="dim small">Trang sức thừa có ${fusePool().length} món. Không dùng đồ đang mặc, đồ khóa 🔒, đồ tốt hơn đồ đang mặc.</div>
      <label><input type="checkbox" id="fgAuto" ${S.autoForge ? "checked" : ""}> Tự động rèn đồ (ghép mảnh Hoàng Kim, khảm Tím, thăng cấp Huyền Tinh; mỗi 30 giây)</label></div>`),
    document.querySelectorAll("#t-forge [data-ep]").forEach((t) => (t.onclick = () => epModal(t.dataset.ep))),
    ($("#fgHt").onclick = () => htModal()),
    ($("#fgFuse").onchange = (t) => {
      ((S.autoFuse = t.target.checked), S.autoFuse && (autoFuse(), renderForge()), save());
    }),
    ($("#fgAuto").onchange = (t) => {
      ((S.autoForge = t.target.checked), S.autoForge && autoForge(), save());
    }),
    document.querySelectorAll("#t-forge .invgrid [data-uid]").forEach(
      (t) =>
        (t.onclick = () => {
          const s = Object.values(S.eq).find((i) => i && i.uid === +t.dataset.uid);
          s && forgeModal(s);
        }),
    ));
}
let questTab = "dt";
function openQuest(n) {
  S.fac && (n && (questTab = n), closeModal(!0), showTab("quest"));
}
function renderQuest() {
  const n = [
    ["dt", "📜 Dã Tẩu"],
    ["boat", `⛵ Đi thuyền${boatOn() ? " ●" : ""}`],
    ["st", "🗡 Sát Thủ"],
    ["act", "Hoạt động"],
  ];
  let e = "";
  (questTab === "dt"
    ? (e = dtBody())
    : questTab === "st"
      ? (e = stBody())
      : questTab === "boat"
        ? (e = boatBody())
        : (e = `<div class="card"><div class="btnrow">${[
            ["dg", "Phó bản"],
            ["tower", "Tháp thử thách"],
            ["wb", "Boss tuần"],
            ["horse", "Mã trường"],
            ["pet", "Đồ đệ"],
            ["rec", "Kỷ lục"],
          ]
            .map(([a, c]) => `<button class="btn" data-act="${a}">${c}</button>`)
            .join("")}</div>
      <div class="btnrow"><button class="btn" id="qGift">🎁 Phần thưởng: điểm danh · mốc cấp · Phúc Duyên · sự kiện · thành tựu</button></div></div>`),
    ($("#t-quest").innerHTML =
      `<div class="dtabs">${n.map(([a, c]) => `<button data-qt="${a}" class="${questTab === a ? "on" : ""}">${c}</button>`).join("")}</div>${e}`),
    document.querySelectorAll("#t-quest [data-qt]").forEach(
      (a) =>
        (a.onclick = () => {
          ((questTab = a.dataset.qt), renderQuest());
        }),
    ),
    questTab === "dt" && bindDt(),
    questTab === "boat" && bindBoat($("#t-quest")),
    questTab === "st" &&
      document.querySelectorAll("#t-quest [data-st]").forEach(
        (a) =>
          (a.onclick = () => {
            (stStart(+a.dataset.st), renderQuest());
          }),
      ),
    document.querySelectorAll("#t-quest [data-act]").forEach((a) => (a.onclick = () => actModal(a.dataset.act))));
  const o = $("#qGift");
  o && (o.onclick = () => giftModal(!0));
}
const questDot = () =>
    !!S.fac && !isNovice() && typeof DT == "function" && DT().task && dtReady(DT().task) && !DT().auto,
  forgeDot = () => {
    if (!S.fac) return !1;
    const n = forgeReadyCounts();
    return !S.autoForge && n.shard + n.ench + n.up > 0;
  };
