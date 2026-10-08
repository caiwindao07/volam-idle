"use strict";
// Load first, then travel (like JX1's loading screen): every map change waits until the target map is ready.
//
// 1. Travel gate. The player's / auto-pilot's travel entry points (Thần Hành Phù thGo, admin world teleport
//    admGo, Thổ Địa Phù key / buttons (mgTravel), zone list + auto zone change gotoZone, dungeon dgStart, boat
//    boatStart, Xa phu npcRide) are wrapped: the target map and landing point are predicted, mapPreload
//    (js/jxmap.js) loads its meta, minimap, first-screen ground tiles and object sprites (town: NPCs), and only
//    then the original function runs and switches the map — so cooldowns, Thổ Địa Phù items and Xa phu fares are
//    spent only when the switch happens (a map that fails to load: no travel). While loading, a blocking JX1
//    overlay shows "Đang tải bản đồ <tên>… 37%", the simulation is paused (the hero stays where he is, nothing
//    hits him) and input on the battle field is blocked. A newer travel request replaces the pending one; calls
//    made in the same task (setMode: dgExit + backFromTown + gotoZone) are chained and run together. An already
//    loaded map switches at once (no overlay); a map coming from the device cache in < 150 ms shows none either.
// 2. Hold. Any other map change (dungeon / boat exit, back from town by the auto-pilots, stage progression, the
//    first map after a reload / deploy resume, a same-zone alt map, a far jump inside a map) is caught right
//    after it happened: simulation and drawing stop (the last frame stays on screen) behind the same overlay
//    until the meta (camps, obstacles, landing) and the visible tiles / sprites are in, so nothing pops either.
const MG = {
  req: null, // pending travel {id, n, acts, f, t0}
  open: null, // request opened in the current task (further gated calls are chained to it)
  inAct: 0, // running a request's actions: nested gated calls go straight through
  sync: 0, // inside a caller that needs its travel to happen synchronously
  hold: null, // {t0, n, f} map switched, waiting for its images
  noHold: 0, // a travel already timed out: don't hold again for it
  sig: "",
  hx: 0,
  hy: 0,
  since: 0,
  el: null,
  SHOW_MS: 150,
  TO: 2e4,
};
const mgName = (id) =>
  (typeof jxmName == "function" && jxmName(id)) ||
  (typeof W == "object" && W.town && String(W.town.id) === String(id) ? W.town.n : "") ||
  (typeof JMAP == "object" && JMAP[String(id)] && JMAP[String(id)].name) ||
  "";
