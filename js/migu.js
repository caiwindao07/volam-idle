"use strict";
// Nguyệt Ca Mật Cốc (map 969, Thần Hành Phù destination group "migu", listed with the level-90 training maps):
// a paid access pass like JX1's entry NPC (Pay(100000)). See docs/backend.md (/api/migu) and docs/admin-console.md (maps.migu).
//   - entering needs an active pass: S.miguUntil (ms, shared by the whole party: not a per-character field);
//     no pass -> confirm "Vào Mật Cốc cần 10 vạn lượng, hiệu lực 3 ngày. Đồng ý?" -> the travel goes through the
//     map-load gate (js/maptravel.js) and the price is paid in thGo only once the map is loaded and the switch
//     happens (a map that fails to load: no charge).
//   - online (logged in): POST /api/migu/buy takes the gold from the STORED save and records the expiry server
//     side (ledger entry: a stale upload replays it, a forged S.miguUntil is replaced on upload); expiry checks use
//     the server clock (GET /api/migu -> now). Offline / dev: client side only.
//   - the pass runs out while inside: back to the last town (Thổ Địa Phù target) with a message.
//   - admin world teleport (admGo) bypasses pass and level (MIGU.adm).
//   - monsters: JX1 looks (jxmon.js), levels from cfg.mlv spread over the 6 landing points (miguBand).
// Settings: config document "maps" -> migu (admin console, js/gcfg/maps.js sets window.MIGU_CFG).
const MIGU_DEF = { price: 1e5, hours: 72, minLv: 90, mlv: [90, 120] }, // server/admin_sections/maps.py MIGU_DEFAULT
  // srv / syncAt: server time (ms) at performance.now() = syncAt (last GET /api/migu or purchase); spent: lượng paid
  MIGU = { srv: null, syncAt: 0, syncing: 0, buy: null, busy: 0, adm: 0, spent: 0, BUY_TTL: 12e4 };
const miguCfg = () => {
    const c = Object.assign({}, MIGU_DEF, window.MIGU_CFG && typeof MIGU_CFG == "object" ? MIGU_CFG : {});
    Array.isArray(c.mlv) && c.mlv.length === 2 && c.mlv[0] <= c.mlv[1] || (c.mlv = MIGU_DEF.mlv.slice());
    return c;
  },
  miguIs = (d) => !!d && d.g === "migu",
  // logged in: the server clock carried forward by the monotonic clock (changing the device clock changes nothing)
  miguNow = () => (MIGU.srv != null && miguOnline() ? MIGU.srv + (performance.now() - MIGU.syncAt) : Date.now()),
  miguDue = (ms) => !MIGU.syncAt || performance.now() - MIGU.syncAt > ms,
  miguLeft = () => Math.max(0, (+(S && S.miguUntil) || 0) - miguNow()),
  miguActive = () => miguLeft() > 0,
  miguOnline = () => typeof NET == "object" && !!NET.user && typeof netOn == "function" && netOn() && !NET.offline,
  miguBypass = () => MIGU.adm > 0 && typeof admOk == "function" && admOk(),
  miguPriceTxt = (c = miguCfg()) => `${fmtL(c.price)} lượng`,
  miguHoursTxt = (h = miguCfg().hours) => (h % 24 ? `${h} giờ` : `${h / 24} ngày`);
// "2 ngày 5 giờ" / "5 giờ 12 phút" / "12 phút"
function miguDur(ms) {
  const m = Math.max(1, Math.ceil(ms / 6e4)),
    d = Math.floor(m / 1440),
    h = Math.floor((m % 1440) / 60),
    mi = m % 60;
  return d ? `${d} ngày${h ? ` ${h} giờ` : ""}` : h ? `${h} giờ${mi ? ` ${mi} phút` : ""}` : `${mi} phút`;
}
// Monster level band of landing point pi: cfg.mlv spread over the points, 10 levels wide (90–100 … 110–120).
function miguBand(d, pi) {
  const [lo, hi] = miguCfg().mlv,
    n = Math.max(1, (d && d.p && d.p.length) || 1),
    w = Math.min(10, hi - lo),
    i = clamp(+pi || 0, 0, n - 1),
    a = Math.round(lo + (n > 1 ? (i * (hi - lo - w)) / (n - 1) : 0));
  return [a, a + w];
}
// Visit alt map of Mật Cốc (thanhanh.js thVisitAlt): own monster levels instead of the borrowed zone's.
function miguAlt(alt, d, pi) {
  if (!alt) return;
  const [lo, hi] = miguBand(d, pi);
  Object.assign(alt, { lo, hi, migu: 1, miguPi: +pi || 0 });
}
// Config changed (js/gcfg/maps.js): refresh a registered Mật Cốc alt.
function miguRefresh() {
  for (const k in ZALT)
    for (const a of ZALT[k] || []) if (a.migu && typeof thDest == "function") miguAlt(a, thDest(a.id), a.miguPi);
}
// Picker row text.
function miguSub() {
  const c = miguCfg();
  return `Mật Cốc · quái cấp ${c.mlv[0]}–${c.mlv[1]} · cần cấp ${c.minLv} · ${
    miguActive() ? `<b class="migok">lệnh vào còn ${miguDur(miguLeft())}</b>` : `lệnh vào ${miguPriceTxt(c)} / ${miguHoursTxt(c.hours)}`
  }`;
}

