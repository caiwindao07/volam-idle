"use strict";
const u20 = () => document.body.classList.contains("u20"),
  u2any = () => u20() || document.body.classList.contains("u2m");
function u2Open(n, a) {
  if (u20()) return u20Open(n, a);
  (a && typeof questTab < "u" && (questTab = a),
    n === "tt" && (u20MoreMode = "tt"),
    closeModal(!0),
    showTab(n === "tt" ? "more" : n));
}
const U2_ORIG = {
  char: renderChar,
  skill: renderSkill,
  inv: renderInv,
  forge: renderForge,
  quest: renderQuest,
  more: renderMore,
  ktc: ktcModal,
};
let u20MoreMode = "sys",
  u20TtTab = "basic",
  u20TrkOn = !0;
const fmtVan = (n) => (
    (n = Math.floor(n)),
    n >= 1e4 ? `${fmt(Math.floor(n / 1e4))} vạn ${n % 1e4} lượng` : `${n} lượng`
  ),
  u2win = (n) => {
    ((document.body.dataset.u2t = n), typeof u20WTitle == "function" && u20WTitle(n === "tt" ? "more" : n));
  },
  U2_DOLL = {
    helm: [92, 8, 64, 64],
    amulet: [180, 8, 60, 40],
    cuff: [12, 34, 46, 66],
    armor: [92, 80, 64, 98],
    weapon: [180, 56, 60, 112],
    ring1: [12, 108, 46, 40],
    ring2: [12, 154, 46, 40],
    belt: [92, 186, 64, 34],
    pendant: [12, 200, 46, 66],
    boot: [180, 176, 60, 62],
    horse: [92, 228, 64, 64],
  };
