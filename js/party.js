"use strict";
// Đồ đệ (party of characters). Model + context switch. See docs/party.md.
//
// S holds the MAIN character's per-character fields directly (so every existing function keeps working);
// each disciple's per-character fields live in a sheet in S.party[k-1] (k = 1..PARTY_MAX-1).
// withChar(k, fn) exchanges the per-character fields of S, the per-actor runtime fields of R and the actor
// fields of H with disciple k, runs fn, and exchanges them back: inside fn every existing function (calc,
// heroAttack, enemyHit, gainXp, equip, the UI renderers, the hero drawing code…) works on disciple k.
// swapMain(k) does the same exchange permanently (disciple k becomes the main character).
const PARTY_MAX = 4, // total characters (main + disciples); data/UI work for 5–7 as well
  // per-character fields of S (everything else in S is shared: gold, stash, mats, potions, quests, settings…)
  CHAR_KEYS = [
    "name",
    "fac",
    "sex",
    "sexSet",
    "lvl",
    "xp",
    "attrPts",
    "attr",
    "skPts",
    "sk",
    "main",
    "mainLock",
    "slots",
    "eq",
    "skL",
    "br90",
    "bkOk",
    "autoPts",
    "auraOff",
    "rot",
    "inv", // each character has its own bag (Hành trang); the stash (Kho chung) stays shared
    "invSort",
  ],
  // per-actor runtime fields of R (stats, HP/MP, cooldowns, target, mount, states, look…)
  ACT_RKEYS = [
    "P",
    "life",
    "mana",
    "power",
    "dirty",
    "atkT",
    "deadT",
    "skCd",
    "rotI",
    "tgt",
    "tgtD",
    "tgtHitT",
    "tgtBan",
    "moveTo",
    "dash",
    "dashTrail",
    "mounted",
    "rideCd",
    "rideCan",
    "slowT",
    "stunT",
    "hurtT",
    "hpDot",
    "hpDotT",
    "hot",
    "potCd",
    "sks",
    "look",
    "jx",
    "jxLast",
    "lookP",
    "dust",
    "dustT",
    "hsT",
    "stList",
    "stKey",
  ],
  // actor fields of H (position, facing, animation, path state)
  ACT_HKEYS = [
    "x",
    "y",
    "face",
    "dir",
    "act",
    "actT",
    "px",
    "py",
    "moving",
    "shOk",
    "animKey",
    "_sx",
    "_sy",
    "_nav",
    "_px",
    "_py",
    "_cx",
    "_cy",
    "_mx",
    "_my",
  ];
let PCTX = 0, // index of the character currently swapped into S/R/H (0 = main)
  PSEL = 0; // character selected in the UI tabs (0 = main)