// ---- entering (thanhanh.js thPick / thGo)
// Confirm dialog (JX1 style) -> travel through the gate with the purchase armed for this key.
function miguAsk(k) {
  const c = miguCfg(),
    exp = +(S && S.miguUntil) > 0;
  modal(
    `<div class="migbox"><h3>Nguyệt Ca Mật Cốc</h3>
    <p>${exp ? "Lệnh vào Mật Cốc đã hết hạn. " : ""}Vào Mật Cốc cần <b>${miguPriceTxt(c)}</b>, hiệu lực <b>${miguHoursTxt(c.hours)}</b>. Đồng ý?</p>
    <p class="dim small">Đang có ${fmtL(S.gold)} lượng. Chỉ trả tiền khi bản đồ đã tải xong và vào được Mật Cốc; trong thời hạn ra vào tự do (cả nhóm đồ đệ). Hết hạn khi đang ở trong sẽ bị đưa về ${esc(W.town.n)}.</p>
    <div class="btnrow"><button class="btn on" data-mig="yes">Đồng ý</button><button class="btn" data-mig="no">Thôi</button></div></div>`,
    () => {
      $("#mBody [data-mig=yes]").onclick = () => {
        if (S.gold < c.price) return toast("Không đủ ngân lượng");
        MIGU.buy = { k, t: Date.now() };
        closeModal(!0);
        thGo(k);
      };
      $("#mBody [data-mig=no]").onclick = () => (typeof thModal == "function" ? thModal() : closeModal(!0));
    },
  );
}
// Called by thGo once the map is loaded (inside the gate), before switching. -> true: travel now.
function miguPay(k) {
  if (miguBypass() || miguActive()) return !0;
  const b = MIGU.buy,
    c = miguCfg();
  if (!b || b.k.split(":")[1] !== k.split(":")[1] || Date.now() - b.t > MIGU.BUY_TTL) return (miguAsk(k), !1);
  if (S.gold < c.price) return ((MIGU.buy = null), toast("Không đủ ngân lượng"), !1);
  if (miguOnline()) {
    // the server charges the stored save; travel once it answered (the map is loaded already: no second wait)
    if (MIGU.busy) return !1;
    MIGU.busy = 1;
    toast("Đang mua lệnh vào Mật Cốc…");
    miguBuyServer()
      .then(() => {
        MIGU.buy = null;
        miguActive() && thGo(k);
      })
      .catch((e) => ((MIGU.buy = null), toast((e && e.message) || "Không mua được lệnh vào Mật Cốc")))
      .finally(() => (MIGU.busy = 0));
    return !1;
  }
  if (S.netOwner && typeof NET == "object") return ((MIGU.buy = null), toast("Nhân vật đám mây: đăng nhập để mua lệnh vào Mật Cốc"), !1);
  S.gold -= c.price;
  MIGU.spent += c.price;
  S.miguUntil = miguNow() + c.hours * 36e5;
  MIGU.buy = null;
  log(`Mua lệnh vào <b>Mật Cốc</b> (−${fmtL(c.price)} lượng), hiệu lực ${miguHoursTxt(c.hours)}.`);
  return !0;
}
async function miguBuyServer() {
  await netNeedChar();
  try {
    await netUpload(); // the server checks the gold of the stored save
  } catch (e) {
    throw new Error("Không lưu được nhân vật lên máy chủ, chưa mua: " + e.message);
  }
  const t0 = performance.now(),
    j = await netCall((s) => s.post("/api/migu/buy", { slot: SLOT }));
  MIGU.srv = j.now;
  MIGU.syncAt = (t0 + performance.now()) / 2;
  j.paid > 0 && ((S.gold -= j.paid), (MIGU.spent += j.paid));
  S.tseq = j.tseq | 0;
  S.miguUntil = j.until;
  j.paid > 0 && log(`Mua lệnh vào <b>Mật Cốc</b> (−${fmtL(j.paid)} lượng), hiệu lực ${miguHoursTxt(j.cfg && j.cfg.hours)}.`);
  save();
  netUpload().catch(() => {});
}
// Server record + server clock (logged in). Also refreshed by every save upload (js/net.js -> miguFromServer).
async function miguSync() {
  if (!miguOnline() || !S || !S.fac || typeof SLOT == "undefined" || (typeof netForeign == "function" && netForeign(S))) return;
  const t0 = (MIGU.syncAt = performance.now()); // a failed sync is retried after the usual delay
  MIGU.syncing = 1;
  try {
    const j = await netCall((s) => s.get("/api/migu?slot=" + SLOT));
    MIGU.srv = j.now;
    MIGU.syncAt = (t0 + performance.now()) / 2;
    miguFromServer(j.until);
  } finally {
    MIGU.syncing = 0;
  }
}
function miguFromServer(v) {
  if (!S || !S.fac) return;
  v > 0 ? (S.miguUntil = +v) : delete S.miguUntil;
}