// ---- landing point predictions (full-map px, resolved once the meta is known)
// Town / dungeon entry: mapMid() on that map (Thần Hành Phù / revive point, else the old crop's centre).
const mgLand = (id) => (m) => {
  const p = JXM.lands[String(id)];
  if (p) return p.slice();
  if (m.crop) {
    const j = window.JMO && window.JMO[String(id)];
    return [m.crop.ox + ((j && j.w) || 3584) / 2, m.crop.oy + ((j && j.h) || 3584) / 2];
  }
  return [m.w / 2, m.h / 2];
};
// Zone change: the hero keeps his position (crop space -> new map, jxmShift), unless a landing is pending;
// inWorld() then puts him on the nearest walkable cell (approximated on the raw obstacle grid).
const mgKeep = (id) => (m) => {
  const p = JXM.landPending === String(id) && JXM.lands[String(id)];
  if (p) return p.slice();
  const ox = m.crop ? m.crop.ox : 0,
    oy = m.crop ? m.crop.oy : 0;
  return mgSnap(m, [H.x - JXM.off.x + ox, H.y - JXM.off.y + oy]);
};
function mgSnap(m, p) {
  if (!m.obs || !m.gw || !m.cw) return p;
  const gw = m.gw,
    gh = m.gh;
  let ok = m._mgok;
  if (!ok) {
    const s = atob(m.obs),
      cx = 512 / m.cw,
      cy = 512 / m.ch,
      n = gw * gh;
    ok = new Uint8Array(n);
    for (let r = 0; r < n; r++)
      ok[r] =
        (r >> 3 < s.length && (s.charCodeAt(r >> 3) >> (r & 7)) & 1) ||
        (m.tmask && !m.tmask[((((r / gw) | 0) / cy) | 0) * m.rw + (((r % gw) / cx) | 0)])
          ? 0
          : 1;
    // only the component obsLoad keeps: the one filling the old crop most (heaviest otherwise)
    const comp = new Int32Array(n).fill(-1),
      q = new Int32Array(n),
      j = m.crop && window.JMO && window.JMO[String(m.id)],
      c0 = m.crop ? Math.floor(m.crop.ox / m.cw) : 0,
      c1 = m.crop ? Math.ceil((m.crop.ox + ((j && j.w) || 3584)) / m.cw) : gw,
      r0 = m.crop ? Math.floor(m.crop.oy / m.ch) : 0,
      r1 = m.crop ? Math.ceil((m.crop.oy + ((j && j.h) || 3584)) / m.ch) : gh;
    let best = -1,
      bw = -1,
      bs = 0,
      k = 0;
    for (let i = 0; i < n; i++) {
      if (!ok[i] || comp[i] >= 0) continue;
      let h = 0,
        t = 0,
        w = 0;
      q[t++] = i;
      comp[i] = k;
      while (h < t) {
        const g = q[h++],
          gx = g % gw,
          gy = (g / gw) | 0;
        gx >= c0 && gx < c1 && gy >= r0 && gy < r1 && w++;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const x = gx + dx,
              y = gy + dy;
            if ((!dx && !dy) || x < 0 || y < 0 || x >= gw || y >= gh) continue;
            const e = y * gw + x;
            !ok[e] || comp[e] >= 0 || (dx && dy && (!ok[gy * gw + x] || !ok[y * gw + gx])) || ((comp[e] = k), (q[t++] = e));
          }
      }
      (w > bw || (w === bw && t > bs)) && ((bw = w), (bs = t), (best = k));
      k++;
    }
    for (let i = 0; i < n; i++) ok[i] = comp[i] === best ? 1 : 0;
    m._mgok = ok;
  }
  const x = clamp(p[0], 0, m.w - 1),
    y = clamp(p[1], 0, m.h - 1),
    c0 = Math.floor(x / m.cw),
    r0 = Math.floor(y / m.ch);
  if (ok[r0 * gw + c0]) return [x, y];
  let best = null,
    bd = 1e18;
  const tr = (c, r) => {
    if (c < 0 || r < 0 || c >= gw || r >= gh || !ok[r * gw + c]) return;
    const px = (c + 0.5) * m.cw,
      py = (r + 0.5) * m.ch,
      d = (px - x) ** 2 + (py - y) ** 2;
    d < bd && ((bd = d), (best = [px, py]));
  };
  // ring perimeters (like obsSnap); cells are 2:1, so go on until the ring is farther than the best hit
  for (let k = 1; k < Math.max(gw, gh); k++) {
    for (let j = -k; j <= k; j++) (tr(c0 - k, r0 + j), tr(c0 + k, r0 + j));
    for (let i = -k + 1; i < k; i++) (tr(c0 + i, r0 - k), tr(c0 + i, r0 + k));
    if (best && (k * Math.min(m.cw, m.ch)) ** 2 > bd) break;
  }
  return best || [x, y];
}