const PT = { act: [], g: null, dfr: {} };
const isSheet = (s) => !!s && typeof s == "object" && !Array.isArray(s);
const partyOk = () => typeof S < "u" && !!S && !!S.fac && Array.isArray(S.party);
const partyN = () => (partyOk() ? S.party.length : 0); // number of disciples
const partyIdx = () => [...Array(partyN() + 1).keys()]; // 0 = main, 1..n disciples
const pSheet = (k) => (k > 0 && partyOk() ? S.party[k - 1] || null : null);
function rebGet() {
  return (S.rw && S.rw.stat && S.rw.stat.reborn) | 0;
}
function rebSet(v) {
  const rw = S.rw || (S.rw = {});
  (rw.stat || (rw.stat = {})).reborn = v | 0;
}
function newAct(k) {
  return {
    h: { x: H.x - 26 * k, y: H.y + 12, face: 1, dir: 0, act: "st", actT: 0 },
    r: { P: null, life: 1, mana: 1, dirty: !0, atkT: 0.2 + 0.15 * k, deadT: 0 },
    k,
  };
}
const pAct = (k) => PT.act[k] || (PT.act[k] = newAct(k));
// exchange the live S/R/H fields with disciple k's sheet + runtime (symmetric: calling twice restores)
function pSwap(k) {
  const sh = S.party[k - 1],
    a = pAct(k),
    r = a.r,
    h = a.h;
  Array.isArray(sh.inv) || (sh.inv = []);
  for (const key of CHAR_KEYS) {
    const v = S[key];
    ((S[key] = sh[key]), (sh[key] = v));
  }
  {
    const v = rebGet();
    (rebSet(sh.reb | 0), (sh.reb = v));
  }
  for (const key of ACT_RKEYS) {
    const v = R[key];
    ((R[key] = r[key]), (r[key] = v));
  }
  for (const key of ACT_HKEYS) {
    const v = H[key];
    ((H[key] = h[key]), (h[key] = v));
  }
}
function pEnter(k) {
  (pSwap(k), (PCTX = k));
}
function pExit() {
  const k = PCTX;
  ((PCTX = 0), pSwap(k));
}
// run fn with character k swapped in (0 = main). Nested calls with another index are supported.
function withChar(k, fn) {
  k = k | 0;
  if (k === PCTX || !partyOk()) return fn();
  if (PCTX) {
    const c = PCTX;
    pExit();
    try {
      return withChar(k, fn);
    } finally {
      pEnter(c);
    }
  }
  if (!pSheet(k)) return;
  pEnter(k);
  try {
    return fn();
  } finally {
    (pExit(), pFlush());
  }
}
const withMain = (fn) => withChar(0, fn);
// value of a per-character field of character k without swapping (UI tab labels etc.)
function charGet(k, key) {
  if (k === PCTX) return key === "reb" ? rebGet() : S[key];
  if (k === 0) {
    const sh = pSheet(PCTX);
    return sh ? sh[key] : void 0;
  }
  const sh = pSheet(k);
  return sh ? sh[key] : void 0;
}
// things that must run in the main context (top bar, hotbar, save…) are deferred while a disciple is in
function pDefer(name, fn) {
  return PCTX ? ((PT.dfr[name] = fn), (PT.dn = 1), !0) : !1;
}
function pFlush() {
  if (PCTX || !PT.dn) return;
  PT.dn = 0;
  const d = PT.dfr;
  PT.dfr = {};
  for (const n in d)
    try {
      d[n]();
    } catch (e) {
      console.error("[party] deferred " + n, e);
    }
}
// disciple k becomes the main character (and the main becomes disciple k)
function swapMain(k) {
  if (PCTX) return (pDefer("swapMain", () => swapMain(k)), !0);
  if (!pSheet(k)) return !1;
  if (R.deadT > 0 || pAct(k).r.deadT > 0) return (toast("Không đổi khi đang trọng thương"), !1);
  const oldName = S.name;
  (pSwap(k),
    (R.dirty = !0),
    (pAct(k).r.dirty = !0),
    (R.moveTo = null),
    (R.pickTarget = null),
    (R.tgt = null),
    typeof INPUT < "u" && INPUT && (INPUT.target = null),
    recalc(),
    typeof fillSlots == "function" && fillSlots(),
    typeof renderPad == "function" && renderPad(),
    typeof refreshRideBtn == "function" && refreshRideBtn(),
    typeof refreshRotBtn == "function" && refreshRotBtn(), // the hotbar Xoay chiêu switch is the new main's
    (PSEL = 0),
    log(`<b class="up">${esc(S.name)}</b> làm nhân vật chính · ${esc(oldName)} thành đồ đệ.`),
    toast(`Nhân vật chính: ${S.name}`),
    typeof refresh == "function" && refresh(),
    save());
  // online: the cloud save and the ranking entry now carry the new main character's name / level
  typeof NET < "u" &&
    NET.user &&
    typeof netUpload == "function" &&
    netUpload()
      .then(() => typeof netSyncChar == "function" && netSyncChar(!0))
      .catch((e) => toast(String((e && e.message) || e)));
  return !0;
}

// ---------------------------------------------------------------- sheets
const PN_FAM = ["Lý", "Trần", "Dương", "Tiêu", "Mộ Dung", "Đoàn", "Hoàng", "Lâm", "Vân", "Tô", "Bạch", "Hàn", "Lục", "Phong", "Thượng Quan", "Âu Dương"],
  PN_M = ["Phong", "Vân", "Kiếm", "Hạo", "Thiên", "Long", "Bình", "Khải", "Minh", "Tuấn", "Dật", "Hàn", "Viễn", "Lãng"],
  PN_F = ["Nhi", "Linh", "Yên", "Tuyết", "Lan", "Nguyệt", "Dao", "Vy", "Ngọc", "Hương", "Uyển", "Thanh", "Mai", "Lạc"];
