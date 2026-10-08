"use strict";
// Lệnh bài Admin (hotbar slot 5 / phím 5): offline / admin-account cheat panel — level, money,
// items, equipment, skills, world. Self-contained like thanhanh.js: hooks existing
// globals at DOMContentLoaded so other files stay untouched.
//
// GATE: every entry point goes through admOk(). The clone talks only to its own
// server (server/main.py, see docs/backend.md):
//   - offline: ?offline_test=1 (NET_LOCAL), no server configured (!netOn()), or the player
//     picked "chơi offline" on the login gate (NET.offline), with no account session and
//     a character that is not cloud-bound (S.netOwner);
//   - online: only when the logged-in account is flagged is_admin on our own server
//     (`python3 server/main.py --make-admin <user>`, see admHostOk). The server accepts
//     admin accounts' edited characters.
// A character that used the panel is tagged S.adm = 1 and, for non-admin accounts, the net
// upload / sell / gift calls refuse it (admGuardNet); the server rejects such uploads too.
const ADM_NAME = "Lệnh bài Admin",
  ADM_DENY = "Lệnh bài Admin chỉ dùng khi chơi offline hoặc với tài khoản admin",
  ADM_IC = "img/ep/ldt.png?adm", // Lệnh Bài Dã Tẩu token, tinted red by CSS (see ADM_CSS)
  ADM_TABS = [
    ["lv", "Cấp"],
    ["money", "Tiền"],
    ["item", "Vật phẩm"],
    ["eq", "Trang bị"],
    ["skill", "Chiến đấu"],
    ["world", "Thế giới"],
  ];
let admTab = "lv",
  admCh = 0, // character the Cấp / Trang bị / Chiến đấu actions apply to (0 = main, k = disciple k, js/party.js)
  admEq = { d: 0, k: 0, lv: 10, n: 6, s: -1, q: 1 },
  admSet = "",
  admHorse = "";

// Logged in to our own server with an account flagged is_admin (sent by /api/auth/*).
function admHostOk() {
  return (
    typeof NET != "undefined" && !!NET.user && !!NET.user.is_admin && typeof netOn == "function" && netOn()
  );
}
// The one check every admin path uses.
function admOk() {
  if (typeof S == "undefined" || !S || !S.fac) return !1;
  if (admHostOk()) return !0;
  if (S.netOwner) return !1; // character bound to a cloud account
  if (typeof NET == "undefined") return !0; // net.js not loaded: pure offline build
  if (NET.user) return !1; // logged in to the online server
  if (typeof NET_LOCAL != "undefined" && NET_LOCAL) return !0;
  if (typeof netOn == "function" && !netOn()) return !0; // no server configured
  return !!NET.offline;
}
// Run an admin action: gate, tag the save, log "[Admin] …", save, refresh UI.
function admDo(fn) {
  if (!admOk()) {
    toast(ADM_DENY);
    $("#mBody .admbox") && closeModal(!0);
    return;
  }
  let msg;
  try {
    msg = fn();
  } catch (e) {
    console.error(e);
    toast("Lỗi: " + (e && e.message));
    return;
  }
  if (!msg) return; // action refused itself (toast shown)
  S.adm = 1;
  R.dirty = !0;
  typeof invDirty != "undefined" && (invDirty = !0);
  log(`<span class="admlog">[Admin]</span> ${msg}`);
  toast(msg.replace(/<[^>]+>/g, ""));
  uiSfx("use");
  save();
  refresh();
  $("#mBody .admbox") && !$("#modal").classList.contains("hidden") && admModal();
}
const admInvFree = () => INV_MAX - S.inv.length;
function admGive(items) {
  let n = 0;
  for (const it of items) {
    if (!it) continue;
    if (S.inv.length >= INV_MAX) break;
    // Straight into Hành trang: addItem() would route white/blue gear to the Đồ phổ box
    // (epAutoStore) or auto-sell it by the loot filter.
    if ((typeof eqBanned == "function" && eqBanned(it)) || (typeof eqRemoved == "function" && eqRemoved(it))) continue;
    S.inv.unshift(it);
    typeof recItem == "function" && recItem(it);
    n++;
  }
  return n;
}

