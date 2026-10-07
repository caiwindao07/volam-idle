/* ======================= GIAO DIEN (5 the) ======================= */
'use strict';
let curTab = 'log', invDirty = true;
function log(h) { if (R.quiet) return; R.logs.unshift(h); if (R.logs.length > 40) R.logs.pop(); R.logDirty = true; if (typeof appendChatLine === 'function') appendChatLine('sys', '', h); }
let toastT; function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 1800); }
function modal(html, bind, locked) { $('#mBody').innerHTML = html; $('#modal').classList.remove('hidden'); $('#modal').dataset.locked = locked ? '1' : ''; if (bind) bind(); try { $('#modal .mbox').focus({ preventScroll: true }); } catch (e) { /* bo qua */ } }
function closeModal(force) { if (typeof ACC !== 'undefined' && !ACC.isLoggedIn) return; if ($('#modal').dataset.locked && !force) return; $('#modal').classList.add('hidden'); }

/* ---------- tui do ---------- */
/* Do thua: khong dung duoc va khong manh hon do dang mac cung o (tru do bo, do Tim dang kham, Bach Kim); vu khi sai loai cua phai.
   Nhan / day chuyen / ngoc boi yeu van giu toi da 6 mon lam nguyen lieu hop Huyen Tinh. */
const FUSE_KEEP = 6;
function isJunk(it) {
  if (it.set || it.vio || it.plv) return false;
  if (!sexOk(it)) return true;                         // trang phuc khac gioi tinh: khong bao gio mac duoc
  const f = FAC[S.fac];
  if (DETAIL_SLOT[it.d] === 'weapon' && f && f.wcode >= 0 && weaponCode({ weapon: it }) !== f.wcode) return true;
  const eq = S.eq[slotFor(it)]; if (!eq || betterThanEquipped(it) || itemPower(it) > itemPower(eq) * 0.85) return false;
  if (FUSE_SLOTS.includes(it.d) && S.inv.filter(x => FUSE_SLOTS.includes(x.d) && !x.set && !x.vio).length < FUSE_KEEP) return false;
  return true;
}
/* Don do thua da nhat truoc (do manh len thi do cu thanh thua): moi 30 giay choi va khi vao lai game */
function sweepJunk() {
  if (S.autoJunk === false) return 0;
  let n = 0;
  for (let guard = 0; guard < INV_MAX; guard++) {
    const j = S.inv.filter(isJunk).sort((a, b) => itemPower(a) - itemPower(b))[0]; if (!j) break;
    S.inv.splice(S.inv.indexOf(j), 1); S.gold += itemValue(j); n++;
  }
  if (n) invDirty = true; return n;
}
function addItem(it, quiet, picked, keep) {
  if (!picked && !lootMatch(it)) { S.gold += itemValue(it); return false; } // khong qua mat dat (offline): mon khong khop bo loc tu ban
  if (S.inv.length >= INV_MAX && (it.set || it.vio || it.plv)) makeRoom(it, true);   // do quy (bo / Tim / Bach Kim): nhuong cho bang cach ban mon yeu nhat
  if (S.inv.length >= INV_MAX) { S.gold += itemValue(it); if (!quiet) log('<span class="dim">Túi đầy, tự bán ' + esc(it.n) + '</span>'); return false; }
  if (!keep && S.autoJunk !== false && isJunk(it)) { S.gold += itemValue(it); return false; }   // do thua: tu ban, khong chat hanh trang
  S.inv.unshift(it); invDirty = true;
  if (!quiet && it.r >= 2) log(`Nhặt được <span style="color:${RAR_COL[it.r]}">${esc(it.n)}</span>`);
  if (S.autoEquip && betterThanEquipped(it)) equip(it, true);
  return true;
}
/* So sanh bang luc chien that (tinh ca mon vu khi cua phai, khang, ...), khong chi chi so cua mon do */
function equipGain(it) {
  if (!reqOk(it)) return -1;
  const eq = Object.assign({}, S.eq); eq[slotFor(it)] = it;
  return power(calc(eq)) / Math.max(1, power(calc(S.eq))) - 1;
}
// tu mac chi doi vu khi cung loai voi mon vu khi cua phai (Con cho Thieu Lam, am khi cho Duong Mon...);
// nguoi choi van mac tay duoc moi loai
function betterThanEquipped(it) {
  const f = FAC[S.fac];
  if (DETAIL_SLOT[it.d] === 'weapon' && f && f.wcode >= 0 && weaponCode({ weapon: it }) !== f.wcode) return false;
  return equipGain(it) > 0.01;
}
function equip(it, quiet) {
  if (!reqOk(it)) { if (!quiet) toast('Chưa mặc được: ' + reqProblems(it).join('; ')); return; }
  const slot = slotFor(it), old = S.eq[slot];
  S.inv = S.inv.filter(x => x !== it); if (old) S.inv.unshift(old);
  S.eq[slot] = it; R.dirty = true; invDirty = true; if (!quiet) uiSfx(it.d <= 1 ? 'equipWeapon' : 'equipCloth');
  if (!quiet) { closeModal(); refresh(); }
}
function unequip(slot) { const it = S.eq[slot]; if (!it) return; if (S.inv.length >= INV_MAX) { toast('Túi đầy'); return; } delete S.eq[slot]; S.inv.unshift(it); R.dirty = true; invDirty = true; closeModal(); refresh(); }
/* Ban mon khong khop bo loc (nut trong the Hanh trang, cua hang, Tho Dia Phu): khong bao gio ban do bo, do Tim dang kham, Bach Kim da thang cap */
const sellProtected = it => !!(it.set || it.vio || it.plv);
function sellUnmatched() {
  const w = S.inv.filter(i => !lootMatch(i) && !sellProtected(i)); let g = 0;
  for (const i of w) g += itemValue(i);
  S.gold += g; S.inv = S.inv.filter(i => !w.includes(i)); invDirty = true;
  if (window.reportLegitGoldGain) window.reportLegitGoldGain(g);
  return { n: w.length, gold: g, kept: S.inv.filter(i => !lootMatch(i)).length };
}
function sellWhiteItems() {
  const list = S.inv.filter(i => i.r === 0 && !sellProtected(i));
  if (!list.length) { toast('Không có đồ trắng nào trong rương!'); return; }
  let g = 0;
  for (const i of list) g += itemValue(i);
  S.gold += g;
  S.inv = S.inv.filter(i => !list.includes(i));
  invDirty = true;
  if (window.reportLegitGoldGain) window.reportLegitGoldGain(g);
  toast(`Đã bán hết ${list.length} món đồ trắng, thu về +${fmt(g)} lượng!`);
  uiSfx('dropOther');
  save();
  refresh();
}
function sellAllBagGear() {
  // Chỉ bán trang bị nằm trong rương S.inv (không động đến S.eq trên người, và bảo vệ đồ tím/bạch kim/bộ)
  const list = S.inv.filter(i => typeof DETAIL_SLOT !== 'undefined' && DETAIL_SLOT[i.d] !== undefined && !sellProtected(i));
  if (!list.length) { toast('Không có trang bị chưa mặc nào trong rương!'); return; }
  let g = 0;
  for (const i of list) g += itemValue(i);
  S.gold += g;
  S.inv = S.inv.filter(i => !list.includes(i));
  invDirty = true;
  if (window.reportLegitGoldGain) window.reportLegitGoldGain(g);
  toast(`Đã bán ${list.length} trang bị trong rương (giữ nguyên đồ trên người), thu +${fmt(g)} lượng!`);
  uiSfx('dropOther');
  save();
  refresh();
}
function sell(it) {
  if (!S.inv.includes(it)) { closeModal(); return; }
  const val = itemValue(it);
  S.inv = S.inv.filter(x => x !== it);
  S.gold += val;
  invDirty = true;
  if (window.reportLegitGoldGain) window.reportLegitGoldGain(val);
  closeModal();
  refresh();
}
function findItem(uid) {
  uid = +uid;
  return (S.inv && S.inv.find(i => i.uid === uid))
    || (S.eq && Object.values(S.eq).find(i => i && i.uid === uid))
    || (S.stash && S.stash.find(i => i && i.uid === uid))
    || ((R.ground && R.ground.find(d => d.it.uid === uid)) || {}).it;
}
function itemCell(it) {
  if (!it) return '';
  const isSel = window.INV_SELECTED && window.INV_SELECTED.has(it.uid);
  const chkBadge = window.INV_SELECT_MODE ? `<span class="chk-mark" style="display:block;background:${isSel ? '#ef4444' : '#00000088'};">${isSel ? '✓' : ''}</span>` : '';
  return `<button class="it r${it.r}${reqOk(it) ? '' : ' bad'}${isSel ? ' chk-sel' : ''}" data-uid="${it.uid}">${it.ic ? `<img src="${esc(it.ic)}" alt="">` : ''}<i>${it.lvl}</i>${it.s >= 0 ? `<b class="s5" style="background:${SERIES_COL[it.s]}"></b>` : ''}${betterThanEquipped(it) && S.inv.includes(it) ? '<em>▲</em>' : ''}${chkBadge}</button>`;
}
function itemHTML(it) {
  return `<div class="idet"><div class="pic r${it.r}">${it.ic ? `<img src="${esc(it.ic)}" alt="">` : ''}</div><div><h4 style="color:${RAR_COL[it.r]}">${esc(it.n)}${it.enh ? ` <span class="enh">+${it.enh}</span>` : ''}</h4>
  <small class="dim">${esc(J.items[it.d].n)} · cấp ${it.lvl}${it.s >= 0 ? ` · <span style="color:${SERIES_COL[it.s]}">hệ ${SERIES[it.s]}</span>` : ''}</small></div></div>
  <div class="sl">${itemLines(it).map(([k, t]) => `<div class="${k}">${esc(t)}</div>`).join('')}</div>`;
}
/* Cong diem tiem nang de du yeu cau Suc manh / Than phap / Sinh khi / Noi cong cua mon do (neu du diem) */
function fixReqPoints(it) {
  const d = reqDeficit(it), need = Object.values(d).reduce((a, b) => a + b, 0);
  if (!need) return false; if (S.attrPts < need) { toast(`Cần ${need} điểm tiềm năng, đang có ${S.attrPts}`); return false; }
  for (const k in d) { S.attr[k] += d[k]; S.attrPts -= d[k]; }
  R.dirty = true; recalc(); toast('Đã cộng điểm để đủ điều kiện'); return true;
}
function cmpLines(it, slot) {
  if (slot) return '';
  const ok = reqOk(it), c = equipCompare(it, !ok), col = v => v > 0.0005 ? 'cp' : v < -0.0005 ? 'cn' : 'dim';
  const row = (n, v, t) => `<span class="${col(v)}">${n} ${t}</span>`;
  const head = ok ? 'So với đang mặc' : 'Nếu đủ điều kiện, so với đang mặc';
  const probs = ok ? [] : reqProblems(it);
  const wrong = DETAIL_SLOT[it.d] === 'weapon' && FAC[S.fac] && FAC[S.fac].wcode >= 0 && weaponCode({ weapon: it }) !== FAC[S.fac].wcode;
  const need = Object.values(reqDeficit(it)).reduce((a, b) => a + b, 0), onlyAttr = probs.length > 0 && probs.length === Object.keys(reqDeficit(it)).length;
  return `<div class="cmp2"><small class="dim">${head}:</small><div class="cmpv">${row('Sức mạnh', c.gain, pctTxt(c.gain))} ${row('DPS', c.dps, pctTxt(c.dps))} ${row('Sinh lực', c.life, numTxt(c.life))} ${row('Né', c.def, numTxt(c.def))} ${row('Kháng TB', c.res, numTxt(c.res) + '%')}</div>
    ${probs.length ? `<div class="reqbad"><b>Chưa mặc được, thiếu:</b><br>${probs.map(esc).join('<br>')}${onlyAttr ? `<br><small>Cần ${need} điểm tiềm năng${S.attrPts >= need ? ` (đang có ${S.attrPts}): bấm "Cộng điểm" để đủ điều kiện` : `, đang có ${S.attrPts}: lên cấp thêm`}.</small>` : ''}</div>` : ''}
    <div class="reqnote"><b>Vì sao:</b><br>${c.why.map(esc).join('<br>')}</div>
    ${wrong ? '<div class="reqnote">Sai loại vũ khí của môn phái: tự mặc sẽ bỏ qua, bạn vẫn mặc tay được.</div>' : ''}</div>`;
}
/* Quet toan bo hanh trang: mac mon cho suc manh that tang nhieu nhat, lap lai den khi het mon manh hon (sau khi len cap / cong diem / roi do) */
function autoEquipAll(force) {
  if (!S.autoEquip && !force) return 0; let n = 0;
  for (let g = 0; g < 14; g++) {
    let best = null, bg = 0.01;
    for (const it of S.inv) {
      if (!reqOk(it)) continue;
      const f = FAC[S.fac]; if (DETAIL_SLOT[it.d] === 'weapon' && f && f.wcode >= 0 && weaponCode({ weapon: it }) !== f.wcode) continue;
      const gn = equipGain(it); if (gn > bg) { bg = gn; best = it; }
    }
    if (!best) break; equip(best, true); n++;
  }
  if (n) { invDirty = true; R.dirty = true; } return n;
}
function unequipAll() {
  let count = 0;
  for (const k of Object.keys(S.eq)) {
    if (S.eq[k]) {
      if (S.inv.length >= INV_MAX) { toast('Hành trang đã đầy!'); break; }
      unequip(k);
      count++;
    }
  }
  if (count) {
    toast(`Đã cởi ${count} món trang bị!`);
    refresh();
  }
}
function resetAttrs() {
  let totalSpent = 0;
  for (const k of Object.keys(ATTR_VI)) {
    totalSpent += (S.attr[k] || 0);
    S.attr[k] = 0;
  }
  S.attrPts += totalSpent;
  R.dirty = true;
  recalc();
  toast(`Đã tẩy tủy! Hoàn lại ${totalSpent} điểm tiềm năng.`);
  refresh();
}
function itemModal(it, slot) {
  const cur = !slot && S.eq[slotFor(it)];
  const isBlueInInv = !slot && it && S.inv && S.inv.includes(it) && (
    (typeof window.EQUIP_SHARD !== 'undefined' && window.EQUIP_SHARD.isBlueGear)
      ? window.EQUIP_SHARD.isBlueGear(it)
      : ((it.r === 1 || it.r === 2) && it.d <= 9 && !it.set && !it.plv && !it.vio && it.r !== 3)
  );
  modal(`${itemHTML(it)}${cmpLines(it, slot)}${cur ? `<div class="cmp"><small class="dim">Đang mặc:</small>${itemHTML(cur)}</div>` : ''}
    <div class="btnrow" style="gap:6px;margin-top:12px;">${slot ? `<button class="jx-action-btn" id="bUn">Tháo</button>` : `<button class="jx-action-btn gold" id="bEq" ${reqOk(it) ? '' : 'disabled'}>Trang bị</button>${!reqOk(it) && Object.keys(reqDeficit(it)).length && reqProblems(it).length === Object.keys(reqDeficit(it)).length ? '<button class="jx-action-btn" id="bReqPts">Cộng điểm</button>' : ''}<button class="jx-action-btn" style="color:#f87171;" id="bSell">Bán (${fmt(itemValue(it))})</button>${isBlueInInv ? '<button class="jx-action-btn" style="color:#60a5fa;" id="bDisBlue">🔨 Rã (1~3 Mảnh)</button>' : ''}${S.inv.includes(it) ? '<button class="jx-action-btn" id="bStashIt">Gửi kho</button>' : ''}`}${findItem(it.uid) && it.d <= 10 ? '<button class="jx-action-btn gold" id="bForge">Rèn đồ</button>' : ''}</div>`,
  () => {
    const b1 = $('#bEq'), b2 = $('#bSell'), b3 = $('#bUn'), b4 = $('#bForge'), bDis = $('#bDisBlue');
    const bs = $('#bStashIt'); if (bs) bs.onclick = () => { const r = stashDeposit(it); toast(r.msg); if (r.ok) { closeModal(); refresh(); } };
    const bp = $('#bReqPts'); if (bp) bp.onclick = () => { if (fixReqPoints(it)) { if (reqOk(it)) equip(it); else itemModal(it, slot); } };
    if (b1) b1.onclick = () => equip(it);
    if (b2) b2.onclick = () => sell(it);
    if (b3) b3.onclick = () => unequip(slot);
    if (b4) b4.onclick = () => forgeModal(it);
    if (bDis) bDis.onclick = () => {
      if (window.EQUIP_SHARD) {
        window.EQUIP_SHARD.dismantleSingle(it);
        closeModal();
      }
    };
  });
}