function partyNames() {
  return [S && S.name].concat((partyOk() ? S.party : []).map((p) => p && p.name)).filter(Boolean);
}
function randName(sex, taken = partyNames()) {
  for (let i = 0; i < 40; i++) {
    const n = `${pick(PN_FAM)} ${pick(sex ? PN_F : PN_M)}`;
    if (n.length <= 14 && !taken.some((t) => String(t).toLowerCase() === n.toLowerCase())) return n;
  }
  return `${pick(PN_FAM.filter((f) => f.length < 6))} ${pick(sex ? PN_F : PN_M)} ${irnd(2, 99)}`;
}
// series for new disciples: different from the main (and from each other while possible)
function partySeries(main, n) {
  const free = [0, 1, 2, 3, 4].filter((s) => s !== main).sort(() => Math.random() - 0.5),
    out = [];
  for (let i = 0; i < n; i++) out.push(free[i % free.length]);
  return out;
}
// can a character of this sex learn some faction of series s?
const seriesSexOk = (s, sex) => FACTIONS.some((f) => f.series === s && facAllowed(f, sex));
function newSheet(name, sex, s) {
  return {
    name: String(name || "").slice(0, 14),
    fac: "vo" + (s | 0),
    sex: sex ? 1 : 0,
    sexSet: 1,
    lvl: 1,
    xp: 0,
    attrPts: 0,
    attr: { str: 0, dex: 0, vit: 0, eng: 0 },
    skPts: 1,
    sk: {},
    main: 0,
    mainLock: !1,
    slots: [0, 0, 0, 0],
    eq: {},
    skL: {},
    br90: 1,
    bkOk: {},
    autoPts: !1,
    auraOff: {},
    inv: [],
    reb: 0,
  };
}
// add a disciple (with starter gear); returns its index or 0
function partyAdd(name, sex, s) {
  if (!S || !S.fac) return 0;
  Array.isArray(S.party) || (S.party = []);
  if (S.party.length >= PARTY_MAX - 1) return 0;
  // a sex with no faction in that series would stay "Vô Môn Phái" forever
  seriesSexOk(s, sex) || (sex = sex ? 0 : 1);
  S.party.push(newSheet(name || randName(sex), sex, s));
  const k = S.party.length;
  return (
    withChar(k, () => {
      (typeof starterGear == "function" && starterGear(), (R.dirty = !0));
    }),
    (pAct(k).r.dirty = !0),
    k
  );
}
// give the initial disciples once (new character: from the creation screen; old save: random)
function partyEnsure(defs) {
  if (!S || !S.fac || PCTX) return !1;
  Array.isArray(S.party) || (S.party = []);
  if (S.partyV) return !1;
  S.partyV = 1;
  const n = PARTY_MAX - 1 - S.party.length;
  if (n <= 0) return !1;
  const ser = partySeries(heroSeries(), n),
    got = [];
  for (let i = 0; i < n; i++) {
    const d = (defs && defs[i]) || {},
      sex = d.sex != null ? d.sex | 0 : Math.random() < 0.5 ? 1 : 0,
      s = d.s != null ? d.s | 0 : ser[i],
      nm = d.name && String(d.name).trim().length >= 2 ? String(d.name).trim().replace(/\s+/g, " ") : randName(sex),
      k = partyAdd(nm, sex, s);
    k && got.push(k);
  }
  return got.length > 0;
}
// sanitize a stored sheet (called from migrate(); e = the migrated save being built)
function partySanitize(sh, e) {
  if (!isSheet(sh)) return null;
  const o = Object.assign(newSheet(sh.name || "Đồ đệ", sh.sex, 0), sh);
  ((o.name = String(o.name || "Đồ đệ").slice(0, 14)),
    (o.sex = o.sex ? 1 : 0),
    (o.fac = typeof o.fac == "string" && FAC[o.fac] ? o.fac : "vo0"),
    (o.attr = Object.assign({ str: 0, dex: 0, vit: 0, eng: 0 }, isSheet(sh.attr) ? sh.attr : {})),
    (o.lvl = clamp(Math.floor(+o.lvl) || 1, 1, MAX_LEVEL)),
    (o.xp = Math.max(0, +o.xp || 0)),
    (o.skPts = Math.max(0, Math.floor(+o.skPts) || 0)),
    (o.attrPts = Math.max(0, Math.floor(+o.attrPts) || 0)),
    (o.reb = clamp(o.reb | 0, 0, 5)),
    (o.sk = isSheet(o.sk) ? o.sk : {}),
    (o.skL = isSheet(o.skL) ? o.skL : {}),
    (o.bkOk = isSheet(o.bkOk) ? o.bkOk : {}),
    (o.auraOff = isSheet(o.auraOff) ? o.auraOff : {}),
    (o.slots = Array.isArray(o.slots) ? o.slots.slice(0, 4).map((v) => +v || 0) : [0, 0, 0, 0]));
  for (; o.slots.length < 4; ) o.slots.push(0);
  for (const t in o.sk) SK[t] || delete o.sk[t];
  o.eq = isSheet(o.eq) ? o.eq : {};
  // own bag (older saves: none, the shared bag stays with the main character)
  const iok = (it) =>
    it &&
    typeof it == "object" &&
    Array.isArray(it.base) &&
    Array.isArray(it.mag) &&
    !(typeof eqBanned == "function" && eqBanned(it)) &&
    !(typeof eqRemoved == "function" && eqRemoved(it)) &&
    !(typeof setNoData == "function" && setNoData(it));
  o.inv = (Array.isArray(o.inv) ? o.inv : []).filter(iok).slice(0, INV_MAX);
  for (const it of o.inv) (vioDedupe(it), typeof setRepair == "function" && setRepair(it));
  typeof o.invSort == "string" || delete o.invSort;
  const inv = o.inv;
  for (const t of Object.keys(o.eq)) {
    const it = o.eq[t];
    if (!it || typeof it != "object" || !Array.isArray(it.base) || !Array.isArray(it.mag)) {
      delete o.eq[t];
      continue;
    }
    if (
      (typeof eqBanned == "function" && eqBanned(it)) ||
      (typeof eqRemoved == "function" && eqRemoved(it)) ||
      (typeof setNoData == "function" && setNoData(it))
    ) {
      delete o.eq[t];
      continue;
    }
    if (typeof sexReqOkFor == "function" && !sexReqOkFor(it, o.sex)) {
      (inv.length < INV_MAX && inv.push(it), delete o.eq[t]);
      continue;
    }
    (vioDedupe(it), typeof setRepair == "function" && setRepair(it));
  }
  return o;
}
// bag of character k without swapping (0 = main)
const charInv = (k) => {
  const v = charGet(k, "inv");
  return Array.isArray(v) ? v : null;
};
// every bag of the party (main first)
function allInv() {
  return partyOk() ? partyIdx().map(charInv).filter(Boolean) : [S.inv];
}
// which character's bag holds the item (-1: none)
function invOwner(it) {
  if (!partyOk()) return S.inv.includes(it) ? 0 : -1;
  for (const k of partyIdx()) {
    const b = charInv(k);
    if (b && b.includes(it)) return k;
  }
  return -1;
}
// move a bag item of the character swapped in (S.inv) into character j's bag
function invGive(it, j) {
  j = j | 0;
  const to = charInv(j);
  if (!it || !S.inv.includes(it)) return { ok: !1, msg: "Món không còn trong hành trang" };
  if (j === PCTX || !to) return { ok: !1, msg: "Chọn nhân vật khác" };
  const nm = charGet(j, "name") || "nhân vật " + (j + 1);
  if (to.length >= INV_MAX) return { ok: !1, msg: `Hành trang của ${nm} đã đầy (${INV_MAX}/${INV_MAX})` };
  (S.inv.splice(S.inv.indexOf(it), 1), to.unshift(it), (invDirty = !0));
  j === 0 || (pAct(j).r.dirty = !0);
  save();
  return { ok: !0, msg: `Đã chuyển ${it.n} cho ${nm}` };
}
// "Chuyển cho…": pick one of the other characters (name, level, free slots)
function invGiveModal(it) {
  const from = PCTX;
  modal(
    `<h3>Chuyển vật phẩm</h3><p class="desc"><b style="color:${RAR_COL[it.r] || "#fff"}">${esc(it.n)}</b> từ hành trang của <b>${esc(S.name)}</b> sang:</p><div class="pgive" style="display:flex;flex-direction:column;gap:6px;margin:8px 0">${partyIdx()
      .filter((k) => k !== from)
      .map((k) => {
        const b = charInv(k) || [],
          free = INV_MAX - b.length,
          f = FAC[charGet(k, "fac")];
        return `<button class="btn pgv" style="text-align:left" data-pg="${k}" ${free > 0 ? "" : "disabled"}><b style="color:${partyCol[k]}">${k + 1}. ${esc(charGet(k, "name") || "")}</b>${k ? "" : ' <small class="cp">chính</small>'} <small>${f ? esc(f.n) + " · " : ""}cấp ${charGet(k, "lvl")} · ${free > 0 ? `trống ${free}/${INV_MAX} ô` : '<span class="bad">túi đầy</span>'}</small></button>`;
      })
      .join("")}</div>${typeof dtNeed == "function" && dtNeed(it) ? '<p class="dim small">Vật phẩm Dã Tẩu chỉ nộp được từ hành trang nhân vật chính.</p>' : ""}<div class="btnrow"><button class="btn" id="pgBack">Quay lại</button></div>`,
    () => {
      $("#mBody")
        .querySelectorAll("[data-pg]")
        .forEach(
          (b) =>
            (b.onclick = () => {
              const r = invGive(it, +b.dataset.pg);
              (toast(r.msg), r.ok && (closeModal(), refresh()));
            }),
        );
      $("#pgBack").onclick = () => itemModal(it);
    },
  );
}
// every equipped item of every character (main first)
function allEq() {
  const out = [];
  for (const k of partyIdx()) {
    const eq = k === PCTX ? S.eq : k === 0 ? (pSheet(PCTX) || {}).eq : (pSheet(k) || {}).eq;
    for (const v of Object.values(eq || {})) v && out.push(v);
  }
  return out;
}
const partyCol = ["#fff3c0", "#9fe8ff", "#b6f59a", "#ffc4f0", "#ffd29a", "#c8b6ff", "#ffe08a"];

