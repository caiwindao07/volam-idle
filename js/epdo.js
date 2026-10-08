"use strict";
const EP_BOX_MAX = 120;
let EP = { tab: "kham", sel: 0, ht: 0, fuse: [] };
const epOreOpen = () => EP.oreOpen || (EP.oreOpen = []),
  oreIc = (t) => `img/ep/da${(t | 0) + 1}.png`,
  oreName = (t) => (oreRows(t)[0] || {}).n || attrName(t),
  isPhoi = (t) => !!t && !t.set && t.d >= 0 && t.d <= 9 && !!t.vio && (t.mag || []).length < vioSlots(t),
  isHutSrc = (t) => !!t && !t.set && !t.vio && !t.thanma && t.d >= 0 && t.d <= 9 && (t.mag || []).length > 0,
  isFuseSrc = (t) =>
    !!t &&
    FUSE_SLOTS.includes(t.d) &&
    !t.set &&
    !t.vio &&
    !t.lock &&
    !Object.values(S.eq).includes(t) &&
    !(typeof betterThanEquipped == "function" && S.inv.includes(t) && betterThanEquipped(t)),
  boxIn = (t) => !t.lock && !dtNeed(t) && (isPhoi(t) || isFuseSrc(t) || (isPhoiSrc(t) && (t.r === 0 || !lootMatch(t)))),
  isPhoiSrc = (t) => !!t && !t.set && !t.vio && !t.thanma && VIO_D.includes(t.d) && (t.r || 0) <= 2,
  epPool = (t) => S.inv.concat(epBox()).filter(t),
  epFind = (t) => S.inv.concat(epBox(), Object.values(S.eq)).find((s) => s && s.uid === t),
  htList = () =>
    Object.keys(mats().ht)
      .map(Number)
      .filter((t) => matHave("ht", t) > 0)
      .sort((t, s) => t - s);
