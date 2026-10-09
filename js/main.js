/* ======================= KHOI DONG + VONG LAP ======================= */
'use strict';
let lastT = performance.now(), saveT = 0, uiT = 0, drawTog = false, _openFloat = null;
/* Tuy chon hien thi luu rieng cho thiet bi (khong theo nhan vat): thu gon, co chu, tiet kiem pin */
const UI_KEY = 'jxidle_ui', UI_FS = [0.9, 1, 1.15, 1.3], UI_FS_NAME = ['Nhỏ', 'Vừa', 'Lớn', 'Rất lớn'];
let UIP = null;
function uiPrefs() {
  if (!UIP) { try { UIP = JSON.parse(localStorage.getItem(UI_KEY) || '{}') || {}; } catch (e) { UIP = {}; } }
  UIP.fs = Number.isInteger(UIP.fs) && UIP.fs >= 0 && UIP.fs < UI_FS.length ? UIP.fs : 1; UIP.saver = !!UIP.saver; UIP.compact = !!UIP.compact;
  return UIP;
}
function applyUiPrefs() { const p = uiPrefs(); document.documentElement.style.setProperty('--fs', UI_FS[p.fs]); document.body.classList.toggle('saver', p.saver); document.body.classList.toggle('compact', p.compact); }
function setUiPref(o) { Object.assign(uiPrefs(), o); try { localStorage.setItem(UI_KEY, JSON.stringify(UIP)); } catch (e) { /* che do rieng tu */ } applyUiPrefs(); fitApp(); }
function onZoneChange(z) { obsLoad(z.id); [H.x, H.y] = inWorld(H.x, H.y); for (const e of R.enemies) [e.x, e.y] = inWorld(e.x, e.y); for (const d of R.ground) [d.x, d.y] = inWorld(d.x, d.y); snapCamera(); R.bgImg = z.bg ? img(z.bg) : null; playMusic(z.id); preloadZoneSounds(z); if (curTab === 'log') refresh(); }
function enterGameWorld() {
  if (!S || !S.fac) return;
  if (typeof COMPANION_SYSTEM !== 'undefined' && COMPANION_SYSTEM.init) COMPANION_SYSTEM.init();
  if (typeof CLOAK_MERIDIAN !== 'undefined' && CLOAK_MERIDIAN.init) CLOAK_MERIDIAN.init();
  recalc();
  if (R.P) {
    R.life = R.P.life;
    R.mana = R.P.mana;
  }
  const z = zoneOf(Math.min(S.stage || 1, STAGES));
  onZoneChange(z);
  [H.x, H.y] = inWorld(WORLD.w / 2, WORLD.h / 2);
  snapCamera();
  R.dirty = false;
  R.spawnT = 0.3;
  R.enemies = [];
  R.corpses = [];
  R.ground = [];
  restoreGround();
  
  bindFloatClose();
  if (isLandscape()) {
    _openFloat = null;
    document.querySelectorAll('.jx-float-win').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('#tabs button').forEach(b => b.classList.remove('on'));
    setTimeout(() => {
      if (typeof toggleFloatWin === 'function') toggleFloatWin('char');
    }, 80);
  } else {
    showTab('log');
  }
  
  refresh();
  updateTop();
  updatePadCd();
  renderPad();
  updateDots();
  log('Tiếp tục hành tẩu giang hồ…');
  loginCheck();
  dotGift();
  if (typeof sendProfile === 'function') sendProfile();
}
window.enterGameWorld = enterGameWorld;
function onStageChange() { if (curTab === 'log') refresh(); }
function onLevelUp() { if (S.autoPts === true) { autoSpendAttrs(); autoSpendSkills(); } autoEquipAll(); if (!R.quiet) { checkHints(); updateDots(); renderPad(); dotGift(); if (LV_MS.some(m => m[0] === S.lvl)) toast(`Đạt mốc cấp ${S.lvl}: nhận quà ở nút 🎁`); } }
/* Mo phong buoc co dinh 60 lan / giay + noi suy vi tri khi ve: chuyen dong deu, khong giat theo toc do khung hinh */
const STEP = 1 / 60, MAX_STEPS = 10, LERP_MAX = 120;
let simAcc = 0;
function movers() { return [H, R.petPos].concat(SV.on ? SV.en : R.enemies).filter(Boolean); }
const gameSpeed = () => typeof S !== 'undefined' && S && S.speed ? +S.speed : 1;
window.gameSpeed = gameSpeed;
function simulateFrame(dt) {
  const spd = typeof gameSpeed === 'function' ? gameSpeed() : 1;
  simAcc += dt * spd; let n = 0;
  while (simAcc >= STEP && n < MAX_STEPS) {
    for (const o of movers()) { o._px = o.x; o._py = o.y; }
    if (SV.on) svTick(STEP); else tick(STEP);
    simAcc -= STEP; n++;
  }
  if (n === MAX_STEPS) simAcc = 0;                       // may cham: bo phan tre, khong don buoc
}
function drawLerp(dt) {
  const a = simAcc / STEP, list = movers().filter(o => o._px !== undefined && Math.hypot(o.x - o._px, o.y - o._py) < LERP_MAX);
  for (const o of list) { o._cx = o.x; o._cy = o.y; o.x = o._px + (o.x - o._px) * a; o.y = o._py + (o.y - o._py) * a; }
  try { if (SV.on) svDraw(dt); else draw(dt); }
  finally { for (const o of list) { o.x = o._cx; o.y = o._cy; } }
}
/* Vong lap khong bao gio chet: moi buoc co try / catch rieng va luon dat lai requestAnimationFrame. Truoc day mot loi trong mot khung
   (tick, ve, cap nhat giao dien) lam vong lap dung han, tro choi dung hinh va nut khong con tac dung.
   Loi lap lai lien tuc: don trang thai chien dau (hieu ung, quai, vat roi tren dat) de thoat ket. */