// ---- overlay (JX1 loading screen: blocks the battle field)
const MG_CSS = `
#mgLoad{position:absolute;inset:0;z-index:40;background:radial-gradient(ellipse at center,#0008 0%,#000c 70%);
 pointer-events:auto;touch-action:none;cursor:wait}
#mgLoad[hidden]{display:none}
#mgLoad>div{position:absolute;left:50%;top:68%;transform:translate(-50%,-50%);box-sizing:border-box;width:min(340px,82%);padding:12px 16px 10px;border:1px solid #8a6d2e;border-radius:3px;
 background:linear-gradient(#1d150bf0,#0f0a05f0);box-shadow:0 0 0 1px #000,0 6px 22px #000c;color:#e8dcc0;text-align:center;font-size:13px}
#mgLoad b{display:block;color:#f3d88a;font-weight:normal;letter-spacing:.3px}
#mgLoad b em{font-style:normal;color:#ffe9a8;font-weight:bold}
#mgLoad i{display:block;height:8px;margin:9px 0 5px;border:1px solid #4a3a1a;background:#1a140a;overflow:hidden}
#mgLoad u{display:block;height:100%;width:0;background:linear-gradient(90deg,#8a5a14,#e8b84a 60%,#fff0b0);transition:width .15s}
#mgLoad small{color:#a89a74;font-size:11px}
`;
function mgUi() {
  const t = MG.req || MG.hold,
    now = performance.now();
  if (!t) {
    MG.since = 0;
    MG.el && (MG.el.hidden = !0);
    return;
  }
  MG.since || (MG.since = now);
  if (now - MG.since < MG.SHOW_MS) return void (MG.uiT || (MG.uiT = setTimeout(() => ((MG.uiT = 0), mgUi()), MG.SHOW_MS + 10)));
  let el = MG.el;
  if (!el) {
    const b = document.getElementById("battle");
    if (!b) return;
    const st = document.createElement("style");
    st.textContent = MG_CSS;
    document.head.appendChild(st);
    el = MG.el = document.createElement("div");
    el.id = "mgLoad";
    el.innerHTML = "<div><b></b><i><u></u></i><small></small></div>";
    // the loading screen swallows input meant for the battle field
    for (const k of ["pointerdown", "pointerup", "click", "contextmenu", "wheel"])
      el.addEventListener(k, (e) => (e.stopPropagation(), e.preventDefault()));
    b.appendChild(el);
  }
  const f = Math.round(clamp(t.f || 0, 0, 0.99) * 100);
  el.hidden = !1;
  el.querySelector("b").innerHTML = `Đang tải bản đồ${t.n ? ` <em>${esc(t.n)}</em>` : ""}…`;
  el.querySelector("u").style.width = `${f}%`;
  el.querySelector("small").textContent = `${f}%`;
}

// ---- travel gate
function mgRun(acts) {
  MG.inAct++;
  let v;
  try {
    for (const a of acts) v = a();
  } catch (e) {
    console.error("[mapGo]", e);
  } finally {
    MG.inAct--;
  }
  return v;
}
// sp: {id, n?, pt: [x, y] | (meta) -> [x, y], town?}; act switches the map. -> {now, v}
function mapGo(sp, act, o = {}) {
  const id = String(sp.id),
    n = sp.n || mgName(id);
  if (mapReady(id, sp.pt, sp.town)) {
    MG.req = null;
    mgUi();
    return { now: !0, v: mgRun([act]) };
  }
  const tok = { id, n, acts: [act], f: 0.02, t0: performance.now() };
  MG.req = tok;
  MG.open = tok;
  queueMicrotask(() => MG.open === tok && (MG.open = null));
  o.close && typeof closeModal == "function" && closeModal(!0);
  R.pickTarget = null;
  R.moveTo = null;
  typeof INPUT == "object" && (INPUT.target = null);
  mgUi();
  mapPreload(id, sp.pt, null, { town: sp.town, to: MG.TO, onp: (f) => MG.req === tok && ((tok.f = f), mgUi()) }).then(
    (r) => {
      if (MG.req !== tok) return; // replaced by a newer request
      MG.req = null;
      if (!r.ok) {
        toast(`Không tải được bản đồ ${n} — thử lại sau`);
        return mgUi();
      }
      r.timeout && (toast(`Mạng chậm: vào ${n} khi bản đồ chưa tải xong`), (MG.noHold = 1));
      MG.lastGo = { id, ms: Math.round(performance.now() - tok.t0), timeout: !!r.timeout };
      mgRun(tok.acts);
      mgUi();
    },
  );
  return { now: !1 };
}
// Replace global function `name` by a gated one. pred(...args) -> travel spec or null (no map change: run as is).
// o.def: return value while deferred; o.act(f, args): custom action; o.close: close the open window when deferring.
function mgGate(name, pred, o = {}) {
  const f = window[name];
  if (typeof f != "function" || f._mg) return;
  const g = function (...a) {
    if (MG.inAct || MG.sync || !S || !S.fac) return f.apply(this, a);
    const act = o.act ? () => o.act(f, a) : () => f.apply(this, a);
    if (MG.open) return (MG.open.acts.push(act), o.def);
    let sp = null;
    try {
      sp = pred.apply(this, a);
    } catch (e) {
      console.warn("[mapGo]", name, e);
    }
    if (!sp) return f.apply(this, a);
    const r = mapGo(sp, act, o);
    return r.now ? r.v : o.def;
  };
  g._mg = 1;
  window[name] = g;
}
// Callers that rely on their travel being done when it returns: never deferred (the hold covers them).
function mgSync(name) {
  const f = window[name];
  if (typeof f != "function" || f._mgs) return;
  const g = function () {
    MG.sync++;
    try {
      return f.apply(this, arguments);
    } finally {
      MG.sync--;
    }
  };
  g._mgs = 1;
  window[name] = g;
}