// ---- running out while inside
const miguHere = () => {
  const z = S && S.fac && typeof zoneOf == "function" && zoneOf(Math.min(S.stage, STAGES));
  return z && z.migu ? z : null;
};
// forget the Mật Cốc visit: "Trở lại bãi" / auto-pilots go to the zone's own map
function miguDrop() {
  for (const k in ZALT) {
    const l = ZALT[k],
      i = l.findIndex((m) => m.migu);
    if (i < 0) continue;
    S.zalt && S.zalt[k] === i + 1 && (S.zalt[k] = 0);
    S.zalt && S.zalt[k] > i + 1 && S.zalt[k]--;
    l.splice(i, 1);
  }
  S.thv && miguIs(thDest(S.thv.id)) && delete S.thv;
}
const miguAdmIn = () => !!(S.thv && S.thv.adm && typeof admOk == "function" && admOk());
function miguTick() {
  if (!S || !S.fac || !miguHere() || miguActive() || miguAdmIn()) return;
  // logged in: expired by the local reckoning -> ask the server first (record + clock; the device clock may
  // have jumped). A failed sync still counts: the next tick decides with the last known server offset.
  if (miguOnline() && (MIGU.syncing || miguDue(15e3))) return void (MIGU.syncing || miguSync().catch(() => {}));
  if (R.town) return void miguDrop(); // in town with Mật Cốc as the "back" map
  if (R.dg || R.tower || (typeof MG == "object" && (MG.req || MG.hold))) return;
  const tn = W.town.n;
  if (!thToTown()) return; // retried next second
  miguDrop();
  MIGU.buy = null;
  R.banner = { t: 3, text: tn, sub: "Lệnh vào Mật Cốc đã hết hạn" };
  log(`⌛ Lệnh vào <b>Mật Cốc</b> đã hết hạn: trở về <b>${esc(tn)}</b>. Mua lệnh mới để vào lại.`);
  toast(`Lệnh vào Mật Cốc đã hết hạn — trở về ${tn}`);
  save();
  typeof refresh == "function" && refresh();
}
// backFromTown hook (thanhanh.js): never back into Mật Cốc without a pass
function miguBackOk() {
  try {
    if (S && S.fac && R.town && miguHere() && !miguActive() && !miguAdmIn() && !miguBypass()) {
      miguDrop();
      toast("Lệnh vào Mật Cốc đã hết hạn");
    }
  } catch (e) {
    console.warn("miguBackOk", e);
  }
}

function miguInstall() {
  const st = document.createElement("style");
  st.textContent = `.migbox p{margin:6px 0;line-height:1.45}.migbox .btnrow{justify-content:center;margin-top:10px}.thlist b.migok{color:#8fe08a;font-weight:normal}`;
  document.head.appendChild(st);
  setInterval(() => {
    try {
      miguTick();
    } catch (e) {
      console.warn("miguTick", e);
    }
    // server record / clock every 5 minutes while logged in (and soon after logging in)
    miguOnline() && !MIGU.syncing && miguDue(3e5) && miguSync().catch(() => {});
  }, 1e3);
}
document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", miguInstall) : setTimeout(miguInstall, 0);