// ---------- Cấp ----------
function admLvLoop() {
  const cap = levelCap();
  let up = 0;
  for (; S.lvl < cap && S.xp >= lvNeed(S.lvl);)
    ((S.xp -= lvNeed(S.lvl)), S.lvl++, (S.attrPts += PTS_PER_LEVEL), (S.skPts += SKILL_PTS_PER_LEVEL), up++);
  S.lvl >= cap && (S.xp = 0);
  if (up) {
    // Same bookkeeping as gainXp() (combat.js), once for the whole jump.
    R.dirty = !0;
    uiSfx("levelup");
    typeof onLevelUp == "function" && onLevelUp();
  }
  return up;
}
function admLvTo(n) {
  const cap = levelCap(),
    to = clamp(Math.floor(+n) || 0, 1, cap),
    from = S.lvl;
  if (to <= from) return (toast(to < from ? "Chỉ tăng cấp được (giảm cấp: dùng Tẩy Tủy)" : `Đang ở cấp ${from}`), "");
  let need = -S.xp;
  for (let l = from; l < to; l++) need += lvNeed(l);
  S.xp += need;
  admLvLoop();
  return `Lên cấp ${from} → <b>${S.lvl}</b> (+${(S.lvl - from) * PTS_PER_LEVEL} tiềm năng, +${(S.lvl - from) * SKILL_PTS_PER_LEVEL} kỹ năng)`;
}
function admXp(f) {
  if (S.lvl >= levelCap()) return (toast("Đã đạt cấp tối đa"), "");
  const a = Math.round(lvNeed(S.lvl) * f),
    from = S.lvl;
  S.xp += a;
  admLvLoop();
  return `+${fmt(a)} kinh nghiệm${S.lvl > from ? ` · lên cấp <b>${S.lvl}</b>` : ""}`;
}
function admTabLv() {
  const cap = levelCap(),
    need = S.lvl < cap ? lvNeed(S.lvl) : 0;
  return `<div class="card stats"><span>Cấp</span><span>${S.lvl} / ${cap}</span><span>Kinh nghiệm</span><span>${need ? `${fmt(Math.floor(S.xp))} / ${fmt(need)} (${Math.floor((S.xp / need) * 100)}%)` : "tối đa"}</span><span>Điểm tiềm năng</span><span>${S.attrPts}</span><span>Điểm kỹ năng</span><span>${S.skPts}</span></div>
  <div class="admh">Lên cấp</div><div class="btnrow"><button class="btn sm" data-a="lv:1">+1 cấp</button><button class="btn sm" data-a="lv:10">+10 cấp</button><button class="btn sm" data-a="lv:50">+50 cấp</button><button class="btn sm on" data-a="lvmax">Cấp ${cap}</button></div>
  <div class="admf"><label>Đặt cấp <input type="number" id="admLv" min="${S.lvl + 1}" max="${cap}" value="${Math.min(cap, Math.max(S.lvl + 1, 80))}"></label><button class="btn sm" data-a="lvset">Đặt</button></div>
  <div class="admh">Kinh nghiệm (theo cấp hiện tại)</div><div class="btnrow"><button class="btn sm" data-a="xp:0.1">+10%</button><button class="btn sm" data-a="xp:0.5">+50%</button><button class="btn sm" data-a="xp:1">+100%</button></div>
  <div class="admh">Điểm</div><div class="btnrow"><button class="btn sm" data-a="ap:10">+10 tiềm năng</button><button class="btn sm" data-a="ap:100">+100 tiềm năng</button><button class="btn sm" data-a="sp:5">+5 kỹ năng</button><button class="btn sm" data-a="sp:50">+50 kỹ năng</button><button class="btn sm on" data-a="spend">Tự cộng hết điểm</button></div>
  ${typeof isNovice == "function" && isNovice() && S.lvl >= NOVICE_LV ? `<div class="btnrow"><button class="btn sm on" data-a="join">Gia nhập môn phái</button></div>` : ""}
  <p class="dim small">Lên cấp đi theo đường lên cấp của game (cộng tiềm năng / kỹ năng mỗi cấp, tự cộng điểm nếu bật, tự đổi bãi, mốc quà cấp).</p>`;
}

// ---------- Tiền ----------
const ADM_CUR = [
  ["gold", "Ngân lượng", "", [1e5, 1e6, 1e7, 1e8], (n) => (S.gold += n), () => S.gold, (n) => fmtL(n)],
  ["knb", "Kim Nguyên Bảo", "img/ep/knb.png", [10, 100, 1e3], (n) => (S.knb = (S.knb || 0) + n), () => S.knb || 0, fmt],
  ["fd", "Phúc Duyên", "img/ep/fd.png", [10, 100, 1e3], (n) => (RW().fd = (RW().fd || 0) + n), () => RW().fd || 0, fmt],
];
function admTabMoney() {
  return (
    ADM_CUR.map(
      ([k, n, ic, steps, , have, f]) =>
        `<div class="admcur">${ic ? `<img src="${ic}" alt="">` : '<i class="coin admcoin"></i>'}<span><b>${n}</b><small>đang có ${f(have())}</small></span><div class="btnrow">${steps.map((s) => `<button class="btn sm" data-a="cur:${k}:${s}">+${f(s)}</button>`).join("")}</div></div>`,
    ).join("") +
    `<div class="admf"><select id="admCurK">${ADM_CUR.map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select><input type="number" id="admCurN" min="1" value="1000000"><button class="btn sm" data-a="curset">Thêm</button></div>`
  );
}
function admCur(k, n) {
  const c = ADM_CUR.find((e) => e[0] === k);
  n = Math.floor(+n);
  if (!c || !(n > 0) || n > 1e12) return (toast("Số không hợp lệ"), "");
  c[4](n);
  return `+${c[6](n)} ${c[1]}`;
}