/* ---------- the: chien truong ---------- */
function renderLog() {
  const z = zoneOf(Math.min(S.stage, STAGES));
  const el = tabEl('log'); if (!el) return;

  const existingZlist = el.querySelector('.zlist');
  if (existingZlist) {
    // Bản đồ đã được dựng sẵn -> Cập nhật nhanh trạng thái thay vì xóa innerHTML (tránh bị giật cuộn lên đầu)
    const headerTitle = el.querySelector('#curStageTitle');
    if (headerTitle) {
      headerTitle.innerHTML = `⚔️ Ải Hiện Tại: <b style="color:#ffd700;">${esc(z.n)}</b> (Ải ${inZone(S.stage)}/${ZONE_STAGES})${isBossStage(S.stage) ? ' <span style="color:#ef4444;font-weight:bold;">(Trùm)</span>' : ''}`;
    }
    const headerLv = el.querySelector('#curStageLv');
    if (headerLv) headerLv.textContent = `Quái cấp ${stageLevel(S.stage)}`;
    const bPush = el.querySelector('#bPush');
    if (bPush) {
      bPush.className = `jx-action-btn ${S.push ? 'gold' : ''}`;
      bPush.textContent = S.push ? '⚔ Vượt ải' : '🛡 Luyện công';
    }
    const bNext = el.querySelector('#bNext');
    if (bNext) bNext.disabled = S.stage >= S.maxStage;

    const curI = zoneIdx(Math.min(S.stage, STAGES));
    const rows = existingZlist.querySelectorAll('.zrow');
    rows.forEach((b, i) => {
      const first = i * ZONE_STAGES + 1, open = S.maxStage >= first, cur = curI === i;
      b.className = `zrow${cur ? ' cur' : ''}${open ? '' : ' lock'}`;
      b.disabled = !open;
    });

    const lb = el.querySelector('#logBox');
    if (lb) lb.innerHTML = R.logs.map(l => `<div>${l}</div>`).join('');
    return;
  }

  const zl = ZONES.map((q, i) => {
    const first = i * ZONE_STAGES + 1, open = S.maxStage >= first, cur = zoneIdx(Math.min(S.stage, STAGES)) === i;
    return `<button class="zrow${cur ? ' cur' : ''}${open ? '' : ' lock'}" data-z="${i}" ${open ? '' : 'disabled'}><b>${esc(q.n)}</b><span>Cấp ${q.lo}–${q.hi}</span></button>`;
  }).join('');

  el.innerHTML = `
    ${todoHTML()}
    <div class="jx-box" style="margin-bottom:6px;">
      <div class="jx-box-header">
        <span id="curStageTitle">⚔️ Ải Hiện Tại: <b style="color:#ffd700;">${esc(z.n)}</b> (Ải ${inZone(S.stage)}/${ZONE_STAGES})${isBossStage(S.stage) ? ' <span style="color:#ef4444;font-weight:bold;">(Trùm)</span>' : ''}</span>
        <span id="curStageLv" style="font-size:10px;color:#a39276;">Quái cấp ${stageLevel(S.stage)}</span>
      </div>
      <div class="row" style="justify-content:space-between;margin-bottom:6px;">
        <div style="display:flex;gap:4px;">
          <button class="jx-action-btn" id="bPrev" style="padding:2px 8px;">◀</button>
          <button class="jx-action-btn ${S.push ? 'gold' : ''}" id="bPush" style="padding:2px 10px;">${S.push ? '⚔ Vượt ải' : '🛡 Luyện công'}</button>
          <button class="jx-action-btn" id="bNext" style="padding:2px 8px;" ${S.stage < S.maxStage ? '' : 'disabled'}>▶</button>
        </div>
        <small class="dim" style="font-size:10px;">Hệ: ${z.sw.map((w, i) => w ? `<span style="color:${SERIES_COL[i]}">${SERIES[i]}</span>` : '').filter(Boolean).join(' ')}</small>
      </div>
      <div style="font-size:11px;color:#cbd5e1;">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="cAutoMap" ${S.autoMap !== false ? 'checked' : ''} class="accent-amber-500"> Tự động đổi bản đồ phù hợp cấp độ</label>
      </div>
    </div>
    <div class="jx-box" style="margin-bottom:6px;padding:4px 6px;">
      <div class="jx-box-header" style="margin-bottom:4px;padding-bottom:2px;">
        <span>📜 Nhật Ký Giang Hồ</span>
      </div>
      <div class="log" id="logBox" style="max-height:100px;overflow-y:auto;font-size:11px;padding:2px 4px;">${R.logs.map(l => `<div>${l}</div>`).join('')}</div>
    </div>
    <div class="jx-box">
      <div class="jx-box-header">
        <span>🗺 Bản Đồ Luyện Công</span>
      </div>
      <div class="zlist" style="max-height:180px;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;">${zl}</div>
    </div>`;
  const q = s => el.querySelector(s), qa = s => el.querySelectorAll(s);
  bindTodo();
  const bp = q('#bPrev'); if (bp) bp.onclick = () => gotoStage(S.stage - 1);
  const bn = q('#bNext'); if (bn) bn.onclick = () => gotoStage(S.stage + 1);
  const bps = q('#bPush'); if (bps) bps.onclick = () => { if (typeof togglePushMode === 'function') togglePushMode(); else { S.push = !S.push; renderLog(); } };
  const cam = q('#cAutoMap');
  if (cam) cam.onchange = e => { S.autoMap = e.target.checked; if (S.autoMap) { S.chosenZone = null; checkAutoMap(); } save(); };
  qa('.zrow').forEach(b => b.onclick = () => {
    const zi = +b.dataset.z;
    const zObj = ZONES[zi];
    if (zObj && S.lvl < zObj.lo) {
      toast(`🔒 Chưa đủ cấp! Cần đạt cấp ${zObj.lo} trở lên để đến ${zObj.n}.`);
      return;
    }
    if (zObj) {
      S.chosenZone = zObj.id;
      S.chosenStage = zi * ZONE_STAGES + 1;
      toast(`🚩 Đã chọn luyện công tại ${zObj.n}!`);
    }
    gotoStage(zi * ZONE_STAGES + 1);
  });
}
function renderLogOnly() { const el = tabEl('log'); const b = el ? el.querySelector('#logBox') : $('#logBox'); if (b) b.innerHTML = R.logs.map(l => `<div>${l}</div>`).join(''); }
function gotoStage(st, keepPush) {
  st = clamp(st, 1, S.maxStage);
  if (st === S.stage) return;
  const oldZ = zoneOf(S.stage);
  S.stage = st; S.wave = 1; R.waveKills = 0;
  if (!keepPush) S.push = false;
  R.enemies = []; R.spawnT = 0.3;
  const newZ = zoneOf(st);
  if (newZ && S.lvl >= newZ.lo) {
    S.chosenZone = newZ.id;
    S.chosenStage = st;
  }
  if (oldZ && newZ && oldZ.id !== newZ.id) {
    obsLoad(newZ.id);
    [H.x, H.y] = inWorld(WORLD.w / 2, WORLD.h / 2);
    snapCamera();
    onZoneChange(newZ);
    R.banner = { t: 2.5, text: newZ.n, sub: `Bản đồ luyện công (Cấp ${newZ.lo} - ${newZ.hi})` };
  }
  refresh();
}

/* ---------- the: nhan vat (trang bi & thuoc tinh hop nhat) ---------- */
const ATTR_VI = { str: 'Sức mạnh', dex: 'Thân pháp', vit: 'Sinh khí', eng: 'Nội công' };

function renderCharAttrib(targetEl) {
  const el = targetEl || (isLandscape() ? $('#t-char-attrib-f') : $('#t-char'));
  if (!el) return;
  const P = R.P, f = FAC[S.fac];
  if (!f) return;
  const vipLv = typeof vipLevel === 'function' ? vipLevel() : 1;
  const curTier = (S && S.cloak && typeof S.cloak.tier === 'number') ? S.cloak.tier : 0;
  const curCloak = curTier > 0 && window.CLOAK_MERIDIAN && CLOAK_MERIDIAN.getCloakInfo
    ? (CLOAK_MERIDIAN.getCloakInfo() || { tier: curTier, name: `Phi Phong Bậc ${curTier}/6`, color: '#4ade80', res: 15, hp: 800, crit: 2 })
    : (curTier > 0 ? { tier: curTier, name: `Phi Phong Bậc ${curTier}/6`, color: '#4ade80', res: 15, hp: 800, crit: 2 } : { tier: 0, name: 'Chưa có', color: '#94a3b8', res: 0, hp: 0, crit: 0 });

  const eqCell = (k, vi, slotCls) => {
    const it = S.eq[k];
    return `<div class="jx-equip-slot ${slotCls || ''} ${it ? (it.r >= 4 ? 'gold-border' : '') : ''}" data-slot="${k}">
      ${it ? itemCell(it) : `<span class="jx-slot-label">${vi}</span>`}
    </div>`;
  };

  const attrs = Object.entries(ATTR_VI).map(([k, vi]) => `<div class="row" style="font-size:11px;justify-content:space-between;padding:2px 0;"><span>${vi}</span><div style="display:flex;align-items:center;gap:4px;"><b style="color:#fde047;min-width:28px;text-align:right;">${S.attr[k]}</b><span class="pm"><button class="plus" data-a="${k}" ${S.attrPts ? '' : 'disabled'}>+</button><button class="minus" data-a="${k}" title="Rút lại 1 điểm" ${S.attr[k] > 0 ? '' : 'disabled'}>−</button></span></div></div>`).join('');

  el.innerHTML = `
    <!-- 1. Header Avatar & Chi so nhan vat (Chuan Hinh 1 JX) -->
    <div class="jx-char-profile-header">
      <div class="jx-char-avatar-col">
        <div class="jx-char-avatar-box">
          <img src="img/pl/${f.key}.png" alt="${f.n}" class="jx-avatar-img">
          <span class="jx-avatar-lvl-badge">Lv.${S.lvl}</span>
        </div>
      </div>
      <div class="jx-char-info-col">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1px;">
          <b style="color:#ffd700;font-size:12px;">${esc(S.heroName || 'BadBoyPK')}</b>
          <span style="font-size:10.5px;color:${SERIES_COL[f.series]};font-weight:bold;">Hệ ${SERIES[f.series]}</span>
        </div>
        <div style="font-size:10px;color:#a39276;display:flex;justify-content:space-between;">
          <span>Phái: <b style="color:#ffd700;">${esc(f.n)}</b></span>
          <span>Danh hiệu: <b style="color:#f59e0b;">${vipLv >= 1 ? `Võ Lâm Chí Tôn (VIP ${vipLv})` : 'Hiệp Khách'}</b></span>
        </div>
        <div style="font-size:10px;color:#a39276;display:flex;justify-content:space-between;">
          <span>Danh vọng: <b style="color:#a78bfa;">${S.fame || (S.lvl * 25 + 100)}</b></span>
          <span>Phúc duyên: <b style="color:#f472b6;">${(typeof RW === 'function' && RW().fd) || 0}</b></span>
          <span>Lực chiến: <b style="color:#ef4444;">${fmt(R.power)}</b></span>
        </div>
        <div style="font-size:10px;color:#cbd5e1;display:flex;justify-content:space-between;margin-top:2px;background:rgba(255,215,0,0.06);padding:2px 5px;border-radius:3px;border:1px solid rgba(255,215,0,0.18);">
          <span>Phi phong: <b style="color:${curCloak.color};cursor:pointer;text-decoration:underline;" onclick="if(window.CLOAK_MERIDIAN)CLOAK_MERIDIAN.toggleWindow();" title="Bấm để mở Bảng Nâng Cấp Phi Phong & Kinh Mạch">${curCloak.name} (Bậc ${curTier}/6)</b></span>
          <span style="color:#ffd700;font-weight:bold;">+${curCloak.res}% Kháng Tất Cả</span>
        </div>
      </div>
    </div>

    <!-- 2. Ma Tran Trang Bi (Paperdoll Matrix) -->
    <div class="jx-box" style="margin-bottom:4px;padding:4px 6px;">
      <div class="jx-paperdoll-grid">
        <!-- Cot trai: Mu, Ao, Lung, Giay, Ngua, Phi Phong -->
        <div class="jx-paperdoll-col">
          ${eqCell('helm', 'Mũ', 'h-mid')}
          ${eqCell('armor', 'Áo', 'h-tall')}
          ${eqCell('belt', 'Lưng', 'h-short')}
          ${eqCell('boot', 'Giày', 'h-mid')}
          ${eqCell('horse', 'Ngựa', 'h-short')}
          <div class="jx-equip-slot h-short gold-border" style="cursor:pointer;background:linear-gradient(180deg,#1c1610,#2e2216);border:1px solid ${curCloak.color || '#ffd700'};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2px;box-shadow:inset 0 0 6px rgba(0,0,0,0.6);" onclick="if(window.CLOAK_MERIDIAN)CLOAK_MERIDIAN.toggleWindow();" title="[Phi Phong] ${curCloak.name} (Bậc ${curTier}/6)&#10;• Kháng Tất Cả: +${curCloak.res}%&#10;• Sinh Lực: +${curCloak.hp}&#10;• Chí Mạng: +${curCloak.crit || 0}%&#10;Bấm để mở nâng cấp Phi Phong & Kinh Mạch">
            <span style="font-size:9.5px;color:#a39276;line-height:1;">Phi Phong</span>
            <span style="font-size:9.5px;font-weight:bold;color:${curCloak.color};line-height:1.2;margin-top:1px;">Bậc ${curTier}/6</span>
            <span style="font-size:8.5px;color:#ffd700;line-height:1;">+${curCloak.res}% Kháng</span>
          </div>
        </div>
        <!-- Cot giua: Silhouette nhan vat & 3 Compact Bars -->
        <div class="jx-paperdoll-col jx-center">
          <div class="jx-char-figure-box">
            <img src="img/pl/${f.key}.png" class="jx-figure-img" alt="${f.n}">
            <div class="jx-figure-glow" style="border-color:${SERIES_COL[f.series]};"></div>
          </div>
          <div style="display:flex;flex-direction:column;gap:2px;width:100%;margin-top:2px;">
            <div class="jx-bar-compact hp"><i style="width:${Math.min(100, (R.life / (P.life || 1)) * 100)}%;"></i><span>HP: ${Math.round(R.life)}/${Math.round(P.life)}</span></div>
            <div class="jx-bar-compact mp"><i style="width:${Math.min(100, (R.mana / (P.mana || 1)) * 100)}%;"></i><span>MP: ${Math.round(R.mana)}/${Math.round(P.mana)}</span></div>
            <div class="jx-bar-compact xp"><i style="width:${Math.min(100, (S.xp / (J.exp[S.lvl - 1] || 1)) * 100)}%;"></i><span>EXP: ${Math.floor((S.xp / (J.exp[S.lvl - 1] || 1)) * 100)}%</span></div>
          </div>
        </div>
        <!-- Cot phai: Ho uyen, Lien, Nhan 1, Nhan 2, Boi, Vu khi -->
        <div class="jx-paperdoll-col">
          ${eqCell('cuff', 'Hộ uyển', 'h-short')}
          ${eqCell('amulet', 'Liên', 'h-sq')}
          ${eqCell('ring1', 'Nhẫn 1', 'h-sq')}
          ${eqCell('ring2', 'Nhẫn 2', 'h-sq')}
          ${eqCell('pendant', 'Bội', 'h-short')}
          ${eqCell('weapon', 'Vũ khí', 'h-tall')}
        </div>
      </div>
    </div>

    <!-- 3. Diem Tiem Nang (Attributes) -->
    <div class="jx-box" style="margin-bottom:4px;padding:4px 6px;">
      <div class="jx-box-header" style="margin-bottom:3px;padding-bottom:2px;">
        <span>⚡ Điểm Tiềm Năng</span>
        <div style="display:flex;align-items:center;gap:4px;">
          <span style="font-size:10.5px;color:#cbd5e1;">Còn: <b style="color:#ef4444;font-size:12px;">${S.attrPts}</b> điểm</span>
          <button class="jx-action-btn" id="bSugAt" style="padding:1px 5px;font-size:9.5px;">Gợi ý</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;">
        ${attrs}
      </div>
    </div>

    <!-- 4. Thuoc Tinh Chien Dau & Khang Tinh (Combat Stats & Resists) -->
    <div class="jx-box" style="margin-bottom:4px;padding:4px 6px;">
      <div class="jx-box-header" style="margin-bottom:3px;padding-bottom:2px;">
        <span>📊 Chiến Đấu & Kháng Tính</span>
        <button class="jx-action-btn" id="bPower" style="padding:1px 5px;font-size:9.5px;">Chi tiết</button>
      </div>
      <div class="card stats" style="background:transparent;border:none;padding:0;margin:0;grid-template-columns:1fr 1fr;gap:2px 8px;font-size:10.5px;">
        <span>Lực tay (Sát thương)</span><span style="color:#ffd700;">${Math.round(P.wmin)}–${Math.round(P.wmax)}</span>
        <span>Phòng thủ / Giảm ST</span><span style="color:#cbd5e1;">${Math.round(P.def)}</span>
        <span>Né tránh</span><span style="color:#cbd5e1;">${Math.round(P.def * 1.2)}</span>
        <span>Chính xác</span><span style="color:#cbd5e1;">${Math.round(P.ar)}</span>
        <span>Chí mạng</span><span style="color:#f87171;">${Math.round(P.main ? P.main.crit : 10)}%</span>
        <span>Tốc đánh</span><span style="color:#60a5fa;">${P.aspd.toFixed(2)}</span>
        <span>Phi Phong (Kháng)</span><span style="color:${curCloak.color};font-weight:bold;cursor:pointer;" onclick="if(window.CLOAK_MERIDIAN)CLOAK_MERIDIAN.toggleWindow();" title="Bấm để mở nâng cấp Phi Phong">${curCloak.name} (+${curCloak.res}%)</span>
        <span>Kinh Mạch (Đới)</span><span style="color:#38bdf8;">+${(S.meridian && S.meridian.levels && S.meridian.levels.doi ? S.meridian.levels.doi * 8 : 8)}% Kháng</span>
        <span>Kháng Băng (Hàn)</span><span style="color:#93c5fd;">${Math.round(P.res.cold || 0)}%</span>
        <span>Kháng Lôi</span><span style="color:#fde047;">${Math.round(P.res.light || 0)}%</span>
        <span>Kháng Hỏa</span><span style="color:#fb923c;">${Math.round(P.res.fire || 0)}%</span>
        <span>Kháng Độc</span><span style="color:#4ade80;">${Math.round(P.res.poison || P.res.pois || 0)}%</span>
        <span>Kháng Vật Lý</span><span style="color:#e2e8f0;">${Math.round(P.res.phys || 0)}%</span>
        <span>Chiêu chính</span><span style="color:#ffd700;">${esc(P.main.n)}</span>
      </div>
    </div>

    <!-- 4.5 Bat / Tat Tu Mac Do Tot -->
    <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.3);border:1px solid #3d2f1d;border-radius:4px;padding:3px 8px;margin-bottom:6px;font-size:11px;">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;color:#e2e8f0;margin:0;" title="Bật hoặc Tắt tự động mặc trang bị tốt hơn khi nhặt hoặc lên cấp">
        <input type="checkbox" id="chkCharAutoEquip" ${S.autoEquip ? 'checked' : ''} class="accent-amber-500">
        <span>Tự động mặc đồ tốt hơn</span>
      </label>
      <span style="font-size:10px;color:${S.autoEquip ? '#4ade80' : '#94a3b8'};font-weight:bold;">${S.autoEquip ? 'ĐANG BẬT' : 'ĐANG TẮT'}</span>
    </div>

    <!-- 5. Hang Nut Chuc Nang duoi day -->
    <div class="jx-btn-grid" style="grid-template-columns:repeat(5,1fr);margin:0;">
      <button class="jx-action-btn gold" id="bBestEq" title="Tự động mặc trang bị tốt nhất">Mặc Tốt</button>
      <button class="jx-action-btn" id="bResetAttrs" title="Hoàn lại toàn bộ điểm tiềm năng">Tẩy Tủy</button>
      <button class="jx-action-btn" id="bFactionModal" title="Đổi sang môn phái khác">Đổi Phái</button>
      <button class="jx-action-btn" id="bOpenInvSide" title="Mở Hành Trang kế bên">Hành Trang</button>
      <button class="jx-action-btn" id="bCloseChar" style="color:#ef4444;" title="Đóng cửa sổ">Đóng</button>
    </div>
  `;

  // Binds
  el.querySelectorAll('.plus').forEach(b => b.onclick = () => { if (!S.attrPts) return; S.attrPts--; S.attr[b.dataset.a]++; if (typeof sendAllocAttr === 'function') sendAllocAttr(b.dataset.a, 1); R.dirty = true; recalc(); renderCharAttrib(targetEl); if (typeof save === 'function') save(); });
  el.querySelectorAll('.minus').forEach(b => b.onclick = () => { unspendAttr(b.dataset.a); renderCharAttrib(targetEl); });
  const bp = el.querySelector('#bPower'); if (bp) bp.onclick = powerModal;
  const bs = el.querySelector('#bSugAt'); if (bs) bs.onclick = suggestModal;
  const chkCharAe = el.querySelector('#chkCharAutoEquip');
  if (chkCharAe) chkCharAe.onchange = e => {
    S.autoEquip = e.target.checked;
    S.autoEquipExplicit = true;
    if (S.auto) {
      S.auto.autoEquip = S.autoEquip;
      S.auto.autoEquipExplicit = true;
    }
    save();
    toast(S.autoEquip ? 'Đã BẬT tự mặc đồ tốt hơn' : 'Đã TẮT tự mặc đồ tốt');
    renderCharAttrib(targetEl);
  };
  const bBe = el.querySelector('#bBestEq');
  if (bBe) bBe.onclick = () => {
    const n = autoEquipAll(true);
    toast(n ? `Đã tự động mặc ${n} món tốt hơn!` : 'Đang mặc toàn bộ trang bị tốt nhất');
    refresh();
  };
  const bRa = el.querySelector('#bResetAttrs'); if (bRa) bRa.onclick = resetAttrs;
  const bFm = el.querySelector('#bFactionModal'); if (bFm) bFm.onclick = () => pvkChangeFactionModal();
  const bInv = el.querySelector('#bOpenInvSide'); if (bInv) bInv.onclick = () => toggleWin('inv');
  const bClose = el.querySelector('#bCloseChar'); if (bClose) bClose.onclick = () => toggleWin('char-attrib');
  el.querySelectorAll('.jx-equip-slot .it').forEach(b => {
    const slot = b.parentNode.dataset.slot;
    b.ondblclick = ev => {
      ev.preventDefault();
      ev.stopPropagation();
      closeModal();
      unequip(slot);
    };
    b.onclick = () => itemModal(findItem(b.dataset.uid), slot);
  });
}