let loopErr = 0, loopLast = '';
function guard(what, fn) {
  try { fn(); loopErr = Math.max(0, loopErr - 0.02); }
  catch (e) {
    loopErr++;
    const k = what + ': ' + (e && e.message);
    if (k !== loopLast) {
      loopLast = k;
      window._loopLast = k;
      window._loopErrDetail = (e && e.stack) || (e && e.message) || String(e);
      console.error('[loi vong lap]', what, e);
    }
    if (loopErr > 30) {
      loopErr = 0; R.fx = []; R.txt = []; R.enemies = []; if (typeof SV !== 'undefined' && SV.on) { try { svExit(); } catch (x) { SV.on = false; } }
      R.spawnT = 0.5; R.deadT = 0; simAcc = 0; R.quiet = false; closeModal(true);
    }
  }
}
function frame(now) {
  const dt = Math.min(0.25, (now - lastT) / 1000); lastT = now;
  guard('tay cam', gamepadPoll);
  if (typeof ACC !== 'undefined' && ACC.isLoggedIn && S && S.fac) {
    guard('mo phong', () => simulateFrame(dt));
    if (!document.hidden && (!uiPrefs().saver || (drawTog = !drawTog))) guard('ve', () => drawLerp(dt));
  }
  uiT += dt;
  if (uiT > 0.1 && typeof ACC !== 'undefined' && ACC.isLoggedIn && S && S.fac) {
    uiT = 0;
    guard('giao dien', () => {
      updateTop(); updatePadCd();
      if (R.logDirty && curTab === 'log') { R.logDirty = false; renderLogOnly(); }
      if (invDirty && curTab === 'inv') renderInv();
    });
  }
  saveT += dt;
  if (saveT > 10 && typeof ACC !== 'undefined' && ACC.isLoggedIn && S && S.fac) guard('luu', () => {
    saveT = 0; loginCheck(); achCheck(); dotGift();
    const el = R.activeT || 0; if (el > 30) S.kps = R.kills / el;
    save();
  });
  requestAnimationFrame(frame);
}