// Thần Hành Phù key -> {id, n, pt, town} (gate: the level locks thGo checks too).
function mgThSpec(k, gate) {
  if (k === "town") return R.town ? null : { id: W.town.id, n: W.town.n, pt: mgLand(W.town.id), town: 1 };
  if (k.startsWith("v:")) {
    const [, id, pi] = k.split(":"),
      d = thDest(id);
    if (!d || !thAvail(d)) return null;
    const p = thPlan(d);
    if (gate && p.lock) return null;
    const pt = (d.p && d.p[+pi || 0]) || [d.n, d.x, d.y];
    return { id: d.id, n: d.n, pt: [pt[1], pt[2]], town: p.kind === "town" };
  }
  const [z, a] = k.split(":").map(Number),
    m = ZONES[z] && (a ? (ZALT[z] || [])[a - 1] : ZONES[z]);
  if (!m || (gate && !zoneOpen(z))) return null;
  if (!R.town && JXM.cur && String(JXM.cur.id) === String(m.id)) return null;
  return { id: m.id, n: m.n, pt: mgKeep(m.id) };
}
// Thổ Địa Phù (key 3 / T, hotbar, gamepad, "Trở lại bãi"): kind "town" | "back".
function mgTravel(kind) {
  const go = kind === "back" ? () => backFromTown() : () => goTown();
  if (!S || !S.fac || MG.inAct) return go();
  if (MG.open) return void MG.open.acts.push(go);
  let sp = null;
  if (kind === "back") {
    if (R.town) {
      const z = zoneOf(Math.min(S.stage, STAGES));
      sp = { id: z.id, n: z.n, pt: z.thv ? mgLand(z.id) : mgKeep(z.id) };
    }
  } else if (
    !R.town &&
    !R.dg &&
    (!((R.tpCd || 0) > 0) || (typeof misc == "function" && typeof MISC_TDP != "undefined" && misc(MISC_TDP) > 0))
  )
    sp = { id: W.town.id, n: W.town.n, pt: mgLand(W.town.id), town: 1 };
  if (!sp) return go();
  const r = mapGo(sp, go);
  return r.now ? r.v : void 0;
}
function mgInstall() {
  mgGate("thGo", (k) => (thBlocked() || thHave() < 1 || thCdLeft() > 0 ? null : mgThSpec(k, !0)), { close: 1 });
  // admin world tab: thGo without cooldown / item, inside admDo (log / save / refresh once it happened)
  mgGate("admGo", (k) => (thBlocked() ? null : mgThSpec(k, !1)), {
    close: 1,
    def: "",
    act: (f, a) => admDo(() => f(...a)),
  });
  mgGate(
    "gotoZone",
    (t) => {
      if (!ZONES[t] || R.dg || R.tower || (!R.town && zoneIdx(Math.min(S.stage, STAGES)) === t)) return null;
      const z = zoneOf(farmStage(t));
      return { id: z.id, n: z.n, pt: mgKeep(z.id) };
    },
    { def: !0 },
  );
  mgGate("dgStart", (t) => {
    const n = DUNGEONS.find((o) => o.id === t);
    if (!n || dgBusy() || !dgUnlocked(n) || !dgLeft(n) || !(n.map && window.JMO && window.JMO[String(n.map)])) return null;
    return { id: n.map, n: n.n, pt: mgLand(n.map) };
  });
  mgGate("boatStart", () => {
    if (dgBusy() || !boatOk() || !boatLeft()) return null;
    const full = !!(window.JMO && window.JMO[337]);
    return {
      id: full ? 337 : 336,
      n: "Phong Lăng Độ",
      pt: (m) => (full ? [2150 + (m.crop ? m.crop.ox : 0), 1130 + (m.crop ? m.crop.oy : 0)] : [m.w / 2, m.h / 2]),
    };
  });
  mgGate("npcRide", (d, price) => {
    if (!d || thBlocked() || S.gold < price) return null;
    const rows = ((NPCV.data && NPCV.data.maps[String(d.id)]) || []).filter((r) => r.k === "xaphu"),
      st = rows.find((r) => r.st === 0) || rows[0];
    return { id: d.id, n: d.n, pt: st ? [st.x + 40, st.y + 30] : [d.x, d.y], town: 1 };
  });
  // Sát Thủ: spawns the assassin on the zone it just travelled to
  mgSync("stStart");
}