function renderChar() { renderCharAttrib(); }
function renderStatus() { renderCharAttrib(); }

/* ---------- the: ky nang ---------- */
/* Rut lai 1 diem ky nang (cong nham): tra diem, bo chieu khoi o / chieu chinh khi ve 0 */
function unlearnSkill(id) {
  const L = S.sk[id] || 0; if (!L) return false;
  if (L <= 1) delete S.sk[id]; else S.sk[id] = L - 1;
  S.skPts++;
  if (!S.sk[id] && S.main === id) S.mainLock = false;
  R.dirty = true; recalc(); fillSlots(); renderSkill(); renderPad(); updateDots(); save();
  toast(`Rút 1 điểm: ${SK[id].n} ${S.sk[id] || 0}/${SK[id].max}`);
  return true;
}
/* Rut lai 1 diem tiem nang */
function unspendAttr(k) {
  if (!(S.attr[k] > 0)) return false;
  S.attr[k]--; S.attrPts++; R.dirty = true; recalc(); renderChar(); updateDots(); save(); return true;
}
const SK_HIDE = /^(skill_attackradius|missle_|skill_cost_v|skill_eventskilllevel|addskilldamage|skill_)/;
function skillEffectLines(s, L) {
  const out = [];
  for (const name in s.attr) {
    if (SK_HIDE.test(name) || !J.attrDesc[name]) continue;
    const p = skVal(s, name, L); if (!p) continue;
    const t = attrText(name, p); if (t && !/^\s*$/.test(t)) out.push(t);
  }
  return out;
}
/* Thong tin ky nang: mo ta, yeu cau, hieu qua o cap hien tai va cap ke tiep, sat thuong / noi luc / tam danh */
function skillModal(id) {
  const s = SK[id]; if (!s) return;
  const L = S.sk[id] || 0, act = isAttack(s), show = Math.max(1, L), next = L < s.max ? L + 1 : 0;
  const lines = (lv) => skillEffectLines(s, lv).map(t => `<div>${esc(t)}</div>`).join('') || '<div class="dim">—</div>';
  let atk = '';
  if (act) {
    const a = activeInfo(R.P, s, show + (L ? 0 : 0));
    atk = `<div class="card stats"><span>Sát thương mỗi đòn</span><span>${fmt(a.tot)}</span><span>DPS ước tính</span><span>${fmt(a.dps)}</span><span>Nội lực tiêu hao</span><span>${Math.round(a.cost)}</span><span>Tầm đánh</span><span>${Math.round(a.rad)}</span><span>Mục tiêu</span><span>${a.targets > 1 ? 'nhiều (tối đa ' + a.targets + ')' : 'đơn'}</span></div>`;
  }
  modal(`<h3>${esc(s.n)} <small>${L}/${s.max}</small></h3>
    <p class="desc">${esc(s.d || 'Không có mô tả.')}</p>
    <div class="idet"><span class="tag${act ? ' attack' : ''}">${act ? 'Tấn công' : 'Nội tại'}</span><small class="dim">Yêu cầu cấp ${s.req}${S.lvl < s.req ? ` (bạn cấp ${S.lvl})` : ''}</small></div>
    ${atk}
    <div class="sl"><b>${L ? 'Cấp hiện tại ' + L : 'Nếu học (cấp 1)'}</b>${lines(show)}</div>
    ${next && L ? `<div class="sl"><b>Cấp kế tiếp ${next}</b>${lines(next)}</div>` : ''}
    <div class="btnrow">${act && L ? '<button class="btn" id="skMain">Chọn làm chiêu chính</button>' : ''}<button class="btn" id="skPlus" ${canLearn(s) ? '' : 'disabled'}>+ Cộng điểm</button><button class="btn red" id="skMinus" ${L ? '' : 'disabled'}>− Rút điểm</button></div>`, () => {
    const m = $('#skMain'); if (m) m.onclick = () => { S.main = s.id; S.mainLock = true; R.dirty = true; recalc(); renderSkill(); toast('Chiêu chính: ' + s.n); skillModal(id); };
    $('#skPlus').onclick = () => { if (!canLearn(s)) return; S.skPts--; S.sk[id] = (S.sk[id] || 0) + 1; if (typeof sendAllocSkill === 'function') sendAllocSkill(id); uiSfx('learn'); R.dirty = true; recalc(); renderSkill(); save(); skillModal(id); };
    $('#skMinus').onclick = () => { if (unlearnSkill(id)) skillModal(id); };
  });
}
function renderSkill() {
  const f = FAC[S.fac];
  const rows = f.skills.map(id => {
    const s = SK[id], L = S.sk[id] || 0, act = isAttack(s);
    const a = act && L ? activeInfo(R.P, s, L) : null;
    return `<div class="skl${S.lvl < s.req ? ' lock' : ''}${R.P.main.id === +id ? ' main' : ''}" data-id="${id}">
      <img class="sic" src="${esc(s.ic || '')}" alt=""><div class="info"><b>${esc(s.n)}</b> <span class="tag${act ? ' attack' : ''}">${act ? 'Tấn công' : 'Nội tại'}</span>
      <small>Cấp yêu cầu ${s.req}${a ? ` · ${fmt(a.tot)} sát thương · ${a.targets > 1 ? 'nhiều mục tiêu' : 'đơn mục tiêu'}` : ''}</small></div>
      <span class="lvl">${L}/${s.max}</span><span class="pm"><button class="plus" data-id="${id}" title="Cộng 1 điểm" ${canLearn(s) ? '' : 'disabled'}>+</button><button class="minus" data-id="${id}" title="Rút lại 1 điểm" ${L > 0 ? '' : 'disabled'}>−</button><button class="skinfo" data-id="${id}" title="Thông tin kỹ năng">i</button></span>
      ${act && L ? `<div class="slots" style="display:flex;align-items:center;gap:4px;"><span style="color:#c89b3c;font-size:10.5px;font-weight:bold;">Gán vào:</span> ${[0, 1, 2, 3].map(i => `<button data-slot="${i}" data-sid="${id}" class="${(S.slots || [])[i] === +id ? 'on' : ''}" style="padding:2px 7px;font-size:11px;font-weight:bold;cursor:pointer;border-radius:3px;${(S.slots || [])[i] === +id ? 'background:#ffd700;color:#000;border:1px solid #ffd700;' : 'background:#1a140d;color:#cbd5e1;border:1px solid #5a4425;'}" title="Gán vào Ô [Phím ${i + 1}]">Ô ${i + 1}</button>`).join('')}</div>` : ''}</div>`;
  }).join('');
  const skillEl = tabEl('skill'); if (!skillEl) return;
  skillEl.innerHTML = `
    <div class="jx-money-bar" style="margin-bottom:6px;">
      <span>⚡ Võ Công Phái <b style="color:#ffd700;">${esc(f.n)}</b></span>
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="font-size:11px;color:#cbd5e1;">Điểm: <b style="color:#ef4444;font-size:13px;">${S.skPts}</b></span>
        <button class="jx-action-btn" id="bSugSk" style="padding:2px 6px;font-size:10px;">Gợi ý</button>
      </div>
    </div>
    <div class="jx-box" style="margin-bottom:6px;padding:4px 8px;font-size:11px;color:#a39276;">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="cRot" ${S.rot === false ? '' : 'checked'} class="accent-amber-500"> Tự động xoay chiêu: Luân phiên các chiêu ô 1–4</label>
    </div>
    <div style="font-size:10.5px;color:#ffd700;margin:0 0 6px 2px;line-height:1.4;">
      ✦ Bấm <b>[Ô 1] – [Ô 4]</b> để gán chiêu vào ô đánh. Chạm tên chiêu để chọn làm chiêu chính ${S.mainLock ? '(<a id="bAutoMain" style="color:#60a5fa;cursor:pointer;text-decoration:underline;">bỏ khóa</a>)' : '(tự chọn chiêu mạnh nhất)'}.<br>
      ✦ Trên thanh đánh: <b>Chuột phải</b> (hoặc <b>Nhấn giữ</b>) vào ô chiêu để mở bảng đổi chiêu nhanh!
    </div>
    <div style="display:flex;flex-direction:column;gap:4px;">
      ${rows}
    </div>
  `;
  skillEl.querySelectorAll('.plus').forEach(b => b.onclick = e => { e.stopPropagation(); const s = SK[b.dataset.id]; if (!canLearn(s)) return; S.skPts--; S.sk[s.id] = (S.sk[s.id] || 0) + 1; if (typeof sendAllocSkill === 'function') sendAllocSkill(s.id); uiSfx('learn'); R.dirty = true; recalc(); renderSkill(); save(); });
  skillEl.querySelectorAll('.minus').forEach(b => b.onclick = e => { e.stopPropagation(); unlearnSkill(+b.dataset.id); });
  skillEl.querySelectorAll('.skinfo').forEach(b => b.onclick = e => { e.stopPropagation(); skillModal(+b.dataset.id); });
  skillEl.querySelectorAll('.slots button').forEach(b => b.onclick = e => { e.stopPropagation(); assignSlot(+b.dataset.slot, +b.dataset.sid); renderSkill(); });
  const bSugSk = skillEl.querySelector('#bSugSk'); if (bSugSk) bSugSk.onclick = suggestModal;
  const cRot = skillEl.querySelector('#cRot'); if (cRot) cRot.onchange = () => toggleRot();
  const am = skillEl.querySelector('#bAutoMain'); if (am) am.onclick = () => { S.mainLock = false; R.dirty = true; recalc(); renderSkill(); };
  skillEl.querySelectorAll('.skl').forEach(r => r.onclick = () => { const s = SK[r.dataset.id]; if (isAttack(s) && S.sk[s.id]) { S.main = s.id; S.mainLock = true; R.dirty = true; recalc(); renderSkill(); toast('Chiêu chính: ' + s.n); } else skillModal(s.id); });
}