// Tim đập ngầm khi tab chạy nền hoặc bị cửa sổ khác che để nhân vật không dừng chiến đấu
let bgLastT = performance.now();
setInterval(() => {
  if (document.hidden && typeof ACC !== 'undefined' && ACC.isLoggedIn && typeof S !== 'undefined' && S && S.fac) {
    const now = performance.now();
    const dt = Math.min(0.3, Math.max(0.05, (now - bgLastT) / 1000));
    bgLastT = now;
    guard('mo phong ngam', () => simulateFrame(dt));
    if (typeof sendMove === 'function') sendMove(dt);
  } else {
    bgLastT = performance.now();
  }
}, 100);
function showOffline(o) {
  if (!o) return;
  const h = Math.floor(o.secs / 3600), m = Math.floor(o.secs % 3600 / 60);
  modal(`<h3>Chào mừng trở lại!</h3><p class="desc">Vắng mặt ${h ? h + ' giờ ' : ''}${m} phút, nhân vật vẫn luyện công tại ${esc(zoneOf(Math.min(S.stage, STAGES)).n)}.</p>
    <div class="card stats"><span>Quái bị hạ</span><span>${fmt(o.kills)}</span><span>Kinh nghiệm</span><span>${fmt(o.xp)}</span>
    <span>Ngân lượng</span><span>${fmt(o.gold)}</span><span>Cấp</span><span>${o.lv0} → ${o.lv1}</span><span>Vật phẩm</span><span>${o.got}${o.sold ? ` (+${o.sold} bán)` : ''}</span>
    <span>Rương tu luyện</span><span>${o.chests || 0} / 3 mốc (1 · 4 · 8 giờ)</span></div>
    ${o.chests ? '<p class="desc">Quà các mốc đã vào túi — xem nhật ký Giang hồ.</p>' : ''}
    <div class="btnrow"><button class="btn" onclick="closeModal()">Nhận</button></div>`);
}
function isMobileUI() {
  return window.innerWidth < 900 && window.innerHeight >= window.innerWidth;
}
function isLandscape() {
  return window.innerWidth >= 900 || window.innerWidth > window.innerHeight;
}
/* Chieu cao that cua vung nhin va dieu chinh ty le man hinh PC/Mobile */
function fitApp() {
  const isPc = isLandscape();
  document.body.classList.toggle('mob', isMobileUI());
  document.body.classList.toggle('pc', isPc);
  document.body.classList.add('jxui');
  const hk = Math.min(1.15, Math.max(0.65, Math.min((window.innerWidth - 16) / 800, window.innerHeight / 600)));
  document.documentElement.style.setProperty('--hk', hk.toFixed(3));
  const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  if (h > 0) document.documentElement.style.setProperty('--app-h', Math.round(h) + 'px');
  if (CV) resizeArena();
}
/* Che do thu gon: an bang thong tin + thanh tab, san dau chiem ca man hinh; nho theo trinh duyet */
function setCompact(on) { setUiPref({ compact: on }); if (!on && S && S.fac) refresh(); }

