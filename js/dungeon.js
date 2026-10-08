"use strict";
const DUNGEONS = [
    {
      id: "dvc",
      map: 140,
      n: "Dược Vương Cốc",
      lv: 20,
      add: -2,
      rooms: 5,
      limit: 120,
      bossMul: 5,
      set: 0.2,
      horse: 0.08,
      fd: 8,
      item: 5,
      gold: 2500,
      knb: 2,
      pot: 5,
      d: "Hang dược thảo bị độc nhân chiếm giữ. 4 phòng tinh anh, phòng 5 là trùm.",
    },
    {
      id: "tbk",
      map: 50,
      n: "Thiên Bảo Khố",
      lv: 50,
      add: 0,
      rooms: 6,
      limit: 150,
      bossMul: 6,
      set: 0.35,
      horse: 0.12,
      fd: 12,
      item: 6,
      gold: 6e3,
      knb: 3,
      pot: 8,
      d: "Kho báu triều đình, lính canh tinh nhuệ. 5 phòng tinh anh, phòng 6 là trùm.",
    },
    {
      id: "lal",
      map: 8,
      n: "Lâm An Hoàng Lăng",
      lv: 80,
      add: 2,
      rooms: 7,
      limit: 210,
      bossMul: 7,
      set: 0.5,
      horse: 0.18,
      fd: 18,
      item: 6,
      gold: 12e3,
      knb: 4,
      pot: 10,
      d: "Lăng mộ hoàng tộc, cơ quan trùng trùng. 6 phòng tinh anh, phòng 7 là trùm.",
    },
    {
      id: "pdq",
      map: 206,
      n: "Phong Đô Quỷ Thành",
      lv: 110,
      rooms: 7,
      limit: 240,
      bossMul: 7,
      set: 0.55,
      horse: 0.2,
      fd: 22,
      item: 6,
      gold: 2e4,
      knb: 5,
      pot: 12,
      d: "Thành ma nơi âm khí ngút trời. 6 phòng tinh anh, phòng 7 là trùm.",
    },
    {
      id: "kct",
      map: 4,
      n: "Kiếm Các Thục Đạo",
      lv: 140,
      rooms: 8,
      limit: 270,
      bossMul: 8,
      set: 0.6,
      horse: 0.22,
      fd: 26,
      item: 6,
      gold: 3e4,
      knb: 6,
      pot: 14,
      d: "Đường Thục hiểm trở, sơn tặc trấn ải. 7 phòng tinh anh, phòng 8 là trùm.",
    },
    {
      id: "mcb",
      map: 225,
      n: "Mạc Cao Bí Cảnh",
      lv: 170,
      rooms: 8,
      limit: 300,
      bossMul: 7,
      set: 0.65,
      horse: 0.25,
      fd: 30,
      item: 6,
      gold: 45e3,
      knb: 7,
      pot: 16,
      d: "Hang động cổ giữa sa mạc, cao thủ ẩn tu. 7 phòng tinh anh, phòng 8 là trùm.",
    },
    {
      id: "hsl",
      map: 212,
      n: "Hoa Sơn Luận Kiếm",
      lv: 190,
      rooms: 9,
      limit: 330,
      bossMul: 7,
      set: 0.7,
      horse: 0.28,
      fd: 35,
      item: 6,
      gold: 6e4,
      knb: 8,
      pot: 20,
      d: "Đỉnh Hoa Sơn, quần hùng tranh phong. 8 phòng tinh anh, phòng 9 là trùm.",
    },
  ],
  DG_ELITE_DMG = 0.55,
  DG_ELITE_HP = 0.6,
  DG_STAGE_BACK = 10,
  DG_RUNS = 2,
  WB_TRIES = 3,
  WB_LIMIT = 75,
  WB_HP = 60,
  WB_RANKS = [
    ["S", 1],
    ["A", 0.5],
    ["B", 0.2],
    ["C", 0.05],
  ],
  DG_HK_K = 0.03,
  DG_HORSE_K = 0.04,
  WB_REWARD = {
    S: { gold: 1e4, fd: 50, set: 1, knb: 15, pts: 3 },
    A: { gold: 6e3, fd: 30, set: 1, knb: 10 },
    B: { gold: 3e3, fd: 20, item: 6, knb: 6 },
    C: { gold: 1500, fd: 10, item: 5, knb: 3 },
  },
  RANK_MUL = { S: 1.5, A: 1.2, B: 1 };