/* ---------- the: tui do ---------- */
let invFilterOpen = false;
let invPage = 0; // Trang rương hiện tại: 0 -> 4 (5 trang)
const INV_PAGE_SIZE = 200; // Mỗi trang chứa 200 ô (chuẩn 10 cột x 20 dòng)
const INV_PAGE_COUNT = 5; // 5 rương: 1 -> 5 (tổng 1000 ô)

function renderInv() {
  invDirty = false;
  const f = lootFilter();
  const rar = RAR_VI.map((n, i) => `<option value="${i}" ${f.minRar === i ? 'selected' : ''}>${n}</option>`).join('');
  const lv = Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}" ${f.minLvl === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('');
  const grp = LOOT_ATTR_GROUPS.map(([n], i) => `<label class="chip2"><input type="checkbox" data-g="${i}" ${f.groups.includes(i) ? 'checked' : ''}>${n}</label>`).join('');
  const ser = SERIES.map((n, i) => `<label class="chip2" style="color:${SERIES_COL[i]}"><input type="checkbox" data-s="${i}" ${f.series.includes(i) ? 'checked' : ''}>${n}</label>`).join('');
  const onGround = R.ground.length, match = R.ground.filter(d => lootMatch(d.it)).length;

  if (invPage < 0) invPage = 0;
  if (invPage >= INV_PAGE_COUNT) invPage = INV_PAGE_COUNT - 1;

  const startIdx = invPage * INV_PAGE_SIZE;
  const endIdx = startIdx + INV_PAGE_SIZE;
  const pageItems = S.inv.slice(startIdx, endIdx);
  const emptyCellsCount = Math.max(0, INV_PAGE_SIZE - pageItems.length);
  const emptyCells = Array.from({ length: emptyCellsCount }, () => `<div class="it empty" style="border:1px dashed #3d2f1d;background:transparent;"></div>`).join('');

  const invEl = tabEl('inv'); if (!invEl) return;
  const van = Math.floor(S.gold / 10000);
  const luong = S.gold % 10000;
  const goldStr = van > 0 ? `${van} vạn ${fmt(luong)} lượng` : `${fmt(S.gold)} lượng`;

  // HTML các nút chuyển trang Rương 1 -> 5 (mỗi rương 200 ô)
  const pageTabsHtml = Array.from({ length: INV_PAGE_COUNT }, (_, idx) => {
    const isAct = idx === invPage;
    const pageItemCount = S.inv.slice(idx * INV_PAGE_SIZE, (idx + 1) * INV_PAGE_SIZE).length;
    const countCol = pageItemCount >= INV_PAGE_SIZE ? '#ef4444' : isAct ? '#ffd700' : '#888';
    return `<button class="inv-page-btn ${isAct ? 'active' : ''}" data-page="${idx}" style="flex:1;padding:4px 2px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;cursor:pointer;border-radius:4px;border:1.5px solid ${isAct ? '#ffd700' : '#4a3820'};background:${isAct ? 'linear-gradient(180deg,#78350f,#3a1700)' : '#140d07'};box-shadow:${isAct ? '0 0 8px rgba(255,215,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none'};transition:all 0.15s;" title="Rương ${idx + 1}: ${pageItemCount}/${INV_PAGE_SIZE} ô">
      <span style="font-size:10.5px;font-weight:bold;color:${isAct ? '#ffd700' : '#d4c7b0'};letter-spacing:0.3px;line-height:1.1;">RƯƠNG ${idx + 1}</span>
      <span style="font-size:9px;color:${countCol};line-height:1;font-weight:600;">${pageItemCount}/${INV_PAGE_SIZE}</span>
    </button>`;
  }).join('');

  invEl.innerHTML = `
    <div class="jx-inv-layout-split">
      <!-- CỘT TRÁI: RƯƠNG HÀNH TRANG (5 RƯƠNG x 200 Ô = 1000 Ô) -->
      <div class="jx-inv-grid-col">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;padding:0 2px;">
          <span style="font-size:11px;font-weight:700;color:#ffd700;">🎒 RƯƠNG HÀNH TRANG ${invPage + 1} (200 Ô)</span>
          <span style="font-size:10.5px;color:#a39276;">Tổng cả 5 rương: <b style="color:${S.inv.length >= INV_MAX ? '#ef4444' : '#4ade80'};">${S.inv.length}/${INV_MAX}</b></span>
        </div>
        <!-- Thanh chọn Rương 1 -> 5 -->
        <div class="inv-page-bar" style="display:flex;gap:4px;margin-bottom:6px;">
          ${pageTabsHtml}
        </div>
        <div class="jx-inv-grid-10" style="flex:1;max-height:calc(100vh - 210px);min-height:360px;overflow-y:auto;padding-right:2px;">
          ${pageItems.map(itemCell).join('')}
          ${emptyCells}
        </div>
      </div>

      <!-- CỘT PHẢI: BẢNG CHỨC NĂNG & TIỆN ÍCH HÀNH TRANG -->
      <div class="jx-inv-ctrl-col">
        <!-- Ngân lượng & Mảnh trang bị -->
        <div style="background:#1e150d;border:1px solid #5a4425;border-radius:4px;padding:4px 6px;text-align:center;">
          <div style="font-size:9.5px;color:#a39276;">NGÂN LƯỢNG · MẢNH TRANG BỊ</div>
          <div style="font-size:11.5px;font-weight:700;color:#ffd700;">${goldStr}</div>
          <div style="display:flex;justify-content:center;align-items:center;gap:4px;margin-top:2px;">
            <span style="font-size:10px;color:#93c5fd;">Mảnh Trang Bị:</span>
            <b style="font-size:11.5px;color:#60a5fa;">${(typeof matHave === 'function') ? matHave('misc', 'equip_shard') : (S.mats && S.mats.misc && S.mats.misc.equip_shard || 0)}</b>
          </div>
        </div>

        <!-- Nhóm Chọn Nhiều (Multi-Select Sell & Dismantle) -->
        <div class="jx-ctrl-group" style="background:#24160d;border:1px solid #c89b3c;padding:5px;border-radius:4px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <label style="display:flex;align-items:center;gap:5px;cursor:pointer;color:#ffd700;font-size:11px;font-weight:bold;">
              <input type="checkbox" id="chkInvSelectMode" ${window.INV_SELECT_MODE ? 'checked' : ''} class="accent-amber-500">
              Chọn Nhiều
            </label>
            <span style="font-size:10px;color:#cbd5e1;">Đã chọn: <b id="lblSelCount" style="color:#4ade80;">${window.INV_SELECTED ? window.INV_SELECTED.size : 0}</b></span>
          </div>
          <div id="selActionRow" style="display:${window.INV_SELECT_MODE ? 'flex' : 'none'};flex-direction:column;gap:3px;margin-top:4px;">
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:2px;">
              <button class="jx-action-btn" id="btnSelAllWhite" style="padding:2px 1px;font-size:9px;" title="Chọn toàn bộ đồ Trắng">Trắng</button>
              <button class="jx-action-btn" id="btnSelAllBlue" style="padding:2px 1px;font-size:9px;color:#60a5fa;" title="Chọn toàn bộ Đồ Xanh">Xanh</button>
              <button class="jx-action-btn" id="btnSelAll" style="padding:2px 1px;font-size:9px;" title="Chọn toàn bộ đồ trong rương">Tất Cả</button>
              <button class="jx-action-btn" id="btnUnselAll" style="padding:2px 1px;font-size:9px;" title="Bỏ chọn">Bỏ Chọn</button>
            </div>
            <button class="jx-action-btn" id="btnExecuteMultiSell" style="width:100%;padding:4px 0;font-size:10.5px;font-weight:bold;background:${window.INV_SELECTED && window.INV_SELECTED.size > 0 ? '#b91c1c' : '#450a0a'};border:1px solid #ef4444;color:#fff;" ${window.INV_SELECTED && window.INV_SELECTED.size > 0 ? '' : 'disabled'}>
              🗑️ Bán (${window.INV_SELECTED ? window.INV_SELECTED.size : 0})
            </button>
            <button class="jx-action-btn" id="btnExecuteMultiDismantle" style="width:100%;padding:3px 0;font-size:10px;font-weight:bold;background:#1e3a8a;border:1px solid #3b82f6;color:#93c5fd;display:none;">
              🔨 Rã Đồ Xanh
            </button>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">
              <button class="jx-action-btn" id="btnDismantleGold" style="padding:3px 2px;font-size:9.5px;font-weight:bold;background:#78350f;border:1px solid #fbbf24;color:#fde68a;" title="Phân rã đồ Hoàng Kim đã chọn thành 2~4 mảnh/món">
                💛 Rã Mảnh HK
              </button>
              <button class="jx-action-btn" id="btnCraftGold" style="padding:3px 2px;font-size:9.5px;font-weight:bold;background:#1a2e1a;border:1px solid #4ade80;color:#86efac;" title="Dùng 10 Mảnh HK ghép trang bị HK">
                ✨ Ghép Đồ HK
              </button>
            </div>
            <button class="jx-action-btn" id="btnStashSelected" style="width:100%;padding:3px 0;font-size:10px;font-weight:bold;background:#1e2a3a;border:1px solid #60a5fa;color:#93c5fd;" title="Gởi các món đã chọn vào Kho chung">
              📦 Gởi Vào Kho Chung
            </button>
          </div>
        </div>

        <!-- Nhóm 1: Bán Nhanh & Rã Đồ -->
        <div class="jx-ctrl-group">
          <div class="jx-ctrl-group-title">Bán & Rã Đồ</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">
            <button class="jx-action-btn jx-btn-sell-white" id="bSellWhite" style="padding:4px 2px;font-size:10px;" title="Bán toàn bộ đồ Trắng">Bán Đồ Trắng</button>
            <button class="jx-action-btn" style="color:#60a5fa;border-color:#2563eb;padding:4px 2px;font-size:10px;" id="bDisAllBlue" title="Rã toàn bộ đồ xanh trong rương thành Mảnh Trang Bị">🔨 Rã Đồ Xanh</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">
            <button class="jx-action-btn jx-btn-sell-bag" id="bSellAllGear" style="padding:4px 2px;font-size:10px;" title="Bán tất cả đồ trong rương">Bán Hết Đồ</button>
            <button class="jx-action-btn" style="color:#fb923c;padding:4px 2px;font-size:10px;" id="bSellAll" title="Bán các món không khớp bộ lọc">Bán Lọc Rác</button>
          </div>
        </div>

        <!-- Nhóm 2: Quản Lý Túi & Ghép Mảnh -->
        <div class="jx-ctrl-group">
          <div class="jx-ctrl-group-title" style="display:flex;justify-content:space-between;align-items:center;">
            <span>Quản Lý Túi</span>
            <label style="display:flex;align-items:center;gap:3px;cursor:pointer;font-size:9.5px;color:#cbd5e1;text-transform:none;font-weight:normal;" title="Bật/Tắt tự động mặc trang bị tốt hơn">
              <input type="checkbox" id="chkInvAutoEquip" ${S.autoEquip ? 'checked' : ''} class="accent-amber-500"> Tự mặc
            </label>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">
            <button class="jx-action-btn gold" id="bOpenShardHub" style="padding:4px 2px;font-size:10px;" title="Mở Lò Rã & Ghép Mảnh">💠 Ghép Mảnh</button>
            <button class="jx-action-btn gold" id="bBest" style="padding:4px 2px;font-size:10px;" title="Tự động mặc đồ tốt nhất">Mặc Đồ Tốt</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">
            <button class="jx-action-btn" id="bSort" style="padding:4px 2px;font-size:10px;" title="Sắp xếp đồ theo phẩm chất">Sắp Xếp</button>
            <button class="jx-action-btn" id="bPickAll" style="padding:4px 2px;font-size:10px;" title="Nhặt toàn bộ đồ trên đất">Nhặt Đất (${onGround})</button>
          </div>
          <button class="jx-action-btn" id="bStash" style="padding:4px 2px;font-size:10.5px;" title="Mở rương thủ kho chung">📦 Kho Chung</button>
        </div>

        <!-- Nhóm 3: Tiện Ích -->
        <div class="jx-ctrl-group">
          <div class="jx-ctrl-group-title">Tiện Ích</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">
            <button class="jx-action-btn ${invFilterOpen ? 'gold' : ''}" id="bToggleFilter" style="padding:4px 2px;font-size:10px;">Lọc Đồ ${invFilterOpen ? '▲' : '▼'}</button>
            <button class="jx-action-btn" id="bMarketQuick" style="color:#fde047;padding:4px 2px;font-size:10px;">Chợ Đen</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">
            <button class="jx-action-btn" id="bKtcQuick" style="color:#67e8f9;padding:4px 2px;font-size:10px;">Kỳ Trân</button>
            <button class="jx-action-btn" id="bCloseInv" style="color:#ef4444;padding:4px 2px;font-size:10px;">Đóng</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Khung Bo Loc & Tu Nhat Do (Drawer) -->
    <div class="jx-box" id="invFilterDrawer" style="${invFilterOpen ? '' : 'display:none;'}margin-top:6px;padding:6px 8px;">
      <div class="jx-box-header" style="margin-bottom:3px;padding-bottom:2px;">
        <span>🔍 Cấu Hình Bộ Lọc & Tự Nhặt</span>
        <span style="font-size:10px;color:#a39276;">${onGround} rơi đất · <b style="color:#4ade80;">${match}</b> khớp</span>
      </div>
      <div class="card lootf" style="background:transparent;border:none;padding:0;margin:0;">
        <label style="display:flex;align-items:center;gap:6px;font-size:10.5px;cursor:pointer;color:#fde047;"><input type="checkbox" id="fAuto" ${f.auto !== false ? 'checked' : ''} class="accent-amber-500"> Tự động nhặt đồ khớp bộ lọc (hút gần + tự đi nhặt)</label>
        <div class="row" style="font-size:10.5px;margin:2px 0;">Độ hiếm từ <select id="fRar">${rar}</select> · cấp đồ từ <select id="fLvl">${lv}</select></div>
        <div class="dim small" style="margin-top:2px;">Ngũ hành trang bị:</div><div class="chips" style="margin-bottom:2px;">${ser}</div>
        <div class="dim small">Thuộc tính quan trọng:</div><div class="chips">${grp}</div>
      </div>
    </div>
  `;

  const q = s => invEl.querySelector(s), qa = s => invEl.querySelectorAll(s);
  const upd = () => { save(); renderInv(); };
  const fa = q('#fAuto'); if (fa) fa.onchange = e => { f.auto = e.target.checked; upd(); };
  const fr = q('#fRar'); if (fr) fr.onchange = e => { f.minRar = +e.target.value; upd(); };
  const fl = q('#fLvl'); if (fl) fl.onchange = e => { f.minLvl = +e.target.value; upd(); };
  qa('[data-g]').forEach(b => b.onchange = () => { const g = +b.dataset.g; f.groups = b.checked ? [...new Set(f.groups.concat(g))] : f.groups.filter(x => x !== g); upd(); });
  qa('[data-s]').forEach(b => b.onchange = () => { const v = +b.dataset.s; f.series = b.checked ? [...new Set(f.series.concat(v))] : f.series.filter(x => x !== v); upd(); });

  const chkMode = q('#chkInvSelectMode');
  if (chkMode) chkMode.onchange = e => { if (window.ITEM_TOOLTIP) window.ITEM_TOOLTIP.toggleSelectMode(e.target.checked); };
  const bSelWhite = q('#btnSelAllWhite');
  if (bSelWhite) bSelWhite.onclick = () => { if (window.ITEM_TOOLTIP) window.ITEM_TOOLTIP.selectAllWhite(); };
  const bSelBlue = q('#btnSelAllBlue');
  if (bSelBlue) bSelBlue.onclick = () => { if (window.ITEM_TOOLTIP && window.ITEM_TOOLTIP.selectAllBlue) window.ITEM_TOOLTIP.selectAllBlue(); };
  const bSelAllItems = q('#btnSelAll');
  if (bSelAllItems) bSelAllItems.onclick = () => { if (window.ITEM_TOOLTIP) window.ITEM_TOOLTIP.selectAll(); };
  const bUnsel = q('#btnUnselAll');
  if (bUnsel) bUnsel.onclick = () => { if (window.ITEM_TOOLTIP) window.ITEM_TOOLTIP.clearSelection(); };
  const bExecSell = q('#btnExecuteMultiSell');
  if (bExecSell) bExecSell.onclick = () => { if (window.ITEM_TOOLTIP) window.ITEM_TOOLTIP.executeSell(); };
  const bExecDis = q('#btnExecuteMultiDismantle');
  if (bExecDis) bExecDis.onclick = () => { if (window.EQUIP_SHARD) window.EQUIP_SHARD.dismantleSelected(); };
  const bDisGold = q('#btnDismantleGold');
  if (bDisGold) bDisGold.onclick = () => { if (window.ITEM_TOOLTIP) window.ITEM_TOOLTIP.dismantleGold(); };
  const bCraftGold = q('#btnCraftGold');
  if (bCraftGold) bCraftGold.onclick = () => { if (window.ITEM_TOOLTIP) window.ITEM_TOOLTIP.craftGold(); };
  const bStashSel = q('#btnStashSelected');
  if (bStashSel) bStashSel.onclick = () => { if (window.ITEM_TOOLTIP) window.ITEM_TOOLTIP.stashSelected(); };

  const bSw = q('#bSellWhite'); if (bSw) bSw.onclick = () => sellWhiteItems();
  const bDisAll = q('#bDisAllBlue'); if (bDisAll) bDisAll.onclick = () => { if (window.EQUIP_SHARD) window.EQUIP_SHARD.dismantleAll(); };
  const bSg = q('#bSellAllGear'); if (bSg) bSg.onclick = () => sellAllBagGear();
  const bOpenShard = q('#bOpenShardHub'); if (bOpenShard) bOpenShard.onclick = () => { if (window.EQUIP_SHARD) window.EQUIP_SHARD.openModal('craft'); };
  const chkInvAe = q('#chkInvAutoEquip');
  if (chkInvAe) chkInvAe.onchange = e => {
    S.autoEquip = e.target.checked;
    S.autoEquipExplicit = true;
    if (S.auto) {
      S.auto.autoEquip = S.autoEquip;
      S.auto.autoEquipExplicit = true;
    }
    save();
    toast(S.autoEquip ? 'Đã BẬT tự mặc đồ tốt hơn' : 'Đã TẮT tự mặc đồ tốt');
  };
  const bBest = q('#bBest'); if (bBest) bBest.onclick = () => { const n = autoEquipAll(); toast(n ? `Đã tự động mặc ${n} món tốt hơn!` : 'Đang mặc toàn bộ trang bị tốt nhất'); refresh(); };
  const bSellAll = q('#bSellAll'); if (bSellAll) bSellAll.onclick = () => { const r = sellUnmatched(); toast(`Bán ${r.n} món${r.kept ? ` (giữ ${r.kept} món bộ / Tím / Bạch Kim)` : ''}`); refresh(); };
  const bTogF = q('#bToggleFilter'); if (bTogF) bTogF.onclick = () => { invFilterOpen = !invFilterOpen; renderInv(); };
  const bSort = q('#bSort'); if (bSort) bSort.onclick = () => sortInventory();
  const bPick = q('#bPickAll'); if (bPick) bPick.onclick = () => pickupAllGround();
  const bMq = q('#bMarketQuick'); if (bMq) bMq.onclick = () => { if (typeof openMarketModal === 'function') openMarketModal(); };
  const bKq = q('#bKtcQuick'); if (bKq) bKq.onclick = () => { if (typeof openKtcModal === 'function') openKtcModal(); };
  const bClose = q('#bCloseInv'); if (bClose) bClose.onclick = () => toggleWin('inv');

  qa('.inv-page-btn').forEach(btn => {
    btn.onclick = () => {
      invPage = +btn.dataset.page;
      renderInv();
    };
  });

  qa('.it').forEach(b => {
    b.ondblclick = ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const uid = +b.dataset.uid;
      if (!uid) return;
      const it = findItem(uid);
      if (it && S.inv && S.inv.includes(it)) {
        closeModal();
        equip(it);
      }
    };
    b.onclick = ev => {
      const uid = +b.dataset.uid;
      if (!uid) return;
      if (window.INV_SELECT_MODE || ev.ctrlKey || ev.shiftKey) {
        if (window.ITEM_TOOLTIP) window.ITEM_TOOLTIP.toggleItem(uid);
      } else {
        itemModal(findItem(uid));
      }
    };
  });
  if (window.ITEM_TOOLTIP) window.ITEM_TOOLTIP.updateUI();
}