// ---------------------------------------------------------------- actors: follow, fight, knock-out
// Every disciple is a full actor: partyTick runs, for each disciple inside withChar, the same per-actor code
// as the main character (regen, potions from the shared stock, mount, buffs / curses / aura damage, heroAttack
// with its own skills, cooldowns and mana, dash, no moving while casting). Only the decision layer differs:
// follow the leader in a loose formation, fight monsters near the leader, never pick up loot (each disciple
// auto-equips from its own bag).
const P_ENGAGE = 420, // disciples fight monsters within this distance (JX1 units) of the leader
  P_LEASH = 560, // further than this from the leader: drop the fight and run back
  P_TELE = 900, // further than this (teleport, Thần Hành Phù, map change): appear next to the leader
  P_KO_T = 6, // knocked out: revive after this many seconds next to the leader (at once in town)
  P_SEP = 34, // party members keep this distance from each other (scene units)
  // formation slot per character (behind, side) in scene units, relative to the leader's facing
  P_FORM = [
    [0, 0],
    [56, -44],
    [56, 44],
    [104, 0],
    [104, -88],
    [104, 88],
    [150, -44],
    [150, 44],
  ];
function pFormation(k, L) {
  const f = P_FORM[k] || [60 + 40 * k, 0],
    a = ((L.dir || 0) * Math.PI) / 4,
    sa = Math.sin(a),
    ca = Math.cos(a);
  // JX1 direction d faces (-sin a, cos a) in scene space (x, 2y): behind = (sin a, -cos a), side = (cos a, sin a)
  return inWorld(L.x + f[0] * sa + f[1] * ca, L.y + (-f[0] * ca + f[1] * sa) / 2);
}
function pFollow(L) {
  const s = PT.slot[PCTX];
  if (!s) return;
  const d = Math.hypot(s[0] - H.x, (s[1] - H.y) * 2);
  if (d > (L.moving ? 8 : 26)) {
    const sp = 150 * Math.max(curSpeed(), L.sp) * (d > 220 ? 1.6 : d > 90 ? 1.2 : 1.05);
    navGo(H, s[0], s[1], sp * (R.slowT > 0 ? ELEM_SLOW : 1) * L.dt, 0);
  } else H.act !== "at" && !L.moving && (H.dir = L.dir);
}
function pPlace(s) {
  ([H.x, H.y] = s), (H._nav = null), (H.px = H._px = H.x), (H.py = H._py = H.y), (R.moveTo = null), (R.tgt = null), (R.dash = null);
}
function discKO() {
  ((R.deadT = P_KO_T),
    (R.life = 0),
    (R.moveTo = null),
    (R.tgt = null),
    (R.dash = null),
    (R.slowT = R.stunT = R.hpDot = R.hpDotT = 0),
    (H.act = "die"),
    (H.actT = 0),
    log(`<span class="bad">${esc(S.name)} trọng thương</span> <span class="dim">(hồi phục sau ${P_KO_T} giây)</span>`));
}
function discTick(L) {
  const k = PCTX,
    dt = L.dt;
  if (R.dirty || !R.P) {
    const first = !R.P;
    (recalc(), first && ((R.life = R.P.life), (R.mana = R.P.mana)));
  }
  const n = R.P,
    s = PT.slot[k];
  if (L.jump || !(H.x > 0) || Math.hypot(H.x - L.x, (H.y - L.y) * 2) > P_TELE) pPlace(s);
  if (R.deadT > 0) {
    if (((R.deadT = R.town ? 0 : R.deadT - dt), R.deadT > 0)) return;
    (pPlace(s), (R.life = n.life), (R.mana = n.mana), (H.act = "st"), (H.actT = 0));
  }
  ((R.life = Math.min(n.life, R.life + n.regen * dt)),
    (R.mana = Math.min(n.mana, R.mana + n.manaRegen * dt)),
    autoPotion(dt),
    rideTick(dt));
  if (R.hpDotT > 0) {
    const o = Math.min(dt, R.hpDotT) / R.hpDotT;
    ((R.life -= R.hpDot * o), (R.hpDot -= R.hpDot * o), (R.hpDotT -= dt));
  }
  (R.slowT > 0 && (R.slowT -= dt),
    R.stunT > 0 && (R.stunT -= dt),
    R.hurtT > 0 && (R.hurtT -= dt),
    R.potCd && ((R.potCd.life = Math.max(0, R.potCd.life - dt)), (R.potCd.mana = Math.max(0, R.potCd.mana - dt))),
    typeof skillSysTick == "function" && skillSysTick(dt));
  if (R.life <= 0) return discKO();
  if (R.town) {
    ((R.life = Math.min(n.life, R.life + n.life * 0.25 * dt)),
      (R.mana = Math.min(n.mana, R.mana + n.mana * 0.25 * dt)),
      pFollow(L));
    return;
  }
  if (dashTick(dt)) return;
  const foes = L.foes,
    slow = R.slowT > 0 ? ELEM_SLOW : 1;
  if (!foes.length || jxd(H.x, H.y, L.x, L.y) > P_LEASH) {
    ((R.moveTo = null), (R.tgt = null), heroCasting() || R.stunT > 0 || pFollow(L), R.atkT > 0.3 || (R.atkT = 0.3));
    return;
  }
  (R.moveTo &&
    R.moveTo.hp > 0 &&
    !heroCasting() &&
    !(R.stunT > 0) &&
    navGo(H, R.moveTo.x, R.moveTo.y, 150 * curSpeed() * slow * dt, 0),
    R.stunT > 0 || ((R.atkT -= dt * slow), R.atkT <= 0 && (R.atkT = heroAttack(foes))));
}
// keep party members apart (no stacking), only onto walkable ground
function pSep() {
  const L = [H];
  for (let k = 1; k <= partyN(); k++) L.push(pAct(k).h);
  for (let i = 1; i < L.length; i++) {
    if (pAct(i).r.deadT > 0) continue;
    const a = L[i];
    let px = 0,
      py = 0;
    for (let j = 0; j < L.length; j++) {
      if (j === i || (j && pAct(j).r.deadT > 0)) continue;
      const b = L[j],
        dx = a.x - b.x,
        dy = (a.y - b.y) * 2,
        d = Math.hypot(dx, dy);
      if (d >= P_SEP) continue;
      const q = (P_SEP - d) / P_SEP;
      d > 0.01 ? ((px += (dx / d) * q), (py += (dy / d) * q)) : (px += i > j ? q : -q);
    }
    if (!px && !py) continue;
    const m = Math.hypot(px, py),
      st = Math.min(1.4, m * 1.4);
    obsMove(a, a.x + (px / m) * st, a.y + (py / m) * st * 0.5);
  }
}
function partyTick(dt) {
  if (PCTX) return;
  // no party on the field any more (disciples dismissed / hidden): drop the shared team states once
  if (!partyOk() || !partyN() || partyAway()) pShareAny() && pAuraTick();
  if (!partyOk() || !partyN()) return;
  if (partyAway()) return void (PT.g = null); // re-summon: PT.g mismatch -> L.jump puts everyone on its slot
  const g = OBS.g,
    L = {
      x: H.x,
      y: H.y,
      dir: H.dir | 0,
      moving: !!H.moving,
      sp: curSpeed(),
      dt,
      jump: PT.g !== g || PT.town !== !!R.town,
      foes: R.town ? [] : alive().filter((e) => jxd(H.x, H.y, e.x, e.y) < P_ENGAGE),
    };
  ((PT.g = g), (PT.town = !!R.town));
  // formation slots: re-anchored when the leader has moved / turned, kept while it stands and fights
  const an = PT.anc;
  if (!PT.slot || !an || L.jump || Math.hypot(L.x - an.x, L.y - an.y) > 34 || (L.moving && an.dir !== L.dir)) {
    ((PT.anc = { x: L.x, y: L.y, dir: L.dir }), (PT.slot = []));
    for (let k = 1; k <= partyN(); k++) PT.slot[k] = pFormation(k, L);
  }
  for (let k = 1; k <= partyN(); k++) withChar(k, () => discTick(L));
  pSep();
  if ((PT.sw = (PT.sw || 0) + dt) > 31) {
    PT.sw = 0;
    for (let k = 1; k <= partyN(); k++)
      withChar(k, () => {
        (autoEquipAll(), S.autoPts === !0 && (autoSpendAttrs(), autoSpendSkills()));
      });
  }
  (PT.auT = (PT.auT || 0) - dt) <= 0 && ((PT.auT = 0.5), pAuraTick());
}
// monsters attack the nearest party member (re-chosen twice a second, the current one slightly preferred)
function partyAggro(t, dt) {
  if (!partyOk() || !partyN() || partyAway()) return 0;
  let k = t.ptk | 0;
  if ((t.ptT = (t.ptT || 0) - dt) <= 0 || (k && (!pSheet(k) || pAct(k).r.deadT > 0))) {
    t.ptT = 0.5;
    let best = R.deadT > 0 ? 1e9 : jxdE(t, H) * (k ? 1 : 0.85),
      bk = 0;
    for (let i = 1; i <= partyN(); i++) {
      const a = pAct(i);
      if (a.r.deadT > 0 || !a.r.P) continue;
      const d = jxdE(t, a.h) * (i === k ? 0.85 : 1);
      d < best && ((best = d), (bk = i));
    }
    t.ptk = k = bk;
  }
  return k;
}
// EXP: every party member gets the full EXP of each kill (computed at its own level, as if solo)
function partyOnKill(t) {
  if (!partyOk() || PCTX || partyAway()) return;
  for (let k = 1; k <= partyN(); k++)
    withChar(k, () => {
      (gainXp(killXp(t)), typeof sk9OnKill == "function" && sk9OnKill(t));
    });
}
// depth-sorted draw entries of the disciples on screen (render.js)
function partyEnts() {
  const out = [];
  if (partyAway()) return out;
  for (let k = 1; k <= partyN(); k++) {
    const a = pAct(k);
    a.r.P && onScreen(a.h.x, a.h.y, 200) && out.push({ disc: k, x: a.h.x, y: a.h.y });
  }
  return out;
}
function partyEach(fn, vis) {
  if (!partyOk() || PCTX || partyAway()) return;
  for (let k = 1; k <= partyN(); k++) {
    const a = pAct(k);
    !a.r.P || (vis && !onScreen(a.h.x, a.h.y, 200)) || withChar(k, fn);
  }
}
// ---------------------------------------------------------------- team auras / buffs / heals (JX1 relation_ally)
// The skills marked in skillsys.js (SK_TEAM_AURA / SK_TEAM_BUFF / SK_TEAM_HEAL, from the Skills.txt columns IsAura +
// TargetAlly): an aura switched on, or a team buff running, on a living member reaches every other living member
// within the skill's AttackRadius, at the CASTER's skill level. The same skill never stacks (JX1 states): the highest
// level wins; an own copy of equal or higher level is kept, a weaker own copy is replaced (skApplies). Hidden
// disciples (S.partyAway) and knocked-out members neither give nor receive. Recomputed every 0.5 s (partyTick) and
// at once when an aura is toggled / a buff starts or ends (partyShareNow); a changed set marks that member dirty.
// PT.aur[r] = {skill id: level} received by member r, PT.aus[r] = {skill id: {k caster, lv, t buff end / -1, until}}.
const P_AURA_HOLD = 1, // s: an aura's state (child skill, 18 game frames) outlives leaving the range by this much
  pTeamAura = (s) => !!s && SK_TEAM_AURA.has(+s.id),
  pTeamBuff = (s) => !!s && SK_TEAM_BUFF.has(+s.id),
  pShareOn = () => partyOk() && partyN() > 0 && !partyAway(),
  pShareAny = () => !!PT.aur && PT.aur.some((m) => m && Object.keys(m).length > 0);