function u2DrawDoll() {
  const n = $("#u2doll");
  if (!n || typeof drawJxHero != "function" || !R.jx) return;
  const a = document.createElement("canvas");
  ((a.width = 600), (a.height = 600));
  const c = a.getContext("2d"),
    s = CX;
  CX = c;
  let i = !1;
  try {
    i = drawJxHero("st", 0, 0, 300, 440, 1, 1); // native 1:1, scaled up below by a whole factor
  } catch {
    i = !1;
  } finally {
    CX = s;
  }
  if (!i) {
    const k = typeof PCTX < "u" ? PCTX : 0; // doll of a disciple tab: retry in its context
    setTimeout(() => {
      $("#u2doll") === n && (k ? withChar(k, u2DrawDoll) : u2DrawDoll());
    }, 400);
    return;
  }
  const t = c.getImageData(0, 0, 600, 600).data;
  let o = 600,
    d = 0,
    u = 600,
    m = 0;
  for (let p = 3; p < t.length; p += 16)
    if (t[p] > 20) {
      const k = (p - 3) / 4,
        g = k % 600,
        v = (k / 600) | 0;
      (g < o && (o = g), g > d && (d = g), v < u && (u = v), v > m && (m = v));
    }
  if (d <= o) return;
  const h = d - o + 4,
    e = m - u + 4,
    q = Math.min(236 / h, 284 / e),
    l = q >= 2 ? Math.floor(q) : q,
    r = h * l,
    b = e * l,
    f = n.getContext("2d");
  ((f.imageSmoothingEnabled = l !== Math.round(l)),
    f.clearRect(0, 0, n.width, n.height),
    f.drawImage(a, o - 2, u - 2, h, e, Math.round((252 - r) / 2), Math.round(296 - b), r, b));
}
function renderChar20() {
  const n = R.P,
    a = FAC[S.fac],
    c = Object.values(S.eq).filter((e) => e && !reqOk(e)),
    s = calc({}),
    i = { life: Math.round(n.life - s.life), mana: Math.round(n.mana - s.mana) },
    t = SLOTS.map(([e, l]) => {
      const [r, b, f, p] = U2_DOLL[e];
      return `<div class="u2s slot" data-slot="${e}" style="left:${r}px;top:${b}px;width:${f}px;height:${p}px">${S.eq[e] ? itemCell(S.eq[e]) : `<span>${l}</span>`}</div>`;
    }).join(""),
    o = Object.keys(ATTR_VI)
      .map(
        (e) =>
          `<div class="u2a"><span>${ATTR_VI[e]}</span><b>${Math.round(n[e])}</b><button class="plus" data-a="${e}" ${S.attrPts ? "" : "disabled"}>+</button><button class="minus" data-a="${e}" title="Rút lại 1 điểm" ${S.attr[e] > 0 ? "" : "disabled"}>−</button></div>`,
      )
      .join(""),
    d = [
      ["Sinh lực", fmt(n.life) + (i.life ? ` <small class="cp">+${fmt(i.life)}</small>` : "")],
      ["Nội lực", fmt(n.mana) + (i.mana ? ` <small class="cp">+${fmt(i.mana)}</small>` : "")],
      ["Sát thương VK", `${Math.round(n.wmin)}–${Math.round(n.wmax)}`],
      ["Chính xác", Math.round(n.ar)],
      ["Né tránh", Math.round(n.def)],
      ["Chí mạng", Math.round(n.main.crit) + "%"],
      ["Tốc độ đánh", n.aspd.toFixed(2)],
    ].concat(ELEM.map((e) => ["Kháng " + ELEM_VI[e], Math.round(n.res[e]) + "%"])),
    u =
      n.plusSkill || Object.keys(n.skAdd || {}).length
        ? `<div class="u2note cp">Kỹ năng từ trang bị: ${n.plusSkill ? `tất cả +${n.plusSkill}` : ""}${Object.entries(
            n.skAdd || {},
          )
            .map(([e, l]) => ` · ${SK[e] ? esc(SK[e].n) : e} +${l}`)
            .join("")}</div>`
        : "";
  (($("#t-char").innerHTML = `<div class="u2char">
    <div class="u2dollw"><div class="u2nm">${esc(hasRealName() ? S.name : a.n)}</div><div class="u2doll"><canvas id="u2doll" width="252" height="300"></canvas>${t}</div>
      <div class="u2btns"><button class="btn sm" id="bTitle">Danh hiệu</button><button class="btn sm${hasRealName() ? "" : " on"}" id="bName">Đặt tên</button><button class="btn sm${S.lvl >= REBORN_LV && RW().stat.reborn < REBORN_MAX ? " on" : ""}" id="bReb">Chuyển sinh</button>${matHave("misc", "ldp") > 0 ? '<button class="btn sm on" id="bDoiPhai">Đổi phái</button>' : ""}</div></div>
    <div class="u2info"><div class="u2box"><b style="color:${SERIES_COL[a.series]}">${esc(a.n)}</b> · hệ ${SERIES[a.series]} · Cấp ${S.lvl}${rebornN() ? ` <small class="cp">CS ${rebornN()}</small>` : ""}
      <div class="small">Chiêu chính: <b class="gold">${esc(n.main.n)}</b></div><div class="small">Lực tay trái <b class="gold">${lucTay(n.basic)}</b></div><div class="small">Lực tay phải <b class="gold">${lucTay(n.main)}</b></div></div>
      <div class="u2h">Tiềm năng <b class="gold">${S.attrPts}</b><span class="sp"></span><button class="btn sm" id="bSugAt">Gợi ý</button><button class="btn sm" id="bTTa">Tẩy Tủy</button></div>
      <div class="u2box">${o}</div>
      <div class="u2h">Chỉ số</div><div class="u2box u2st">${d.map(([e, l]) => `<span>${e}</span><span>${l}</span>`).join("")}</div>${u}${typeof ptCampHTML == "function" ? ptCampHTML() : ""}</div></div>
    ${c.length ? `<div class="reqbad"><b>⚠ ${c.length} món chưa đủ điều kiện, không được cộng chỉ số:</b><br>${c.map((e) => `${esc(e.n)}: ${esc(reqProblems(e).join("; "))}`).join("<br>")}</div>` : ""}`),
    ($("#bTTa").onclick = tayTuyModal),
    document.querySelectorAll("#t-char .plus").forEach((e) => (e.onclick = () => attrAddModal(e.dataset.a))),
    document.querySelectorAll("#t-char .minus").forEach((e) => (e.onclick = () => unspendAttr(e.dataset.a))),
    ($("#bTitle").onclick = () => titleModal()),
    ($("#bName").onclick = () => nameModal()),
    ($("#bReb").onclick = rebornModal));
  const m = $("#bDoiPhai");
  (m && (m.onclick = doiPhaiModal),
    ($("#bSugAt").onclick = suggestModal),
    document
      .querySelectorAll("#t-char .slot .it")
      .forEach(
        (e) =>
          (e.onclick = () =>
            e.parentNode.dataset.slot === "horse"
              ? horsePickModal()
              : itemModal(findItem(e.dataset.uid), e.parentNode.dataset.slot)),
      ));
  const h = document.querySelector('#t-char .slot[data-slot="horse"]');
  (h && !S.eq.horse && (h.onclick = () => horsePickModal()), u2DrawDoll());
  typeof ptCampBind == "function" && ptCampBind($("#t-char"));
}
// "Kỹ năng chính" of the character shown in this Võ công window (main or disciple: partyui binds the handlers
// to that character through withChar, so S / R.P here are that character's): current main skill + lock,
// a picker, and the rotation switch (with Xoay chiêu on, the 4 slots rotate and the main skill is the fallback)
function u2MainBar() {
  const P = R.P,
    m = P && P.main;
  if (!m) return "";
  const bs = m === P.basic,
    lk = !!S.mainLock,
    cur = lk ? String(S.main) : "auto",
    acts = P.actives.slice().sort((a, b) => SK[a.id].req - SK[b.id].req),
    rot = S.rot !== !1 && typeof rotPool == "function" && rotPool(P).length >= 2,
    ic = bs ? "img/s/8.png" : (SK[m.id] && SK[m.id].ic) || "";
  return `<div class="u2mainbar"><span class="dim">Chiêu chính</span>${ic ? `<img src="${esc(ic)}" alt="">` : ""}<b class="gold">${esc(bs ? "Đánh thường" : m.n)}</b><span class="u2ml${lk ? " on" : ""}">${lk ? "🔒 đã khóa" : "tự chọn chiêu mạnh nhất"}</span><span class="sp"></span><select id="u2mSel" title="Đặt làm chiêu chính"><option value="auto"${cur === "auto" ? " selected" : ""}>Tự chọn (mạnh nhất)</option><option value="basic"${cur === "basic" ? " selected" : ""}>Đánh thường</option>${acts.map((a) => `<option value="${a.id}"${cur === String(a.id) ? " selected" : ""}>${esc(a.n)}</option>`).join("")}</select><button class="btn sm${lk ? " on" : ""}" id="u2mLock" title="${lk ? "Bỏ khóa: tự chọn chiêu mạnh nhất" : "Khóa chiêu đang dùng làm chiêu chính"}">${lk ? "Bỏ khóa" : "Khóa"}</button><label title="Xoay chiêu: luân phiên các chiêu ở 4 ô. Tắt: chỉ đánh chiêu chính"><input type="checkbox" id="u2mRot" ${S.rot !== !1 ? "checked" : ""}> Xoay chiêu</label>${rot ? `<div class="u2mnote dim small">${lk && !bs ? "Đang xoay chiêu: chiêu chính đã khóa và các chiêu ở 4 ô luân phiên." : "Đang xoay chiêu theo 4 ô; chiêu chính dùng khi các ô đang hồi / thiếu nội lực."} Tắt Xoay chiêu để chỉ đánh chiêu chính.</div>` : ""}</div>`;
}
// id: skill id, "basic", or "auto" (unlock); runs in the window's character context
function u2SetMain(id) {
  (id === "auto" ? (S.mainLock = !1) : ((S.main = id === "basic" ? "basic" : +id), (S.mainLock = !0)),
    (R.dirty = !0),
    recalc());
  const m = R.P && R.P.main;
  (toast(
    (typeof PCTX < "u" && PCTX ? S.name + ": " : "") +
      (S.mainLock ? "Chiêu chính: " + (m === R.P.basic ? "Đánh thường" : m.n) : "Chiêu chính: tự chọn mạnh nhất"),
  ),
    save(),
    renderPad(), // hotbar #bMain (deferred to the main context while a disciple is swapped in)
    refresh());
}
function u2MainBind() {
  const r = $("#t-skill"),
    sel = r.querySelector("#u2mSel"),
    lk = r.querySelector("#u2mLock"),
    rot = r.querySelector("#u2mRot");
  (sel && (sel.onchange = () => u2SetMain(sel.value)),
    lk &&
      (lk.onclick = () =>
        S.mainLock ? u2SetMain("auto") : u2SetMain(R.P.main === R.P.basic ? "basic" : R.P.main.id)),
    rot &&
      (rot.onchange = () => {
        ((S.rot = rot.checked),
          (R.dirty = !0),
          !(typeof PCTX < "u" && PCTX) && typeof refreshRotBtn == "function" && refreshRotBtn(),
          save(),
          refresh());
      }),
    r.querySelectorAll(".u2mk[data-mk]").forEach(
      (b) =>
        (b.onclick = (e) => {
          e.stopPropagation();
          const id = +b.dataset.mk;
          R.P.main.id === id && S.mainLock ? u2SetMain("auto") : u2SetMain(id);
        }),
    ));
}
function renderSkill20() {
  const n = FAC[S.fac];
  if (n.novice) return U2_ORIG.skill();
  const a = {};
  for (const e of n.skills) {
    const l = SK[e],
      r = l.tier === 90 ? 90 : l.req;
    (a[r] || (a[r] = [])).push(e);
  }
  const c = Object.keys(a)
      .map(Number)
      .sort((e, l) => e - l),
    s = Math.max(1, ...c.map((e) => a[e].length)),
    i = (e) => (e <= 1 ? "Nhập môn" : `Lv${e}`),
    t = (e) => {
      if (!e) return '<div class="u2k empty"></div>';
      const l = SK[e],
        r = S.sk[e] || 0,
        b = r ? skillBonusLv(e) : 0,
        f = canLearn(l),
        mn = R.P.main.id === +e,
        mk = r && isAttack(l) && (mn || R.P.actives.some((x) => x.id === +e));
      return `<div class="u2k ${[skReqOk(l) ? "" : "lock", mn ? "main" : "", r ? "on" : ""].join(" ")}" data-id="${e}" title="${esc(l.n)}"><img src="${esc(l.ic || "")}" alt=""><i>${r ? r + b : ""}</i>${l.tier === 90 ? sk9BarHTML(e, "c") : ""}${mk ? `<button class="u2mk${mn ? " on" : ""}${mn && S.mainLock ? " lk" : ""}" data-mk="${e}" title="${mn ? (S.mainLock ? "Chiêu chính (đã khóa) · bấm để bỏ khóa" : "Chiêu chính (tự chọn) · bấm để khóa") : "Đặt làm chiêu chính"}">★</button>` : ""}${f ? `<button class="plus" data-id="${e}" title="Cộng 1 điểm">+</button>` : ""}${l.tier === 90 && r && r < l.max && matHave("misc", "dtbk") > 0 ? `<button class="u2dt" data-dt="${e}" title="Dùng Đại Thành Bí Kíp">📕</button>` : ""}</div>`;
    },
    o = R.P && R.P.basic,
    d = S.mainLock && S.main === "basic",
    u = `<div class="u2kc"><div class="u2kh">Cơ bản</div><div class="u2k on${R.P.main === o ? " main" : ""}${d ? " lockm" : ""}" id="u2basic" title="Đánh thường · bấm để ${d ? "bỏ khóa" : "khóa làm chiêu chính"}"><img src="img/s/8.png" alt=""><i>1</i></div>${'<div class="u2k empty"></div>'.repeat(s - 1)}</div>`,
    m = c
      .map(
        (e) =>
          `<div class="u2kc"><div class="u2kh">${i(e)}</div>${Array.from({ length: s }, (l, r) => t(a[e][r])).join("")}</div>`,
      )
      .join("");
  (($("#t-skill").innerHTML =
    `<div class="u2tabs"><button class="on">${esc(n.n)}</button><button id="u2skOpt">› Trợ Thủ Kiếm Hiệp</button></div>
    ${u2MainBar()}
    ${typeof sk9MainHTML == "function" ? sk9MainHTML() : ""}
    <div class="u2kg">${u}${m}</div>
    <div class="u2foot"><span class="dim small">Mật Tịch 90 ×${matHave("misc", "bk90")} · Đại Thành ×${matHave("misc", "dtbk")}${S.mainLock ? ' · <a id="bAutoMain">bỏ khóa chiêu chính</a>' : ""}</span><span class="sp"></span><button class="btn sm" id="bSugSk">Gợi ý</button><button class="btn sm" id="bTT">Tẩy Tủy</button><span class="u2pts">Điểm kỹ năng còn: <b>${S.skPts}</b></span></div>
    <p class="dim small u2tip">Bấm biểu tượng: xem chi tiết, chọn chiêu chính, rút điểm. Bấm <b class="plusd">+</b> để cộng điểm.</p>`),
    document.querySelectorAll("#t-skill .plus").forEach(
      (e) =>
        (e.onclick = (l) => {
          l.stopPropagation();
          const r = SK[e.dataset.id];
          canLearn(r) && (skLearn(r.id), uiSfx("learn"), (R.dirty = !0), recalc(), renderSkill(), save());
        }),
    ),
    document.querySelectorAll("#t-skill [data-dt]").forEach(
      (e) =>
        (e.onclick = (l) => {
          (l.stopPropagation(), useDaiThanh(+e.dataset.dt));
        }),
    ),
    document.querySelectorAll("#t-skill .u2k[data-id]").forEach((e) => (e.onclick = () => skillModal(+e.dataset.id))),
    u2MainBind(),
    ($("#u2basic").onclick = () => {
      (S.mainLock && S.main === "basic" ? (S.mainLock = !1) : ((S.main = "basic"), (S.mainLock = !0)),
        (R.dirty = !0),
        recalc(),
        renderSkill(),
        renderPad(),
        save(),
        toast(S.mainLock && S.main === "basic" ? "Chiêu chính: Đánh thường" : "Bỏ khóa đánh thường"));
    }));
  const h = $("#bAutoMain");
  (h &&
    (h.onclick = () => {
      ((S.mainLock = !1), (R.dirty = !0), recalc(), renderSkill());
    }),
    ($("#bSugSk").onclick = suggestModal),
    ($("#bTT").onclick = tayTuyModal),
    ($("#u2skOpt").onclick = () => u20Tt("skill")));
}
function renderInv20() {
  U2_ORIG.inv();
  const n = $("#t-inv"),
    a = n.querySelector(".invgrid"),
    c = $("#iSort");
  for (let u = S.inv.length; u < INV_MAX; u++) a.insertAdjacentHTML("beforeend", '<span class="it empty"></span>');
  const s = {};
  for (const u of ["bBest", "bDonKho", "bStash", "bSellAll", "bKtcI"]) s[u] = $("#" + u);
  const i = document.createElement("div");
  ((i.className = "u2bag"),
    (i.innerHTML = `<div class="u2bh"><span>${S.inv.length}/${INV_MAX}</span><span class="sp"></span></div>`),
    i.firstChild.appendChild(c),
    i.appendChild(a),
    i.insertAdjacentHTML(
      "beforeend",
      `<div class="u2money"><span>Ng.lượng</span><b>${fmtVan(S.gold)}</b><span>Kim Ng.Bảo</span><b>${fmt(S.knb || 0)}</b></div><div class="u2btns" id="u2invB"></div><div class="u2btns" id="u2invB2"></div>`,
    ));
  const t = i.querySelector("#u2invB"),
    o = i.querySelector("#u2invB2");
  ((s.bBest.textContent = "Mặc đồ tốt"),
    (s.bDonKho.textContent = "Dọn kho"),
    (s.bStash.textContent = "Kho chung"),
    (s.bKtcI.textContent = "Kỳ Trân Các"),
    (s.bSellAll.textContent = s.bSellAll.disabled
      ? "Bán đồ thừa"
      : `Bán ${S.inv.filter((u) => !lootMatch(u) && !sellProtected(u)).length} món thừa`),
    t.append(s.bBest, s.bDonKho, s.bStash),
    o.append(s.bSellAll),
    typeof verVio == "function" &&
      verVio() &&
      typeof epModal == "function" &&
      t.insertAdjacentHTML("beforeend", `<button class="btn sm" id="u2kren">Kho Rèn (${epBox().length})</button>`),
    o.insertAdjacentHTML("beforeend", '<button class="btn sm" id="u2filt">Bộ lọc nhặt</button>'),
    o.append(s.bKtcI),
    (n.innerHTML = ""),
    n.appendChild(i),
    ($("#u2filt").onclick = () => u20Tt("loot")));
  const d = $("#u2kren");
  d && (d.onclick = () => epModal("box"));
}
function renderForge20() {
  const n = forgeReadyCounts(),
    a = Object.keys(mats().ore).reduce((l, r) => l + matHave("ore", r), 0),
    c = Object.keys(mats().ht).reduce((l, r) => l + matHave("ht", r), 0),
    s = S.inv.concat(epBox(), Object.values(S.eq)).filter((l) => l && typeof isPhoi == "function" && isPhoi(l)).length,
    i = Object.keys(mats().shard).filter((l) => SHARDS[l] && matHave("shard", l) >= SHARDS[l]).length,
    t = Object.values(S.eq)
      .filter((l) => l && canPlatBase(l))
      .concat(S.inv.filter(canPlatBase))
      .filter((l) => !platReady(l)).length,
    o = SLOTS.map(([l]) => S.eq[l]).filter(Boolean),
    d = (
      verVio()
        ? [
            ["tl", "Tinh luyện"],
            ["hut", "Lấy"],
            ["phoi", "Chế tạo"],
            ["kham", "Khảm nạm"],
            ["box", "Kho Rèn"],
          ]
        : []
    ).concat([["ht", "Hoàng Kim"]]),
    u = o.length,
    m = o
      .map((l, r) => {
        const b = -Math.PI / 2 + (r * 2 * Math.PI) / Math.max(1, u),
          f = 118 + Math.cos(b) * 92 - 19,
          p = 118 + Math.sin(b) * 92 - 19;
        return `<div class="u2ri" style="left:${f.toFixed(0)}px;top:${p.toFixed(0)}px">${itemCell(l)}</div>`;
      })
      .join(""),
    h = (l, r, b) => `<div class="${b ? "cp" : ""}">${l}: <b>${r}</b></div>`;
  $("#t-forge").innerHTML =
    `<div class="u2tabs">${d.map(([l, r]) => `<button data-fg="${l}">${r}</button>`).join("")}</div>
    <div class="u2forge"><div class="u2circ"><svg viewBox="0 0 236 236"><g fill="none" stroke="#d9b65a" stroke-width="1.6" opacity=".85"><circle cx="118" cy="118" r="112"/><circle cx="118" cy="118" r="104"/><circle cx="118" cy="118" r="60"/>
      <rect x="44" y="44" width="148" height="148"/><rect x="44" y="44" width="148" height="148" transform="rotate(45 118 118)"/><circle cx="118" cy="118" r="30" stroke-dasharray="4 3"/></g></svg>
      <div class="u2rc"><img src="img/ep/ht.png" alt=""><b>${c}</b><small>Huyền Tinh</small></div>${m}</div>
      <div class="u2ftxt"><div class="u2h">Nguyên liệu</div>
        ${verVio() ? h("Huyền Tinh Khoáng Thạch", c) + h("Đá thuộc tính", a) + h("Phôi đồ Tím", s) + h("Kho Rèn", `${epBox().length}/${EP_BOX_MAX}`) : ""}
        ${h("Mảnh Hoàng Kim đủ ghép", i, i > 0)}${h("Thủy Tinh Trắng", matHave("misc", "wc"))}${h("Thần Bí Khoáng Thạch", matHave("misc", "mys"))}
        ${n.ench ? '<div class="cp">Có thể khảm nạm</div>' : ""}${n.up ? '<div class="cp">Huyền Tinh thăng cấp được</div>' : ""}
        <div class="u2h">Quy tắc</div><div class="dim small">Cường hóa +1…+${ENH_MAX}, mỗi cấp +${Math.round(ENH_STEP * 100)}% thuộc tính gốc, +${Math.round(ENH_LINE_STEP * 100)}% các dòng thuộc tính. Bấm món đồ trên vòng pháp trận để rèn riêng (cường hóa, tẩy luyện).</div>
        <div class="u2btns"><button class="btn sm" id="u2fgOpt">Tự động rèn…</button></div></div></div>`;
  const e = { ht: () => htModal(), batch: () => batchForgeModal() };
  (document
    .querySelectorAll("#t-forge [data-fg]")
    .forEach((l) => (l.onclick = () => (e[l.dataset.fg] || (() => epModal(l.dataset.fg)))())),
    ($("#u2fgOpt").onclick = () => u20Tt("other")),
    document.querySelectorAll("#t-forge .u2ri [data-uid]").forEach(
      (l) =>
        (l.onclick = () => {
          const r = Object.values(S.eq).find((b) => b && b.uid === +l.dataset.uid);
          r && forgeModal(r);
        }),
    ));
}
const U2_QT = [
    ["dt", "Dã Tẩu"],
    ["st", "Sát Thủ"],
  ],
  U2_ACT = [
    ["dg", "Phó bản"],
    ["boat", "Đi thuyền"],
    ["tower", "Tháp thử thách"],
    ["wb", "Boss tuần"],
    ["horse", "Mã trường"],
    ["pet", "Đồ đệ"],
    ["rec", "Kỷ lục"],
  ],
  u2IsAct = (n) => U2_ACT.some((a) => a[0] === n),
  u2ActBody = (n) =>
    n === "boat"
      ? boatBody()
      : n === "tower"
        ? towerBody()
        : n === "pet"
          ? partyBody()
          : n === "dg"
            ? dungeonBody()
            : n === "wb"
              ? wbBody()
              : n === "horse"
                ? stableBody()
                : recordsBody();