/* ---------- the: khac ---------- */
function renderMore() {
  const moreEl = tabEl('more'); if (!moreEl) return;
  moreEl.innerHTML = `
    <!-- Tai khoan nguoi choi -->
    <div class="jx-box">
      <div class="jx-box-header">
        <span>👤 Tài Khoản Võ Lâm & Đám Mây</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div>
          <span style="font-size:12px;color:#cbd5e1;">Tài khoản: </span>
          <b style="color:#ffd700;font-size:13px;">${(typeof ACC !== 'undefined' && ACC.user) ? esc(ACC.user.username) : 'Khách'}</b>
          ${(typeof ACC !== 'undefined' && ACC.user && ACC.user.heroName) ? `<small style="color:#38bdf8;"> (${esc(ACC.user.heroName)})</small>` : ''}
        </div>
        <button class="jx-action-btn" id="bLogout" style="padding:4px 10px;font-size:11px;color:#ef4444;border-color:#ef444455;">🚪 Đăng Xuất</button>
      </div>
      <div class="jx-btn-grid" style="grid-template-columns:1fr 1fr;">
        <button class="jx-action-btn gold" id="bSyncCloud">☁️ Đồng bộ máy chủ</button>
        <button class="jx-action-btn" id="bSwitchAcc">🔄 Đổi tài khoản</button>
      </div>
    </div>

    <!-- Luu game -->
    <div class="jx-box">
      <div class="jx-box-header">
        <span>💾 Dữ Liệu Nhân Vật (.jxsave)</span>
      </div>
      <p class="dim small" style="margin-bottom:6px;font-size:10px;line-height:1.3;">Nhân vật lưu trong trình duyệt (3 slot). Để chơi máy khác: bấm <b>Tải file lưu</b> rồi nạp vào máy kia.</p>
      <div class="jx-btn-grid" style="grid-template-columns:1fr 1fr;margin-bottom:6px;">
        <button class="jx-action-btn gold" id="bDl">📥 Tải file lưu (.jxsave)</button>
        <button class="jx-action-btn" id="bFile">📂 Nạp từ file</button>
      </div>
      <div class="jx-btn-grid" style="grid-template-columns:1fr 1fr;margin-bottom:4px;">
        <button class="jx-action-btn" id="bExp">📋 Xuất mã văn bản</button>
        <button class="jx-action-btn" id="bImp">📥 Nhập mã văn bản</button>
      </div>
      <textarea id="saveTxt" rows="2" style="font-size:10px;padding:3px;" placeholder="Dán mã văn bản tại đây nếu không dùng file .jxsave"></textarea>
    </div>

    <!-- Am thanh -->
    <div class="jx-box">
      <div class="jx-box-header">
        <span>🔊 Âm Thanh & Nhạc Nền</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;font-size:11px;">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="sOn" ${sndCfg().on ? 'checked' : ''} class="accent-amber-500"> Hiệu ứng âm thanh (đòn đánh, chiêu, quái, đồ rơi)</label>
        <div class="row" style="font-size:11px;"><span>Âm lượng SFX</span> <input type="range" id="sVol" min="0" max="1" step="0.05" value="${sndCfg().vol}"></div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="mOn" ${sndCfg().music ? 'checked' : ''} class="accent-amber-500"> Nhạc nền theo bản đồ (BGM)</label>
        <div class="row" style="font-size:11px;"><span>Âm lượng Nhạc</span> <input type="range" id="mVol" min="0" max="1" step="0.05" value="${sndCfg().mvol}"></div>
      </div>
    </div>

    <!-- Tu dong -->
    <div class="jx-box">
      <div class="jx-box-header">
        <span>⚙️ Thiết Lập Tự Động (Auto)</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;font-size:11px;color:#cbd5e1;">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="cAuto" ${S.autoEquip ? 'checked' : ''} class="accent-amber-500"> Tự mặc đồ tốt hơn khi nhặt</label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="cPot" ${S.potOff ? '' : 'checked'} class="accent-amber-500"> Tự dùng thuốc (Kim Sáng Dược / Ngưng Thần đan)</label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="cJunk" ${S.autoJunk === false ? '' : 'checked'} class="accent-amber-500"> Tự bán đồ thừa (yếu hơn đồ đang mặc, sai loại vũ khí)</label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="cPts" ${S.autoPts === true ? 'checked' : ''} class="accent-amber-500"> Tự cộng điểm tiềm năng và võ công khi lên cấp</label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="cForge" ${S.autoForge ? 'checked' : ''} class="accent-amber-500"> Tự rèn đồ (ghép mảnh Hoàng Kim, hợp Huyền Tinh mỗi 30s)</label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="cBuy" ${S.autoBuy === false ? '' : 'checked'} class="accent-amber-500"> Tự mua vũ khí Biện Kinh khi mạnh hơn ≥ 25%</label>
      </div>
    </div>

    <!-- Do kho & Tien ich -->
    <div class="jx-box">
      <div class="jx-box-header">
        <span>🎮 Độ Khó & Trợ Giúp</span>
      </div>
      <div class="row" style="font-size:11px;margin-bottom:6px;">Độ khó: <select id="sDiff">${DIFFS.map((d, i) => `<option value="${i}" ${diffOf() === d ? 'selected' : ''}>${d.n}</option>`).join('')}</select> <small class="dim">${esc(diffOf().d)}</small></div>
      <div class="jx-btn-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:4px;">
        <button class="jx-action-btn" id="bStashM">📦 Kho</button>
        <button class="jx-action-btn" id="bTut">📖 Hướng dẫn</button>
        <button class="jx-action-btn" id="bCodex">📜 Bách khoa</button>
        <button class="jx-action-btn" id="bSug">💡 Gợi ý</button>
      </div>
    </div>

    <!-- Dieu khien & Nhan vat -->
    <div class="jx-box">
      <div class="jx-box-header">
        <span>🕹 Điều Khiển & Tài Khoản</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;font-size:11px;margin-bottom:6px;">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="cJoy" ${joyFixed() ? 'checked' : ''} class="accent-amber-500"> Joystick cố định góc trái dưới</label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="cLowFx" ${S.lowFx ? 'checked' : ''} class="accent-amber-500"> Giảm hiệu ứng đồ họa (mượt hơn)</label>
      </div>
      <div class="jx-btn-grid" style="grid-template-columns:1fr 1fr;margin:0;">
        <button class="jx-action-btn" id="bSwitch">🔄 Đổi nhân vật / slot</button>
        <button class="jx-action-btn" style="color:#ef4444;" id="bReset">❌ Xóa nhân vật này</button>
      </div>
    </div>`;

  const m = s => moreEl.querySelector(s);
  const bLogout = m('#bLogout'); if (bLogout) bLogout.onclick = () => { if (typeof logoutAccount === 'function') logoutAccount(); };
  const bSwitchAcc = m('#bSwitchAcc'); if (bSwitchAcc) bSwitchAcc.onclick = () => { if (typeof logoutAccount === 'function') logoutAccount(); };
  const bSyncCloud = m('#bSyncCloud'); if (bSyncCloud) bSyncCloud.onclick = () => {
    if (typeof syncCloudSave === 'function') {
      if (typeof ACC !== 'undefined') ACC.lastCloudSaveT = 0;
      syncCloudSave();
      toast('Đang đồng bộ dữ liệu với máy chủ...');
    }
  };
  m('#bDl').onclick = () => { if (downloadSaveFile()) toast('Đã tải file lưu: ' + saveFileName()); };
  m('#bFile').onclick = () => pickSaveFile(null);
  m('#bExp').onclick = () => { m('#saveTxt').value = exportSave(); toast('Đã xuất mã'); };
  m('#bImp').onclick = () => importFlow(m('#saveTxt').value, null);
  m('#cAuto').onchange = e => {
    S.autoEquip = e.target.checked;
    S.autoEquipExplicit = true;
    if (S.auto) {
      S.auto.autoEquip = S.autoEquip;
      S.auto.autoEquipExplicit = true;
    }
    save();
    toast(S.autoEquip ? 'Đã BẬT tự mặc đồ tốt hơn' : 'Đã TẮT tự mặc đồ tốt');
  };
  m('#cJunk').onchange = e => { S.autoJunk = e.target.checked; save(); };
  m('#sOn').onchange = e => { audInit(); sndCfg().on = e.target.checked; audApply(); save(); };
  m('#mOn').onchange = e => { audInit(); sndCfg().music = e.target.checked; audApply(); if (sndCfg().music) playMusic(R.town ? W.town.id : zoneOf(Math.min(S.stage, STAGES)).id); save(); };
  m('#sVol').oninput = e => { sndCfg().vol = +e.target.value; audApply(); };
  m('#mVol').oninput = e => { sndCfg().mvol = +e.target.value; audApply(); };
  m('#sVol').onchange = m('#mVol').onchange = () => save();
  m('#cPot').onchange = e => { S.potOff = !e.target.checked; save(); };
  m('#cPts').onchange = e => { S.autoPts = e.target.checked; if (S.autoPts) { autoSpendAttrs(); autoSpendSkills(); recalc(); } save(); };
  m('#cJoy').onchange = e => { S.joy = e.target.checked ? 'fixed' : 'float'; save(); };
  m('#cLowFx').onchange = e => { S.lowFx = e.target.checked; save(); };
  m('#sDiff').onchange = e => { S.diff = +e.target.value; R.enemies = []; R.spawnT = 0.3; save(); toast('Độ khó: ' + diffOf().n); renderMore(); };
  m('#cBuy').onchange = e => { S.autoBuy = e.target.checked; save(); };
  m('#cForge').onchange = e => { S.autoForge = e.target.checked; if (S.autoForge) autoForge(); save(); };
  m('#bStashM').onclick = () => stashModal(); m('#bTut').onclick = () => tutorialModal(0); m('#bCodex').onclick = () => codexModal(); m('#bSug').onclick = suggestModal;
  m('#bSwitch').onclick = () => switchCharacter();
  m('#bReset').onclick = () => modal(`<h3>Xóa nhân vật?</h3><p class="desc">Xóa nhân vật ở slot ${SLOT + 1} (${esc(FAC[S.fac] ? FAC[S.fac].n : '')} cấp ${S.lvl}). Toàn bộ tiến trình của slot này sẽ mất; các slot khác không ảnh hưởng.</p><div class="btnrow"><button class="btn red" id="bYes">Xóa</button></div>`, () => $('#bYes').onclick = () => deleteSlot(SLOT));
}