function weekStart(t = new Date()) {
  const n = new Date(t);
  return (n.setHours(0, 0, 0, 0), n.setDate(n.getDate() - ((n.getDay() + 6) % 7)), n);
}
const weekKey = () => dayKey(weekStart());
function DG() {
  const t = S.dg || (S.dg = {});
  return (
    t.day !== today() && ((t.day = today()), (t.runs = {})),
    t.week !== weekKey() &&
      ((t.week = weekKey()), (t.wbTries = 0), (t.wbBest = 0), (t.wbRank = ""), (t.wbClaimed = !1)),
    (t.runs = t.runs || {}),
    t
  );
}
const dgLeft = (t) => Math.max(0, DG_RUNS - (DG().runs[t.id] || 0)),
  dgUnlocked = (t) => S.lvl >= t.lv || RW().stat.reborn > 0;
function wbBossTid() {
  const t = [...new Set(ZONES.map((o) => o.boss))].filter((o) => MON[o]),
    n = Math.floor(weekStart().getTime() / 6048e5);
  return t[((n % t.length) + t.length) % t.length];
}
const DG_SPAN = 10,
  dgRoomL = (t) => clamp(Math.round(t.d.lv + (DG_SPAN * (t.room - 1)) / Math.max(1, t.d.rooms - 1)), 1, 200),
  dgGoldF = (t) => (1 + Math.min(S.lvl, t.lv + DG_SPAN) / 10) / (1 + S.lvl / 10),
  dgLevel = (t) => clamp(Math.max(S.lvl, stageLevel(Math.max(1, S.maxStage - DG_STAGE_BACK))) + t, 1, levelCap()),
  zoneForLevel = (t) => ZONES.find((n) => t <= n.hi) || ZONES[ZONES.length - 1];