function u2ActBind(n) {
  const a = () => renderQuest(),
    c = (i) => () => {
      (u20Close(), i());
    },
    s = (i, t) => {
      const o = n.querySelector(i);
      o && (o.onclick = t);
    };
  if (
    (n.querySelectorAll("[data-dg]").forEach((i) => (i.onclick = c(() => dgStart(i.dataset.dg)))),
    s("#wbGo", c(wbStart)),
    s("#wbClaim", () => {
      (wbClaim(), a());
    }),
    s("#dgOut", () => {
      (R.dg.kind === "wb" ? wbFinish(!1) : (log("Rời phó bản."), dgExit()), a());
    }),
    s("#gTower", c(towerStart)),
    s("#gTowerOut", () => {
      (towerExit(!1), a());
    }),
    questTab === "pet" && partyBind(n, a),
    questTab === "boat")
  ) {
    (bindBoat(n), s("#boatGo", c(boatStart)));
    const i = n.querySelector("#boatOut");
    if (i) {
      const t = i.onclick;
      i.onclick = () => {
        (t(), a());
      };
    }
  }
  if (questTab === "horse") {
    const i = $("#mBody");
    ((i.id = "mBodyX"), (n.id = "mBody"));
    try {
      bindStable(a);
    } finally {
      ((n.id = ""), (i.id = "mBody"));
    }
  }
}
function renderQuest20() {
  if (u2IsAct(questTab) || questTab === "act" || questTab === "tm") {
    const d = questTab;
    ((questTab = "dt"), d !== "act" && setTimeout(() => actModal(d), 0));
  }
  const n = !1;
  n ? ($("#t-quest").innerHTML = `<div class="dtabs"></div>${u2ActBody(questTab)}`) : U2_ORIG.quest();
  const a = $("#t-quest"),
    c = a.querySelector(".dtabs");
  if (!c) return;
  const s = document.createElement("div");
  for (s.className = "u2qd"; c.nextSibling;) s.appendChild(c.nextSibling);
  const i = ([d, u]) =>
      `<button data-qt="${d}" class="${questTab === d ? "on" : ""}">${u}${d === "boat" && boatOn() ? " ●" : ""}</button>`,
    t = document.createElement("div");
  ((t.className = "u2tree"),
    (t.innerHTML = `<div class="u2tg">⊟ Nhiệm vụ</div>${U2_QT.map(i).join("")}<div class="u2tg">⊟ Phó bản · Hoạt động</div>${U2_ACT.map(([d, u]) => `<button data-act="${d}">${u}${d === "boat" && boatOn() ? " ●" : ""}</button>`).join("")}<div class="u2tg">⊟ Khác</div><button id="u2gift">Phần thưởng</button>`),
    (a.innerHTML = ""));
  const o = document.createElement("div");
  ((o.className = "u2quest"),
    o.appendChild(t),
    o.appendChild(s),
    a.appendChild(o),
    a.insertAdjacentHTML(
      "beforeend",
      `<div class="u2btns u2qb"><button class="btn sm${u20TrkOn ? " on" : ""}" id="u2trkB">${u20TrkOn ? "Hủy theo dõi" : "Theo dõi NV"}</button></div>`,
    ),
    t.querySelectorAll("[data-qt]").forEach(
      (d) =>
        (d.onclick = () => {
          ((questTab = d.dataset.qt), renderQuest());
        }),
    ),
    t.querySelectorAll("[data-act]").forEach((d) => (d.onclick = () => actModal(d.dataset.act))),
    ($("#u2gift").onclick = () => giftModal(!0)),
    ($("#u2trkB").onclick = () => {
      ((u20TrkOn = !u20TrkOn), (S.u20trk = u20TrkOn), save(), renderQuest(), u20TrkDraw());
    }),
    n && u2ActBind(s));
}
function u20TrkDraw() {
  const n = $("#u20trk");
  if (!n) return;
  const a = [];
  if (S.fac && S.lvl >= (typeof DT_LV < "u" ? DT_LV : 20)) {
    const i = DT(),
      t = i.task;
    t &&
      a.push(
        `<div data-q="dt"><b>Dã Tẩu</b> <small>chuỗi ${i.chain || 0}</small><br>${esc(dtText(t))} <span class="${dtReady(t) ? "cp" : "gold"}">${dtReady(t) ? "xong" : dtProg(t)}</span></div>`,
      );
  }
  (R.sat && a.push('<div data-q="st"><b>Sát Thủ</b><br>Truy sát mục tiêu</div>'),
    R.dg && a.push(`<div><b>${esc(R.dg.kind === "boat" ? "Đi thuyền" : R.dg.d ? R.dg.d.n : "Phó bản")}</b></div>`));
  const c = !!S.u20trkMin,
    s =
      u20TrkOn && a.length
        ? `<div class="u2trh" title="Thu gọn / mở rộng">Nhiệm vụ Theo Dấu <b>${c ? "▸" : "▾"}</b></div>${c ? "" : a.join("")}`
        : "";
  if (n.innerHTML !== s) {
    ((n.innerHTML = s),
      (n.style.display = s ? "" : "none"),
      n.querySelectorAll("[data-q]").forEach((t) => (t.onclick = () => u20Open("quest", t.dataset.q))));
    const i = n.querySelector(".u2trh");
    i &&
      (i.onclick = () => {
        ((S.u20trkMin = !S.u20trkMin), save(), u20TrkDraw());
      });
  }
}
const KTC_CAT = [
  ["Tiện ích", ["knb", "tt", "qht", "ldt"]],
  ["Quý hiếm", ["rht", "rda", "mt90", "dtbk"]],
  ["Đặc biệt", ["ldp", "dgt"]],
  ["Thú cưỡi", ["rngua"]],
];
let u2KtcCat = 0;
function ktcModal20() {
  const n = (t) =>
      t === "mt90"
        ? matHave("misc", "bk90")
        : ["dtbk", "ldp", "ldt", "dgt", "rngua"].includes(t)
          ? matHave("misc", t)
          : null,
    a = { ldp: "ktcLdp", ldt: "ktcLdt", mt90: "ktcMt", dgt: "ktcDgt", dtbk: "ktcDtbk", rngua: "ktcRngua" },
    c = !1,
    s = c ? [] : KTC_CAT[u2KtcCat][1].map((t) => KTC.find((o) => o.k === t)).filter(Boolean),
    i = (t) => {
      const o = ktcOk(t),
        d = n(t.k);
      return `<div class="u2card${o ? "" : " bad"}" title="${esc(t.d)}"><div class="u2ct">${esc(t.n)}</div><div class="u2cb"><img src="${t.ic}" alt=""><div><div>Giá: <b class="${t.knb ? "gold" : ""}">${ktcCost(t)}</b></div><small class="dim">${t.k === "knb" ? `Không giới hạn · hôm nay đổi ${knbDay().n}` : t.k === "ldt" ? `Hôm nay ${ldtDay().n}/${LDT_BUY_DAY} · có ${d}` : d != null ? `Đang có ${d}` : esc(t.d.slice(0, 40))}</small></div></div>
      <div class="u2cf"><button class="u2buy" data-ktc="${t.k}" ${o && ktcCan(t) ? "" : "disabled"}>Mua</button>${t.k === "dtbk" || t.k === "ldp" || t.k === "dgt" || t.k === "ldt" ? "" : `<button class="u2buy x" data-ktc10="${t.k}" ${o && ktcCan(t, 10) ? "" : "disabled"}>×10</button>`}${a[t.k] && d ? `<button class="u2buy x on" id="${a[t.k]}">${t.k === "mt90" ? "Lĩnh ngộ" : "Dùng"}</button>` : ""}${t.k === "rngua" && d > 1 ? `<button class="u2buy x on" id="ktcRngua10">Dùng ×${Math.min(10, d)}</button>` : ""}</div></div>`;
    };
  (modal(
    `<h3>Kỳ Trân Các</h3><div class="u2shop"><div class="u2cat">${KTC_CAT.map(([t], o) => `<button data-kc="${o}" class="${o === u2KtcCat ? "on" : ""}">${t}</button>`).join("")}</div>
    <div><div class="u2sh"><img src="img/ep/knb.png" alt=""> <span>Kim Nguyên Bảo:</span> <b class="gold">${S.knb || 0}</b> <span>· Ngân lượng:</span> <b>${fmtVan(S.gold)}</b></div>${c ? `<div class="u2tm">${thanMaBody().replace('<p class="desc">không', '<p class="desc">Thần Mã không')}</div>` : `<div class="u2cards">${s.map(i).join("")}</div>`}
    ${c ? "" : `${buffText() ? `<div class="small u2buf">Đang có: ${buffText()}</div>` : ""}<p class="dim small">Kim Nguyên Bảo rơi từ trùm (10%), trùm Hoàng Kim / boss tuần (50%). Rương Huyền Tinh / Đá mở ngay khi mua; Rương Ngựa cất vào túi, bấm Dùng để mở. Rê chuột lên vật phẩm để xem công dụng.</p>`}</div></div>`,
    () => {
      (document.querySelectorAll("#mBody [data-kc]").forEach(
        (o) =>
          (o.onclick = () => {
            ((u2KtcCat = +o.dataset.kc), ktcModal());
          }),
      ),
        c && bindThanMa(() => ktcModal()),
        document.querySelectorAll("#mBody [data-ktc]").forEach((o) => (o.onclick = () => ktcBuy(o.dataset.ktc, 1))),
        document
          .querySelectorAll("#mBody [data-ktc10]")
          .forEach((o) => (o.onclick = () => ktcBuy(o.dataset.ktc10, 10))));
      const t = (o, d) => {
        const u = $("#" + o);
        u && (u.onclick = d);
      };
      (t("ktcLdp", doiPhaiModal),
        t("ktcDgt", doiGioiTinhModal),
        t("ktcDtbk", () => {
          (closeModal(!0), u2Open("skill"), toast("Bấm 📕 ở võ công 90 đã học để đại thành cấp 20"));
        }),
        t("ktcMt", () => {
          if (S.lvl < 80 && !rebornN()) {
            toast("Võ công 90 cần cấp 80");
            return;
          }
          (closeModal(!0), u2Open("skill"), toast("Bấm + ở võ công 90 để lĩnh ngộ (không tốn điểm)"));
        }),
        t("ktcLdt", () => {
          if (S.lvl < DT_LV) {
            toast(`Dã Tẩu mở từ cấp ${DT_LV}`);
            return;
          }
          (dtUseLdt(!1), ktcModal());
        }),
        t("ktcRngua", () => {
          (horseBoxUse(1), ktcModal());
        }),
        t("ktcRngua10", () => {
          (horseBoxUse(10), ktcModal());
        }));
    },
  ),
    $("#modal").classList.add("u2ktc"));
}
const U2_TT = [
  ["basic", "Cơ bản"],
  ["skill", "Kỹ năng"],
  ["loot", "Nhặt đồ"],
  ["other", "Khác"],
];
function u20Tt(n) {
  (n && (u20TtTab = n), u2Open("tt"));
}
function renderTt() {
  const n = (t, o, d) => `<label><input type="checkbox" id="${t}" ${o ? "checked" : ""}> ${d}</label>`,
    a = typeof DT == "function" ? DT() : {};
  let c = "";
  if (
    (u20TtTab === "basic"
      ? (c = `<div class="u2h">Tự đánh</div>${n("tAuto", !manual(), "Tự đánh quái (Auto) · phím F")}${n("tMap", S.autoMap !== !1, "Tự đổi bãi luyện công theo cấp")}${n("tClose", !!S.closeAtk, "Đánh tiếp cận (chạy sát quái rồi mới ra chiêu, cả chiêu tầm xa)")}${n("tBoss", !!S.bossFirst, "Ưu tiên đánh boss (trùm / trùm Hoàng Kim trên bản đồ: bỏ quái thường, chạy tới đánh trùm)")}${n("tRide", S.autoRide !== !1, "Tự lên ngựa khi di chuyển, xuống ngựa khi đánh chiêu không dùng trên ngựa · phím M")}
    <div class="u2h">Dược phẩm</div>${n("tPot", !S.potOff, `Dùng thuốc khi sinh lực / nội lực dưới 50% · đã dùng ${fmt(S.potUsed || 0)}`)}${n("tBuy", S.potBuy !== !1, "Tự mua thuốc khi hết (tối đa 20% ngân lượng)")}
    <div class="u2btns">${[0, 1]
      .map((t) => {
        const o = typeof slotShow == "function" ? slotShow(t) : { name: "" };
        return `<button class="btn sm" data-potsl="${t}">${t ? "Nội lực" : "Sinh lực"}: ${esc(o.name || "Tự động")} ▾</button>`;
      })
      .join("")}</div>
    <div class="u2h">Trang bị</div>${n("tEq", !!S.autoEquip, "Tự mặc đồ tốt hơn khi nhặt")}${n("tJunk", S.autoJunk !== !1, "Tự bán đồ thừa (yếu hơn đồ đang mặc, vũ khí sai loại; giữ 6 trang sức để hợp Huyền Tinh)")}${n("tWb", S.autoBuy !== !1, "Tự mua vũ khí đúng loại ở Biện Kinh khi mạnh hơn ≥ 25%")}`)
      : u20TtTab === "skill"
        ? (c = `<div class="u2h">Xoay chiêu</div>${n("tRot", S.rot !== !1, "Xoay chiêu tự động: luân phiên chiêu ở ô Q W E A (phím R), luôn có 2 chiêu mạnh nhất, bỏ chiêu hết nội lực")}${skOptsHTML()}
    <div class="u2h">Cộng điểm</div>${n("tPts", S.autoPts === !0, "Tự cộng điểm tiềm năng và võ công")}<div class="u2btns"><button class="btn sm" id="tSug">Gợi ý cộng điểm</button></div>`)
        : u20TtTab === "other" &&
          (c = `<div class="u2h">Lò rèn</div>${n("fgFuse", S.autoFuse !== !1, `Tự hợp Huyền Tinh từ trang sức thừa (3 món → 1, ${fmtL(fuseCost())} lượng; mỗi 30 giây) · có ${fusePool().length} món`)}
    <div class="u2h">Nhiệm vụ</div>${n("tDt", a.auto !== !1, "Dã Tẩu tự trả / nhận")}${n("tLdt", S.autoLdt !== !1, "Tự dùng Lệnh Bài Dã Tẩu khi hết lượt")}
`),
    u20TtTab === "sys")
  ) {
    (U2_ORIG.more(), u2SysTrim(), $("#t-more").insertAdjacentHTML("afterbegin", u2TtTabs()), u2TtBind());
    return;
  }
  if (
    (($("#t-more").innerHTML = `<div class="u2tabs">${u2TT()
      .map(([t, o]) => `<button data-tt="${t}" class="${u20TtTab === t ? "on" : ""}">${o}</button>`)
      .join("")}</div><div class="u2tt" id="u2ttBody">${c}</div>`),
    u2TtBind(),
    u20TtTab === "loot")
  ) {
    renderInv();
    return;
  }
  const s = (t, o) => {
    const d = $(t);
    d &&
      (d.onchange = () => {
        (o(d.checked), save());
      });
  };
  (s("#tAuto", (t) => setCtrl(t ? "auto" : "manual")),
    s("#tRot", (t) => {
      ((S.rot = t), refreshRotBtn(), (R.dirty = !0));
    }),
    s("#tRide", (t) => {
      S.autoRide = t;
    }),
    s("#tMap", (t) => {
      S.autoMap = t;
    }),
    s("#tClose", (t) => {
      S.closeAtk = t;
    }),
    s("#tBoss", (t) => {
      S.bossFirst = t;
    }),
    s("#tPot", (t) => {
      S.potOff = !t;
    }),
    s("#tBuy", (t) => {
      S.potBuy = t;
    }),
    s("#tEq", (t) => {
      S.autoEquip = t;
    }),
    s("#tWb", (t) => {
      S.autoBuy = t;
    }),
    s("#tJunk", (t) => {
      S.autoJunk = t;
    }),
    s("#tPts", (t) => {
      ((S.autoPts = t), t && (autoSpendAttrs(), autoSpendSkills(), recalc()));
    }),
    s("#tDt", (t) => {
      DT().auto = t;
    }),
    s("#tLdt", (t) => {
      S.autoLdt = t;
    }),
    s("#fgFuse", (t) => {
      ((S.autoFuse = t), t && autoFuse());
    }),
    document
      .querySelectorAll("#t-more [data-potsl]")
      .forEach((t) => (t.onclick = () => potSlotModal(+t.dataset.potsl))));
  const i = $("#tSug");
  (i && (i.onclick = suggestModal), bindSkOpts());
}
const u2TT = () => U2_TT,
  u2TtTabs = () =>
    `<div class="u2tabs">${u2TT()
      .map(([n, a]) => `<button data-tt="${n}" class="${u20TtTab === n ? "on" : ""}">${a}</button>`)
      .join("")}</div>`;