function stoneCell(t) {
  const s = oreParse(t),
    c = s.lvl < ORE_MAX ? ` · chạm: 3 viên → c${s.lvl + 1} (${pct(upRate(s.lvl))}, ${fmtL(EP_COST.up)} lượng)` : "";
  return `<button class="it ep-st" data-st="${t}" title="${esc(oreStoneName(t) + " · " + oreName(s.a) + " · cấp " + s.lvl + c)}"><img src="${oreIc(s.place)}" alt=""><i>c${s.lvl}</i><em class="ep-pl"${s.s >= 0 ? ` style="color:${SERIES_COL[s.s]}"` : ""}>${s.place + 1}</em><b class="ep-n">×${matHave("ore", t)}</b></button>`;
}
function epHtFix() {
  const t = htList();
  t.includes(EP.ht) || (EP.ht = t[t.length - 1] || 0);
}
function htRow(t) {
  const s = htList();
  return (
    t && epHtFix(),
    `<div class="ep-ht">${s.map((c) => (t ? `<button class="ep-htc${EP.ht === c ? " ep-on" : ""}" data-ht="${c}" title="Huyền Tinh Khoáng Thạch cấp ${c} · giá trị ${fmtL(IV_ORE[c])}"><img src="img/ep/ht.png" alt=""><i>c${c}</i><b>×${matHave("ht", c)}</b></button>` : `<span class="ep-htc" title="Huyền Tinh Khoáng Thạch cấp ${c}"><img src="img/ep/ht.png" alt=""><i>c${c}</i><b>×${matHave("ht", c)}</b></span>`)).join("") || '<small class="dim">Chưa có Huyền Tinh (hạ tinh anh / trùm, Dã Tẩu, hoặc luyện ở thẻ Tinh luyện)</small>'}</div>`
  );
}
function auxRow() {
  const t = (s, c) => {
    const h = Math.min(9, auxCap(s));
    return `<label class="small" style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;white-space:nowrap">${c} <select data-aux="${s}" style="width:auto;min-width:44px;display:inline-block" ${EP_AUX.on && h ? "" : "disabled"}>${Array.from({ length: h + 1 }, (d, i) => `<option value="${i}" ${(EP_AUX[s] | 0) === i ? "selected" : ""}>${i}</option>`).join("")}</select> <span class="dim">/ ${auxCap(s)}</span></label>`;
  };
  return `<div class="small" style="margin:4px 0"><label><input type="checkbox" id="epAux" ${EP_AUX.on ? "checked" : ""} ${auxHave() ? "" : "disabled"}> Phụ liệu</label> <span class="dim">(cộng giá trị: Thủy Tinh ${fmtL(AUX_VAL.wc)} · Thần Bí K.T ${fmtL(AUX_VAL.mys)} · Phúc Duyên Lộ = ${AUX_FD} Phúc Duyên ${fmtL(AUX_VAL.fd)}; giảm dần khi vượt giá trị nguyên liệu chính)</span><br>
    ${t("wc", "Thủy Tinh")}${t("mys", "Thần Bí K.T")}${t("fd", "Phúc Duyên Lộ")}</div>`;
}
function epTabs() {
  return `<div class="dtabs">${[
    ["tl", "Tinh luyện"],
    ["hut", "Lấy thuộc tính"],
    ["phoi", "Chế tạo phôi"],
    ["kham", "Khảm nạm"],
    ["box", `Kho Rèn (${epBox().length})`],
  ]
    .map(([s, c]) => `<button data-et="${s}" class="${EP.tab === s ? "on" : ""}">${c}</button>`)
    .join("")}</div>`;
}
function itemMini(t) {
  return `<div class="idet"><div class="pic r${t.r}">${t.ic ? `<img src="${esc(t.ic)}" alt="">` : ""}</div><div><h4 style="color:${RAR_COL[t.r]}">${esc(t.n)}${t.vio ? ` <small class="vtag">Tím ${t.mag.length}/${vioSlots(t)}</small>` : ""}</h4><small class="dim">${esc(J.items[t.d].n)} · cấp ${t.lvl}${t.s >= 0 ? ` · <span style="color:${SERIES_COL[t.s]}">hệ ${SERIES[t.s]}</span>` : ""}${epBox().includes(t) ? " · trong Kho Rèn" : Object.values(S.eq).includes(t) ? " · đang mặc" : ""}</small></div></div>`;
}
const lineTxt = (t) =>
    esc(
      attrText(
        attrName(t.a),
        t.p.map((s) => (s === -1 ? 0 : s)),
      ),
    ),
  pickGrid = (t, s) =>
    `<div class="invgrid ep-grid">${t.map((c) => itemCell(c).replace('class="it', `class="it${s === c ? " ep-on" : ""}`)).join("")}</div>`,
  failTxt = (t) => (t >= 5e-4 ? ` · <span class="bad">thất bại ${pct(t)}</span>` : "");