// live R / H of member k from any context (while c is swapped in, the main's live in pAct(c))
function pRH(k) {
  if (k === PCTX) return { r: R, h: H };
  const a = pAct(k || PCTX);
  return { r: a.r, h: a.h };
}
function partyShareNow() {
  PT.auT = 0;
}
function pAuraTick() {
  const n = pShareOn() ? partyN() : 0,
    src = [],
    t0 = clk();
  for (let k = 0; k <= n; k++)
    withChar(k, () => {
      if (R.deadT > 0 || !R.P || typeof auraList != "function") return;
      const at = { k, x: H.x, y: H.y };
      for (const id of auraList())
        pTeamAura(SK[id]) && src.push(Object.assign({ id, lv: Math.max(1, skLv(id)), t: -1 }, at));
      const b = SKS().buff;
      for (const id in b)
        b[id] > t0 &&
          S.sk[id] &&
          pTeamBuff(SK[id]) &&
          src.push(Object.assign({ id: +id, lv: Math.max(1, skLv(id)), t: b[id] }, at));
    });
  const live = new Set(src.map((a) => a.k + ":" + a.id)),
    hold = PT.aus || [],
    aur = [],
    aus = [];
  for (let r = 0; r <= n; r++) {
    const o = pRH(r),
      h = hold[r] || {},
      w = {},
      m = {};
    if (!(o.r.deadT > 0) && o.r.P) {
      // a state received earlier stays while its caster still runs it: a buff until it ends (JX1: cast on the
      // ally, range only matters at the cast), an aura for its state's lifetime after leaving the range
      for (const id in h) live.has(h[id].k + ":" + id) && h[id].until > t0 && (w[id] = h[id]);
      for (const a of src) {
        if (a.k === r || jxd(a.x, a.y, o.h.x, o.h.y) > skTeamR(a.id)) continue;
        const c = w[a.id];
        (!c || c.k === a.k || a.lv >= c.lv) &&
          (w[a.id] = { k: a.k, lv: a.lv, t: a.t, until: a.t < 0 ? t0 + P_AURA_HOLD : a.t });
      }
      for (const id in w) m[id] = w[id].lv;
    }
    ((aur[r] = m), (aus[r] = w));
  }
  const old = PT.aur || [];
  ((PT.aur = aur), (PT.aus = aus));
  for (let r = 0; r < Math.max(aur.length, old.length); r++)
    JSON.stringify(aur[r] || {}) !== JSON.stringify(old[r] || {}) && (r && !pSheet(r) ? 0 : (pRH(r).r.dirty = !0));
}
const pShareMap = () => (pShareOn() && PT.aur && PT.aur[PCTX]) || null,
  partyShareLv = (id) => {
    const m = pShareMap();
    return (m && m[id]) || 0;
  },
  // level of the own copy of a team aura / buff that is active on the current character (0 = none)
  pOwnLv = (id) =>
    S.sk[id] && (pTeamAura(SK[id]) ? auraOn(id) : buffOn(id) || !!R.buffAssume) ? skLv(id) : 0;