function u2TtBind() {
  document.querySelectorAll("#t-more [data-tt]").forEach(
    (n) =>
      (n.onclick = () => {
        ((u20TtTab = n.dataset.tt), renderMore());
      }),
  );
}
function renderMore20() {
  if ((u20TtTab === "sys" && (u20TtTab = "basic"), u20MoreMode === "tt")) return renderTt();
  (U2_ORIG.more(),
    u2SysTrim(),
    $("#t-more").insertAdjacentHTML(
      "afterbegin",
      '<div class="u2btns"><button class="btn sm" id="u2toTt">Trợ Thủ Kiếm Hiệp (tự động, nhặt đồ)…</button></div>',
    ),
    ($("#u2toTt").onclick = () => u20Tt("basic")));
}
function u2SysTrim() {
  const n = $("#t-more");
  for (const c of n.querySelectorAll("h3"))
    if (/^Tự động/.test(c.textContent)) {
      const s = c.nextElementSibling;
      (c.remove(), s && s.remove());
    }
  for (const c of ["#cForge", "#cBuy"]) {
    const s = $(c);
    s && s.closest("label").remove();
  }
  const a = [...n.querySelectorAll("h3")].find((c) => /^Tiện ích/.test(c.textContent));
  a && (a.textContent = "Tiện ích");
}
// the loot filter page of Trợ Thủ borrows the bag renderer: true while the Hệ thống window (not Hành trang) renders
const u2ttLoot = () =>
  ((typeof U20W < "u" && U20W.rendering) || curTab) === "more" && u20MoreMode === "tt" && u20TtTab === "loot";