// ---------- Vật phẩm ----------
function admKtcList() {
  return typeof KTC == "undefined" ? [] : KTC.filter((e) => e.k !== "knb" && typeof e.use == "function");
}
function admKtc(k, q) {
  const e = admKtcList().find((x) => x.k === k);
  if (!e) return "";
  // KTC use() hooks also bump daily purchase counters — keep those untouched.
  const ld = typeof ldtDay == "function" ? ldtDay().n : 0;
  let last = "";
  for (let i = 0; i < q; i++) last = e.use() || "";
  typeof ldtDay == "function" && (ldtDay().n = ld);
  return q > 1 ? `Nhận ${q} × ${esc(e.n)}` : esc(last || e.n);
}
function admTabItem() {
  const pots = J.potions
      .map(
        (p, i) =>
          `<button class="shoprow" data-a="pot:${i}"><img src="${esc(p.ic || "")}" alt=""><span><b>${esc(p.n)}</b><small>${p.kind === "life" ? "sinh lực" : p.kind === "mana" ? "nội lực" : "sinh lực + nội lực"} · còn ${potStock(p.kind)[p.tier] || 0}</small></span><em>+100</em></button>`,
      )
      .join(""),
    ktc = admKtcList()
      .map(
        (e) =>
          `<div class="shoprow admrow"><img src="${esc(e.ic)}" alt=""><span><b>${esc(e.n)}</b><small>${esc(e.d)}</small></span><span class="btnrow"><button class="btn sm" data-a="ktc:${e.k}:1">+1</button><button class="btn sm" data-a="ktc:${e.k}:10">+10</button></span></div>`,
      )
      .join(""),
    misc = [
      ["thp", typeof TH_NAME != "undefined" ? TH_NAME : "Thần Hành Phù", "img/ep/ldp.png?th", 1],
      ["wc", "Thủy Tinh Trắng", "img/ep/wc.png", 10],
      ["mys", "Thần Bí Khoáng Thạch", "img/ep/mys.png", 10],
    ]
      .map(
        ([k, n, ic, q]) =>
          `<button class="shoprow" data-a="misc:${k}:${q}"><img src="${ic}" alt=""><span><b>${n}</b><small>đang có ${matHave("misc", k)}</small></span><em>+${q}</em></button>`,
      )
      .join("");
  return `<div class="btnrow"><button class="btn sm on" data-a="potall">Mọi loại thuốc +100</button></div>
  <div class="shoplist admlist"><div class="admh">Thuốc</div>${pots}
  <div class="admh">Phù · nguyên liệu</div>${misc}
  <div class="shoprow admrow"><img src="img/ep/ht.png" alt=""><span><b>Huyền Tinh Khoáng Thạch</b><small>chọn cấp</small></span><span class="btnrow"><select id="admHt">${Array.from({ length: HT_MAX }, (_, i) => `<option${i + 1 === Math.min(HT_MAX, Math.floor(S.lvl / 15) + 1) ? " selected" : ""}>${i + 1}</option>`).join("")}</select><button class="btn sm" data-a="ht:10">+10</button></span></div>
  <div class="shoprow admrow"><img src="img/ep/da1.png" alt=""><span><b>Đá thuộc tính</b><small>cấp theo cấp nhân vật, hợp đồ đang mặc</small></span><span class="btnrow"><button class="btn sm" data-a="ore:5">+5</button></span></div>
  <div class="admh">Kỳ Trân Các</div>${ktc}</div>
  <p class="dim small">Thổ Địa Phù dùng mãi không mất: hồi chiêu đặt lại ở thẻ Thế giới.</p>`;
}