/* ---------- khung chung & cua so noi (Floating Windows) ---------- */

/* Kiem tra xem co dang o che do landscape/desktop (floating window) khong */
function isLandscape() {
  return window.matchMedia('(orientation:landscape)').matches || (window.matchMedia && window.matchMedia('(min-width: 900px)').matches) || document.body.classList.contains('deskland') || (window.innerWidth > window.innerHeight && window.innerWidth >= 600);
}

/* Lay phan tu muc tieu de render: landscape -> float body, portrait -> panel tab */
function tabEl(t) {
  if (t === 'char' || t === 'char-attrib') {
    return isLandscape() ? $('#t-char-attrib-f') : $('#t-char');
  }
  if (isLandscape()) return $('#t-' + t + '-f');
  return $('#t-' + t);
}

/* Keo tha cua so floating (Draggable Windows) */
function makeDraggable(win, handle) {
  if (!win || !handle || win._dragBound) return;
  win._dragBound = true;
  let startX = 0, startY = 0, initLeft = 0, initTop = 0, dragging = false;
  handle.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = win.getBoundingClientRect();
    const parentRect = win.offsetParent ? win.offsetParent.getBoundingClientRect() : { left: 0, top: 0 };
    initLeft = rect.left - parentRect.left;
    initTop = rect.top - parentRect.top;
    win.style.position = 'absolute';
    win.style.left = `${initLeft}px`;
    win.style.top = `${initTop}px`;
    win.style.bottom = 'auto';
    handle.setPointerCapture && handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    win.style.left = `${Math.max(0, initLeft + dx)}px`;
    win.style.top = `${Math.max(0, initTop + dy)}px`;
  });
  const stopDrag = () => { dragging = false; };
  handle.addEventListener('pointerup', stopDrag);
  handle.addEventListener('pointercancel', stopDrag);
}

/* Mo / Dong cua so */
function openWin(t) {
  if (t === 'char') t = 'char-attrib';
  if (!isLandscape()) {
    showTab(t === 'char-attrib' ? 'char' : t);
    return;
  }
  const fw = $('#fw-' + t);
  if (!fw) return;
  fw.classList.remove('hidden');
  const handle = fw.querySelector('.jx-float-header');
  if (handle) makeDraggable(fw, handle);

  if (t === 'char-attrib') renderCharAttrib();
  else if (t === 'inv') renderInv();
  else if (t === 'skill') renderSkill();
  else if (t === 'party' && typeof renderPartyWin === 'function') renderPartyWin();
  else if (t === 'datau' && typeof DATAU !== 'undefined') DATAU.open();
  else if (t === 'log') renderLog();
  else if (t === 'auto' && typeof renderAutoWin === 'function') renderAutoWin();
  else if (t === 'more') renderMore();
  updateDots();
}

function closeWin(t) {
  if (t === 'char') t = 'char-attrib';
  const fw = $('#fw-' + t);
  if (fw) fw.classList.add('hidden');
}

function toggleWin(t) {
  if (t === 'char') t = 'char-attrib';
  if (!isLandscape()) {
    showTab(t === 'char-attrib' ? 'char' : t);
    return;
  }
  const fw = $('#fw-' + t);
  if (!fw) return;
  if (fw.classList.contains('hidden')) {
    openWin(t);
  } else {
    closeWin(t);
  }
}

function closeAllWindows() {
  document.querySelectorAll('.jx-float-win').forEach(w => w.classList.add('hidden'));
}

/* Gan nut dong X trong floating header va nut mo tren action bar */
function bindFloatClose() {
  document.querySelectorAll('.jx-close-btn[data-close]').forEach(btn => {
    btn.onclick = () => {
      closeWin(btn.dataset.close);
    };
  });
  document.querySelectorAll('[data-open-win]').forEach(btn => {
    btn.onclick = () => {
      toggleWin(btn.dataset.openWin);
    };
  });
}

function showTab(t) {
  curTab = t;
  if (isLandscape()) {
    toggleWin(t === 'char' ? 'char-attrib' : t);
  } else {
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
    document.querySelectorAll('.tab').forEach(el => el.classList.toggle('hidden', el.id !== 't-' + t));
    refresh();
  }
}

function refresh() {
  if (!S || !S.fac) return;
  if (R.dirty) recalc();
  if (isLandscape()) {
    if (!$('#fw-char-attrib').classList.contains('hidden')) renderCharAttrib();
    if (!$('#fw-inv').classList.contains('hidden')) renderInv();
    if (!$('#fw-skill').classList.contains('hidden')) renderSkill();
    if (!$('#fw-log').classList.contains('hidden')) renderLog();
    if (!$('#fw-auto').classList.contains('hidden') && typeof renderAutoWin === 'function') renderAutoWin();
    if ($('#fw-party') && !$('#fw-party').classList.contains('hidden') && typeof renderPartyWin === 'function') renderPartyWin();
    if (!$('#fw-more').classList.contains('hidden')) renderMore();
  } else {
    if (curTab === 'char') renderCharAttrib();
    else if (curTab === 'inv') renderInv();
    else if (curTab === 'skill') renderSkill();
    else if (curTab === 'party' && typeof renderPartyWin === 'function') renderPartyWin();
    else if (curTab === 'log') renderLog();
    else if (curTab === 'auto' && typeof renderAutoWin === 'function') renderAutoWin();
    else if (curTab === 'more') renderMore();
  }
  renderPad();
  updateDots();
}

function updateDots() {
  if (!S || !S.fac) return;
  const dc = $('#dotChar'); if (dc) dc.classList.toggle('on', S.attrPts > 0);
  const ds = $('#dotSkill'); if (ds) ds.classList.toggle('on', S.skPts > 0 && FAC[S.fac] && FAC[S.fac].skills.some(id => canLearn(SK[id])));
}

function updatePkModeBtn() {
  const pkMode = (typeof S !== 'undefined' && S && S.pkMode) || 'peace';
  const btnPk = $('#btnPkMode');
  if (btnPk) {
    btnPk.className = `pk-mode-btn ${pkMode}`;
    if (pkMode === 'peace') {
      btnPk.innerHTML = '🛡️ Luyện công';
      btnPk.title = '[Phím F9] Chế độ Luyện Công: Chỉ đánh quái, không đánh người';
    } else if (pkMode === 'pk') {
      btnPk.innerHTML = '⚔️ PK (F9)';
      btnPk.title = '[Phím F9] Chế độ PK: Tuyên chiến, đánh người cùng bật PK';
    } else if (pkMode === 'slaughter') {
      btnPk.innerHTML = '🩸 Đồ sát';
      btnPk.title = '[Phím F9] Chế độ Đồ Sát: Máu hồng, có thể tấn công bất kỳ ai!';
    }
  }
  const pkChip = $('#pkChipBtn');
  if (pkChip) {
    if (pkMode === 'peace') {
      pkChip.style.color = '#4ade80';
      pkChip.innerHTML = '🛡️ Luyện công';
    } else if (pkMode === 'pk') {
      pkChip.style.color = '#fbbf24';
      pkChip.innerHTML = '⚔️ PK (F9)';
    } else if (pkMode === 'slaughter') {
      pkChip.style.color = '#f472b6';
      pkChip.innerHTML = '🩸 Đồ sát';
    }
  }
  const hpB = $('#hpBar');
  if (hpB) {
    if (pkMode === 'slaughter') {
      hpB.style.background = 'linear-gradient(180deg, #f472b6 0%, #ec4899 50%, #be185d 100%)';
    } else {
      hpB.style.background = '';
    }
  }
}
window.updatePkModeBtn = updatePkModeBtn;

function updateTop() {
  if (!S || !S.fac) return;
  const P = R.P; if (!P) return;

  // Clock
  const clockEl = $('#topClock');
  if (clockEl) {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    clockEl.textContent = `${mm}-${dd} ${hh}:${min}`;
  }

  // Level & Avatar
  const hw = W.hero[S.fac], lb = $('.lvbox');
  if (hw && lb) lb.style.setProperty('--pl', `url('${hw.img}')`);
  const lvEl = $('#lv'); if (lvEl) lvEl.textContent = S.lvl;
  const goldEl = $('#gold'); if (goldEl) goldEl.textContent = fmt(S.gold);
  const nameEl = $('#heroName'); if (nameEl) nameEl.textContent = FAC[S.fac] ? FAC[S.fac].n : '';
  const stageEl = $('#stageLbl');
  if (stageEl) {
    if (S.push) {
      stageEl.innerHTML = `<span style="color:#ffd700;font-weight:bold;">Ải ${S.stage}</span> · đợt ${S.wave}/${WAVES}`;
    } else {
      stageEl.innerHTML = `<span style="color:#60a5fa;font-weight:bold;">Ải ${S.stage}</span> <span style="font-size:10px;color:#94a3b8;">(Luyện công)</span>`;
    }
  }

  const btnPushMode = $('#btnPushMode');
  if (btnPushMode) {
    btnPushMode.className = `push-mode-btn ${S.push ? 'push-on' : 'farm-on'}`;
    btnPushMode.innerHTML = S.push ? `⚔ VƯỢT ẢI (${S.wave}/${WAVES})` : `🛡 LUYỆN CÔNG`;
    btnPushMode.title = S.push ? 'Đang ở chế độ Vượt Ải. Bấm để chuyển sang Luyện Công.' : 'Đang ở chế độ Luyện Công. Bấm để bắt đầu Vượt Ải.';
  }

  const bPushTab = $('#bPush');
  if (bPushTab) {
    bPushTab.className = `jx-action-btn ${S.push ? 'gold' : ''}`;
    bPushTab.textContent = S.push ? '⚔ Vượt ải' : '🛡 Luyện công';
  }

  // Bars
  const need = J.exp[S.lvl - 1] || 1;
  const xpPct = clamp((S.xp / need) * 100, 0, 100);
  const xpB = $('#xpBar'); if (xpB) xpB.style.width = xpPct + '%';
  const xpT = $('#xpTxt'); if (xpT) xpT.textContent = `${xpPct.toFixed(1)}%`;

  const hpPct = clamp((R.life / P.life) * 100, 0, 100);
  const hpB = $('#hpBar');
  if (hpB) {
    hpB.style.width = hpPct + '%';
    if (S && S.pkMode === 'slaughter') {
      hpB.style.background = 'linear-gradient(180deg, #f472b6 0%, #ec4899 50%, #be185d 100%)';
    } else {
      hpB.style.background = '';
    }
  }
  const hpT = $('#hpTxt'); if (hpT) hpT.textContent = `${Math.round(R.life)} / ${Math.round(P.life)}`;

  updatePkModeBtn();

  const mpPct = clamp((R.mana / P.mana) * 100, 0, 100);
  const mpB = $('#mpBar'); if (mpB) mpB.style.width = mpPct + '%';
  const mpT = $('#mpTxt'); if (mpT) mpT.textContent = `${Math.round(R.mana)} / ${Math.round(P.mana)}`;

  const spB = $('#spBar'); if (spB) spB.style.width = '100%';
  const spT = $('#spTxt'); if (spT) spT.textContent = '100 / 100';

  // Map banner coords
  const coordsEl = $('#hudCoords');
  if (coordsEl) {
    const cx = Math.round(typeof H !== 'undefined' ? H.x / 4 : 198);
    const cy = Math.round(typeof H !== 'undefined' ? H.y / 4 : 121);
    coordsEl.textContent = `${cx}/${cy}`;
  }
  const zoneEl = $('#hudZoneName');
  if (zoneEl) {
    const curZ = R.town ? W.town : zoneOf(Math.min(S.stage, STAGES));
    zoneEl.textContent = curZ ? curZ.n : 'Hoa Sơn';
  }

  const mainSkEl = $('#mainSk'); if (mainSkEl) mainSkEl.textContent = P.main ? P.main.n : '';

  const rankEl = $('#hudRankTag');
  if (rankEl) {
    const myRank = (typeof getPlayerRank === 'function') ? getPlayerRank('level') : 1;
    rankEl.textContent = `Hạng #${myRank} Giang Hồ`;
    rankEl.title = `Nhấp xem Bảng Xếp Hạng Giang Hồ (Hiện tại: Hạng #${myRank})`;
  }
}
/* Nap tu file .jxsave (hoac ma van ban): chon slot dich, canh bao ghi de, roi tai lai trang */
function pickSaveFile(after) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.jxsave,.json,.txt,application/json,text/plain'; inp.style.display = 'none';
  inp.onchange = () => { const f = inp.files && inp.files[0]; inp.remove(); if (!f) return; const r = new FileReader(); r.onload = () => importFlow(String(r.result), after); r.onerror = () => toast('Không đọc được file'); r.readAsText(f); };
  document.body.appendChild(inp); inp.click();
}
function importFlow(txt, after, slot) {
  let st; try { st = parseSaveText(txt); } catch (e) { toast(e.message || 'File không hợp lệ'); return; }
  const f = FAC[st.fac], desc = `${esc(f.n)} cấp ${Math.max(1, Math.min(MAX_LEVEL, st.lvl | 0))}`;
  const rows = [...Array(SLOT_N).keys()].map(i => { const o = slotInfo(i), g = o && FAC[o.fac];
    return `<div class="slotrow ${o ? '' : 'empty'}"><span><b>Slot ${i + 1}</b><small>${o && g ? esc(g.n) + ' cấp ' + o.lvl + ' (sẽ bị ghi đè)' : 'Trống'}</small></span><button class="btn ${o ? 'red' : ''}" data-into="${i}">${o ? 'Ghi đè' : 'Nạp vào'}</button></div>`; }).join('');
  modal(`<h3>Nạp file lưu</h3><p class="desc">Nhân vật trong file: <b>${desc}</b>. Chọn slot để nạp (slot đã có nhân vật sẽ giữ một bản sao lưu).</p><div class="slotlist">${rows}</div>${after ? '<div class="btnrow"><button class="btn" id="impBack">Quay lại</button></div>' : ''}`, () => {
    document.querySelectorAll('#mBody [data-into]').forEach(b => b.onclick = () => { try { if (SLOT === +b.dataset.into) SAVE_LOCK = true; writeSlot(+b.dataset.into, st); } catch (e) { toast(e.message); return; } location.reload(); });
    const bk = $('#impBack'); if (bk) bk.onclick = after;
  }, !!after && !S.fac);
}
/* Man hinh chon nhan vat: 3 slot. Chon / tao -> dat con tro roi tai lai trang; xoa co buoc xac nhan rieng */
function slotMenu(confirmDel) {
  const rows = [...Array(SLOT_N).keys()].map(i => {
    const o = slotInfo(i), f = o && FAC[o.fac];
    if (!o || !f) return `<div class="slotrow empty"><span><b>Slot ${i + 1}</b><small>Trống</small></span><button class="btn" data-play="${i}">Tạo nhân vật</button></div>`;
    const ago = o.last ? new Date(o.last).toLocaleString('vi-VN') : '';
    if (confirmDel === i) return `<div class="slotrow del"><span><b>Xóa slot ${i + 1}?</b><small>${esc(f.n)} cấp ${o.lvl} sẽ mất vĩnh viễn</small></span><button class="btn red" data-del-yes="${i}">Xóa</button><button class="btn" data-del-no="1">Hủy</button></div>`;
    return `<div class="slotrow"><img src="${esc((W.hero[o.fac] || {}).img || '')}" alt=""><span><b style="color:${SERIES_COL[f.series]}">${esc(f.n)}</b><small>Cấp ${o.lvl} · ải ${o.stage}${ago ? ' · ' + esc(ago) : ''}</small></span><button class="btn" data-play="${i}">Chơi</button><button class="btn red" data-del="${i}">Xóa</button></div>`;
  }).join('');
  modal(`<h3>Chọn nhân vật</h3><p class="desc">Mỗi slot là một nhân vật riêng, lưu độc lập.</p><div class="slotlist">${rows}</div><div class="btnrow"><button class="btn" id="slotImp">Nạp từ file lưu (.jxsave)</button></div>`, () => {
    $('#slotImp').onclick = () => pickSaveFile(() => slotMenu());
    document.querySelectorAll('#mBody [data-play]').forEach(b => b.onclick = () => { try { localStorage.setItem(SLOT_PTR, b.dataset.play); } catch (e) { /* bo qua */ } SAVE_LOCK = true; location.reload(); });
    document.querySelectorAll('#mBody [data-del]').forEach(b => b.onclick = () => slotMenu(+b.dataset.del));
    document.querySelectorAll('#mBody [data-del-no]').forEach(b => b.onclick = () => slotMenu());
    document.querySelectorAll('#mBody [data-del-yes]').forEach(b => b.onclick = () => deleteSlot(+b.dataset.delYes));
  }, true);
}
function pickFaction() {
  const cards = FACTIONS.map(f => `<button data-f="${f.key}" style="--c:${SERIES_COL[f.series]}"><img src="${(W.hero[f.key] || {}).img || ''}" alt=""><b>${esc(f.n)}</b><small>hệ ${SERIES[f.series]}</small><i class="s5b" style="background-image:url('ui/s${f.series}.png')"></i></button>`).join('');
  modal(`<h3>Chọn môn phái</h3><p class="desc">Mỗi phái thuộc một hệ ngũ hành. Kim khắc Mộc, Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim.</p><div class="facpick">${cards}</div>`, () => {
    document.querySelectorAll('.facpick button').forEach(b => b.onclick = () => startFaction(b.dataset.f));
  }, true);
}
const NOTICE_TXT = 'JxOffline - Phi thương mại, ưu tiên giải trí trên chính thiết bị của mình';
/* Hien moi lan khoi tao nhan vat moi */
function noticeModal() {
  modal(`<h3>JxOffline</h3><p class="desc notice">${esc(NOTICE_TXT)}</p><div class="btnrow"><button class="btn" id="bNotice">Đã hiểu</button></div>`, () => { $('#bNotice').onclick = () => { closeModal(true); if (!S.tut) tutorialModal(0); }; });
  log(`<span class="dim">${esc(NOTICE_TXT)}</span>`);
}
function startFaction(key) {
  const f = FAC[key]; S.fac = key; S.sex = ['emei', 'cuiyan'].includes(key) ? 1 : 0; S.name = f.n;
  S.sk = S.sk || {}; S.main = 0; S.slots = [0, 0, 0, 0];
  R.dirty = true; recalc(); R.life = R.P.life; R.mana = R.P.mana;
  loginCheck(); dotGift();                                  // ngay dau: co qua diem danh
  closeModal(true); save(); showTab('log');
  noticeModal();
  log(`Gia nhập <b style="color:${SERIES_COL[f.series]}">${esc(f.n)}</b>. Bắt đầu hành tẩu giang hồ!`);
}
function starterGear() {
  if (S.eq.weapon) return;
  const f = FAC[S.fac];
  const wc = f.wcode >= 0 ? f.wcode : 0;
  const it = wc === 7 ? makeItem(1, 0, 1, 0) : makeItem(0, wc === 9 ? 6 : wc, 1, 0);
  if (it) S.eq.weapon = it;
  const ar = makeItem(2, sexPart(2, 0), 1, 0); if (ar && sexOk(ar)) S.eq.armor = ar;
}