((renderChar = () => (u2any() ? (u2win("char"), renderChar20()) : U2_ORIG.char())),
  (renderSkill = () => (u2any() ? (u2win("skill"), renderSkill20()) : U2_ORIG.skill())),
  (renderInv = () =>
    u2any() ? (u2ttLoot() ? (U2_ORIG.inv(), u2MoveFilter()) : (u2win("inv"), renderInv20())) : U2_ORIG.inv()),
  (renderForge = () => (u2any() ? (u2win("forge"), renderForge20()) : U2_ORIG.forge())),
  (renderQuest = () => (u2any() ? (u2win("quest"), renderQuest20()) : U2_ORIG.quest())),
  (renderMore = () => (u2any() ? (u2win(u20MoreMode === "tt" ? "tt" : "more"), renderMore20()) : U2_ORIG.more())),
  (ktcModal = () => (u2any() ? ktcModal20() : U2_ORIG.ktc())));
function u2MoveFilter() {
  const n = $("#u2ttBody");
  if (!n || !u2ttLoot()) return;
  const a = $("#t-inv");
  ((n.innerHTML = ""),
    [...a.children].filter((s) => s.matches("h3, .lootf, #epLoot")).forEach((s) => n.appendChild(s)));
  const c = n.querySelector("h3");
  (c && c.classList.add("u2h"), (a.innerHTML = ""), (invDirty = !0));
  // Hành trang open as its own window next to it: give it its bag back
  typeof u20IsOpen == "function" && u20IsOpen("inv") && u20RenderOne("inv");
}
const U2_ACTT = [
    ["dg", "Phó bản"],
    ["boat", "Đi thuyền"],
    ["tower", "Tháp"],
    ["wb", "Boss tuần"],
    ["horse", "Mã trường"],
    ["pet", "Đồ đệ"],
    ["rec", "Kỷ lục"],
  ],
  _actModal = actModal;