// ---------- Trang bị ----------
const admKinds = (d) => {
  const it = J.items[d];
  if (!it) return [];
  const m = new Map();
  for (const r of it.list) m.has(r.k) || m.set(r.k, r);
  return [...m.values()].map((r) => [r.k, r.n]);
};
function admMake(d, k, lv, lines, s) {
  let it = null;
  for (let i = 0; i < 8 && !(it && sexOk(it)); i++) it = makeItem(d, sexPart(d, k), lv, lines, s);
  return it;
}
function admEqMake() {
  const e = admEq,
    q = clamp(e.q | 0, 1, 20);
  if (admInvFree() < 1) return (toast("Hành trang đầy"), "");
  const its = [];
  for (let i = 0; i < Math.min(q, admInvFree()); i++) its.push(admMake(e.d, e.k, e.lv, e.n, e.s));
  const n = admGive(its);
  return n ? `Tạo ${n} × <b>${esc(its[0].n)}</b> (cấp phẩm ${e.lv}, ${e.n} dòng)` : (toast("Không tạo được món này"), "");
}
function admFullGear(wear) {
  const lv = admEq.lv,
    lines = admEq.n,
    [wd, wk] = wantWeaponDP(),
    plan = [[wd, wk], [2], [3], [3], [4], [5], [6], [7], [8], [9]];
  if (admInvFree() < plan.length) return (toast(`Cần ${plan.length} ô trống trong hành trang`), "");
  const its = plan.map(([d, k]) => {
    const ks = admKinds(d).map((x) => x[0]);
    // Prefer a kind this character can wear (sex / faction / attribute requirements).
    let it = null;
    for (let i = 0; i < 16; i++) {
      it = admMake(d, k != null ? k : ks.length ? pick(ks) : 0, lv, lines, admEq.s);
      if (it && (typeof reqOk != "function" || reqOk(it))) break;
    }
    return it;
  });
  const n = admGive(its);
  wear && typeof autoEquipAll == "function" && autoEquipAll();
  return `Tạo trọn bộ ${n} món (cấp phẩm ${lv}, ${lines} dòng)${wear ? ", tự mặc đồ tốt hơn" : ""}`;
}
function admSets() {
  if (!J.sets || !J.sets.gold) return [];
  const m = new Map();
  for (const r of J.sets.gold) {
    if (typeof setRowOk == "function" && !setRowOk(r)) continue;
    if (!sexReqOk(r.req)) continue;
    const g = m.get(r.grp) || { grp: r.grp, rows: [], lv: 999 };
    g.rows.push(r);
    g.lv = Math.min(g.lv, (r.req.find((x) => x[0] === 36) || [0, 0])[1]);
    m.set(r.grp, g);
  }
  const fid = FAC[S.fac] ? FAC[S.fac].id : -1;
  return [...m.values()]
    .map((g) => {
      const f = (g.rows[0].req.find((x) => x[0] === 39) || [0, -1])[1],
        nm = (typeof SET_GRP_NAME != "undefined" && SET_GRP_NAME[g.grp]) || bareName(g.rows[0].n).split(" ").slice(0, 2).join(" "),
        fac = f >= 0 ? (FACTIONS.find((x) => x.id === f) || {}).n : "";
      return { ...g, n: `${nm}${fac ? ` · ${fac}` : ""} (cấp ${g.lv}, ${g.rows.length} món)`, mine: f >= 0 && f === fid };
    })
    .sort((a, b) => b.mine - a.mine || a.lv - b.lv || a.n.localeCompare(b.n));
}
function admSetGive() {
  const g = admSets().find((x) => String(x.grp) === String(admSet));
  if (!g) return (toast("Chọn bộ Hoàng Kim"), "");
  if (admInvFree() < g.rows.length) return (toast(`Cần ${g.rows.length} ô trống trong hành trang`), "");
  const n = admGive(g.rows.map((r) => makeSetItem("gold", r, 10)));
  return `Nhận ${n} món bộ Hoàng Kim <b style="color:${RAR_COL[4]}">${esc(g.n)}</b>`;
}
function admHorses() {
  const it = J.items[10];
  if (!it) return [];
  const m = new Map();
  for (const r of it.list) {
    if (!sexReqOk(r.req)) continue;
    const o = m.get(r.k);
    (!o || r.lvl > o.lvl) && m.set(r.k, r);
  }
  return [...m.values()];
}
function admHorseGive() {
  const r = admHorses().find((x) => String(x.k) === String(admHorse));
  if (!r) return (toast("Chọn ngựa"), "");
  if (admInvFree() < 1) return (toast("Hành trang đầy"), "");
  const h = makeItem(10, r.k, r.lvl, 0);
  if (!h) return "";
  typeof HORSE_RARE != "undefined" && HORSE_RARE.includes(r.k) && ((h.r = 2), (h.rareH = 1));
  return admGive([h]) ? `Nhận ngựa <b>${esc(h.n)}</b>` : "";
}
function admTabEq() {
  const e = admEq,
    ds = Object.keys(J.items)
      .map(Number)
      .filter((d) => d !== 10),
    ks = admKinds(e.d);
  ks.some((x) => x[0] === e.k) || (e.k = ks.length ? ks[0][0] : 0);
  const sets = admSets(),
    hs = admHorses();
  sets.some((g) => String(g.grp) === String(admSet)) || (admSet = sets.length ? String(sets[0].grp) : "");
  hs.some((h) => String(h.k) === String(admHorse)) || (admHorse = hs.length ? String(hs[hs.length - 1].k) : "");
  const opt = (v, cur, label) => `<option value="${v}"${String(v) === String(cur) ? " selected" : ""}>${esc(label)}</option>`;
  return `<p class="dim small">Hành trang trống ${admInvFree()} / ${INV_MAX} ô. Đồ tạo bằng bộ sinh đồ của game (như đồ rơi). Tự mặc chỉ mặc món đủ yêu cầu (thiếu sức mạnh / thân pháp: thêm tiềm năng ở thẻ Cấp).</p>
  <div class="admh">Tạo món</div>
  <div class="admgrid">
    <label>Loại<select id="admEqD">${ds.map((d) => opt(d, e.d, J.items[d].n)).join("")}</select></label>
    <label>Kiểu<select id="admEqK">${ks.map(([k, n]) => opt(k, e.k, n)).join("")}</select></label>
    <label>Cấp phẩm<select id="admEqL">${Array.from({ length: 10 }, (_, i) => opt(i + 1, e.lv, String(i + 1))).join("")}</select></label>
    <label>Số dòng<select id="admEqN">${Array.from({ length: 7 }, (_, i) => opt(i, e.n, i ? `${i} dòng` : "Trắng")).join("")}</select></label>
    <label>Hệ<select id="admEqS">${opt(-1, e.s, "Ngẫu nhiên")}${SERIES.map((n, i) => opt(i, e.s, n)).join("")}</select></label>
    <label>Số lượng<input type="number" id="admEqQ" min="1" max="20" value="${e.q}"></label>
  </div>
  <div class="btnrow"><button class="btn sm on" data-a="eqmake">Tạo</button><button class="btn sm" data-a="eqfull:0">Trọn bộ 10 món</button><button class="btn sm" data-a="eqfull:1">Trọn bộ + tự mặc</button></div>
  <div class="admh">Bộ Hoàng Kim</div>
  <div class="admf"><select id="admSet">${sets.map((g) => opt(g.grp, admSet, (g.mine ? "★ " : "") + g.n)).join("")}</select><button class="btn sm" data-a="set">Nhận trọn bộ</button></div>
  <div class="admh">Ngựa</div>
  <div class="admf"><select id="admHorse">${hs.map((h) => opt(h.k, admHorse, `${h.n} (cấp ${(h.req.find((x) => x[0] === 36) || [0, 0])[1]})`)).join("")}</select><button class="btn sm" data-a="horse">Nhận ngựa</button></div>`;
}