// ---- hold: called by main.js frame() before simulating (draw = false) and before drawing (draw = true).
// -> true: skip that step (simulation: travel loading or hold; drawing: hold only, the last frame stays).
function mgCheck(draw) {
  try {
    if (typeof S != "object" || !S || !S.fac || typeof OBS != "object") return !1;
    const m = JXM.cur,
      sig = `${OBS.key}|${m ? m.id : ""}|${OBS.g && OBS.g.jm ? 1 : 0}|${R.town ? 1 : 0}`;
    if (sig !== MG.sig) ((MG.sig = sig), mgHoldStart());
    else if (Math.abs(H.x - MG.hx) > AR.w * 0.75 || Math.abs(H.y - MG.hy) > AR.h * 0.75) mgHoldStart(); // far jump
    MG.hx = H.x;
    MG.hy = H.y;
    MG.hold && mgHoldStep();
    mgUi();
    // no map yet (first frames after a reload): nothing worth drawing until the first map is in
    return draw ? !!MG.hold || OBS.key == null : !!(MG.hold || MG.req);
  } catch (e) {
    console.warn("[mapGo] hold", e);
    MG.hold = null;
    return !1;
  }
}
function mgHoldStart() {
  if (MG.noHold) return void (MG.noHold = 0);
  MG.hold || (MG.hold = { t0: performance.now(), n: "", f: 0.1 });
}
function mgHoldEnd() {
  const h = MG.hold;
  // last holds (debugging: a gated travel normally needs none or a 0 ms one)
  h && (MG.holds = (MG.holds || []).slice(-9)).push({ id: JXM.cur && String(JXM.cur.id), ms: Math.round(performance.now() - h.t0) });
  MG.hold = null;
  typeof snapCamera == "function" && snapCamera();
  JXM.cur && typeof jxmPrefetch == "function" && jxmPrefetch(JXM.cur);
}
function mgHoldStep() {
  const h = MG.hold,
    k = OBS.key;
  if (k == null || window.NO_JMAP) return mgHoldEnd();
  const id = String(k === "town" ? W.town.id : k);
  h.n || (h.n = mgName(id) || (R.town ? W.town.n : (zoneOf(Math.min(S.stage, STAGES)) || {}).n || ""));
  if (performance.now() - h.t0 > MG.TO) return (toast(`Mạng chậm: bản đồ ${h.n} vẫn đang tải`), mgHoldEnd());
  // meta still coming: obsJmapReady rebuilds the map (obstacles, landing, camps) when it arrives
  if (JXM.st[id] === "load" || JXM.st[id] === "wait") return void (h.f = 0.1);
  const m = JXM.cur;
  if (!m || !OBS.g || !OBS.g.jm || String(m.id) !== id) return mgHoldEnd(); // no full map: nothing to wait for
  if (R.town && typeof npcData == "function" && !window.JNPC && !(typeof NPCV == "object" && NPCV.st === 2))
    return (npcData(), void (h.f = 0.15));
  const [cx, cy] = camTarget(),
    r = { x: cx, y: cy, w: AR.w, h: AR.h },
    need = jxmNeed(m, JXM.cs, r, 0),
    n = need.filter((e) => e.im || e.bad).length;
  h.mg || ((h.mg = 1), jxmNeed(m, JXM.cs, r, 1)); // the 1-tile margin starts loading too (not waited for)
  h.f = 0.15 + (0.85 * n) / need.length;
  n >= need.length && mgHoldEnd();
}
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", mgInstall) : setTimeout(mgInstall, 0);