// ids of the shared states the current character receives (state sprites, skillfx.js heroStates; per frame: no allocs
// beyond the small list)
function partyShareIds() {
  const m = pShareMap();
  if (!m) return [];
  const o = [];
  for (const id in m) pOwnLv(id) < m[id] && o.push(+id);
  return o;
}
// calc() hook: attributes of the team auras / buffs other members project onto the character being computed
// (wc = its weapon code: weapon-bound bonuses such as Nhất Khí Tam Thanh's blade damage follow the receiver's weapon)
function partyAuraAttr(A, wc) {
  const m = pShareMap();
  if (!m) return;
  for (const id in m) {
    const s = SK[id];
    if (!s || pOwnLv(id) >= m[id]) continue;
    for (const key in s.attr) {
      if (SKIP_PASSIVE.test(key)) continue;
      const v = skVal(s, key, m[id]);
      v && (wc == null || passiveApplies(s, key, v, wc)) && addAttr(A, key, v);
    }
  }
}
// shared states received by the current character, for the state icons / skill panel
function partyShared() {
  const m = pShareMap(),
    w = PT.aus && PT.aus[PCTX];
  if (!m || !w) return [];
  const out = [],
    t0 = clk();
  for (const id in m) {
    const s = SK[id],
      a = w[id];
    if (!s || !a || pOwnLv(id) >= m[id]) continue;
    const who = charGet(a.k, "name") || (a.k ? "Đồ đệ " + a.k : "Nhân vật chính");
    out.push({
      id: +id,
      ic: s.ic,
      aura: a.t < 0,
      lv: m[id],
      from: a.k,
      t: a.t < 0 ? -1 : Math.max(0, a.t - t0),
      n: `${a.t < 0 ? "Vòng sáng" : "Bùa lợi"}: ${s.n} cấp ${m[id]} (từ ${who})`,
    });
  }
  return out;
}
// ally heal target (TargetAlly heals): the living member, caster included, with the lowest HP ratio in range
function partyHealTarget(rad) {
  let best = { k: PCTX, self: !0, ratio: R.P ? R.life / R.P.life : 1 };
  if (!pShareOn()) return best;
  for (let k = 0; k <= partyN(); k++) {
    if (k === PCTX) continue;
    const o = pRH(k);
    if (!o.r.P || o.r.deadT > 0 || jxd(H.x, H.y, o.h.x, o.h.y) > rad) continue;
    const q = o.r.life / o.r.P.life;
    q < best.ratio && (best = { k, self: !1, ratio: q });
  }
  return best;
}
function partyHealApply(tg, v) {
  const o = pRH(tg.k),
    e = o.r.life;
  o.r.life = Math.min(o.r.P.life, o.r.life + v);
  o.r.life - e > 1 && addText(o.h.x, o.h.y - 44, "+" + fmt(o.r.life - e), "#7f7", 11);
}