// ---------- Chiến đấu ----------
function admMaxSkills() {
  const f = FAC[S.fac];
  if (!f || !f.skills) return (toast("Chưa có môn phái"), "");
  let n = 0;
  const L = typeof SKL == "function" ? SKL() : {},
    one = (pass2) => {
      for (const id of f.skills) {
        const t = SK[id];
        if (!t || !skReqOk(t)) continue;
        const br = typeof isBr90 == "function" && isBr90(id);
        if (br !== pass2) continue;
        let to;
        if (t.tier === 90 && !br) {
          to = t.max;
          L[id] = { lv: to, xp: 0 };
          t.book && ((S.bkOk || (S.bkOk = {}))[id] = 1);
        } else to = skCap(t);
        to > (S.sk[id] || 0) && ((S.sk[id] = to), n++);
      }
    };
  one(!1);
  one(!0); // 90 branch skills: cap depends on their branch skills
  if (!n) return (toast("Võ công đã tối đa ở cấp hiện tại"), "");
  R.dirty = !0;
  recalc();
  typeof fillSlots == "function" && fillSlots();
  renderPad();
  return `Tối đa ${n} võ công (theo giới hạn cấp hiện tại)`;
}
function admResetCd() {
  R.potCd = { life: 0, mana: 0 };
  R.skCd = {};
  R.tpCd = 0;
  R.thAt = 0;
  R.rideCd = 0;
  typeof SKS == "function" && (SKS().cd = {});
  return "Đặt lại mọi thời gian hồi (chiêu, thuốc, Thổ Địa Phù, Thần Hành Phù, ngựa)";
}
function admFull() {
  R.dirty && recalc();
  R.life = R.P.life;
  R.mana = R.P.mana;
  R.hpDot = R.hpDotT = 0;
  return "Hồi đầy sinh lực + nội lực";
}
function admTabSkill() {
  const sw = (k, on, n, d) =>
    `<button class="shoprow admsw${on ? " own" : ""}" data-a="${k}"><span class="admck">${on ? "✔" : ""}</span><span><b>${n}</b><small>${d}</small></span><em>${on ? "Đang bật" : "Tắt"}</em></button>`;
  return `<div class="btnrow"><button class="btn sm on" data-a="skmax">Tối đa võ công</button><button class="btn sm" data-a="cd">Đặt lại hồi chiêu</button><button class="btn sm" data-a="full">Hồi đầy HP / MP</button></div>
  <div class="shoplist admlist">${sw("god", !!R.admGod, "Bất tử", "Quái đánh không mất máu, không thể trọng thương")}${sw("ohk", !!R.admOhk, "Nhất kích", "Mỗi đòn đánh trúng hạ gục mục tiêu")}</div>
  <p class="dim small">Bất tử / Nhất kích chỉ có hiệu lực trong phiên này (tải lại trang sẽ tắt).</p>`;
}