actModal = (n) => {
  if (!u2any()) return _actModal(n === "boat" ? "dg" : n);
  if (!S.fac) return;
  if (n === "dt" || n === "st") {
    u2Open("quest", n);
    return;
  }
  if (n === "tm") {
    ((u2KtcCat = KTC_CAT.length - 1), ktcModal());
    return;
  }
  (n && (actTab = n), actTab === "tm" && (actTab = "dg"));
  const a = () =>
    U2_ACTT.map(([c, s]) => `<button data-a="${c}" class="${c === actTab ? "on" : ""}">${s}</button>`).join("");
  if (actTab !== "boat") {
    _actModal();
    const c = $("#actTabs");
    c && ((c.innerHTML = a()), c.querySelectorAll("button").forEach((s) => (s.onclick = () => actModal(s.dataset.a))));
    return;
  }
  modal(`<h3>Hoạt động</h3><div class="dtabs" id="actTabs">${a()}</div>${boatBody()}`, () => {
    (document.querySelectorAll("#actTabs button").forEach((c) => (c.onclick = () => actModal(c.dataset.a))),
      bindBoat($("#mBody")));
  });
};
const _modalClose = closeModal;
closeModal = (n) => {
  (_modalClose(n), $("#modal").classList.remove("u2ktc"));
};
function u20ZoneName() {
  const n = $("#u20zn");
  if (!n || !S.fac) return;
  const a = R.dg
    ? R.dg.kind === "boat"
      ? "Phong Lăng Độ"
      : R.dg.d
        ? R.dg.d.n
        : "Phó bản"
    : R.town
      ? (W.town && W.town.n) || "Thành thị"
      : (() => {
          const c = zoneIdx(Math.min(S.stage, STAGES)),
            s = ZONES[c],
            i = ZALT[c],
            t = (S.zalt || {})[c] || 0;
          return ((i && t && i[t - 1]) || s).n;
        })();
  n.textContent !== a && (n.textContent = a);
}
function u20ZoneList(n) {
  const a = $("#u20zl");
  if (!n && !a.classList.contains("hidden")) {
    a.classList.add("hidden");
    return;
  }
  const c = zoneOf(Math.min(S.stage, STAGES)),
    s = ZONES.map((o, d) => {
      const u = zoneOpen(d),
        m = zoneIdx(Math.min(S.stage, STAGES)) === d,
        h = ZALT[d],
        e = (S.zalt || {})[d] || 0,
        l = (h && e && h[e - 1]) || o,
        r =
          h && u
            ? `<div class="zalt">${[o]
                .concat(h)
                .map((b, f) => `<button class="chip2${f === e ? " on" : ""}" data-za="${d}:${f}">${esc(b.n)}</button>`)
                .join("")}</div>`
            : "";
      return `<button class="zrow${m ? " cur" : ""}${u ? "" : " lock"}" data-z="${d}" ${u ? "" : "disabled"}><b>${esc(l.n)}</b><span>${seriesDots(l)} Cấp ${o.lo}–${o.hi}</span></button>${r}`;
    }).join("");
  ((a.innerHTML = `<div class="u2zh"><b>Bản đồ luyện công</b><label><input type="checkbox" id="u20za" ${S.autoMap !== !1 ? "checked" : ""}> Tự đổi theo cấp</label></div>
    <div class="u2zs">Quái hệ: ${seriesMix(c)}</div><div class="u2zr">${s}</div>`),
    a.classList.remove("hidden"));
  const i = a.querySelector(".zrow.cur");
  i && !n && i.scrollIntoView({ block: "center" });
  const t = (o) => {
    ((S.mode === "quest" || S.mode === "dg") &&
      ((S.mode = "farm"), log("⚔ Chọn bãi luyện công: chuyển sang chế độ Luyện công.")),
      (S.autoMap = !1),
      gotoZone(o, "Chọn bãi luyện công"),
      save(),
      refresh(),
      a.classList.add("hidden"));
  };
  (a.querySelectorAll(".zrow").forEach((o) => (o.onclick = () => t(+o.dataset.z))),
    a.querySelectorAll("[data-za]").forEach(
      (o) =>
        (o.onclick = () => {
          const [d, u] = o.dataset.za.split(":").map(Number);
          (((S.zalt || (S.zalt = {}))[d] = u),
            zoneIdx(Math.min(S.stage, STAGES)) === d
              ? ((S.wave = 1), (R.enemies = []), (R.spawnT = 0.3), (R.zoneShown = null))
              : t(d),
            save(),
            refresh(),
            u20ZoneList(!0));
        }),
    ),
    ($("#u20za").onchange = (o) => {
      ((S.autoMap = o.target.checked), save());
    }));
}
document.addEventListener("pointerdown", (n) => {
  const a = $("#u20zone");
  if (a && !a.contains(n.target)) {
    const c = $("#u20zl");
    c && c.classList.add("hidden");
  }
});
async function rankModal20() {
  if (typeof netOn != "function" || !netOn()) return toast("Bản chơi trên máy không có bảng xếp hạng");
  const n = RANKS.map(([t, o]) => `<button data-rk="${t}" class="${t === NET.rank ? "on" : ""}">${o}</button>`).join(
    "",
  );
  modal(
    `<h3>Bảng Xếp Hạng</h3><div class="dtabs" id="rkTabs">${n}</div><div id="rkBody"><p class="dim small">Đang tải…</p></div>`,
    () => {
      document.querySelectorAll("#rkTabs [data-rk]").forEach(
        (t) =>
          (t.onclick = () => {
            ((NET.rank = t.dataset.rk), rankModal20());
          }),
      );
    },
  );
  try {
    await netClient();
  } catch (t) {
    const o = $("#rkBody");
    o && (o.innerHTML = `<p class="reqbad">${esc(t.message)}</p>`);
    return;
  }
  const a = $("#rkBody");
  if (!a) return;
  try {
    await netRankBody(a);
  } catch (t) {
    a.innerHTML = `<p class="reqbad">${esc(t.message || t)}</p>`;
    return;
  }
  const c = $("#nrCol");
  c && (c.style.display = "none");
  const s = $("#nrFac");
  (s &&
    (s.onchange = (t) => {
      ((NET.rfac = t.target.value), rankModal20());
    }),
    a.querySelectorAll("[data-pn]").forEach(
      (t) =>
        (t.onclick = (o) => {
          (o.preventDefault(), profileModal(t.dataset.pn, () => rankModal20()));
        }),
    ));
  const i =
    S &&
    S.name &&
    [...a.querySelectorAll("tr")].findIndex(
      (t) => t.querySelector("[data-pn]") && t.querySelector("[data-pn]").dataset.pn === S.name,
    );
  a.insertAdjacentHTML(
    "afterbegin",
    `<p class="small">Hạng của bạn: <span class="gold" style="font-weight:700">${i > 0 ? "#" + i : "ngoài top 50"}</span>${NET.user ? "" : ' <span class="dim">(đăng nhập ở Hệ thống › Tài khoản để có tên trên bảng)</span>'}</p>`,
  );
}