// ---------------------------------------------------------------- UI context binding
const P_ON = ["onclick", "onchange", "oninput", "onkeydown", "onpointerdown", "onpointerup", "onsubmit"];
// wrap every on* handler property under root so it runs with character k swapped in
function pBindCtx(root, k) {
  if (!root || !k) return;
  const els = [root].concat(Array.from(root.querySelectorAll("*")));
  for (const el of els) {
    if (el.closest && el.closest(".ptabs")) continue; // the character tabs themselves act in the main context
    for (const p of P_ON) {
      const f = el[p];
      if (typeof f != "function" || f.__pk === k) continue;
      const g = function (ev) {
        return withChar(k, () => f.call(this, ev));
      };
      ((g.__pk = k), (el[p] = g));
    }
  }
}
// a modal opened while disciple k is swapped in: its buttons act on k; show whose it is
function pModalCtx(k) {
  const b = $("#mBody");
  if (!b) return;
  b.querySelector(".pctx") ||
    b.insertAdjacentHTML(
      "afterbegin",
      `<div class="pctx" style="color:${partyCol[k] || "#9fe8ff"}">Nhân vật ${k + 1} (đồ đệ): <b>${esc(S.name)}</b> · Cấp ${S.lvl}</div>`,
    );
  pBindCtx(b, k);
}