// ---------- Thế giới ----------
function admGo(k) {
  if (typeof thGo != "function") return (toast("Thiếu Thần Hành Phù"), "");
  if (k.startsWith("v:")) {
    // JX1 destination (thanhanh_dest.js): unlock the zone it uses (visit / zone maps)
    const d = typeof thDest == "function" && thDest(k.split(":")[1]),
      p = d && thPlan(d);
    p && p.z != null && !zoneOpen(p.z) && (S.maxStage = Math.max(S.maxStage || 1, zoneFirst(p.z)));
  } else if (k !== "town") {
    const z = +k.split(":")[0];
    zoneOpen(z) || (S.maxStage = Math.max(S.maxStage || 1, zoneFirst(z)));
  }
  // Reuse Thần Hành Phù's travel path, ignoring its cooldown / item count.
  const had = thHave(),
    at = R.thAt;
  had < 1 && matAdd("misc", TH_KEY, 1);
  R.thAt = 0;
  const lg = R.logs && R.logs[0],
    mg = typeof MIGU == "object" ? MIGU : null; // Mật Cốc: no pass / level needed (js/migu.js)
  mg && mg.adm++;
  try {
    thGo(k);
  } finally {
    mg && mg.adm--;
  }
  const moved = R.logs && R.logs[0] !== lg;
  had < 1 && matAdd("misc", TH_KEY, -1);
  R.thAt = at;
  moved && R.logs[0].includes(TH_NAME) && R.logs.shift();
  if (!moved) return "";
  const dest = typeof thKeyName == "function" ? thKeyName(k) : k;
  return `Dịch chuyển tới <b>${esc(dest)}</b>`;
}
// Same destination list as the Thần Hành Phù picker (thanhanh.js thListHTML), rows act via data-a="go:<key>".
function admTabWorld() {
  const list = typeof thListHTML == "function" ? thListHTML(!0) : "";
  return `<div class="btnrow"><button class="btn sm on" data-a="unlock">Mở mọi bãi luyện công</button><button class="btn sm" data-a="cd">Đặt lại Thổ Địa / Thần Hành</button></div>
  <input id="admThQ" class="thq" type="search" placeholder="Tìm bản đồ…" autocomplete="off">
  <div class="shoplist admlist thlist">${list}</div>
  <p class="dim small">Mọi nơi đến của Thần Hành Phù (JX1) + bãi luyện công. Dịch chuyển dùng đường đi của Thần Hành Phù (không tốn phù, không hồi, tự mở bãi). Không dùng được trong phó bản, Tháp, khi đi thuyền hoặc truy sát.</p>`;
}

// ---------- Character selector (đồ đệ) ----------
const ADM_CH_TABS = { lv: 1, eq: 1, skill: 1 },
  admChN = () => (typeof partyN == "function" ? partyN() : 0),
  admChOf = (k) => (ADM_CH_TABS[k] || k === "join" || k === "ore" ? admCh : 0),
  admInCh = (k, fn) => (typeof withChar == "function" && admChOf(k) ? withChar(admChOf(k), fn) : fn());
function admChRow() {
  if (!admChN() || !ADM_CH_TABS[admTab]) return "";
  admCh > admChN() && (admCh = 0);
  return `<div class="dtabs admch"><small class="dim">Áp dụng cho:</small>${partyIdx()
    .map(
      (k) =>
        `<button data-ach="${k}" class="${k === admCh ? "on" : ""}">${k + 1}. ${esc(charGet(k, "name") || "")} <small>Lv${charGet(k, "lvl")}</small></button>`,
    )
    .join("")}</div>`;
}