function dgMap(t) {
  const n = t && t.map && window.JMO && window.JMO[String(t.map)] ? t.map : null;
  n &&
    ((R.zoneShown = "dg"),
    obsLoad(n),
    ([H.x, H.y] = inWorld(...(typeof mapMid == "function" ? mapMid() : [WORLD.w / 2, WORLD.h / 2]))),
    snapCamera(),
    (R.bgImg = img(`img/z/${n}.jpg`)),
    playMusic(n));
}
const dgBusy = () => R.dg || R.tower || R.deadT > 0;
function dgEnterCommon() {
  (R.town && backFromTown(),
    (R.enemies = []),
    (R.corpses = []),
    (R.pickTarget = null),
    (R.moveTo = null),
    (R.spawnT = 0.8),
    (R.stall = 0),
    (R.deadT = 0),
    (R.life = R.P.life),
    (R.mana = R.P.mana),
    closeModal(!0));
}
function dgStart(t) {
  const n = DUNGEONS.find((o) => o.id === t);
  if (n) {
    if (dgBusy()) {
      toast(R.deadT > 0 ? "Đang trọng thương, chờ hồi phục" : "Đang ở tháp / phó bản");
      return;
    }
    if (!dgUnlocked(n)) {
      toast(`Cần cấp ${n.lv}`);
      return;
    }
    if (!dgLeft(n)) {
      toast("Hết lượt hôm nay");
      return;
    }
    (dgEnterCommon(),
      (R.dg = { kind: "dg", id: t, d: n, room: 1, t: 0, limit: n.limit, L: Math.min(200, n.lv + DG_SPAN) }),
      (R.banner = {
        t: 2.4,
        text: n.n,
        sub: `${n.rooms} phòng · ${n.limit >= 120 && n.limit % 60 === 0 ? n.limit / 60 + " phút" : n.limit + " giây"} · gục ngã là thất bại`,
      }),
      dgMap(n),
      log(`🏯 Dịch chuyển vào phó bản <b>${esc(n.n)}</b>.`));
  }
}
function wbStart() {
  const t = DG();
  if (dgBusy()) {
    toast(R.deadT > 0 ? "Đang trọng thương, chờ hồi phục" : "Đang ở tháp / phó bản");
    return;
  }
  if (S.lvl < 20 && !RW().stat.reborn) {
    toast("Cần cấp 20");
    return;
  }
  if (t.wbTries >= WB_TRIES) {
    toast("Hết lượt tuần này");
    return;
  }
  (t.wbTries++,
    REC().wbTries++,
    dgEnterCommon(),
    (R.dg = { kind: "wb", t: 0, limit: WB_LIMIT, L: dgLevel(3), tid: wbBossTid(), dmg: 0 }),
    (R.banner = {
      t: 2.4,
      text: "Boss tuần: " + MON[R.dg.tid].n,
      sub: `${WB_LIMIT} giây · gây càng nhiều sát thương càng tốt`,
    }),
    save());
}
function dgExit() {
  const t = R.dg && R.dg.kind === "boat",
    n = R.dg && R.dg.kind === "dg" && R.zoneShown === "dg";
  ((R.dg = null),
    (R.dgPilotT = 3),
    (R.enemies = []),
    (R.corpses = []),
    (S.wave = 1),
    (R.spawnT = 0.8),
    (R.zoneShown = null),
    (R.stall = 0),
    t && typeof boatMap == "function"
      ? boatMap(!1)
      : n && ((R.zoneShown = null), onZoneChange(zoneOf(Math.min(S.stage, STAGES)))),
    curTab === "log" && refresh());
}
function dgSpawn() {
  const t = R.dg;
  if (((R.enemies = []), (R.stall = 0), t.kind === "boat")) {
    boatSpawn();
    return;
  }
  const n = (i, d) => {
    const a = rnd(0, Math.PI * 2),
      l = rnd(i, d);
    return inWorld(H.x + Math.cos(a) * l, H.y + Math.sin(a) * l);
  };
  if (t.kind === "wb") {
    const [i, d] = n(200, 240),
      a = makeEnemy(t.tid, t.L, "boss", i, d);
    ((a.hp = a.max = a.max * WB_HP),
      (a.dmg *= 1.1),
      (a.wb = !0),
      (a.n = "Boss tuần · " + a.n),
      (t.boss = a),
      R.enemies.push(a));
    return;
  }
  const o = t.kind === "dg" ? dgRoomL(t) : t.L,
    s = zoneForLevel(o);
  if (t.room >= t.d.rooms) {
    const [i, d] = n(220, 260),
      a = makeEnemy(s.boss, o, "boss", i, d);
    ((a.hp = a.max = (a.max * t.d.bossMul) / 2),
      (a.dmg *= 1.25),
      (a.n = "Trấn thủ · " + bossName(s.boss, s.n)),
      R.enemies.push(a));
    for (let l = 0; l < 2; l++) {
      const [r, g] = n(140, 240),
        c = makeEnemy(pick(s.m), o, "elite", r, g);
      ((c.dmg *= DG_ELITE_DMG), (c.hp = c.max = c.max * DG_ELITE_HP), R.enemies.push(c));
    }
  } else {
    const i = 3 + Math.floor(t.room / 3);
    for (let d = 0; d < i; d++) {
      const [a, l] = n(140, 260),
        r = makeEnemy(pick(s.m), o, "elite", a, l);
      ((r.dmg *= DG_ELITE_DMG), (r.hp = r.max = r.max * DG_ELITE_HP), R.enemies.push(r));
    }
  }
}
function dgTick(t) {
  const n = R.dg;
  n &&
    ((n.t += t),
    (R.stall = 0),
    n.kind === "wb" && n.boss && (n.dmg = Math.max(n.dmg, n.boss.max - Math.max(0, n.boss.hp))),
    n.t >= n.limit && (n.kind === "wb" ? wbFinish(!1) : dgFail("Hết thời gian")));
}
function dgCleared() {
  const t = R.dg;
  if (t.kind === "boat") {
    boatCleared();
    return;
  }
  if (t.kind === "wb") {
    if (!t.boss || t.boss.hp > 0) {
      R.spawnT = 0.5;
      return;
    }
    ((t.dmg = t.boss.max), wbFinish(!0));
    return;
  }
  if (t.room >= t.d.rooms) {
    dgWin();
    return;
  }
  if ((t.room++, t.kind === "dg" && t.d.islands && R.zoneShown === "dg")) {
    const n = obsIsland(t.room - 1);
    if (n) {
      (([H.x, H.y] = n), (R.moveTo = null), (R.pickTarget = null));
      for (const o of R.ground) [o.x, o.y] = inWorld(o.x, o.y);
      typeof snapCamera == "function" && snapCamera();
    }
  }
  (heal(R.P.life * 0.25, !0),
    (R.mana = Math.min(R.P.mana, R.mana + R.P.mana * 0.3)),
    (R.spawnT = 1.5),
    (R.banner = {
      t: 1.4,
      text: `Phòng ${t.room}/${t.d.rooms} · quái cấp ${dgRoomL(t)}`,
      sub: t.room >= t.d.rooms ? "Trùm trấn thủ!" : `Còn ${Math.ceil(t.limit - t.t)} giây`,
    }));
}
function dgFail(t) {
  const n = R.dg;
  if (n) {
    if (n.kind === "wb") {
      wbFinish(!1);
      return;
    }
    if (n.kind === "boat") {
      (log(`<span class="bad">Phong Lăng Độ thất bại: ${esc(t)}.</span> Không mất lượt.`),
        (R.banner = { t: 2.2, text: "Thuyền bị cướp", sub: t + " · không mất lượt" }),
        dgExit(),
        curTab === "quest" && refresh());
      return;
    }
    (log(`<span class="bad">Phó bản ${esc(n.d.n)} thất bại: ${esc(t)}.</span> Không mất lượt.`),
      ((R.dgSkip || (R.dgSkip = {}))[n.d.id] = !0),
      (R.banner = { t: 2.2, text: "Thất bại", sub: t + " · không mất lượt" }),
      dgExit());
  }
}
function forceOre(t) {
  const n = rcInt(0, VIO_SLOTS - 1),
    o = Object.values(S.eq).filter((r) => r && r.d <= 9),
    s = o.length ? pick(o) : null,
    e = s
      ? J.affixLevel
          .filter(
            (r) =>
              r.lvl === 1 &&
              r.pre === (n % 2 === 0 ? 1 : 0) &&
              magicMatchSeries(r.a, s.s) &&
              magicMatchEquip(r.a, s.d, s.k),
          )
          .map((r) => r.a)
      : [],
    i = e.length ? pick([...new Set(e)]) : pick(orePool(n)),
    d = clamp(Math.floor(t / 12) + rcInt(0, 1), 1, ORE_MAX),
    a = Object.values(S.eq).filter((r) => r && r.d <= 9),
    l = oreKey(n, i, d, n % 2 ? (a.length ? pick(a).s : irnd(0, 4)) : -1);
  return (matAdd("ore", l), `${oreStoneName(l)} cấp ${d}`);
}
function dgLoot(t, n) {
  const o = [],
    s = clamp(Math.floor(t / 15) + 1, 1, HT_MAX);
  (matAdd("ht", s, n), o.push(`${n} Huyền Tinh cấp ${s}`));
  for (let e = 0; e < n; e++) o.push(forceOre(t));
  return o;
}
function dgWin() {
  const t = R.dg,
    n = t.d,
    o = Math.round(t.t),
    s = o <= n.limit * 0.5 ? "S" : o <= n.limit * 0.75 ? "A" : "B",
    e = RANK_MUL[s];
  DG().runs[n.id] = (DG().runs[n.id] || 0) + 1;
  const i = REC();
  ((i.dgClear[n.id] = (i.dgClear[n.id] || 0) + 1),
    (!i.dgBest[n.id] || o < i.dgBest[n.id]) && (i.dgBest[n.id] = o),
    (!i.dgRank[n.id] || "SAB".indexOf(s) < "SAB".indexOf(i.dgRank[n.id])) && (i.dgRank[n.id] = s));
  const d = grant(
      {
        fd: Math.round(n.fd * e),
        knb: Math.round((n.knb || 0) * e),
        buff: { tt: [0.5, s === "S" ? 30 : s === "A" ? 20 : 10] },
      },
      `Phó bản ${n.n} · hạng ${s}`,
    ),
    a = dgLoot(t.L, s === "S" ? 3 : s === "A" ? 2 : 1);
  if ((log(`🎁 ${a.join(", ")}`), Math.random() < n.set * DG_HK_K * e)) {
    const l = forceSetItem(!1);
    l && (addItem(l, !0, !0, !0), log(`🎁 Phó bản ${esc(n.n)}: <b style="color:${RAR_COL[l.r]}">${esc(l.n)}</b>`));
  }
  (typeof horseBoxGive == "function" && Math.random() < n.horse * HB_DROP.dg * e && horseBoxGive(1, "Phó bản " + n.n),
    questTick("dungeon"),
    (R.banner = {
      t: 3,
      text: `Qua ${n.n} · hạng ${s}`,
      sub: `${o} giây · ${d.join(", ").replace(/<[^>]+>/g, "")}`.slice(0, 70),
    }),
    uiSfx("levelup"),
    achCheck(),
    dgExit(),
    save());
}
function wbRankOf(t, n) {
  for (const [o, s] of WB_RANKS) if (t >= n * s - 0.5) return o;
  return "";
}
function wbFinish(t) {
  const n = R.dg,
    o = DG(),
    s = n.boss ? n.boss.max : 1,
    e = n.boss ? Math.round(t ? s : n.dmg) : 0,
    i = n.boss ? wbRankOf(e, s) : "";
  (e > (o.wbBest || 0) && ((o.wbBest = e), (o.wbHp = s)),
    i && (!o.wbRank || "SABC".indexOf(i) < "SABC".indexOf(o.wbRank)) && (o.wbRank = i),
    recSet("wbBest", e, { n: MON[n.tid].n, rank: i || "—", pct: Math.round((e / s) * 100) }),
    log(
      `Boss tuần ${esc(MON[n.tid].n)}: gây <b>${fmt(e)}</b> sát thương (${Math.round((e / s) * 100)}% máu) · hạng ${i || "chưa đạt"}`,
    ),
    (R.banner = { t: 3, text: t ? "Hạ Boss tuần!" : "Hết giờ", sub: `${fmt(e)} sát thương · hạng ${i || "—"}` }),
    dgExit(),
    dotGift(),
    save());
}
function wbClaim() {
  const t = DG();
  if (t.wbClaimed || !t.wbRank) return;
  ((t.wbClaimed = !0), grant(WB_REWARD[t.wbRank], `Rương Boss tuần hạng ${t.wbRank}`));
  const n = dgLoot(dgLevel(3), { S: 3, A: 2, B: 1, C: 1 }[t.wbRank]);
  (log(`🎁 ${n.join(", ")}`), achCheck(), save());
}
const dgPending = () => S && S.fac && ((DG().wbRank && !DG().wbClaimed) || !1);
function drawDgHud(t) {
  const n = R.dg;
  if (!n) return;
  const o = Math.max(0, n.limit - n.t),
    s = Math.floor(o / 60),
    e = String(Math.floor(o % 60)).padStart(2, "0"),
    i =
      n.kind === "wb"
        ? `Boss tuần · ${fmt(n.dmg)} (${(() => {
            const a = (n.dmg / Math.max(1, n.boss ? n.boss.max : 1)) * 100;
            return a < 10 ? a.toFixed(1) : Math.round(a);
          })()}%) · ${s}:${e}`
        : n.kind === "boat"
          ? `⛵ Phong Lăng Độ · đoạn ${n.room}/${BOAT_SEGS} · ${s}:${e}`
          : `${n.d.n} · phòng ${n.room}/${n.d.rooms} · ${s}:${e}`;
  ((t.font = '12px "IBM Plex Mono", monospace'), (t.textAlign = "center"));
  const d = t.measureText(i).width + 18;
  ((t.fillStyle = "#000b"),
    t.fillRect(AR.w / 2 - d / 2, 34, d, 20),
    (t.fillStyle = o < 20 ? "#ff7a6a" : "#f3d88a"),
    t.fillText(i, AR.w / 2, 48));
}
function dungeonBody() {
  const t = R.dg
      ? `<div class="card"><b>Đang trong ${R.dg.kind === "wb" ? "Boss tuần" : esc(R.dg.d.n)}</b><div class="btnrow"><button class="btn red" id="dgOut">Rời đi${R.dg.kind === "wb" ? " (giữ sát thương đã gây)" : " (không mất lượt)"}</button></div></div>`
      : "",
    n = REC();
  return `<p class="desc">Phó bản: quái tinh anh cấp cố định theo phó bản (phòng 1 = cấp phó bản, mỗi phòng mạnh dần, phòng cuối +10 là trùm trấn thủ), không mạnh lên theo cấp nhân vật. ${DG_RUNS} lượt / ngày cho mỗi phó bản, chỉ trừ lượt khi vượt qua. Hạng theo thời gian: S ≤ 50% giới hạn (thưởng ×1.5), A ≤ 75% (×1.2), B.</p>${t}
    ${DUNGEONS.map((o) => {
      const s = dgUnlocked(o),
        e = dgLeft(o);
      return `<div class="card dgc${s ? "" : " lock"}"><b>${esc(o.n)}</b> <small class="dim">từ cấp ${o.lv} · quái cấp ${o.lv} → ${Math.min(200, o.lv + DG_SPAN)} · ${o.rooms} phòng · ${o.limit >= 120 && o.limit % 60 === 0 ? o.limit / 60 + " phút" : o.limit + " giây"}</small><br><small>${esc(o.d)}</small><br>
      <small class="dim">Thưởng: ${o.fd} Phúc Duyên, <b style="color:#ffd24a">${o.knb || 0} KNB</b>, Tiên Thảo Lộ 10–30 phút, Huyền Tinh + khoáng · Hoàng Kim ${(o.set * DG_HK_K * 100).toFixed(1)}% · Rương Ngựa ${(o.horse * HB_DROP.dg * 100).toFixed(1)}%${n.dgClear[o.id] ? ` · kỷ lục ${n.dgBest[o.id]} giây (hạng ${n.dgRank[o.id]})` : ""}</small>
      <div class="btnrow"><button class="btn" data-dg="${o.id}" ${s && e && !dgBusy() ? "" : "disabled"}>${s ? (e ? `Vào (còn ${e}/${DG_RUNS} lượt)` : "Hết lượt hôm nay") : `Cần cấp ${o.lv}`}</button></div></div>`;
    }).join("")}`;
}
function wbBody() {
  const t = DG(),
    n = wbBossTid(),
    o = MON[n],
    s = dgLevel(3),
    e = S.lvl >= 20 || RW().stat.reborn > 0,
    i = weekStart();
  i.setDate(i.getDate() + 7);
  const d = Math.max(0, Math.round((i - Date.now()) / 36e5)),
    a = t.wbBest && t.wbHp ? Math.round((t.wbBest / t.wbHp) * 100) : 0;
  return `<p class="desc">Mỗi tuần một trùm cực trâu (máu ×${WB_HP} trùm thường). ${WB_TRIES} lượt / tuần, mỗi lượt ${WB_LIMIT} giây. Hạng theo % máu trùm đã đánh mất: C ${WB_RANKS[3][1] * 100}% · B ${WB_RANKS[2][1] * 100}% · A ${WB_RANKS[1][1] * 100}% · S hạ gục. Nhận rương tuần theo hạng tốt nhất.</p>
    <div class="card"><div class="idet">${o.img ? `<div class="pic"><img src="${esc(o.img)}" alt=""></div>` : ""}<div><h4 class="boss">${esc(o.n)}</h4><small class="dim">Cấp ${s} · đổi trùm sau ${d} giờ</small></div></div>
      <div class="stats"><span>Lượt còn</span><span>${WB_TRIES - t.wbTries}/${WB_TRIES}</span><span>Sát thương tốt nhất</span><span>${fmt(t.wbBest || 0)}${a ? ` (${a}%)` : ""}</span><span>Hạng tuần</span><span>${t.wbRank || "—"}</span></div>
      <div class="chips">${["S", "A", "B", "C"].map((l) => `<span class="chip2${t.wbRank === l ? " on" : ""}">${l}: ${giftText(WB_REWARD[l])}${l === "S" ? ", 35% thần mã" : ""}</span>`).join("")}</div>
      <div class="btnrow"><button class="btn" id="wbGo" ${e && t.wbTries < WB_TRIES && !dgBusy() ? "" : "disabled"}>${e ? (t.wbTries < WB_TRIES ? "Khiêu chiến" : "Hết lượt tuần này") : "Cần cấp 20"}</button>
      <button class="btn" id="wbClaim" ${t.wbRank && !t.wbClaimed ? "" : "disabled"}>${t.wbClaimed ? "Đã nhận rương tuần" : "Nhận rương tuần"}</button></div></div>`;
}
let actTab = "dg";
function actModal(t) {
  if (!S.fac) return;
  if (t === "dt" || t === "st") {
    openQuest(t);
    return;
  }
  t && (actTab = t);
  const n = [
      ["dg", "Phó bản"],
      ["tower", "Tháp"],
      ["wb", "Boss tuần"],
      ["horse", "Mã trường"],
      ["pet", "Đồ đệ"],
      ["rec", "Kỷ lục"],
    ],
    o =
      actTab === "tower"
        ? towerBody()
        : actTab === "pet"
          ? partyBody()
          : actTab === "dg"
            ? dungeonBody()
            : actTab === "wb"
              ? wbBody()
              : actTab === "horse"
                ? stableBody()
                : actTab === "tm"
                  ? thanMaBody()
                  : recordsBody();
  modal(
    `<h3>Hoạt động <small>${fmtL(S.gold)} lượng</small></h3><div class="dtabs" id="actTabs">${n.map(([s, e]) => `<button data-a="${s}" class="${s === actTab ? "on" : ""}">${e}</button>`).join("")}</div>${o}`,
    () => {
      (document.querySelectorAll("#actTabs button").forEach((e) => (e.onclick = () => actModal(e.dataset.a))),
        document.querySelectorAll("#mBody [data-dg]").forEach((e) => (e.onclick = () => dgStart(e.dataset.dg))));
      const s = (e, i) => {
        const d = $(e);
        d && (d.onclick = i);
      };
      (s("#wbGo", wbStart),
        s("#wbClaim", () => {
          (wbClaim(), actModal());
        }),
        s("#dgOut", () => {
          (R.dg.kind === "wb" ? wbFinish(!1) : (log("Rời phó bản."), dgExit()), actModal());
        }),
        actTab === "horse" && bindStable(() => actModal()),
        actTab === "tm" && bindThanMa(() => actModal()),
        s("#gTower", towerStart),
        s("#gTowerOut", () => {
          (towerExit(!1), actModal());
        }),
        actTab === "pet" && partyBind($("#mBody"), () => actModal()));
    },
  );
}
function actDot() {
  const t = $("#actBtn");
  if (!t || !S.fac) return;
  const n =
    DUNGEONS.some((o) => dgUnlocked(o) && dgLeft(o)) ||
    ((S.lvl >= 20 || RW().stat.reborn) && DG().wbTries < WB_TRIES) ||
    dgPending();
  t.classList.toggle("on", !!n);
}
const dgNext = () =>
  DUNGEONS.filter((t) => dgUnlocked(t) && dgLeft(t) > 0 && !(R.dgSkip || {})[t.id]).sort((t, n) => n.lv - t.lv)[0] ||
  null;
function dgPilot(t) {
  if (
    S.mode !== "dg" ||
    !S.fac ||
    R.dg ||
    R.tower ||
    R.deadT > 0 ||
    R.sat ||
    ((R.dgPilotT = (R.dgPilotT || 0) - t), R.dgPilotT > 0)
  )
    return;
  R.dgPilotT = 1.5;
  const n = dgNext();
  if (n) {
    (R.town && backFromTown(), dgStart(n.id));
    return;
  }
  if (!R.town) {
    const o = bestZoneIdx();
    S.autoMap !== !1 && zoneIdx(Math.min(S.stage, STAGES)) !== o && gotoZone(o, "Hết lượt phó bản, luyện công");
  }
}