// "Tạm lánh đồ đệ": disciples leave the field (not drawn, don't fight, aren't targeted, get no EXP) and only
// the main plays; "Triệu hồi đồ đệ" brings them back next to the leader. Saved in S.partyAway; on-screen chip.
function partyAway() {
  return !!(typeof S < "u" && S && S.partyAway);
}
function partyAwayToggle(on) {
  if (!partyOk() || !partyN()) return;
  S.partyAway = on == null ? !S.partyAway : !!on;
  PT.g = null;
  PT.aur = [];
  PT.aus = [];
  for (let k = 1; k <= partyN(); k++) pAct(k).r.dirty = !0;
  R.dirty = !0;
  typeof toast == "function" && toast(S.partyAway ? "Đồ đệ tạm lánh: chỉ còn nhân vật chính" : "Đã triệu hồi đồ đệ");
  typeof uiSfx == "function" && uiSfx("click");
  typeof save == "function" && save();
  partyAwayBtn();
}
function partyAwayBtn() {
  let b = document.getElementById("awayBtn");
  const tc = document.getElementById("topCtl");
  if (!tc) return;
  if (!b) {
    b = document.createElement("button");
    ((b.id = "awayBtn"), (b.className = "chip"), (b.onclick = () => partyAwayToggle()));
    tc.appendChild(b);
  }
  const show = partyOk() && partyN() > 0;
  b.hidden = !show;
  if (!show) return;
  const away = partyAway();
  b.textContent = away ? "Triệu hồi đồ đệ" : "Tạm lánh đồ đệ";
  b.title = away ? "Gọi các đồ đệ quay lại chiến đấu cùng nhân vật chính" : "Ẩn các đồ đệ, chỉ để lại nhân vật chính";
  b.classList.toggle("on", away);
}
window.addEventListener("DOMContentLoaded", () => {
  partyAwayBtn();
  setInterval(partyAwayBtn, 1000);
});