// ---------- Modal ----------
function admModal() {
  if (!admOk()) return toast(ADM_DENY);
  const body0 = { lv: admTabLv, money: admTabMoney, item: admTabItem, eq: admTabEq, skill: admTabSkill, world: admTabWorld }[admTab] || admTabLv,
    body = () => admInCh(admTab, body0),
    old = $("#mBody .admbody"),
    sc = old && $("#mBody .admbox") ? old.scrollTop : 0,
    ls = $("#mBody .admlist"),
    lsc = ls ? ls.scrollTop : 0;
  modal(
    `<div class="admbox"><h3><img src="${ADM_IC}" alt="" class="admic"> ${ADM_NAME} <small>${admHostOk() ? "admin online" : "offline"} · phím 5</small></h3>
    <div class="dtabs admtabs">${ADM_TABS.map(([k, n]) => `<button data-at="${k}" class="${k === admTab ? "on" : ""}">${n}</button>`).join("")}</div>
    ${admChRow()}<div class="admbody">${body()}</div></div>`,
    () => {
      const b = $("#mBody .admbody");
      b && (b.scrollTop = sc);
      const l = $("#mBody .admlist");
      l && (l.scrollTop = lsc);
      document.querySelectorAll("#mBody [data-at]").forEach((e) => (e.onclick = () => ((admTab = e.dataset.at), admModal())));
      document.querySelectorAll("#mBody [data-ach]").forEach((e) => (e.onclick = () => ((admCh = +e.dataset.ach), admModal())));
      document.querySelectorAll("#mBody [data-a]").forEach((e) => (e.onclick = () => admAct(e.dataset.a)));
      const v = (id) => $("#" + id);
      const eqSync = () => {
        const g = (id, d) => (v(id) ? +v(id).value : d);
        admEq = { d: g("admEqD", 0), k: g("admEqK", 0), lv: g("admEqL", 10), n: g("admEqN", 6), s: g("admEqS", -1), q: clamp(g("admEqQ", 1) | 0, 1, 20) };
      };
      v("admEqD") && (v("admEqD").onchange = () => (eqSync(), admModal()));
      ["admEqK", "admEqL", "admEqN", "admEqS", "admEqQ"].forEach((id) => v(id) && (v(id).onchange = eqSync));
      v("admSet") && (v("admSet").onchange = () => (admSet = v("admSet").value));
      v("admHorse") && (v("admHorse").onchange = () => (admHorse = v("admHorse").value));
      v("admThQ") &&
        typeof thFilter == "function" &&
        (v("admThQ").oninput = () => thFilter($("#mBody .admlist"), v("admThQ").value));
    },
  );
}
function admAct(a) {
  const [k, x, y] = a.split(":"),
    v = (id) => ($("#" + id) || {}).value;
  const tab = { lv: "lv", lvmax: "lv", lvset: "lv", xp: "lv", ap: "lv", sp: "lv", spend: "lv", eqmake: "eq", eqfull: "eq", set: "eq", horse: "eq", skmax: "skill", cd: "skill", full: "skill" }[k] || k;
  admDo(() => admInCh(tab, () => {
    switch (k) {
      case "lv":
        return admLvTo(S.lvl + +x);
      case "lvmax":
        return admLvTo(levelCap());
      case "lvset":
        return admLvTo(v("admLv"));
      case "xp":
        return admXp(+x);
      case "ap":
        return ((S.attrPts += +x), `+${x} điểm tiềm năng`);
      case "sp":
        return ((S.skPts += +x), `+${x} điểm kỹ năng`);
      case "spend": {
        // The game's own auto-allocation (same as "Tự cộng điểm" on level-up).
        const a = S.attrPts,
          s = S.skPts;
        autoSpendAttrs();
        FAC[S.fac] && !isNovice() && autoSpendSkills();
        R.dirty = !0;
        recalc();
        typeof autoEquipAll == "function" && autoEquipAll();
        renderPad();
        return a - S.attrPts || s - S.skPts
          ? `Tự cộng ${a - S.attrPts} tiềm năng, ${s - S.skPts} điểm kỹ năng`
          : (toast("Không còn điểm để cộng"), "");
      }
      case "join": {
        const c = admCh; // the faction picker acts on the selected character
        return (setTimeout(() => withChar(c, () => (closeModal(!0), joinModal())), 0), "Mở bảng gia nhập môn phái");
      }
      case "cur":
        return admCur(x, y);
      case "curset":
        return admCur(v("admCurK"), v("admCurN"));
      case "pot":
      case "potall": {
        const ps = k === "pot" ? [J.potions[+x]] : J.potions;
        for (const p of ps) p && (potStock(p.kind)[p.tier] = (potStock(p.kind)[p.tier] || 0) + 100);
        return k === "pot" ? `+100 ${esc(ps[0].n)}` : `+100 mỗi loại thuốc (${ps.length} loại)`;
      }
      case "misc":
        return (matAdd("misc", x, +y), `+${y} ${esc(miscName(x))}`);
      case "ht": {
        const l = clamp(+v("admHt") || 1, 1, HT_MAX);
        return (matAdd("ht", l, +x), `+${x} Huyền Tinh cấp ${l}`);
      }
      case "ore": {
        const r = [];
        for (let i = 0; i < +x; i++) r.push(forceOre(S.lvl));
        return "Đá thuộc tính: " + r.map(esc).join(", ");
      }
      case "ktc":
        return admKtc(x, +y);
      case "eqmake":
        return admEqMake();
      case "eqfull":
        return admFullGear(x === "1");
      case "set":
        return admSetGive();
      case "horse":
        return admHorseGive();
      case "skmax":
        return admMaxSkills();
      case "cd":
        return admResetCd();
      case "full":
        return admFull();
      case "god":
        return ((R.admGod = !R.admGod), R.admGod && admFull(), `Bất tử: <b>${R.admGod ? "bật" : "tắt"}</b>`);
      case "ohk":
        return ((R.admOhk = !R.admOhk), `Nhất kích: <b>${R.admOhk ? "bật" : "tắt"}</b>`);
      case "unlock":
        return ((S.maxStage = STAGES), typeof syncMaxStage == "function" && syncMaxStage(), "Mở mọi bãi luyện công");
      case "go":
        return admGo(a.slice(3));
    }
    return "";
  }));
}
function admUse() {
  if (!S || !S.fac) return;
  if (!admOk()) return toast(ADM_DENY);
  admModal();
}