/* =================== BẢN ĐỒ & XA PHU DỊCH CHUYỂN =================== */
const JX_TOWNS = (typeof TOWN_NPC !== 'undefined' && TOWN_NPC.TOWNS_CONFIG) ? TOWN_NPC.TOWNS_CONFIG : [
  // 7 ĐẠI THÀNH THỊ
  { id: 37, type: 'city', n: 'Biện Kinh', sub: 'Kinh đô phồn hoa phương Bắc (Bắc Tống)', desc: 'Trung tâm quyền lực và giao thương tấp nập nhất thiên hạ.' },
  { id: 78, type: 'city', n: 'Tương Dương', sub: 'Chiến địa huyết lệ trung nguyên', desc: 'Pháo đài tiền tuyến bất khả xâm phạm, ngã ba sông Hán.' },
  { id: 176, type: 'city', n: 'Lâm An', sub: 'Kinh đô hoa lệ nam triều (Nam Tống)', desc: 'Cảnh sắc Tây Hồ thơ mộng, lâu đài cung điện nguy nga tráng lệ.' },
  { id: 11, type: 'city', n: 'Thành Đô', sub: 'Thục trung danh thắng phì nhiêu', desc: 'Đất Thục trù phú, sản vật ngàn năm, cửa ngõ Nga My và Đường Môn.' },
  { id: 162, type: 'city', n: 'Đại Lý', sub: 'Nam Chiếu vương quốc ngát hương', desc: 'Thành trì thanh bình nơi biên thùy phía Nam, phong hoa tuyết nguyệt.' },
  { id: 1, type: 'city', n: 'Phượng Tường', sub: 'Tây Bắc biên ải quan môn', desc: 'Hào khí biên cương lộng gió, ngút ngàn non sông đất trời Tây Bắc.' },
  { id: 80, type: 'city', n: 'Dương Châu', sub: 'Giang Nam đệ nhất thắng cảnh', desc: 'Sông nước hữu tình, bến thuyền tấp nập ngày đêm, đô hội phồn vinh.' },
  // 10 ĐẠI THÔN TRẤN
  { id: 53, type: 'village', n: 'Ba Lăng Huyện', sub: 'Hồ Nam cổ trấn khởi đầu giang hồ', desc: 'Thôn trấn yên bình ngàn năm, nơi xuất thân của biết bao bậc hào kiệt.' },
  { id: 20, type: 'village', n: 'Giang Tân Thôn', sub: 'Làng chài ven sông Ba Thục', desc: 'Bến nước êm đềm, tiếng chèo khua sóng nước đón chào lữ khách.' },
  { id: 99, type: 'village', n: 'Vĩnh Lạc Trấn', sub: 'Giang Nam thôn trấn thái bình', desc: 'Khói lam chiều bảng lảng, đất đai trù phú, người dân hiền hòa.' },
  { id: 100, type: 'village', n: 'Chu Tiên Trấn', sub: 'Hà Nam danh trấn trù phú', desc: 'Địa linh nhân kiệt, nổi tiếng nghề gốm sứ và chợ phiên đông đúc.' },
  { id: 101, type: 'village', n: 'Đạo Hương Thôn', sub: 'Thôn quê hương lúa ngạt ngào', desc: 'Những cánh đồng lúa vàng óng ả trải dài tít tắp, thanh bình tĩnh lặng.' },
  { id: 121, type: 'village', n: 'Long Môn Trấn', sub: 'Cửa ải sa mạc Tây Bắc', desc: 'Nơi giáp ranh quan ải và sa mạc cát vàng, hào khí ngất trời.' },
  { id: 153, type: 'village', n: 'Thạch Cổ Trấn', sub: 'Thôn trấn chân núi thanh tịnh', desc: 'Vách đá ngàn năm dựng đứng che chở cho cuộc sống êm đềm của thôn dân.' },
  { id: 174, type: 'village', n: 'Long Tuyền Thôn', sub: 'Làng đúc kiếm danh bất hư truyền', desc: 'Suối nước lạnh ngắt chuyên dùng tôi luyện những thanh kiếm bén ngọt.' },
  { id: 175, type: 'village', n: 'Tây Sơn Thôn', sub: 'Sơn thôn mộc mạc hữu tình', desc: 'Thôn xóm ẩn hiện dưới tán rừng thông bạt ngàn, không khí trong lành.' },
  { id: 54, type: 'village', n: 'Nam Nhạc Trấn', sub: 'Hành Sơn chân núi thánh địa', desc: 'Cửa ngõ dẫn lên đỉnh Hành Sơn linh thiêng, hương khói nghi ngút.' }
];

let travelTab = 'city'; // 'city' | 'village' | 'zone'

function openMapTravelModal() {
  const cities = JX_TOWNS.filter(x => x.type === 'city');
  const villages = JX_TOWNS.filter(x => x.type === 'village');

  const renderTownList = (list) => list.map(t => {
    const idx = JX_TOWNS.indexOf(t);
    const isCurrent = R.town && R.currentTown === t.n;
    return `
      <div class="map-card ${isCurrent ? 'current' : ''}">
        <div class="map-card-info">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="map-card-name">${esc(t.n)}</span>
            <span class="map-card-badge town">${t.type === 'city' ? 'Thành Thị' : 'Thôn Trấn'}</span>
            ${isCurrent ? '<span style="color:#4ade80;font-size:10px;font-weight:bold;">[Đang ở đây]</span>' : ''}
          </div>
          <span class="map-card-sub">${esc(t.sub)}</span>
          <small style="font-size:10px;color:#a39276;">${esc(t.desc)}</small>
        </div>
        <div>
          ${isCurrent 
            ? `<button class="jx-action-btn" disabled style="opacity:0.6;">Tại Chỗ</button>`
            : `<button class="jx-action-btn gold" onclick="travelToTown(${idx})">Dịch Chuyển</button>`}
        </div>
      </div>
    `;
  }).join('');

  const zonesHtml = ZONES.map((z, idx) => {
    const ok = S.lvl >= z.lo;
    const stageStart = idx * ZONE_STAGES + 1;
    return `
      <div class="map-card ${ok ? '' : 'locked'}">
        <div class="map-card-info">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="map-card-name">${esc(z.n)}</span>
            <span class="map-card-badge ${ok ? '' : 'lock'}">Cấp ${z.lo} – ${z.hi}</span>
          </div>
          <span class="map-card-sub">Ải ${stageStart} · Quái cấp ${z.lo}+ · Boss ${MON[z.boss] ? MON[z.boss].n : 'Thủ Lĩnh'}</span>
          <small style="font-size:10px;color:${ok ? '#4ade80' : '#f87171'};">${ok ? '✓ Đủ điều kiện luyện công' : `🔒 Cần đạt cấp ${z.lo} mới được vào`}</small>
        </div>
        <div>
          ${ok 
            ? `<button class="jx-action-btn gold" onclick="travelToZone(${idx})">Đến Ngay</button>` 
            : `<button class="jx-action-btn" disabled style="opacity:0.5;color:#888;">Cần Cấp ${z.lo}</button>`}
        </div>
      </div>
    `;
  }).join('');

  modal(`
    <div class="jx-client-window" style="margin:-14px;border:none;box-shadow:none;">
      <div class="jx-window-header">
        <div class="jx-window-title">
          <span>🗺️ XA PHU VÕ LÂM - THẦN HÀNH PHÙ</span>
        </div>
        <span style="font-size:11px;color:#ffd700;">Đẳng cấp: Lv.${S.lvl} · Vị trí: ${esc(R.currentTown || 'Giang Hồ')}</span>
      </div>
      <div class="dtabs" style="margin:6px 12px 4px 12px;">
        <button id="bTravelTabCity" class="${travelTab === 'city' ? 'on' : ''}">🏯 Thất Đại Thành Thị (7)</button>
        <button id="bTravelTabVillage" class="${travelTab === 'village' ? 'on' : ''}">🏡 Thập Đại Thôn Trấn (10)</button>
        <button id="bTravelTabZone" class="${travelTab === 'zone' ? 'on' : ''}">⚔️ Bản Đồ Luyện Công (16)</button>
      </div>
      <div style="padding:10px 12px;">
        <div class="map-travel-grid">
          ${travelTab === 'city' ? renderTownList(cities) : travelTab === 'village' ? renderTownList(villages) : zonesHtml}
        </div>
      </div>
    </div>
  `, () => {
    const btCity = $('#bTravelTabCity'), btVill = $('#bTravelTabVillage'), btZone = $('#bTravelTabZone');
    if (btCity) btCity.onclick = () => { travelTab = 'city'; openMapTravelModal(); };
    if (btVill) btVill.onclick = () => { travelTab = 'village'; openMapTravelModal(); };
    if (btZone) btZone.onclick = () => { travelTab = 'zone'; openMapTravelModal(); };
  });
}

function travelToTown(idx) {
  const t = JX_TOWNS[idx];
  if (!t) return;
  closeModal();
  if (!R.town) {
    R.town = true;
    R.enemies = []; R.corpses = []; R.pickTarget = null; R.moveTo = null; INPUT.target = null;
  }
  R.currentTown = t.n;
  obsLoad('town');
  [H.x, H.y] = inWorld(WORLD.w / 2, WORLD.h / 2);
  snapCamera();
  R.bgImg = img(t.bg || 'img/z/town.jpg');
  uiSfx('use');
  playMusic(t.id || W.town.id);
  $('#townName').textContent = t.n;
  $('#townBar').classList.remove('hidden');
  R.banner = { t: 2.5, text: t.n, sub: `Khu vực an toàn · ${t.type === 'city' ? 'Đại Thành Thị' : 'Tân Thủ Thôn'}` };
  if (typeof TOWN_NPC !== 'undefined' && TOWN_NPC.onTownEntered) {
    TOWN_NPC.onTownEntered(t);
  }
  log(`Xa Phu đưa bạn đến <b>${esc(t.n)}</b> (${t.type === 'city' ? 'Đại Thành Thị' : 'Thôn Trấn'}).`);
  toast(`Đã đến ${t.n}!`);
}

function travelToZone(idx) {
  const z = ZONES[idx];
  if (!z) return;
  if (S.lvl < z.lo) {
    toast(`Chưa đủ đẳng cấp! Cần đạt cấp ${z.lo} trở lên để đến ${z.n}.`);
    return;
  }
  closeModal();
  if (R.town) {
    R.town = false;
    $('#townBar').classList.add('hidden');
  }
  const targetStage = idx * ZONE_STAGES + 1;
  S.chosenZone = z.id;
  S.chosenStage = targetStage;
  S.maxStage = Math.max(S.maxStage || 1, targetStage);
  S.stage = targetStage;
  S.wave = 1;
  S.push = false;
  R.enemies = [];
  R.spawnT = 0.3;
  obsLoad(z.id);
  [H.x, H.y] = inWorld(WORLD.w / 2, WORLD.h / 2);
  snapCamera();
  onZoneChange(z);
  R.tpCd = TP_CD;
  R.banner = { t: 2.5, text: z.n, sub: `Bản đồ luyện công (Cấp ${z.lo} - ${z.hi})` };
  log(`Dịch chuyển đến bản đồ luyện công <b>${esc(z.n)}</b> (Cấp ${z.lo}-${z.hi}).`);
  toast(`Đã dịch chuyển đến ${z.n}!`);
  refresh();
}

/* =================== CƯỠI NGỰA (MOUNT RIDING) =================== */
function toggleMountRide() {
  if (typeof pvkEnsureMount === 'function') pvkEnsureMount();
  S.mounted = !S.mounted;
  if (S.mounted) {
    const m = typeof mountCurrent === 'function' ? mountCurrent() : null;
    toast(`🏇 Đã lên ngựa [${m ? m.n : 'Chiến Mã'}]! Tốc độ di chuyển gia tăng!`);
    uiSfx('use');
  } else {
    toast('Đã xuống ngựa!');
  }
  recalc();
  if (typeof sendMove === 'function') sendMove(0);
}

/* =================== CHATBOX & ACTION BAR CONTROLS =================== */
let currentChatChan = 'world'; // 'world' hoac 'trade'