function bindPcUi() {
  // pcTop buttons
  const bGift = document.getElementById('pcBtnGift');
  if (bGift) bGift.onclick = () => { if (typeof openTodayDashboardModal === 'function') openTodayDashboardModal(); else if (typeof giftModal === 'function') giftModal(); };
  const bKtc = document.getElementById('pcBtnKtc');
  if (bKtc) bKtc.onclick = () => { if (typeof kytranModal === 'function') kytranModal(); };
  const bTower = document.getElementById('pcBtnTower');
  if (bTower) bTower.onclick = () => { if (window.VIP_DUNGEON) VIP_DUNGEON.openDungeonHub(); else if (typeof openDungeonModal === 'function') openDungeonModal(); };
  const bRank = document.getElementById('pcBtnRank');
  if (bRank) bRank.onclick = () => { if (typeof openRankModal === 'function') openRankModal(); };

  // pcZone
  const pcZone = document.getElementById('pcZone');
  if (pcZone) {
    pcZone.onchange = (e) => {
      const idx = +e.target.value;
      if (typeof gotoStage === 'function') gotoStage(idx * 10 + 1);
    };
  }
  // pcStage buttons
  const pcPrev = document.getElementById('pcPrev');
  if (pcPrev) pcPrev.onclick = () => { if (typeof gotoStage === 'function' && typeof S !== 'undefined') gotoStage(S.stage - 1); };
  const pcNext = document.getElementById('pcNext');
  if (pcNext) pcNext.onclick = () => { if (typeof gotoStage === 'function' && typeof S !== 'undefined') gotoStage(S.stage + 1); };
  const pcPush = document.getElementById('pcPush');
  if (pcPush) pcPush.onclick = () => { if (typeof togglePushMode === 'function') togglePushMode(); };
  const pcJump = document.getElementById('pcJump');
  if (pcJump) pcJump.onclick = () => {
    if (typeof S === 'undefined') return;
    const ans = prompt(`Nhảy tới ải luyện công (1 - ${S.maxStage || 1}):`, S.stage);
    if (ans && !isNaN(+ans)) gotoStage(+ans);
  };

  // 10 pcMenu buttons
  const menuMap = {
    char: () => { if (isLandscape() && typeof toggleFloatWin === 'function') toggleFloatWin('char-attrib'); else if (typeof showTab === 'function') showTab('char'); },
    inv: () => { if (isLandscape() && typeof toggleFloatWin === 'function') toggleFloatWin('inv'); else if (typeof showTab === 'function') showTab('inv'); },
    forge: () => { if (typeof epModal === 'function') epModal(); else if (typeof htModal === 'function') htModal(); },
    skill: () => { if (isLandscape() && typeof toggleFloatWin === 'function') toggleFloatWin('skill'); else if (typeof showTab === 'function') showTab('skill'); },
    quest: () => { if (window.DATAU) DATAU.toggle(); else if (typeof toast === 'function') toast('Nhiệm vụ Dã Tẩu'); },
    pet: () => { if (window.COMPANION_SYSTEM) COMPANION_SYSTEM.toggleWindow(); else if (typeof openPartyWin === 'function') openPartyWin(); },
    guild: () => { if (typeof openWarModal === 'function') openWarModal(); else if (window.TONGKIM) TONGKIM.openRegisterModal(); },
    rank: () => { if (typeof openRankModal === 'function') openRankModal(); },
    world: () => { if (isLandscape() && typeof toggleFloatWin === 'function') toggleFloatWin('log'); else if (typeof showTab === 'function') showTab('log'); },
    sys: () => { if (isLandscape() && typeof toggleFloatWin === 'function') toggleFloatWin('more'); else if (typeof showTab === 'function') showTab('more'); }
  };

  document.querySelectorAll('#pcMenu [data-pm]').forEach(btn => {
    btn.onclick = () => {
      if (typeof uiSfx === 'function') uiSfx('click');
      const action = menuMap[btn.dataset.pm];
      if (action) action();
    };
  });

  document.querySelectorAll('#pcMenu [data-jx]').forEach(btn => {
    btn.onclick = () => {
      if (typeof uiSfx === 'function') uiSfx('click');
      const jx = btn.dataset.jx;
      if (jx === 'event') {
        openMarketHubModal();
      } else if (menuMap[jx]) {
        menuMap[jx]();
      }
    };
  });

  // pad controls
  const pcMain = document.getElementById('pcMain');
  if (pcMain) pcMain.onclick = () => {
    if (isLandscape() && typeof toggleFloatWin === 'function') toggleFloatWin('skill');
    else if (typeof showTab === 'function') showTab('skill');
  };

  const jxAuto = document.getElementById('jxAuto');
  if (jxAuto) jxAuto.onclick = () => {
    if (typeof toggleAuto === 'function') toggleAuto();
    else if (window.AUTO_SYSTEM) AUTO_SYSTEM.toggle();
    else if (typeof S !== 'undefined' && S.auto) { S.auto.on = !S.auto.on; }
  };

  const jxRot = document.getElementById('jxRot');
  if (jxRot) jxRot.onclick = () => {
    if (typeof S !== 'undefined') {
      S.rot = !S.rot;
      if (typeof toast === 'function') toast(S.rot ? 'Đã bật xoay chiêu' : 'Đã tắt xoay chiêu');
      jxRot.classList.toggle('on', !!S.rot);
    }
  };

  const bRide = document.getElementById('bRide');
  if (bRide) bRide.onclick = () => {
    if (typeof toggleMount === 'function') toggleMount();
    else if (typeof mountModal === 'function') mountModal();
  };
}