function epTabTl() {
  const t = epPool(canFuse),
    s = Object.keys(mats().ht)
      .map(Number)
      .sort((e, o) => e - o);
  EP.fuse = EP.fuse.filter((e) => t.some((o) => o.uid === e));
  const c = t.filter((e) => EP.fuse.includes(e.uid)),
    d = (c.length === 3 ? fuseErr(c) : "x") ? null : fusePlan(c),
    i = FUSE_SLOTS.filter((e) => !c.some((o) => o.d === e)).map((e) => FUSE_NAMES[e]);
  return `<div class="card"><b>Luyện Huyền Tinh Khoáng Thạch</b> <small class="dim">1 nhẫn + 1 dây chuyền + 1 ngọc bội thường + ${fmtL(fuseCost())} lượng → Huyền Tinh cấp theo giá trị (số dòng mỗi món: 0 dòng ${fmtL(IV_NORM_MAGIC[0])} … 6 dòng ${fmtL(IV_NORM_MAGIC[6])}; c1 ${fmtL(IV_ORE[1])}, c2 ${fmtL(IV_ORE[2])}, c3 ${fmtL(IV_ORE[3])}, c4 ${fmtL(IV_ORE[4])}, c5 ${fmtL(IV_ORE[5])})</small>
      <div class="invgrid ep-grid" id="epFuseG">${t.map((e) => itemCell(e).replace('class="it', `class="it${EP.fuse.includes(e.uid) ? " ep-on" : ""}`)).join("")}</div>${t.length ? "" : '<small class="dim">Không có nhẫn / dây chuyền / ngọc bội chưa mặc, chưa khóa</small>'}
      <div class="small">${d ? `Giá trị ${fmtL(d.src)} → ${distTxt(d.probs, (e) => "c" + (e + 1))}${failTxt(1 - d.sum)}` : `<span class="dim">Chọn thêm: ${i.join(", ") || "—"}</span>`}</div>
      <div class="btnrow"><button class="btn" id="epFuse" ${d && S.gold >= fuseCost() ? "" : "disabled"}>Luyện (${c.length}/3)</button><button class="btn" id="epFuseAuto" ${fusePick(fusePool()).length === 3 && S.gold >= fuseCost() ? "" : "disabled"}>Tự chọn 3 món thừa</button></div></div>
    <div class="card"><b>Thăng cấp Huyền Tinh</b> <small class="dim">3 viên cùng cấp + ${fmtL(EP_COST.up)} lượng → 1 viên cấp +1 · thất bại mất 1 viên</small>
      ${s.map((e) => `<div class="ep-row"><span class="ep-htc"><img src="img/ep/ht.png" alt=""><i>c${e}</i><b>×${matHave("ht", e)}</b></span><button class="btn sm" data-up="${e}" ${matHave("ht", e) >= 3 && e < HT_MAX && S.gold >= EP_COST.up ? "" : "disabled"}>${e < HT_MAX ? `Thăng lên cấp ${e + 1} · ${pct(upRate(e))}` : "Tối đa"}</button></div>`).join("") || '<small class="dim">Chưa có Huyền Tinh</small>'}</div>
    <div class="card"><b>Thăng cấp đá thuộc tính</b> <small class="dim">ở thẻ Kho Rèn: chạm viên đá (3 viên cùng loại, cùng cấp + ${fmtL(EP_COST.up)} → +1 cấp; ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((e) => `c${e}→${e + 1} ${pct(upRate(e))}`).join(", ")}; thất bại mất 1 viên)</small></div>`;
}
function ahCard() {
  const t = AH(),
    s = (c, h, d, i = (e) => e) =>
      `<select id="${c}">${h.map((e) => `<option value="${e}" ${d === e ? "selected" : ""}>${i(e)}</option>`).join("")}</select>`;
  return `<div class="card"><label><input type="checkbox" id="ahOn" ${t.on ? "checked" : ""}> <b>⚗ Tự rút thông minh</b></label> <button class="btn sm" id="ahNow" ${t.on ? "" : "disabled"}>Rút ngay</button>
    <div class="row small">Dòng từ cấp ${s("ahLv", [1, 2, 3, 4, 5, 6, 7], t.minLv)} · Huyền Tinh tối đa c${s("ahHt", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], t.htMax)} · tối đa ${s("ahCap", [1, 2, 3, 5, 10], t.cap)} viên / loại · giữ ${s("ahRes", [0, 1e4, 5e4, 2e5, 1e6], t.reserve, fmt)} lượng</div>
    <div class="dim small">Rút đồ xanh không được bộ lọc giữ: ưu tiên dòng phôi Tím đang cần, rồi dòng cấp cao. Không dùng phụ liệu. Không đụng đồ khóa / bộ / Tím / đang mặc / nâng cấp (▲ △).</div></div>`;
}
function epTabHut() {
  const t = epPool(isHutSrc).sort((o, n) => n.r - o.r || n.lvl - o.lvl);
  let s = epFind(EP.sel);
  if (((!s || !t.includes(s)) && (s = t[0]), !s))
    return ahCard() + '<p class="dim">Không có đồ xanh trong hành trang hoặc Kho Rèn.</p>';
  EP.sel = s.uid;
  const c = EP.ht,
    h = auxSel(),
    d = hutCost(s),
    i = s.lock ? "Món đang khóa 🔒 — mở khóa ở chi tiết món" : c ? "" : "Cần Huyền Tinh",
    e = s.mag
      .map((o, n) => {
        const l = hutOk(s, n),
          a = l && c ? hutPlan(s, n, c, h) : null,
          p = Math.min(n, VIO_SLOTS - 1);
        return `<div class="ep-opt">${l ? `<span class="it ep-st"><img src="${oreIc(p)}" alt=""><i>c${hutLevel(o)}</i></span>` : '<span class="it ep-st"></span>'}<span class="${n % 2 ? "h" : "m"}">${lineTxt(o)}<br><small class="dim">${l ? `dòng cấp ${hutLevel(o)} (${fmtL(MAL[lineMal(o)].base)}) → ${ORE_NAMES[p]}${p % 2 ? ` hệ ${SERIES[s.s] || "—"}` : ""}${a ? `: ${distTxt(a.probs, (r) => "c" + (r + 1))}${failTxt(1 - a.sum)}` : ""}` : "không lấy được"}</small></span>
      <span></span><span class="btnrow">${l && !i ? `<button class="btn sm" data-hut="${n}:${p}" ${S.gold >= d ? "" : "disabled"} title="${esc(ORE_NAMES[p])}">Lấy</button>` : ""}</span></div>`;
      })
      .join("");
  return (
    ahCard() +
    `<div class="card">${itemMini(s)}<small class="dim">Lấy 1 dòng → 1 viên đá đúng vị trí dòng (dòng ẩn: đá mang hệ ${SERIES[s.s] || "—"}) · món mất · ${fmtL(d)} lượng + 1 Huyền Tinh · cấp đá theo giá trị dòng + Huyền Tinh${auxN(h) ? " + phụ liệu" : ""}</small>
      <div class="dim small">Chọn Huyền Tinh (cấp cao: đá cấp cao hơn):</div>${htRow(!0)}${auxRow()}${i ? `<div class="cn small">${i}</div>` : ""}${e}</div>
    <h3>Đồ có thể lấy thuộc tính <small>${t.length} món</small></h3>${pickGrid(t, s)}`
  );
}
function epTabPhoi() {
  const t = epPool(isPhoiSrc).sort((e, o) => o.lvl - e.lvl || e.r - o.r);
  let s = epFind(EP.sel);
  (!s || !t.includes(s)) && (s = t[0]);
  const c = (e) => {
      const o = PHOI_ODDS(e);
      return o.length ? `${o[0][0]} dòng · ${o[0][1]}%` : "thất bại";
    },
    h = (e) => {
      const o = phoiPlan(e);
      return (distTxt(o.probs, (n) => `${n + 1} dòng`) || "") + failTxt(1 - o.sum);
    },
    d = `<p class="desc">Trang bị trắng / xanh (không gồm trang sức) + 1 Huyền Tinh + ${fmtL(EP_COST.phoi)} lượng → phôi Tím 1–5 khung (trang bị thường không tính giá trị; Huyền Tinh c1 không đủ → thất bại, mất cả trang bị).</p>
    <div class="chips">${[1, 2, 3, 4, 5].map((e) => `<span class="chip2${EP.ht && Math.min(EP.ht, 5) === e ? " on" : ""}"><span class="dim">c${e}${e === 5 ? "+" : ""}</span>&nbsp;<b>${c(e)}</b></span>`).join("")}</div>`;
  if (!s) return d + '<p class="dim">Không có đồ trắng / xanh phù hợp.</p>';
  EP.sel = s.uid;
  const i = s.lock
    ? "Món đang khóa 🔒"
    : EP.ht
      ? S.gold < EP_COST.phoi
        ? "Không đủ ngân lượng"
        : ""
      : "Cần Huyền Tinh";
  return `${d}<div class="card">${itemMini(s)}${htRow(!0)}${EP.ht ? `<div class="small">Huyền Tinh c${EP.ht}: ${h(EP.ht)}</div>` : ""}
      <div class="btnrow"><button class="btn" id="epPhoi" ${i ? "disabled" : ""}>Chế tạo phôi${EP.ht ? ` · c${EP.ht} → ${c(EP.ht)}` : ""}</button></div>${i ? `<div class="cn small">${i}</div>` : ""}</div>
    <h3>Chọn trang bị <small>${t.length} món</small></h3>${pickGrid(t, s)}`;
}
function epTabKham() {
  const t = epPool(isPhoi)
    .concat(Object.values(S.eq).filter(isPhoi))
    .sort((n, l) => (l.mag || []).length - (n.mag || []).length || l.lvl - n.lvl);
  let s = epFind(EP.sel);
  (!s || !s.vio) && (s = t[0]);
  const c =
    pickGrid(t, s) +
    (t.length ? "" : '<p class="dim small">Chưa có phôi Huyền Tinh: sang thẻ <b>Chế tạo phôi</b>.</p>');
  if (!s) return `<h3>Chọn phôi</h3>${c}`;
  ((EP.sel = s.uid), epHtFix());
  const h = (s.mag || []).length,
    d = vioSlots(s),
    i = EP.ht ? vioOptions(s, EP.ht) : [],
    e = Array.from({ length: d }, (n, l) => {
      const a = `<b class="ep-no">${l + 1}</b><small class="dim">${l % 2 ? "ẩn" : "hiện"}</small>`;
      if (l < h) {
        const p = s.mag[l];
        return `<div class="ep-slot done">${a}<img src="${oreIc(l)}" alt=""><span class="vio">${lineTxt(p)}</span><small class="dim">${lineLevel(p) ? "c" + lineLevel(p) : ""}</small></div>`;
      }
      return l === h
        ? `<div class="ep-slot next">${a}<span class="cp">◀ cần ${esc(ORE_NAMES[l] || "đá")}${l % 2 ? ` hệ ${SERIES[s.s]}` : ""}</span></div>`
        : `<div class="ep-slot">${a}<span class="dim">${esc(ORE_NAMES[l] || "đá")} · trống</span></div>`;
    }).join(""),
    o = i.length
      ? i
          .map(
            (n, l) =>
              `<div class="ep-opt">${stoneCell(n.key)}<span><b>${esc(n.txt)}</b><br><small class="dim">${esc(oreStoneName(n.key))} c${oreParse(n.key).lvl} + Huyền Tinh c${n.ht} → ${distTxt(n.probs, (a) => "c" + MAL[n.js[a]].lvl)}${failTxt(n.fail)}</small></span><small class="${n.gain > 5e-4 ? "cp" : "dim"}">${pctTxt(n.gain)}</small><button class="btn sm" data-ep="${l}">Khảm</button></div>`,
          )
          .join("")
      : `<p class="dim small">Không có ${esc(ORE_NAMES[Math.min(h, VIO_SLOTS - 1)])} hợp món này (đúng vị trí dòng ${h + 1}, thuộc tính gắn được vào ${esc(J.items[s.d].n)}, hợp hệ ${SERIES[s.s] || "—"}, chưa trùng thuộc tính đã có), thiếu Huyền Tinh hoặc ngân lượng. Lấy thuộc tính từ đồ xanh để có đá.</p>`;
  return `<div class="card ep-main">${itemMini(s)}<div class="ep-slots">${e}</div>
      <div class="dim small">Huyền Tinh dùng khi khảm (cấp cao: dòng cấp cao hơn, ít thất bại hơn):</div>${htRow(!0)}${auxRow()}
      <div class="btnrow">${h ? "" : `<button class="btn red" id="epSell" ${vioSellOk(s) ? "" : "disabled"}>Bán (+${fmtL(itemValue(s))} lượng)</button>`}</div>
      <div class="dim small">Mỗi lần khảm: 1 đá đúng dòng + 1 Huyền Tinh + ${fmtL(EP_COST.kham)} lượng · giá trị phôi ${fmtL(Math.round(itemVioVal(s)))} + Huyền Tinh + đá (+ phụ liệu) → cấp dòng · thất bại mất đá, Huyền Tinh, phụ liệu (giữ phôi) · khảm lần lượt từng dòng.</div></div>
    <h3>Đá cho dòng ${Math.min(h + 1, d)}</h3>${h < d ? o : '<p class="dim">Đã đủ dòng</p>'}
    <h3>Chọn phôi <small>${t.length} món</small></h3>${c}`;
}
function epTabBox() {
  const t = Object.keys(mats().ore).sort(
      (i, e) => oreParse(i).place - oreParse(e).place || oreParse(e).lvl - oreParse(i).lvl,
    ),
    s = Array.from({ length: VIO_SLOTS }, (i, e) => t.filter((o) => oreParse(o).place === e)),
    c = epBox(),
    h = S.inv.filter(boxIn),
    d = c.filter((i) => FUSE_SLOTS.includes(i.d)).length;
  return `<div class="card"><b>Đá thuộc tính</b> <small class="dim">${t.reduce((i, e) => i + matHave("ore", e), 0)} viên · chạm đá để thăng cấp (3 viên cùng loại → +1 cấp, ${fmtL(EP_COST.up)} lượng, thất bại mất 1 viên) · số màu = hệ của đá dòng ẩn</small>
      <button class="btn sm" id="epOreAll" style="margin-left:6px">${epOreOpen().length ? "Ẩn tất cả" : "Hiện tất cả"}</button>
      ${s
        .map((i, e) => {
          const o = epOreOpen().includes(e),
            n = i.reduce((a, p) => a + matHave("ore", p), 0),
            l = i.length ? Math.max(...i.map((a) => oreParse(a).lvl)) : 0;
          return `<div class="ep-row"><button class="ep-no ep-otg" data-otg="${e}" style="min-width:150px">${o ? "▾" : "▸"} ${e + 1}. ${esc(ORE_NAMES[e])}<br><small class="dim">${n} viên${l ? " · cao nhất c" + l : ""}</small></button><div class="ep-stones${o ? "" : " ep-hide"}">${i.map((a) => stoneCell(a)).join("") || '<small class="dim">—</small>'}</div></div>`;
        })
        .join("")}</div>
    <div class="card"><b>Huyền Tinh</b>${htRow(!1)}<div class="ep-ht"><span class="ep-htc" title="Thủy Tinh"><img src="img/ep/wc.png" alt=""><b>×${matHave("misc", "wc")}</b></span><span class="ep-htc" title="Phúc Duyên"><img src="img/ep/fd.png" alt=""><b>${RW().fd || 0}</b></span><span class="ep-htc" title="Thần Bí Khoáng Thạch"><img src="img/ep/mys.png" alt=""><b>×${matHave("misc", "mys")}</b></span></div><small class="dim">Phụ liệu (Lấy thuộc tính / Khảm nạm): Thủy Tinh · Phúc Duyên (${AUX_FD} điểm = 1 Phúc Duyên Lộ) · Thần Bí Khoáng Thạch</small></div>
    <div class="card"><b>Phôi · đồ lấy thuộc tính · trang sức luyện Huyền Tinh</b> <small class="dim">${c.length}/120 · không chiếm hành trang · chạm món để lấy ra</small>
      <div class="btnrow"><button class="btn sm" id="epIn" ${h.length && c.length < 120 ? "" : "disabled"}>Cất ${h.length} món từ hành trang</button><button class="btn sm" id="epOutAll" ${c.length ? "" : "disabled"}>Lấy hết ra</button></div>
      <div class="dim small">Cất: phôi Huyền Tinh chưa đủ dòng · nhẫn / dây chuyền / ngọc bội không tốt hơn đồ đang mặc (${d} trong rương, dùng ở thẻ Tinh luyện) · đồ trắng · đồ xanh không khớp bộ lọc. Món khóa 🔒 không cất.</div>
      <div class="invgrid ep-grid" id="epBoxG">${c.map(itemCell).join("")}</div>
      <div class="btnrow"><button class="btn sm" id="epToStash" ${c.length ? "" : "disabled"}>Gửi hết sang Kho chung</button><button class="btn sm" id="epDon">🧹 Dọn kho</button><button class="btn sm" id="epLootCfg">⚙ Nhặt đồ để ép (bộ lọc)</button></div>
      <div class="dim small">Tự nhặt đồ để ép: ${(() => {
        const i = lootFilter().ep;
        return (
          [
            i.white && "đồ trắng",
            i.jew && "nhẫn / dây chuyền / ngọc bội",
            i.blue && `đồ xanh có dòng cấp ≥ ${i.blueLv}`,
          ]
            .filter(Boolean)
            .join(", ") || "tắt"
        );
      })()} → ${{ box: "Kho Rèn", stash: "Kho chung", inv: "Hành trang" }[lootFilter().ep.dest]}</div></div>`;
}
function epModal(t, s) {
  if (
    ($("#modal").classList.contains("hidden") && (EP.oreOpen = []),
    t && (EP.tab = t),
    ["tl", "hut", "phoi", "kham", "box"].includes(EP.tab) || (EP.tab = "kham"),
    s && (EP.sel = s),
    epHtFix(),
    !verVio())
  )
    return modal('<h3>Lò Ép Đồ</h3><p class="desc">Chưa mở.</p>');
  const c = { tl: epTabTl, hut: epTabHut, phoi: epTabPhoi, kham: epTabKham, box: epTabBox },
    h = (c[EP.tab] || epTabKham)();
  modal(`<h3>Lò Ép Đồ · Thợ Rèn <small>${fmtL(S.gold)} lượng</small></h3>${epTabs()}${h}`, () => {
    (document.querySelectorAll("#mBody [data-et]").forEach((n) => (n.onclick = () => epModal(n.dataset.et))),
      document.querySelectorAll("#mBody [data-ht]").forEach(
        (n) =>
          (n.onclick = () => {
            ((EP.ht = +n.dataset.ht), epModal());
          }),
      ));
    const d = $("#epAux");
    (d &&
      (d.onchange = (n) => {
        ((EP_AUX.on = n.target.checked), epModal());
      }),
      document.querySelectorAll("#mBody [data-aux]").forEach(
        (n) =>
          (n.onchange = () => {
            ((EP_AUX[n.dataset.aux] = +n.value), epModal());
          }),
      ),
      document.querySelectorAll("#mBody .ep-grid [data-uid]").forEach((n) => {
        EP.tab !== "box" && EP.tab !== "tl" && (n.onclick = () => epModal(EP.tab, +n.dataset.uid));
      }));
    const i = () => epModal(),
      e = (n) => {
        (toast(n.msg), uiSfx(n.ok ? "learn" : "use"), log(esc(n.msg)), (R.dirty = !0), (invDirty = !0), save(), i());
      },
      o = epFind(EP.sel);
    if (EP.tab === "tl")
      (($("#epFuseAuto").onclick = () => {
        ((EP.fuse = fusePick(fusePool()).map((n) => n.uid)), i());
      }),
        document.querySelectorAll("#mBody #epFuseG [data-uid]").forEach(
          (n) =>
            (n.onclick = () => {
              const l = +n.dataset.uid,
                a = EP.fuse.indexOf(l),
                p = epFind(l);
              (a >= 0
                ? EP.fuse.splice(a, 1)
                : p &&
                  ((EP.fuse = EP.fuse.filter((r) => {
                    const u = epFind(r);
                    return u && u.d !== p.d;
                  })),
                  EP.fuse.push(l)),
                i());
            }),
        ),
        ($("#epFuse").onclick = () => {
          const n = EP.fuse.map((l) => epFind(l)).filter(Boolean);
          ((EP.fuse = []), e(fuse(n)));
        }),
        document.querySelectorAll("#mBody [data-up]").forEach((n) => (n.onclick = () => e(upgradeHT(+n.dataset.up)))));
    else if (EP.tab === "kham") {
      const n = o ? vioOptions(o, EP.ht) : [];
      document.querySelectorAll("#mBody [data-ep]").forEach(
        (r) =>
          (r.onclick = () => {
            const u = n[+r.dataset.ep];
            u && e(enchase(o, u.ht, u.key));
          }),
      );
      const l = $("#epAll");
      l && (l.onclick = () => e(vioFillAll(o)));
      const a = $("#epTake");
      a && (a.onclick = () => e(vioTake(o)));
      const p = $("#epSell");
      p &&
        (p.onclick = () => {
          const r = vioSell(o);
          (r.ok && (EP.sel = 0), e(r));
        });
    } else if (EP.tab === "hut") {
      const n = AH(),
        l = () => {
          (save(), i());
        };
      (($("#ahOn").onchange = (a) => {
        ((n.on = a.target.checked), l());
      }),
        ($("#ahLv").onchange = (a) => {
          ((n.minLv = +a.target.value), l());
        }),
        ($("#ahHt").onchange = (a) => {
          ((n.htMax = +a.target.value), l());
        }),
        ($("#ahCap").onchange = (a) => {
          ((n.cap = +a.target.value), l());
        }),
        ($("#ahRes").onchange = (a) => {
          ((n.reserve = +a.target.value), l());
        }),
        ($("#ahNow").onclick = () => {
          const a = autoHut(20);
          (toast(a ? `Tự rút ${a} món (xem nhật ký)` : "Không có món nào để rút"), i());
        }),
        document.querySelectorAll("#mBody [data-hut]").forEach(
          (a) =>
            (a.onclick = () => {
              const [p, r] = a.dataset.hut.split(":").map(Number);
              ((EP.sel = 0), e(hutPhoi(o, p, r, EP.ht)));
            }),
        ));
    } else if (EP.tab === "phoi") {
      const n = $("#epPhoi");
      n &&
        (n.onclick = () => {
          const l = makePhoi(o, EP.ht);
          (l.ok && (EP.tab = "kham"), e(l));
        });
    } else {
      (document.querySelectorAll("#mBody [data-st]").forEach((n) => (n.onclick = () => e(upgradeOre(n.dataset.st)))),
        document.querySelectorAll("#mBody [data-otg]").forEach(
          (n) =>
            (n.onclick = () => {
              const l = +n.dataset.otg,
                a = epOreOpen(),
                p = a.indexOf(l);
              p >= 0 ? a.splice(p, 1) : a.push(l);
              const r = p < 0;
              (n.nextElementSibling.classList.toggle("ep-hide", !r),
                (n.firstChild.textContent = (r ? "▾" : "▸") + n.firstChild.textContent.slice(1)));
              const u = $("#epOreAll");
              u && (u.textContent = a.length ? "Ẩn tất cả" : "Hiện tất cả");
            }),
        ));
      {
        const n = $("#epOreAll");
        n &&
          (n.onclick = () => {
            ((EP.oreOpen = epOreOpen().length ? [] : Array.from({ length: VIO_SLOTS }, (l, a) => a)), i());
          });
      }
      (document.querySelectorAll("#mBody #epBoxG [data-uid]").forEach(
        (n) =>
          (n.onclick = () => {
            const l = epBox().find((a) => a.uid === +n.dataset.uid);
            if (l) {
              if (S.inv.length >= INV_MAX) return toast("Hành trang đầy");
              (itemRemove(l), S.inv.push(l), (invDirty = !0), save(), i());
            }
          }),
      ),
        ($("#epIn").onclick = () => {
          let n = 0;
          for (const l of S.inv.filter(boxIn)) {
            if (epBox().length >= 120) break;
            (itemRemove(l), epBox().push(l), n++);
          }
          (toast(`Cất ${n} món vào Kho Rèn`), (invDirty = !0), save(), i());
        }),
        ($("#epOutAll").onclick = () => {
          let n = 0;
          for (; epBox().length && S.inv.length < INV_MAX;) (S.inv.push(epBox().shift()), n++);
          (toast(`Lấy ra ${n} món`), (invDirty = !0), save(), i());
        }),
        ($("#epLootCfg").onclick = () => {
          (closeModal(),
            showTab("inv"),
            setTimeout(() => {
              const n = $("#epLoot");
              n && n.scrollIntoView({ block: "center" });
            }, 50));
        }),
        ($("#epDon").onclick = () => donKhoModal()),
        ($("#epToStash").onclick = () => {
          let n = 0;
          for (const l of epBox().slice()) {
            if (S.inv.length >= INV_MAX) break;
            (itemRemove(l), S.inv.push(l));
            const a = stashDeposit(l);
            if (a && a.ok) n++;
            else {
              (itemRemove(l), epBox().push(l));
              break;
            }
          }
          (toast(`Gửi ${n} món sang Kho chung`), (invDirty = !0), save(), i());
        }));
    }
  });
}
let epStashQ = 0;
function epAutoStore(t) {
  const s = epWant(t);
  if (!s || (typeof dtNeed == "function" && dtNeed(t)) || (s === "blue" && lootMatch(t) && S.inv.length < INV_MAX))
    return !1;
  const c = lootFilter().ep.dest;
  if (c === "box" && epBox().length < 120) return (epBox().push(t), !0);
  if (c === "stash" && typeof stashDeposit == "function" && S.inv.length < INV_MAX) {
    S.inv.push(t);
    const h = stashDeposit(t);
    if (h && h.ok) return !0;
    const d = S.inv.indexOf(t);
    d >= 0 && S.inv.splice(d, 1);
  }
  return epBox().length < 120 ? (epBox().push(t), !0) : !1;
}