function appendChatLine(chan, sender, text) {
  const logEl = $('#jxChatLog');
  if (!logEl) return;
  const line = document.createElement('div');
  line.className = `chat-line ${chan}`;
  const chanNames = {
    sys: 'Hệ thống',
    world: 'Thế giới',
    trade: 'Rao bán',
    fac: 'Môn phái',
    team: 'Đội ngũ',
    whisper: 'Mật',
    near: 'Lân cận'
  };
  const chanName = chanNames[chan] || 'Thế giới';
  line.innerHTML = `<span class="c-tag ${chan}">[${chanName}]</span> ${sender ? `<b style="color:#ffd700;">${esc(sender)}:</b> ` : ''}${text}`;
  
  // Tách biệt kênh nghiêm ngặt: kiểm tra tab đang được chọn (kênh Mật luôn hiển thị)
  const activeTab = document.querySelector('.jx-ctab.on');
  const activeChan = activeTab ? activeTab.dataset.chan : 'all';
  if (activeChan !== 'all' && activeChan !== chan && chan !== 'whisper') {
    line.style.display = 'none';
  }

  logEl.appendChild(line);
  if (logEl.children.length > 100) logEl.removeChild(logEl.firstChild);
  if (line.style.display !== 'none') {
    logEl.scrollTop = logEl.scrollHeight;
  }
}

function initChatbox() {
  const input = $('#chatInlineInput');
  const sendBtn = $('#chatInlineSend');
  const tabs = document.querySelectorAll('.jx-ctab');
  const chanLbl = $('#chatChanLbl');

  if (chanLbl) {
    chanLbl.style.cursor = 'pointer';
    chanLbl.onclick = () => {
      currentChatChan = currentChatChan === 'world' ? 'trade' : 'world';
      chanLbl.textContent = currentChatChan === 'world' ? 'Thế giới' : 'Rao bán';
      chanLbl.style.color = currentChatChan === 'world' ? '#38bdf8' : '#fb923c';
      chanLbl.style.borderColor = currentChatChan === 'world' ? '#0284c7' : '#ea580c';
      toast(`Đã chuyển kênh chat sang: [${currentChatChan === 'world' ? 'Thế giới' : 'Rao bán'}]`);
    };
  }

  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t => t.classList.remove('on'));
      tab.classList.add('on');
      const chan = tab.dataset.chan;
      const logEl = $('#jxChatLog');
      if (!logEl) return;
      logEl.querySelectorAll('.chat-line').forEach(line => {
        if (chan === 'all') {
          line.style.display = '';
        } else {
          line.style.display = line.classList.contains(chan) ? '' : 'none';
        }
      });
      logEl.scrollTop = logEl.scrollHeight;
    };
  });

  const send = () => {
    if (!input) return;
    const txt = input.value.trim();
    if (!txt) return;
    input.value = '';
    const isTrade = currentChatChan === 'trade' || txt.startsWith('/rao ') || txt.startsWith('/trade ');
    const cleanTxt = txt.replace(/^(\/rao|\/trade)\s+/i, '');
    const chan = isTrade ? 'trade' : 'world';
    if (typeof sendMultiplayerChat === 'function') {
      sendMultiplayerChat(cleanTxt, chan);
    }
  };

  if (sendBtn) sendBtn.onclick = send;
  if (input) {
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        send();
      }
    };
  }
}

function initActionBar() {
  const qHp = $('#qbHp'), qMp = $('#qbMp'), qTp = $('#qbTp'), qMount = $('#qbMount');
  if (qHp) qHp.onclick = () => { if (typeof drinkNow === 'function') drinkNow('life'); };
  if (qMp) qMp.onclick = () => { if (typeof drinkNow === 'function') drinkNow('mana'); };
  if (qTp) qTp.onclick = () => { if (typeof openMapTravelModal === 'function') openMapTravelModal(); };
  if (qMount) qMount.onclick = () => {
    toggleMountRide();
  };

  const mapCell = $('#jxHudMapCell');
  if (mapCell) {
    mapCell.onclick = () => openMapTravelModal();
  }

  const autoBtn = $('#btnAutoToggle');
  if (autoBtn) {
    autoBtn.onclick = () => {
      if (typeof setCtrl === 'function' && typeof manual === 'function') {
        setCtrl(manual() ? 'auto' : 'manual');
        autoBtn.classList.toggle('on', !manual());
      }
    };
  }
}

/* =========================================================================
   BẢNG XẾP HẠNG GIANG HỒ VÕ LÂM 1 (ĐẲNG CẤP, PHÚ HỘ, MÔN PHÁI, TỐNG KIM, ÁC NHÂN)
   ========================================================================= */
const RANK_LEGENDS = [
  { name: 'Trương Tam Phong', fac: 'vd', lvl: 85, gold: 12000000, kills: 14500, pk: 0, tk: 43500 },
  { name: 'Phong Thanh Dương', fac: 'cl', lvl: 84, gold: 9800000, kills: 13200, pk: 0, tk: 39600 },
  { name: 'Dương Quá', fac: 'cl', lvl: 82, gold: 8900000, kills: 12400, pk: 3, tk: 37200 },
  { name: 'Quách Tĩnh', fac: 'cb', lvl: 81, gold: 11000000, kills: 12000, pk: 0, tk: 36000 },
  { name: 'Lệnh Hồ Xung', fac: 'vd', lvl: 80, gold: 7500000, kills: 11000, pk: 2, tk: 33000 },
  { name: 'Hà Thiết Thủ', fac: '5d', lvl: 79, gold: 8200000, kills: 10500, pk: 8, tk: 31500 },
  { name: 'Nhậm Ngã Hành', fac: 'tn', lvl: 79, gold: 7100000, kills: 10100, pk: 15, tk: 30300 },
  { name: 'Cừu Thiên Nhận', fac: 'tn', lvl: 78, gold: 6900000, kills: 9800, pk: 12, tk: 29400 },
  { name: 'Hoàng Dung', fac: 'ty', lvl: 77, gold: 10500000, kills: 8900, pk: 0, tk: 26700 },
  { name: 'Cổ Mộ Thu Cúc', fac: 'ty', lvl: 76, gold: 5400000, kills: 8400, pk: 0, tk: 25200 },
  { name: 'Điền Bá Quang', fac: 'dm', lvl: 75, gold: 4800000, kills: 7900, pk: 25, tk: 23700 },
  { name: 'Tạ Tốn', fac: 'tv', lvl: 74, gold: 5100000, kills: 8100, pk: 18, tk: 24300 },
  { name: 'Hư Trúc', fac: 'tl', lvl: 73, gold: 6400000, kills: 7100, pk: 0, tk: 21300 },
  { name: 'Chu Bá Thông', fac: 'cb', lvl: 73, gold: 3900000, kills: 7200, pk: 1, tk: 21600 },
  { name: 'Đoàn Dự', fac: 'tl', lvl: 72, gold: 9200000, kills: 6800, pk: 0, tk: 20400 }
];

function getLeaderboardList() {
  const myName = (typeof ACC !== 'undefined' && ACC.user && (ACC.user.heroName || ACC.user.username)) || (typeof S !== 'undefined' && (S.heroName || S.name)) || 'Võ Lâm Hiệp Khách';
  const myFac = (typeof S !== 'undefined' && S.fac) || 'tl';
  const myLvl = (typeof S !== 'undefined' && S.lvl) || 1;
  const myGold = (typeof S !== 'undefined' && S.gold) || 0;
  const myKills = (typeof S !== 'undefined' && S.totalKills) || 0;
  const myPk = (typeof S !== 'undefined' && S.pk) || 0;
  const myTk = (typeof S !== 'undefined' && (S.tkPoints || (S.totalKills || 0) * 3)) || 0;

  const me = {
    isMe: true,
    name: myName,
    fac: myFac,
    lvl: myLvl,
    gold: myGold,
    kills: myKills,
    pk: myPk,
    tk: myTk
  };

  const list = [me];
  for (const leg of RANK_LEGENDS) {
    list.push({ ...leg });
  }

  // Live bot & player sync from MP.otherPlayers
  if (typeof MP !== 'undefined' && MP.otherPlayers) {
    for (const id in MP.otherPlayers) {
      const p = MP.otherPlayers[id];
      if (!p || !p.name) continue;
      const exist = list.find(x => x.name === p.name);
      if (exist) {
        if (p.lvl) exist.lvl = Math.max(exist.lvl, p.lvl);
      } else {
        const pLvl = p.lvl || 1;
        list.push({
          name: p.name,
          fac: p.fac || 'tl',
          lvl: pLvl,
          gold: pLvl * 12000,
          kills: pLvl * 25,
          pk: 0,
          tk: pLvl * 80
        });
      }
    }
  }

  return list;
}

function getPlayerRank(cat = 'level') {
  const list = getLeaderboardList();
  if (cat === 'level') {
    list.sort((a, b) => b.lvl - a.lvl || b.gold - a.gold);
  } else if (cat === 'wealth') {
    list.sort((a, b) => b.gold - a.gold || b.lvl - a.lvl);
  } else if (cat === 'tongkim') {
    list.sort((a, b) => b.tk - a.tk || b.lvl - a.lvl);
  } else if (cat === 'pk') {
    list.sort((a, b) => b.pk - a.pk || b.kills - a.kills);
  }
  const idx = list.findIndex(x => x.isMe);
  return idx >= 0 ? idx + 1 : 1;
}

function openRankModal(category = 'level', curFac = 'all') {
  let list = getLeaderboardList();

  if (category === 'faction' && curFac !== 'all') {
    list = list.filter(x => x.fac === curFac || x.isMe);
  }

  // Sort
  if (category === 'level' || category === 'faction') {
    list.sort((a, b) => b.lvl - a.lvl || b.gold - a.gold);
  } else if (category === 'wealth') {
    list.sort((a, b) => b.gold - a.gold || b.lvl - a.lvl);
  } else if (category === 'tongkim') {
    list.sort((a, b) => b.tk - a.tk || b.lvl - a.lvl);
  } else if (category === 'pk') {
    list.sort((a, b) => b.pk - a.pk || b.kills - a.kills);
  }

  const myRank = list.findIndex(x => x.isMe) + 1;

  const facNames = {
    tl: 'Thiếu Lâm', tv: 'Thiên Vương', dm: 'Đường Môn', '5d': 'Ngũ Độc',
    nm: 'Nga My', ty: 'Thúy Yên', cb: 'Cái Bang', tn: 'Thiên Nhẫn',
    vd: 'Võ Đang', cl: 'Côn Lôn'
  };

  const facBtns = Object.keys(facNames).map(k => {
    const on = curFac === k ? 'style="border-color:#ffd700;color:#ffd700;background:#2a1f14;"' : '';
    return `<button class="btn sm" ${on} onclick="openRankModal('faction','${k}')">${facNames[k]}</button>`;
  }).join(' ');

  const rows = list.slice(0, 20).map((item, idx) => {
    const rankNum = idx + 1;
    const medal = rankNum === 1 ? '🥇' : rankNum === 2 ? '🥈' : rankNum === 3 ? '🥉' : `#${rankNum}`;
    const medalColor = rankNum === 1 ? '#ffd700' : rankNum === 2 ? '#e2e8f0' : rankNum === 3 ? '#f97316' : '#94a3b8';
    const isMe = item.isMe;
    const bgRow = isMe ? 'background:rgba(234,179,8,0.18);border:1px solid #ffd700;font-weight:bold;' : (idx % 2 === 0 ? 'background:rgba(0,0,0,0.3);' : 'background:rgba(255,255,255,0.02);');
    const fName = (typeof FAC !== 'undefined' && FAC[item.fac]) ? FAC[item.fac].n : (facNames[item.fac] || item.fac);

    let valCol = '';
    if (category === 'level' || category === 'faction') {
      valCol = `<span style="color:#ffd700;font-weight:bold;">Cấp ${item.lvl}</span>`;
    } else if (category === 'wealth') {
      valCol = `<span style="color:#fde047;font-weight:bold;">${(typeof fmt === 'function' ? fmt(item.gold) : item.gold)} lượng</span>`;
    } else if (category === 'tongkim') {
      valCol = `<span style="color:#60a5fa;font-weight:bold;">${item.tk.toLocaleString()} điểm</span>`;
    } else if (category === 'pk') {
      valCol = `<span style="color:#ef4444;font-weight:bold;">Trị ác: ${item.pk}</span> <small style="color:#94a3b8">(${item.kills} trảm)</small>`;
    }

    return `
      <div style="display:grid;grid-template-columns:48px 1fr 100px 110px;align-items:center;padding:7px 10px;font-size:12px;border-radius:4px;margin-bottom:3px;${bgRow}">
        <div style="font-weight:bold;color:${medalColor};font-size:13px;">${medal}</div>
        <div style="display:flex;align-items:center;gap:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          <span style="color:${isMe ? '#fef08a' : '#fff'};font-weight:${isMe ? 'bold' : 'normal'};">${item.name}</span>
          ${isMe ? '<span style="font-size:9px;background:#ca8a04;color:#000;font-weight:800;padding:1px 4px;border-radius:3px;">BẠN</span>' : ''}
        </div>
        <div style="color:#cbd5e1;font-size:11px;">${fName}</div>
        <div style="text-align:right;">${valCol}</div>
      </div>
    `;
  }).join('');

  const modalHtml = `
    <div style="max-width:540px;width:100%;">
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #5a4425;padding-bottom:8px;margin-bottom:10px;">
        <h3 style="margin:0;color:#ffd700;font-size:15px;display:flex;align-items:center;gap:6px;">🏆 BẢNG XẾP HẠNG GIANG HỒ</h3>
        <span style="font-size:11px;color:#a3e635;">Vị trí của bạn: <b>Hạng #${myRank}</b></span>
      </div>

      <!-- Tabs -->
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;">
        <button class="btn sm ${category === 'level' ? 'on' : ''}" onclick="openRankModal('level')">🥋 Đẳng Cấp</button>
        <button class="btn sm ${category === 'wealth' ? 'on' : ''}" onclick="openRankModal('wealth')">💰 Phú Hộ</button>
        <button class="btn sm ${category === 'faction' ? 'on' : ''}" onclick="openRankModal('faction', '${curFac === 'all' ? (typeof S !== 'undefined' ? S.fac : 'tl') : curFac}')">⚡ Môn Phái</button>
        <button class="btn sm ${category === 'tongkim' ? 'on' : ''}" onclick="openRankModal('tongkim')">⚔ Tống Kim</button>
        <button class="btn sm ${category === 'pk' ? 'on' : ''}" onclick="openRankModal('pk')">💀 Ác Nhân</button>
      </div>

      ${category === 'faction' ? `
        <div style="display:flex;gap:3px;flex-wrap:wrap;background:rgba(0,0,0,0.4);padding:5px;border-radius:4px;margin-bottom:8px;border:1px solid #3d2a18;">
          ${facBtns}
        </div>
      ` : ''}

      <!-- Header table -->
      <div style="display:grid;grid-template-columns:48px 1fr 100px 110px;padding:4px 10px;font-size:11px;color:#9ca3af;border-bottom:1px solid #3d2a18;margin-bottom:4px;text-transform:uppercase;font-weight:bold;">
        <div>Hạng</div>
        <div>Hiệp Khách</div>
        <div>Môn Phái</div>
        <div style="text-align:right;">${category === 'level' || category === 'faction' ? 'Đẳng Cấp' : category === 'wealth' ? 'Tài Phú' : category === 'tongkim' ? 'Chiến Tích' : 'Ác Danh'}</div>
      </div>

      <!-- List -->
      <div style="max-height:360px;overflow-y:auto;padding-right:3px;">
        ${rows}
      </div>

      <div style="margin-top:10px;text-align:center;">
        <button class="btn sm" onclick="if(typeof modalClose === 'function') modalClose(); else modal();">Đóng</button>
      </div>
    </div>
  `;

  modal(modalHtml);
}
window.openRankModal = openRankModal;
window.getPlayerRank = getPlayerRank;

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      bindFloatClose();
      initChatbox();
      initActionBar();
      setInterval(updateTop, 1000);
      updateTop();
    }, 200);
  });
}