function openMarketHubModal() {
  modal(`
    <div class="jx-client-window" style="margin:-14px;border:none;">
      <div class="jx-window-header">
        <div class="jx-window-title"><span>🏮 KỲ TRÂN CÁC & TRUNG TÂM GIANG HỒ</span></div>
      </div>
      <div style="padding:14px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <button class="btn" onclick="closeModal();if(typeof kytranModal==='function')kytranModal();">💎 Kỳ Trân Các</button>
        <button class="btn" onclick="closeModal();if(window.STALL)STALL.toggle();">🏪 Sạp Hàng Bày Bán</button>
        <button class="btn" onclick="closeModal();if(window.BLACK_MARKET)BLACK_MARKET.toggleWindow();">🏮 Chợ Đen Hắc Thị</button>
        <button class="btn" onclick="closeModal();if(window.TRADE)TRADE.openRequestModal();">🤝 Giao Dịch Vật Phẩm</button>
        <button class="btn" onclick="closeModal();if(typeof openCasinoModal==='function')openCasinoModal();">🎲 Tửu Quán Tiêu Dao</button>
        <button class="btn" onclick="closeModal();if(typeof openArcadeModal==='function')openArcadeModal();">🎮 Khu Giải Trí Arcade</button>
        <button class="btn" onclick="closeModal();if(typeof openStashIoModal==='function')openStashIoModal();">🧰 Xuất / Nạp Kho (.jxkho)</button>
        <button class="btn" onclick="closeModal();if(typeof openTodayDashboardModal==='function')openTodayDashboardModal();">📅 Việc Hôm Nay</button>
      </div>
      <div style="text-align:center;padding-bottom:12px;">
        <button class="btn sm" onclick="closeModal();">Đóng</button>
      </div>
    </div>
  `);
}
window.openMarketHubModal = openMarketHubModal;
function init() {
  if (typeof purgeLegacyOfflineSaves === 'function') purgeLegacyOfflineSaves();
  CV = $('#arena'); CX = CV.getContext('2d');
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('button[data-t]'); if (b) showTab(b.dataset.t); });
  $('#mClose').onclick = () => closeModal();
  $('#giftBtn').onclick = () => { if (S && S.fac) { uiSfx('click'); giftModal(); } };
  const svBtn = $('#svBtn'); if (svBtn) svBtn.onclick = () => { uiSfx('click'); svIntro(); };
  const campBtn = $('#campBtn'); if (campBtn) campBtn.onclick = () => { uiSfx('click'); campModal(); };
  const mountBtn = $('#mountBtn'); if (mountBtn) mountBtn.onclick = () => { uiSfx('click'); mountModal(); };
  const bossBtn = $('#bossBtn'); if (bossBtn) bossBtn.onclick = () => { uiSfx('click'); bossModal(); };
  const rebornBtn = $('#rebornBtn'); if (rebornBtn) rebornBtn.onclick = () => { if (S && S.fac) { uiSfx('click'); openRebornTab(); } else { if (typeof toast === 'function') toast('Chọn môn phái trước!'); } };
  $('#svPauseBtn').onclick = () => svPause();
  const ultBtn = $('#svUlt'); if (ultBtn) ultBtn.onclick = () => svCastUlt();
  const bombBtn = $('#svBomb'); if (bombBtn) bombBtn.onclick = () => svUseBomb();
  const hpBtn = $('#svHpBtn'); if (hpBtn) hpBtn.onclick = () => svUseHp();
  $('#modal').onclick = e => { if (e.target.id === 'modal') closeModal(); };
  const bpm = $('#btnPushMode'); if (bpm) bpm.onclick = () => { if (typeof togglePushMode === 'function') togglePushMode(); };
  const stLbl = $('#stageLbl'); if (stLbl) stLbl.onclick = () => { if (typeof togglePushMode === 'function') togglePushMode(); };
  window.addEventListener('resize', fitApp); window.addEventListener('orientationchange', fitApp);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitApp);
  $('#compactBtn').onclick = () => setCompact(!document.body.classList.contains('compact'));
  applyUiPrefs();
  fitApp();
  bindControls();
  bindPcUi();
  const unlock = () => {
    audInit();
    if (!S || !S.fac) return;
    const z = zoneOf(Math.min(S.stage || 1, STAGES));
    preloadZoneSounds(z);
    if (AUD.music && sndCfg().music && AUD.music.paused) AUD.music.play().catch(() => {});
    else if (!AUD.music && S.fac) playMusic(R.town ? W.town.id : z.id);
  };
  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('keydown', unlock, true);
  resizeArena();
  [H.x, H.y] = inWorld(WORLD.w / 2, WORLD.h / 2);
  snapCamera();

  // Cập nhật trạng thái hiển thị header ban đầu
  if (typeof updateAccountHeaderUI === 'function') updateAccountHeaderUI();

  // Khởi tạo hệ thống tài khoản & Server Database
  if (typeof initAccountSystem === 'function') {
    initAccountSystem((loggedIn) => {
      if (loggedIn && typeof initMultiplayer === 'function') {
        initMultiplayer();
      }
    });
  }

  // Khởi tạo thanh tổ đội (Teambar PC)
  if (typeof initTeambar === 'function') initTeambar();
  if (typeof DATAU !== 'undefined' && DATAU.init) DATAU.init();
  if (typeof TONGKIM !== 'undefined' && TONGKIM.init) TONGKIM.init();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (S && S.fac) save(); if (SV.on) svPause(); }
    else if (S && S.fac && !SV.on && Date.now() - S.last > 60000) { R.dirty = true; recalc(); showOffline(offlineGains()); refresh(); }
    lastT = performance.now();
  });
  window.addEventListener('pagehide', () => { if (S && S.fac) save(); });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!$('#modal').classList.contains('hidden')) closeModal();
      else if (typeof _openFloat !== 'undefined' && _openFloat) toggleFloatWin(_openFloat);
    }
  });
  requestAnimationFrame(frame);
}
init();
if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