// ---------- Hooks ----------
// Never let an admin-touched character reach the shared server.
function admGuardNet() {
  const deny = () => new Error("Nhân vật đã dùng Lệnh bài Admin: không đồng bộ / giao dịch với máy chủ");
  const wrap = (name, bad) => {
    if (typeof window[name] != "function") return;
    const o = window[name];
    window[name] = function () {
      if (!admHostOk() && bad.apply(this, arguments)) return Promise.reject(deny());
      return o.apply(this, arguments);
    };
  };
  const cur = () => !!(S && S.adm);
  wrap("netUpload", cur);
  wrap("netSyncChar", cur);
  wrap("netSell", cur);
  wrap("netSendGift", cur);
  wrap("netUploadSlot", (i, st) => !!(st && st.adm));
}
function admHookCombat() {
  if (typeof enemyHit == "function") {
    const o = enemyHit;
    enemyHit = function (t) {
      if (R.admGod && admOk()) return (addText(H.x, H.y - 30, "Bất tử", "#ffd24a", 11), void 0);
      return o.apply(this, arguments);
    };
  }
  if (typeof heroDeath == "function") {
    const o = heroDeath;
    heroDeath = function () {
      if (R.admGod && admOk() && R.P) return void ((R.life = R.P.life), (R.hpDot = R.hpDotT = 0));
      return o.apply(this, arguments);
    };
  }
  if (typeof heroHit == "function") {
    const o = heroHit;
    heroHit = function (t, n) {
      const r = o.apply(this, arguments);
      R.admOhk && !R.quiet && n && r > 0 && n.hp > 0 && admOk() && (n.hp = 0);
      return r;
    };
  }
}
function admSyncBtn() {
  const b = $("#bAdm");
  if (!b) return;
  const ok = admOk();
  b.style.display = ok ? "" : "none";
  if (ok && R.admGod && R.P && R.life < R.P.life && !(R.deadT > 0)) R.life = R.P.life;
}

const ADM_CSS = `
img[src$="ldt.png?adm"],#pad .pbtn.adm i{filter:hue-rotate(-40deg) saturate(1.8) brightness(1.1)}
#pad .pbtn.adm i{background-image:url(img/ep/ldt.png)}
.pbtn.adm{background:radial-gradient(#c93a3a,#3a0808)}
.admic{height:18px;vertical-align:middle;image-rendering:pixelated}
.admbox h3 small{font-weight:normal}
.admtabs{display:flex;flex-wrap:wrap;gap:3px;margin:4px 0 6px}
.admtabs button{flex:1 1 auto;min-width:0;padding:4px 6px;font-size:12px}
.admch{display:flex;flex-wrap:wrap;gap:3px;align-items:center;margin:0 0 6px}
.admch button{padding:2px 6px;font-size:11px}
.admbody{max-height:62vh;overflow-y:auto;overflow-x:hidden;padding-right:2px}
.admbody .admlist{max-height:none}
.admh{color:var(--gold,#e0c060);font-weight:bold;margin:8px 0 3px;font-size:13px}
.admf{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0}
.admf select,.admf input,.admgrid select,.admgrid input{min-width:0;max-width:100%;padding:3px 4px;background:#111;color:#eee;border:1px solid #555;font:inherit;font-size:12px}
.admf select{flex:1 1 180px}
.admf input[type=number]{width:110px}
.admgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px;margin:4px 0}
.admgrid label{display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--dim,#bdb59a)}
.admcur{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--line,#3e3c30)}
.admcur img{width:28px;height:28px;object-fit:contain;image-rendering:pixelated}
.admcur .admcoin{display:inline-block;width:24px;height:18px;margin:5px 2px}
.admcur>span{flex:1 1 120px;min-width:0}
.admcur small{display:block;color:var(--dim,#bdb59a);font-size:11px}
.admrow{cursor:default;grid-template-columns:auto 1fr auto}
.admrow .btnrow{margin:0;flex-wrap:nowrap;align-items:center;gap:4px}
.admrow select{background:#111;color:#eee;border:1px solid #555}
.admlist .shoprow:not(:has(img)){grid-template-columns:1fr auto}
.admlist .shoprow.alt{margin-left:14px}
.admlist .shoprow.admsw{grid-template-columns:auto 1fr auto;align-items:center;text-align:left}
.admlist .shoprow.admsw>span{text-align:left}
.admsw .admck{display:inline-grid;place-items:center;width:20px;height:20px;border:1px solid #777;color:#ffd24a}
.admlog{color:#ff6a5a;font-weight:bold}
`;

function admInstall() {
  const st = document.createElement("style");
  st.textContent = ADM_CSS;
  document.head.appendChild(st);
  admGuardNet();
  admHookCombat();
  const btn = $("#bAdm");
  btn &&
    btn.addEventListener("pointerdown", (e) => {
      (e.preventDefault(), e.stopPropagation(), e.button !== 2 && admUse());
    });
  window.addEventListener("keydown", (e) => {
    if (e.repeat || e.key !== "5" || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (!S || !S.fac) return;
    const mb = $("#modal");
    if (mb && !mb.classList.contains("hidden") && $("#mBody .admbox")) return closeModal();
    admUse();
  });
  admSyncBtn();
  setInterval(() => {
    try {
      admSyncBtn();
    } catch {}
  }, 500);
}
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", admInstall) : setTimeout(admInstall, 0);
