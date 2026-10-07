/* ======================= VE SAN DAU (canvas) ======================= */
'use strict';
let CV, CX, DPR = 1;
const MON_SCALE = 1.4, HERO_SCALE = 1.35; // bang hoat anh xuat o 0.6 kich thuoc goc
const IMG = {};
function img(src) { if (!src) return null; let i = IMG[src]; if (!i) { i = new Image(); i.src = src; IMG[src] = i; } return i; }
function addText(x, y, t, color, size = 12) { const max = S.lowFx ? 20 : 60; if (R.quiet || R.txt.length > max) return; R.txt.push({ x, y, t, color, size, life: S.lowFx ? 0.6 : 0.9 }); }
function burst(x, y, color) { if (R.quiet) return; R.fx.push({ k: 'ring', x, y, color, life: 0.45, max: 0.45 }); }
function addSparks(x, y, color = '#ffd700', count = 8, spd = 140) {
  if ((typeof S !== 'undefined' && S && S.lowFx) || R.quiet || R.fx.length > 80) return;
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const s = spd * (0.5 + Math.random() * 0.9);
    R.fx.push({
      k: 'spark',
      x, y,
      vx: Math.cos(ang) * s,
      vy: Math.sin(ang) * s,
      color,
      size: 2 + Math.random() * 2.5,
      life: 0.22 + Math.random() * 0.16,
      max: 0.38
    });
  }
}
function fxLine(a, b, atk) {
  if (R.quiet || R.fx.length > 80) return;
  let el = 'phys', v = 0; for (const e in atk.parts) if (atk.parts[e] > v) { v = atk.parts[e]; el = e; }
  R.fx.push({ k: 'line', x1: a.x, y1: a.y - 20, x2: b.x, y2: b.y - 14, color: ELEM_COL[el], life: 0.18, max: 0.18 });
}
/* ---------- hieu ung chieu goc (Missles.txt -> tools/extract_fx.py -> fx.js): dan bay theo huong + no tai muc tieu ----------
   chieu can chien: phat hoat anh tai muc tieu; thieu hinh thi ve tia nhu cu */
const JFX = window.JFX || { m: {}, s: {}, c: {}, f: {} }, FX_SCALE = 1.65, FX_MAX = 90;
const dir16 = (vx, vy) => (((Math.round(Math.atan2(-vx, vy) / (Math.PI / 8)) % 16) + 16) % 16);
/* hieu ung tai cho nguoi ra chieu (PreCastSpr cua skills.txt) */
function castFx(atk, caster) {
  const cst = caster || (typeof H !== 'undefined' ? H : { x: 0, y: 0 });
  const f = atk && atk.id && JFX.f && JFX.f[atk.id], c = f && f.pre && JFX.c && JFX.c[f.pre];
  if (!c || R.quiet || R.fx.length > FX_MAX) return;
  R.fx.push({ k: 'boom', s: c, x: cst.x, y: cst.y - 6, t: 0, life: animDur(c), dir: 0, scale: 1.6 });
}
function getSkillEffectDef(atk) {
  if (!atk) return null;
  const sid = Number(atk.id || 0);
  const s = (typeof SK !== 'undefined' && SK[sid]) || {};
  const f = (JFX.f && JFX.f[sid]) ? { ...JFX.f[sid] } : {};
  let k = f.c || (JFX.s && JFX.s[sid]);
  if (!k && s && s.child) {
    k = (JFX.s && JFX.s[s.child]) || s.child;
  }
  if (!k && JFX.m && JFX.m[sid]) k = sid;

  // Cấu hình hiệu ứng môn phái Hoa Sơn & các chiêu thức thiếu trong fx.js
  if (!k || !(JFX.m && JFX.m[k])) {
    if (sid === 1347) { k = 2; f.form = 1; f.num = 1; }         // Bạch Hồng Quán Nhật (kiếm khí phóng tới)
    else if (sid === 1352) { k = 26; f.form = 1; f.num = 2; }   // Hữu Phượng Lai Nghi (kiếm phi rực sáng)
    else if (sid === 1363) { k = 110; f.form = 2; f.num = 3; }  // Thái Nhạc Tam Thanh Phong (3 luồng kiếm khí)
    else if (sid === 1379) { k = 175; f.form = 1; f.num = 1; }  // Khí Quán Trường Hồng (thần kiếm xuất thế)
    else if (sid === 1368) { k = 173; f.form = 3; f.num = 6; }  // Độc Cô Cửu Kiếm (trận pháp kiếm tỏa tròn)
    else {
      // Fallback theo ngũ hành của chiêu thức
      const ser = atk.series >= 0 ? atk.series : (s.series >= 0 ? s.series : 0);
      if (ser === 0) { k = 216; f.form = 1; }       // Hệ Kim: Kim quang kiếm trảm
      else if (ser === 1) { k = 31; f.form = 1; }   // Hệ Mộc: Độc khí xạ
      else if (ser === 2) { k = 2; f.form = 1; }    // Hệ Thủy: Băng sương phi kiếm
      else if (ser === 3) { k = 45; f.form = 1; }   // Hệ Hỏa: Hỏa cầu bộc phá
      else if (ser === 4) { k = 24; f.form = 1; }   // Hệ Thổ: Lôi điện lôi kích
    }
  }

  const m = JFX.m && JFX.m[k];
  return { f, m, s, k };
}

/* kieu phong dan cua chieu (MisslesForm / ChildSkillNum trong skills.txt, KSkill::CastMissles):
   0 tuong, 1 hang, 2 quat, 3 vong, 4 ngau nhien, 5 vung, 6 tai muc tieu, 7 tai nguoi ra chieu, >= 8 can chien */
function skillFx(a, b, atk) {
  const def = getSkillEffectDef(atk);
  const f = def ? def.f : {};
  const m = def ? def.m : null;
  castFx(atk, a);
  if (!m || R.quiet) { fxLine(a, b, atk); if (typeof burst === 'function') burst(b.x, b.y, '#ffd700'); return; }
  if (R.fx.length > FX_MAX) return;
  const x1 = a.x, y1 = a.y - 20, x2 = b.x, y2 = b.y - 14, dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1;
  const form = f.form === undefined ? 1 : f.form, n = clamp(f.num || 1, 1, 8), ang = Math.atan2(dy, dx);

  let atkEl = 'phys';
  if (atk && atk.parts) {
    let maxV = 0;
    for (const e in atk.parts) if (atk.parts[e] > maxV) { maxV = atk.parts[e]; atkEl = e; }
  }
  const sparkColor = ELEM_COL[atkEl] || '#ffd700';

  const boom = (s, x, y, delay = 0, scale = FX_SCALE, shake = 0, sparks = 0, sparkCol = sparkColor) => {
    if (!s) return;
    R.fx.push({ k: 'boom', s, x, y, t: -delay, life: animDur(s), dir: dir16(dx, dy), scale, shake, sparks, sparkCol });
    if (shake && delay === 0) shakeCamera(shake, 0.16);
    if (sparks && delay === 0) addSparks(x, y, sparkCol, sparks, 150);
  };
  const mis = (s, hit, tx, ty, delay = 0, spd = (m.spd || 350), opts = {}) => {
    if (!s) return;
    const sx = opts.fromX !== undefined ? opts.fromX : x1;
    const sy = opts.fromY !== undefined ? opts.fromY : y1;
    const dist = Math.hypot(tx - sx, ty - sy) || 1;
    const life = Math.min(0.85, dist / spd);
    R.fx.push({
      k: 'mis',
      s,
      hit,
      x1: sx,
      y1: sy,
      x2: tx,
      y2: ty,
      t: -delay,
      life,
      dir: dir16(tx - sx, ty - sy),
      scale: opts.scale || FX_SCALE,
      wave: opts.wave,
      waveFreq: opts.waveFreq,
      wavePhase: opts.wavePhase,
      arc: opts.arc,
      trail: opts.trail !== false,
      shake: opts.shake || 0,
      sparks: opts.sparks || 0,
      sparkCol: opts.sparkCol || sparkColor
    });
  };

  // -------------------------------------------------------------
  // HIỆU ỨNG ĐẶC BIỆT CHI TIẾT TỪNG MÔN PHÁI CHUẨN NGUYÊN TÁC VLTK 1
  // -------------------------------------------------------------
  const sid = atk ? Number(atk.id) : 0;

  // 1. CÁI BANG (Chưởng & Bổng)
  // Phi Long Tại Thiên (sid 357) - 4 con rồng vàng uốn lượn hình sin sóng, nổ rung chuyển màn hình
  if (sid === 357) {
    const dragonSprite = (JFX.m && JFX.m[166] && JFX.m[166].fly);
    const dragonHit = (JFX.m && JFX.m[166] && JFX.m[166].hit) || (JFX.m && JFX.m[45] && JFX.m[45].hit);
    for (let i = 0; i < 4; i++) {
      const g = ang + (i - 1.5) * 0.15;
      const tx = x1 + Math.cos(g) * d, ty = y1 + Math.sin(g) * d;
      mis(dragonSprite, dragonHit, tx, ty, i * 0.05, 460, {
        scale: 1.85,
        wave: 28,
        waveFreq: Math.PI * 3.5,
        wavePhase: (i - 1.5) * 1.5,
        trail: true,
        shake: 5,
        sparks: 8,
        sparkCol: '#f59e0b'
      });
    }
    boom(dragonHit, x2, y2, 0.16, 1.9, 4, 10, '#f97316');
    return;
  }
  // Kháng Long Hữu Hối (sid 128) - 3 con rồng đỏ uốn lượn tỏa quạt
  if (sid === 128) {
    const dFly = (JFX.m && JFX.m[48] && JFX.m[48].fly);
    const dHit = (JFX.m && JFX.m[48] && JFX.m[48].hit) || (JFX.m && JFX.m[45] && JFX.m[45].hit);
    for (let i = 0; i < 3; i++) {
      const g = ang + (i - 1) * 0.22;
      const tx = x1 + Math.cos(g) * d, ty = y1 + Math.sin(g) * d;
      mis(dFly, dHit, tx, ty, i * 0.05, 380, {
        scale: 1.8,
        wave: 22,
        waveFreq: Math.PI * 3,
        wavePhase: (i - 1) * 1.6,
        trail: true,
        shake: 4,
        sparks: 6,
        sparkCol: '#ef4444'
      });
    }
    return;
  }
  // Thiên Hạ Vô Cẩu (sid 359) - Bát phương bổng khí tỏa tròn 360 độ từ thân người chơi
  if (sid === 359) {
    const stickFly = (JFX.m && JFX.m[168] && JFX.m[168].fly);
    const stickHit = (JFX.m && JFX.m[168] && JFX.m[168].hit);
    for (let i = 0; i < 8; i++) {
      const g = (i / 8) * Math.PI * 2;
      const tx = x1 + Math.cos(g) * 160, ty = y1 + Math.sin(g) * 160;
      mis(stickFly, stickHit, tx, ty, i * 0.015, 520, {
        scale: 1.7,
        trail: true,
        shake: 3,
        sparks: 5,
        sparkCol: '#10b981'
      });
    }
    boom(stickHit, x2, y2, 0.1, 1.7, 4, 8, '#34d399');
    return;
  }
  // Bổng Đả Ác Cẩu (sid 125) - 5 bóng bổng quét vòng cung
  if (sid === 125) {
    const stickFly = (JFX.m && JFX.m[47] && JFX.m[47].fly);
    const stickHit = (JFX.m && JFX.m[47] && JFX.m[47].hit);
    for (let i = 0; i < 5; i++) {
      const g = ang + (i - 2) * 0.2;
      const tx = x1 + Math.cos(g) * d, ty = y1 + Math.sin(g) * d;
      mis(stickFly, stickHit, tx, ty, i * 0.03, 500, {
        scale: 1.6,
        trail: true,
        shake: 3,
        sparks: 5,
        sparkCol: '#3b82f6'
      });
    }
    return;
  }
  // Diên Môn Thác Bát (sid 119) & Kiến Nhân Thần Thủ (sid 122)
  if (sid === 119 || sid === 122) {
    const fSprite = (JFX.m && JFX.m[45] && JFX.m[45].fly) || (JFX.m && JFX.m[46] && JFX.m[46].fly);
    const hSprite = (JFX.m && JFX.m[45] && JFX.m[45].hit) || (JFX.m && JFX.m[46] && JFX.m[46].hit);
    mis(fSprite, hSprite, x2, y2, 0, 520, { scale: 1.6, wave: 15, trail: true, shake: 3, sparks: 6, sparkCol: '#f97316' });
    return;
  }

  // 2. VÕ ĐANG (Kiếm & Khí)
  // Thiên Địa Vô Cực (sid 365) - Vòng xoáy Thái Cực Bát Quái trận xoay tròn + 3 đợt lôi kiếm giáng từ trên xuống
  if (sid === 365) {
    const taijiStorm = (JFX.m && JFX.m[173] && JFX.m[173].fly);
    const taijiHit = (JFX.m && JFX.m[110] && JFX.m[110].hit) || (JFX.m && JFX.m[24] && JFX.m[24].hit);
    const swordFly = (JFX.m && JFX.m[175] && JFX.m[175].fly) || (JFX.m && JFX.m[110] && JFX.m[110].fly);
    if (taijiStorm) {
      boom(taijiStorm, x2, y2, 0, 2.0);
      boom(taijiStorm, x2, y2, 0.28, 2.0);
      boom(taijiStorm, x2, y2, 0.56, 2.0);
    }
    mis(swordFly, taijiHit, x2, y2, 0.1, 1050, { fromX: x2, fromY: y2 - 220, scale: 1.7, shake: 4, sparks: 8, sparkCol: '#60a5fa' });
    mis(swordFly, taijiHit, x2 + rnd(-22, 22), y2 + rnd(-16, 16), 0.3, 1050, { fromX: x2 + rnd(-22, 22), fromY: y2 - 220, scale: 1.7, shake: 4, sparks: 8, sparkCol: '#60a5fa' });
    mis(swordFly, taijiHit, x2 + rnd(-22, 22), y2 + rnd(-16, 16), 0.5, 1050, { fromX: x2 + rnd(-22, 22), fromY: y2 - 220, scale: 1.8, shake: 5, sparks: 10, sparkCol: '#93c5fd' });
    return;
  }
  // Nhân Kiếm Hợp Nhất (sid 368) - Thần kiếm phi thấu lôi đình cắm thẳng mục tiêu + cột lôi kiếm
  if (sid === 368) {
    const swordFly = (JFX.m && JFX.m[175] && JFX.m[175].fly) || (JFX.m && JFX.m[110] && JFX.m[110].fly);
    const swordHit = (JFX.m && JFX.m[176] && JFX.m[176].hit) || (JFX.m && JFX.m[110] && JFX.m[110].hit);
    const swordPillar = (JFX.m && JFX.m[176] && JFX.m[176].fly);
    mis(swordFly, swordHit, x2, y2, 0, 780, { scale: 1.75, trail: true, shake: 5, sparks: 8, sparkCol: '#93c5fd' });
    mis(swordFly, swordHit, x2, y2, 0.06, 820, { scale: 1.75, trail: true, shake: 5, sparks: 8, sparkCol: '#93c5fd' });
    if (swordPillar) {
      boom(swordPillar, x2, y2, 0.08, 1.8);
      boom(swordPillar, x2 + rnd(-18, 18), y2 + rnd(-12, 12), 0.18, 1.8);
    }
    return;
  }
  // Vô Ngã Vô Kiếm (sid 165) - 3 tia kiếm khí xanh lam xé gió
  if (sid === 165) {
    const sFly = (JFX.m && JFX.m[29] && JFX.m[29].fly) || (JFX.m && JFX.m[110] && JFX.m[110].fly);
    const sHit = (JFX.m && JFX.m[110] && JFX.m[110].hit);
    for (let i = 0; i < 3; i++) {
      const g = ang + (i - 1) * 0.18;
      const tx = x1 + Math.cos(g) * d, ty = y1 + Math.sin(g) * d;
      mis(sFly, sHit, tx, ty, i * 0.03, 560, { scale: 1.6, trail: true, sparks: 5, sparkCol: '#60a5fa' });
    }
    return;
  }
  // Tam Hoàn Thao Nguyệt (sid 267) & Kiếm Phi Kinh Thiên (sid 158)
  if (sid === 267 || sid === 158) {
    const sFly = (JFX.m && JFX.m[110] && JFX.m[110].fly) || (JFX.m && JFX.m[26] && JFX.m[26].fly);
    const sHit = (JFX.m && JFX.m[110] && JFX.m[110].hit) || (JFX.m && JFX.m[26] && JFX.m[26].hit);
    mis(sFly, sHit, x2, y2, 0, 640, { scale: 1.7, trail: true, shake: 3, sparks: 7, sparkCol: '#60a5fa' });
    mis(sFly, sHit, x2, y2, 0.07, 680, { scale: 1.7, trail: true, shake: 3, sparks: 7, sparkCol: '#60a5fa' });
    return;
  }

  // 3. CÔN LÔN (Đao gió & Lôi kiếm)
  // Lôi Động Cửu Thiên (sid 375) - 3 tia sét giáng thẳng từ cửu thiên (đỉnh trời) xuống đầu mục tiêu
  if (sid === 375) {
    const bolt = (JFX.m && JFX.m[181] && JFX.m[181].fly) || (JFX.m && JFX.m[18] && JFX.m[18].fly);
    const boltHit = (JFX.m && JFX.m[181] && JFX.m[181].hit) || (JFX.m && JFX.m[18] && JFX.m[18].hit);
    for (let i = 0; i < 3; i++) {
      const ox = rnd(-28, 28), oy = rnd(-18, 18);
      const tx = x2 + ox, ty = y2 + oy;
      mis(bolt, boltHit, tx, ty, i * 0.08, 1200, {
        fromX: tx,
        fromY: ty - 260,
        scale: 1.85,
        trail: true,
        shake: 5,
        sparks: 10,
        sparkCol: '#fbbf24'
      });
    }
    return;
  }
  // Ngũ Lôi Chánh Pháp (sid 182) - 3 trụ lôi đình giáng từ trời xuống
  if (sid === 182) {
    const thunder = (JFX.m && JFX.m[18] && JFX.m[18].fly);
    const thunderHit = (JFX.m && JFX.m[18] && JFX.m[18].hit);
    for (let i = 0; i < 3; i++) {
      const ox = rnd(-24, 24), oy = rnd(-16, 16);
      const tx = x2 + ox, ty = y2 + oy;
      mis(thunder, thunderHit, tx, ty, i * 0.07, 1100, {
        fromX: tx,
        fromY: ty - 250,
        scale: 1.8,
        trail: true,
        shake: 4,
        sparks: 8,
        sparkCol: '#fbbf24'
      });
    }
    return;
  }
  // Ngạo Tuyết Tiêu Phong (sid 372) & Cuồng Phong Sậu Điện (sid 176)
  if (sid === 372 || sid === 176) {
    const stormFly = (JFX.m && JFX.m[178] && JFX.m[178].fly) || (JFX.m && JFX.m[16] && JFX.m[16].fly);
    const stormHit = (JFX.m && JFX.m[178] && JFX.m[178].hit) || (JFX.m && JFX.m[16] && JFX.m[16].hit);
    for (let i = 0; i < 3; i++) {
      const g = ang + (i - 1) * 0.15;
      const tx = x1 + Math.cos(g) * d, ty = y1 + Math.sin(g) * d;
      mis(stormFly, stormHit, tx, ty, i * 0.04, 600, { scale: 1.7, trail: true, shake: 3, sparks: 6, sparkCol: '#93c5fd' });
    }
    return;
  }

  // 4. THIÊN NHẪN (Mâu lửa & Ma đạo)
  // Thiên Ngoại Lưu Tinh (sid 362) - Sao băng thiên thạch lao chéo từ trên trời xuống bùng nổ biển lửa
  if (sid === 362) {
    const meteor = (JFX.m && JFX.m[171] && JFX.m[171].fly);
    const meteorHit = (JFX.m && JFX.m[171] && JFX.m[171].hit) || (JFX.m && JFX.m[56] && JFX.m[56].hit);
    const fireSea = (JFX.m && JFX.m[82] && JFX.m[82].fly);
    for (let i = 0; i < 2; i++) {
      const ox = rnd(-24, 24), oy = rnd(-16, 16);
      const tx = x2 + ox, ty = y2 + oy;
      mis(meteor, meteorHit, tx, ty, i * 0.1, 880, {
        fromX: tx - 130,
        fromY: ty - 260,
        scale: 1.85,
        trail: true,
        shake: 6,
        sparks: 12,
        sparkCol: '#f97316'
      });
    }
    if (fireSea) {
      boom(fireSea, x2, y2, 0.18, 1.8);
      boom(fireSea, x2 + rnd(-20, 20), y2 + rnd(-14, 14), 0.28, 1.8);
    }
    return;
  }
  // Vân Long Kích (sid 361) - Rồng lửa đâm xuyên thấu 2 đợt
  if (sid === 361) {
    const fireSpear = (JFX.m && JFX.m[169] && JFX.m[169].fly);
    const fireHit = (JFX.m && JFX.m[169] && JFX.m[169].hit) || (JFX.m && JFX.m[54] && JFX.m[54].hit);
    mis(fireSpear, fireHit, x2, y2, 0, 720, { scale: 1.8, trail: true, shake: 4, sparks: 8, sparkCol: '#ef4444' });
    mis(fireSpear, fireHit, x2, y2, 0.06, 750, { scale: 1.8, trail: true, shake: 4, sparks: 8, sparkCol: '#ef4444' });
    return;
  }
  // Ma Diệm Thất Sát (sid 148) - 5 cột lửa ma đạo bùng cháy dưới chân mục tiêu
  if (sid === 148) {
    const firePillar = (JFX.m && JFX.m[82] && JFX.m[82].fly);
    const firePillarHit = (JFX.m && JFX.m[82] && JFX.m[82].hit);
    for (let i = 0; i < 5; i++) {
      const ox = rnd(-32, 32), oy = rnd(-20, 20);
      boom(firePillar, x2 + ox, y2 + oy, i * 0.05, 1.75, 2, 4, '#f97316');
      if (firePillarHit) boom(firePillarHit, x2 + ox, y2 + oy, i * 0.05 + 0.03, 1.6, 2, 4, '#ef4444');
    }
    return;
  }

  // 5. NGA MY (Kiếm băng & Bão tuyết)
  // Phong Sương Toái Ảnh (sid 380) - Kiếm băng phi vụt + mưa bão tuyết rơi trắng xóa + băng nổ tung tóe
  if (sid === 380) {
    const swordSprite = (JFX.m && JFX.m[142] && JFX.m[142].fly) || (JFX.m && JFX.m[2] && JFX.m[2].fly);
    const hitSprite = (JFX.m && JFX.m[186] && JFX.m[186].hit) || (JFX.m && JFX.m[142] && JFX.m[142].hit);
    const snowStorm = JFX.m && JFX.m[186] && JFX.m[186].fly;
    for (let i = 0; i < 3; i++) {
      const g = ang + (i - 1) * 0.16;
      const tx = x1 + Math.cos(g) * d, ty = y1 + Math.sin(g) * d;
      mis(swordSprite, hitSprite, tx, ty, i * 0.04, 560, { scale: 1.7, trail: true, sparks: 6, sparkCol: '#67e8f9' });
    }
    if (snowStorm) {
      boom(snowStorm, x2, y2, 0.04, 1.85, 3, 8, '#bae6fd');
      boom(snowStorm, x2 + rnd(-24, 24), y2 + rnd(-16, 16), 0.14, 1.85, 3, 8, '#bae6fd');
    }
    boom(hitSprite, x2, y2, 0.1, 1.7, 3, 10, '#38bdf8');
    return;
  }
  // Tam Nga Tề Tuyết (sid 328) - 3 tia băng tuyết song hành
  if (sid === 328) {
    const snowFly = (JFX.m && JFX.m[142] && JFX.m[142].fly);
    const snowHit = (JFX.m && JFX.m[142] && JFX.m[142].hit);
    for (let i = 0; i < 3; i++) {
      const g = ang + (i - 1) * 0.13;
      const tx = x1 + Math.cos(g) * d, ty = y1 + Math.sin(g) * d;
      mis(snowFly, snowHit, tx, ty, i * 0.03, 620, { scale: 1.7, trail: true, sparks: 6, sparkCol: '#67e8f9' });
    }
    return;
  }

  // 6. THÚY YÊN (Đao băng & Băng tinh)
  // Băng Tung Vô Ảnh (sid 336) - 5 sóng đao tuyết xanh bay hình cánh quạt
  if (sid === 336) {
    const iceFly = (JFX.m && JFX.m[146] && JFX.m[146].fly);
    const iceHit = (JFX.m && JFX.m[146] && JFX.m[146].hit);
    for (let i = 0; i < 5; i++) {
      const g = ang + (i - 2) * 0.16;
      const tx = x1 + Math.cos(g) * d, ty = y1 + Math.sin(g) * d;
      mis(iceFly, iceHit, tx, ty, i * 0.025, 620, { scale: 1.75, trail: true, wave: 12, wavePhase: i, sparks: 6, sparkCol: '#67e8f9' });
    }
    return;
  }
  // Băng Tâm Tiên Tử (sid 337) - Quả cầu băng tinh bay tới bung nở hoa sen tuyết
  if (sid === 337) {
    const iceFly = (JFX.m && JFX.m[147] && JFX.m[147].fly);
    const iceHit = (JFX.m && JFX.m[147] && JFX.m[147].hit);
    mis(iceFly, iceHit, x2, y2, 0, 620, { scale: 1.75, trail: true, shake: 3, sparks: 8, sparkCol: '#e0f2fe' });
    boom(iceHit, x2, y2, 0.12, 1.85, 4, 10, '#bae6fd');
    return;
  }

  // 7. THIẾU LÂM (Kim Cang côn & Vô Tướng đao)
  // Vô Tướng Trảm (sid 321) - Đao khí chữ thập vàng kim xé toạc cự ly
  if (sid === 321) {
    const slashFly = (JFX.m && JFX.m[136] && JFX.m[136].fly);
    const slashHit = (JFX.m && JFX.m[136] && JFX.m[136].hit);
    mis(slashFly, slashHit, x2, y2, 0, 720, { scale: 1.85, trail: true, shake: 5, sparks: 10, sparkCol: '#ffd700' });
    mis(slashFly, slashHit, x2, y2, 0.06, 760, { scale: 1.85, trail: true, shake: 5, sparks: 10, sparkCol: '#ffd700' });
    return;
  }
  // Đạt Ma Độ Giang (sid 318) - Côn kình trượng vàng giáng uy vũ
  if (sid === 318) {
    const monkFly = (JFX.m && JFX.m[134] && JFX.m[134].fly);
    const monkHit = (JFX.m && JFX.m[134] && JFX.m[134].hit);
    mis(monkFly, monkHit, x2, y2, 0, 580, { scale: 1.75, trail: true, shake: 4, sparks: 8, sparkCol: '#fbbf24' });
    boom(monkHit, x2, y2, 0.12, 1.8, 4, 10, '#ffd700');
    return;
  }
  // Hoành Tảo Thiên Quân (sid 319) - Kim quang bộc phát quét 360 độ
  if (sid === 319) {
    const sweep = (JFX.m && JFX.m[135] && JFX.m[135].fly);
    const sweepHit = (JFX.m && JFX.m[135] && JFX.m[135].hit);
    boom(sweep, x1, y1, 0, 1.9, 4, 10, '#ffd700');
    boom(sweepHit, x2, y2, 0.08, 1.7, 3, 8, '#fbbf24');
    return;
  }
  // Sư Tử Hống (sid 20) - Sóng âm chấn động
  if (sid === 20) {
    const lionRoar = (JFX.c && JFX.c[1]);
    if (lionRoar) boom(lionRoar, x1, y1, 0, 1.9, 6, 12, '#ffd700');
    shakeCamera(6, 0.2);
    return;
  }

  // 8. THIÊN VƯƠNG (Thương đao cận chiến)
  // Huyết Chiến Bát Phương (sid 41) - Đao thương tỏa 8 hướng
  if (sid === 41) {
    const hitSprite = (JFX.m && JFX.m[225] && JFX.m[225].hit) || (JFX.m && JFX.m[63] && JFX.m[63].hit);
    const flySprite = (JFX.m && JFX.m[225] && JFX.m[225].fly);
    for (let i = 0; i < 8; i++) {
      const g = (i / 8) * Math.PI * 2;
      mis(flySprite || hitSprite, hitSprite, x1 + Math.cos(g) * 150, y1 + Math.sin(g) * 150, i * 0.015, 560, { scale: 1.65, trail: true, shake: 3, sparks: 6, sparkCol: '#fbbf24' });
    }
    return;
  }
  // Phá Thiên Trảm (sid 322), Truy Tinh Trục Nguyệt (sid 323), Thừa Long Quyết (sid 324), Truy Phong Quyết (sid 325), Đoạn Hồn Thích (sid 40)
  if ([322, 323, 324, 325, 40].includes(sid)) {
    const flySprite = (sid === 322 && JFX.m && JFX.m[326] && JFX.m[326].fly) || (sid === 323 && JFX.m && JFX.m[327] && JFX.m[327].fly) || (def.m && def.m.fly);
    const hitSprite = (sid === 322 && JFX.m && JFX.m[326] && JFX.m[326].hit) || (sid === 323 && JFX.m && JFX.m[327] && JFX.m[327].hit) || (def.m && def.m.hit);
    mis(flySprite, hitSprite, x2, y2, 0, 680, { scale: 1.8, trail: true, shake: 5, sparks: 10, sparkCol: '#ffd700' });
    mis(flySprite, hitSprite, x2, y2, 0.06, 720, { scale: 1.8, trail: true, shake: 5, sparks: 10, sparkCol: '#ffd700' });
    return;
  }

  // 9. NGŨ ĐỘC (Độc khí & Huyền Âm Đao)
  // Âm Phong Thực Cốt (sid 353) - Cột khói độc u minh từ lòng đất bốc lên
  if (sid === 353) {
    const poisonPillar = (JFX.m && JFX.m[163] && JFX.m[163].fly);
    const poisonHit = (JFX.m && JFX.m[33] && JFX.m[33].hit) || (JFX.m && JFX.m[30] && JFX.m[30].hit);
    boom(poisonPillar, x2, y2, 0, 1.85, 3, 8, '#10b981');
    boom(poisonPillar, x2 + rnd(-22, 22), y2 + rnd(-16, 16), 0.12, 1.85, 3, 8, '#10b981');
    boom(poisonHit, x2, y2, 0.15, 1.7, 3, 10, '#34d399');
    return;
  }
  // Huyền Âm Trảm (sid 355) - Đao khí lục sắc độc sát chém đôi kẻ thù
  if (sid === 355) {
    const slashFly = (JFX.m && JFX.m[165] && JFX.m[165].fly);
    const slashHit = (JFX.m && JFX.m[165] && JFX.m[165].hit);
    for (let i = 0; i < 2; i++) {
      mis(slashFly, slashHit, x2 + rnd(-10, 10), y2 + rnd(-8, 8), i * 0.05, 680, { scale: 1.75, trail: true, shake: 4, sparks: 8, sparkCol: '#10b981' });
    }
    return;
  }

  // 10. HOA SƠN (Kiếm pháp)
  // Độc Cô Cửu Kiếm (sid 1368) - 9 thanh kiếm thần từ 9 hướng bao vây cùng lao vào tâm mục tiêu
  if (sid === 1368) {
    const swordFly = (JFX.m && JFX.m[175] && JFX.m[175].fly) || (JFX.m && JFX.m[173] && JFX.m[173].fly) || (JFX.m && JFX.m[110] && JFX.m[110].fly);
    const swordHit = (JFX.m && JFX.m[110] && JFX.m[110].hit) || (JFX.m && JFX.m[176] && JFX.m[176].hit);
    for (let i = 0; i < 9; i++) {
      const g = (i / 9) * Math.PI * 2;
      const fx = x2 + Math.cos(g) * 160, fy = y2 + Math.sin(g) * 160;
      mis(swordFly, swordHit, x2, y2, i * 0.025, 680, {
        fromX: fx,
        fromY: fy,
        scale: 1.65,
        trail: true,
        shake: 3,
        sparks: 5,
        sparkCol: '#60a5fa'
      });
    }
    boom(swordHit, x2, y2, 0.22, 1.9, 6, 12, '#93c5fd');
    return;
  }
  // Thái Nhạc Tam Thanh Phong (sid 1363)
  if (sid === 1363) {
    const swordFly = (JFX.m && JFX.m[110] && JFX.m[110].fly);
    const swordHit = (JFX.m && JFX.m[110] && JFX.m[110].hit);
    for (let i = 0; i < 3; i++) {
      const g = ang + (i - 1) * 0.16;
      const tx = x1 + Math.cos(g) * d, ty = y1 + Math.sin(g) * d;
      mis(swordFly, swordHit, tx, ty, i * 0.04, 620, { scale: 1.7, trail: true, sparks: 6, sparkCol: '#60a5fa' });
    }
    return;
  }

  // 11. ĐƯỜNG MÔN (Ám khí & Cạm bẫy)
  // Bạo Vũ Lê Hoa (sid 302) - Cơn mưa 12 mũi kim bạc xé gió 2 đợt
  if (sid === 302) {
    const needleSprite = (JFX.m && JFX.m[96] && JFX.m[96].fly) || (JFX.m && JFX.m[152] && JFX.m[152].fly);
    const hitSprite = (JFX.m && JFX.m[152] && JFX.m[152].hit) || (JFX.m && JFX.m[35] && JFX.m[35].hit);
    for (let i = 0; i < 12; i++) {
      const delay = Math.floor(i / 6) * 0.08 + (i % 6) * 0.015;
      const tx = x2 + rnd(-24, 24), ty = y2 + rnd(-16, 16);
      mis(needleSprite, hitSprite, tx, ty, delay, 720, { scale: 1.45, trail: true, sparks: 3, sparkCol: '#cbd5e1' });
    }
    boom(hitSprite, x2, y2, 0.15, 1.6, 4, 8, '#e2e8f0');
    return;
  }
  // Mạn Thiên Hoa Vũ (sid 54) - Bão kim rơi trùm kín mục tiêu
  if (sid === 54) {
    const stormSprite = (JFX.m && JFX.m[38] && JFX.m[38].fly);
    const hitSprite = (JFX.m && JFX.m[35] && JFX.m[35].hit) || (JFX.m && JFX.m[151] && JFX.m[151].hit);
    if (stormSprite) {
      boom(stormSprite, x2, y2 - 25, 0, 1.85);
      boom(stormSprite, x2 + rnd(-30, 30), y2 + rnd(-20, 20) - 25, 0.1, 1.85);
    }
    boom(hitSprite, x2, y2, 0.12, 1.65, 4, 8, '#cbd5e1');
    return;
  }
  // Tiểu Lý Phi Đao (sid 249) - Phi đao hạ thủ vô hình tốc độ cực cao
  if (sid === 249) {
    const knifeSprite = (JFX.m && JFX.m[37] && JFX.m[37].fly) || (JFX.m && JFX.m[149] && JFX.m[149].fly);
    const hitSprite = (JFX.m && JFX.m[106] && JFX.m[106].hit) || (JFX.m && JFX.m[35] && JFX.m[35].hit);
    mis(knifeSprite, hitSprite, x2, y2, 0, 850, { scale: 1.7, trail: true, shake: 4, sparks: 8, sparkCol: '#ffd700' });
    mis(knifeSprite, hitSprite, x2, y2, 0.05, 880, { scale: 1.7, trail: true, shake: 4, sparks: 8, sparkCol: '#ffd700' });
    return;
  }
  // Cửu Cung Phi Tinh (sid 342) & Tán Hoa Tiêu (sid 341)
  if (sid === 342 || sid === 341) {
    const starSprite = (JFX.m && JFX.m[152] && JFX.m[152].fly) || (JFX.m && JFX.m[151] && JFX.m[151].fly);
    const hitSprite = (JFX.m && JFX.m[152] && JFX.m[152].hit) || (JFX.m && JFX.m[151] && JFX.m[151].hit);
    for (let i = 0; i < 5; i++) {
      const g = ang + (i - 2) * 0.16;
      const tx = x1 + Math.cos(g) * d, ty = y1 + Math.sin(g) * d;
      mis(starSprite, hitSprite, tx, ty, i * 0.025, 640, { scale: 1.6, trail: true, sparks: 4, sparkCol: '#94a3b8' });
    }
    return;
  }
  // Thiên La Địa Võng (sid 58)
  if (sid === 58) {
    const netSprite = (JFX.m && JFX.m[67] && JFX.m[67].fly);
    const hitSprite = (JFX.m && JFX.m[35] && JFX.m[35].hit) || (JFX.m && JFX.m[106] && JFX.m[106].hit);
    for (let i = 0; i < 3; i++) {
      const g = ang + (i - 1) * 0.14;
      const tx = x1 + Math.cos(g) * d, ty = y1 + Math.sin(g) * d;
      mis(netSprite, hitSprite, tx, ty, i * 0.04, 520, { scale: 1.6, trail: true, sparks: 5, sparkCol: '#a855f7' });
    }
    if (hitSprite) boom(hitSprite, x2, y2, 0.15, 1.7, 3, 6, '#c084fc');
    return;
  }
  // Đoạt Hồn Tiêu (sid 47)
  if (sid === 47) {
    const dartSprite = (JFX.m && JFX.m[116] && JFX.m[116].fly);
    const hitSprite = (JFX.m && JFX.m[35] && JFX.m[35].hit);
    mis(dartSprite, hitSprite, x2, y2, 0, 560, { scale: 1.6, trail: true, shake: 2, sparks: 5, sparkCol: '#94a3b8' });
    return;
  }
  // Truy Tâm Tiễn (sid 50) & Nhiếp Hồn Nguyệt Ảnh (sid 339)
  if (sid === 50 || sid === 339) {
    const arrowSprite = (sid === 50 && JFX.m && JFX.m[37] && JFX.m[37].fly) || (JFX.m && JFX.m[149] && JFX.m[149].fly);
    const hitSprite = (JFX.m && JFX.m[106] && JFX.m[106].hit) || (JFX.m && JFX.m[35] && JFX.m[35].hit);
    mis(arrowSprite, hitSprite, x2, y2, 0, 640, { scale: 1.65, trail: true, shake: 3, sparks: 6, sparkCol: '#ffd700' });
    if (sid === 50) mis(arrowSprite, hitSprite, x2 + rnd(-12, 12), y2 + rnd(-8, 8), 0.08, 640, { scale: 1.65, trail: true, shake: 3, sparks: 6, sparkCol: '#ffd700' });
    return;
  }
  // Cạm bẫy Đường Môn (sid 347 Địa Diệm Hỏa, 303 Độc Thích Cốt, 343 Xuyên Tâm Thích, 345 Hàn Băng Thích, 349 Lôi Kích Thuật, 351 Loạn Hoàn Kích)
  if ([347, 303, 343, 345, 349, 351].includes(sid)) {
    const trapM = def && def.m;
    const trapSprite = trapM && (trapM.hit || trapM.fly);
    const hitSprite = (JFX.m && JFX.m[35] && JFX.m[35].hit) || (JFX.m && JFX.m[106] && JFX.m[106].hit);
    if (trapSprite) {
      boom(trapSprite, x2, y2, 0, 1.75, 3, 6, sparkColor);
      boom(trapSprite, x2 + rnd(-16, 16), y2 + rnd(-12, 12), 0.08, 1.75, 3, 6, sparkColor);
    }
    if (hitSprite) boom(hitSprite, x2, y2, 0.12, 1.65, 4, 8, sparkColor);
    return;
  }

  // 1. Chiêu dạng hào quang quanh người ra chiêu
  if (form === 7) { boom(m.hit || m.fly, x1, y1 + 8, 0, 1.8, 3, 8, sparkColor); return; }

  // 2. Chiêu nổ diện rộng tại mục tiêu hoặc chiêu giáng từ trời xuống
  if (form === 6) {
    for (let i = 0; i < n; i++) {
      const ox = (n > 1 ? rnd(-36, 36) : 0);
      const oy = (n > 1 ? rnd(-24, 24) : 0);
      const delay = i * 0.07;
      if (m.fly) boom(m.fly, x2 + ox, y2 + oy, delay, 1.75, 3, 6, sparkColor);
      if (m.hit) boom(m.hit, x2 + ox, y2 + oy, delay + 0.04, 1.7, 3, 6, sparkColor);
    }
    return;
  }

  // 3. Có đạn bay (Missiles):
  if (!m.fly) {
    boom(m.hit, x2, y2, 0, 1.75, 3, 6, sparkColor);
    return;
  }
  if (form === 3) {
    for (let i = 0; i < n; i++) {
      const g = ang + (i / n) * Math.PI * 2;
      mis(m.fly, m.hit, x1 + Math.cos(g) * 140, y1 + Math.sin(g) * 140, 0, m.spd || 350, { scale: 1.65, trail: true, shake: 2, sparks: 5, sparkCol: sparkColor });
    }
    return;
  }
  if (form === 2) {
    for (let i = 0; i < n; i++) {
      const g = ang + (i - (n - 1) / 2) * 0.24;
      mis(m.fly, m.hit, x1 + Math.cos(g) * d, y1 + Math.sin(g) * d, 0, m.spd || 350, { scale: 1.65, trail: true, shake: 2, sparks: 5, sparkCol: sparkColor });
    }
    return;
  }
  if (form === 0) {
    const px = -dy / d, py = dx / d;
    for (let i = 0; i < n; i++) {
      const o = (i - (n - 1) / 2) * 36;
      mis(m.fly, m.hit, x2 + px * o, y2 + py * o, 0, m.spd || 350, { scale: 1.65, trail: true, shake: 2, sparks: 5, sparkCol: sparkColor });
    }
    return;
  }
  // Dạng 1, dạng 8, 10, 11, 12: Đạn bay thẳng tới mục tiêu
  for (let i = 0; i < n; i++) {
    mis(m.fly, m.hit, x2, y2, i * 0.08, m.spd || 350, { scale: 1.65, trail: true, shake: 2, sparks: 5, sparkCol: sparkColor });
  }
}
const animDur = s => Math.min(1.2, s.n * s.ms / 1000);
function drawFxSprite(s, dir, t, x, y, loop, scale = FX_SCALE, alpha = 1) {
  const im = img(s.f); if (!im || !im.complete || !im.naturalWidth) return false;
  const fr = loop ? Math.floor(t * 1000 / s.ms) % s.n : Math.min(s.n - 1, Math.floor(t * 1000 / s.ms));
  const row = s.d > 1 ? Math.round(dir * s.d / 16) % s.d : 0;
  const sc = scale || FX_SCALE;
  const dw = s.w * sc, dh = s.h * sc;
  const dx = x - s.ax * sc, dy = y - s.ay * sc;

  const prevAlpha = CX.globalAlpha;
  CX.globalAlpha = clamp(alpha * prevAlpha, 0, 1);
  CX.drawImage(im, fr * s.w, row * s.h, s.w, s.h, dx, dy, dw, dh);

  // Hiệu ứng hào quang phát sáng (glow layer) nhẹ nhàng tôn màu sắc võ lâm
  if (!S.lowFx && (s.f.includes('hit') || sc >= 1.65)) {
    CX.globalCompositeOperation = 'lighter';
    CX.globalAlpha = clamp(0.32 * alpha * prevAlpha, 0, 1);
    CX.drawImage(im, fr * s.w, row * s.h, s.w, s.h, dx, dy, dw, dh);
    CX.globalCompositeOperation = 'source-over';
  }
  CX.globalAlpha = prevAlpha;
  return true;
}
function stepFx(f, dt) { // tra ve false khi het; dan toi dich thi doi sang no
  f.t += dt; if (f.t < 0) return true;     // dang cho (phat dan lien tiep)
  if (f.k === 'mis') {
    // Luu lich su toa do cho tan anh (ghost trail)
    if (f.trail && f.curX !== undefined) {
      if (!f.history) f.history = [];
      f.history.unshift({ x: f.curX, y: f.curY, dir: f.curDir !== undefined ? f.curDir : f.dir, t: f.t });
      if (f.history.length > 4) f.history.pop();
    }
    if (f.t >= f.life) {
      if (f.hit) {
        Object.assign(f, {
          k: 'boom',
          s: f.hit,
          x: f.x2,
          y: f.y2,
          t: 0,
          life: animDur(f.hit),
          scale: f.scale || FX_SCALE
        });
        if (f.shake) shakeCamera(f.shake, 0.16);
        if (f.sparks) addSparks(f.x2, f.y2, f.sparkCol || '#ffd700', f.sparks, 150);
        return true;
      }
      return false;
    }
  }
  return f.t < f.life;
}
function drawFx(f) {
  if (f.t < 0) return false;
  if (f.k === 'mis') {
    const k = clamp(f.t / f.life, 0, 1);
    let curX = f.x1 + (f.x2 - f.x1) * k;
    let curY = f.y1 + (f.y2 - f.y1) * k;
    let curDir = f.dir;

    // 1. Quỹ đạo sóng uốn lượn (sin-wave) cho rồng Cái Bang / ám khí
    if (f.wave) {
      const ang = Math.atan2(f.y2 - f.y1, f.x2 - f.x1);
      const perpX = -Math.sin(ang), perpY = Math.cos(ang);
      const wPhase = (f.wavePhase || 0) + k * (f.waveFreq || (Math.PI * 4));
      const envelope = Math.sin(k * Math.PI);
      const offset = Math.sin(wPhase) * f.wave * envelope;
      curX += perpX * offset;
      curY += perpY * offset;
      if (f.curX !== undefined && (Math.abs(curX - f.curX) > 0.5 || Math.abs(curY - f.curY) > 0.5)) {
        curDir = dir16(curX - f.curX, curY - f.curY);
      }
    }

    // 2. Quỹ đạo cung tròn (arc) cho lựu đạn / bẫy ném
    if (f.arc) {
      curY -= Math.sin(k * Math.PI) * f.arc;
    }

    f.curX = curX;
    f.curY = curY;
    f.curDir = curDir;

    // 3. Vẽ tàn ảnh (ghost trail)
    if (f.trail && f.history && f.history.length > 0) {
      for (let h = 0; h < f.history.length; h++) {
        const hist = f.history[h];
        const hAlpha = 0.32 / (h + 1.2);
        drawFxSprite(f.s, hist.dir, hist.t, hist.x, hist.y, true, (f.scale || FX_SCALE) * 0.96, hAlpha);
      }
    }

    return drawFxSprite(f.s, curDir, f.t, curX, curY, true, f.scale || FX_SCALE, 1);
  }
  return drawFxSprite(f.s, f.dir, f.t, f.x, f.y, false, f.scale || FX_SCALE, 1);
}
/* Giao dien di dong thu nho 20% (UI_SCALE_MOBILE): #app co width / height lon 1/0.8 lan roi transform: scale(0.8) (style.css, body.mob).
   Toa do trong game theo px bo cuc (offsetWidth / Height, khong bi transform); DPR hieu dung nhan them he so thu nho de net. */
const UI_SCALE_MOBILE = 0.8;
const isMobileUI = () => !(typeof isDesktopLandscape === 'function' && isDesktopLandscape()) && !!(window.matchMedia && (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 700));
const uiScale = () => document.body.classList.contains('mob') ? UI_SCALE_MOBILE : 1;
function resizeArena() {
  const b = $('#battle'), box = { width: b.offsetWidth, height: b.offsetHeight };
  DPR = Math.min(2, window.devicePixelRatio || 1) * uiScale();
  CV.width = Math.round(box.width * DPR); CV.height = Math.round(box.height * DPR);
  AR.w = box.width; AR.h = box.height; AR.top = 58; AR.bot = box.height - 12;   // khung nhin (man hinh)
  snapCamera();
}
/* ---------- camera chay theo nhan vat, khong ra ngoai mep ban do ---------- */
/* ---------- camera chay theo nhan vat, khong ra ngoai mep ban do ---------- */
const CAM = { x: 0, y: 0, sx: 0, sy: 0, shakeT: 0, shakeDur: 0, shakeMag: 0 };
const camTarget = () => [clamp(H.x - AR.w / 2, 0, Math.max(0, WORLD.w - AR.w)), clamp(H.y - AR.h * 0.55, 0, Math.max(0, WORLD.h - AR.h))];
function snapCamera() { [CAM.x, CAM.y] = camTarget(); CAM.sx = 0; CAM.sy = 0; }
function updateCamera(dt) {
  const [tx, ty] = camTarget(), k = Math.min(1, dt * 6);
  CAM.x += (tx - CAM.x) * k;
  CAM.y += (ty - CAM.y) * k;
  if (CAM.shakeT > 0) {
    CAM.shakeT -= dt;
    const progress = Math.max(0, CAM.shakeT / (CAM.shakeDur || 0.15));
    const curMag = CAM.shakeMag * progress;
    CAM.sx = (Math.random() - 0.5) * 2 * curMag;
    CAM.sy = (Math.random() - 0.5) * 2 * curMag;
  } else {
    CAM.sx = 0;
    CAM.sy = 0;
  }
}
function shakeCamera(mag = 4, dur = 0.15) {
  if (typeof S !== 'undefined' && S && S.lowFx) return;
  CAM.shakeMag = Math.max(CAM.shakeMag || 0, mag);
  CAM.shakeDur = dur;
  CAM.shakeT = dur;
}
/* ---------- nen ban do: anh 3x3 vung that (BG_TILE diem) lat guong xen ke -> ghep lien, khong thay mep, the gioi rong tuy y ---------- */
const BG_TILE = 1536;
function drawTiledBg(c, bg) {
  if (!(bg && bg.complete && bg.naturalWidth)) { c.fillStyle = '#26301f'; c.fillRect(CAM.x - 40, CAM.y - 40, AR.w + 80, AR.h + 80); return; }
  if (OBS.g) { c.drawImage(bg, 0, 0, WORLD.w, WORLD.h); return; }          // ban do that rong, khong lat guong
  const T = BG_TILE, i0 = Math.floor((CAM.x - 40) / T), i1 = Math.floor((CAM.x + AR.w + 40) / T), j0 = Math.floor((CAM.y - 40) / T), j1 = Math.floor((CAM.y + AR.h + 40) / T);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const fx = i & 1, fy = j & 1;
    if (!fx && !fy) { c.drawImage(bg, i * T, j * T, T, T); continue; }
    c.save(); c.translate(i * T + (fx ? T : 0), j * T + (fy ? T : 0)); c.scale(fx ? -1 : 1, fy ? -1 : 1); c.drawImage(bg, 0, 0, T, T); c.restore();
  }
}
/* ---------- ban do nho: anh ban do that thu nho, quai = cham theo ngu hanh / trum, nhan vat = mui ten, khung = tam nhin ---------- */
const MINI = { s: 92, m: 8, top: 62 };
function drawMinimap(c) {
  if (R.town || S.miniMap === false) return;
  c.save();
  const s = MINI.s, x0 = AR.w - s - MINI.m, y0 = MINI.top, k = s / WORLD.w;
  const bg = R.bgImg || (typeof zoneOf === 'function' && typeof S !== 'undefined' && S ? (R.bgImg = img(zoneOf(S.stage || 1).bg)) : null);
  if (bg && bg.complete && bg.naturalWidth) {
    if (OBS.g) c.drawImage(bg, x0, y0, s, s);
    else { const n = Math.round(WORLD.w / BG_TILE), h = s / n;                   // cung cach ghep lat guong nhu nen tran dau
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { c.save(); c.translate(x0 + i * h + (i & 1 ? h : 0), y0 + j * h + (j & 1 ? h : 0)); c.scale(i & 1 ? -1 : 1, j & 1 ? -1 : 1); c.drawImage(bg, 0, 0, h, h); c.restore(); } }
  } else { c.fillStyle = '#26301f'; c.fillRect(x0, y0, s, s); }
  c.globalAlpha = 1;
  c.strokeStyle = '#fff6'; c.lineWidth = 1; c.strokeRect(x0 + CAM.x * k, y0 + CAM.y * k, Math.min(s, AR.w * k), Math.min(s, AR.h * k));
  if (typeof MAP_EXPANSION !== 'undefined' && MAP_EXPANSION.drawMinimapCamps) MAP_EXPANSION.drawMinimapCamps(c, x0, y0, s, k);
  for (const d of R.ground) if (lootMatch(d.it)) { c.fillStyle = RAR_COL[d.it.r]; c.fillRect(x0 + d.x * k - 1, y0 + d.y * k - 1, 2, 2); }
  for (const e of R.enemies) {
    if (e.dead) continue;
    const r = e.cls === 'boss' ? 3.2 : e.cls === 'elite' ? 2.4 : 1.8;
    c.fillStyle = e.goldBoss ? '#ffd24a' : e.cls === 'boss' ? '#ff4a3a' : SERIES_COL[e.series];
    c.beginPath(); c.arc(x0 + e.x * k, y0 + e.y * k, r, 0, 7); c.fill();
  }
  // Cham nguoi choi khac tren ban do nho (mau xanh cyan)
  if (typeof MP !== 'undefined' && MP.otherPlayers) {
    const curZone = typeof getCurZoneId === 'function' ? getCurZoneId() : null;
    for (const id in MP.otherPlayers) {
      const p = MP.otherPlayers[id];
      if (curZone && p.zoneId && p.zoneId !== curZone) continue;
      c.fillStyle = '#38bdf8';
      c.beginPath(); c.arc(x0 + p.x * k, y0 + p.y * k, 2.5, 0, 7); c.fill();
    }
  }
  if (R.petPos) { c.fillStyle = '#9fe36a'; c.fillRect(x0 + R.petPos.x * k - 1.5, y0 + R.petPos.y * k - 1.5, 3, 3); }
  const hx = x0 + H.x * k, hy = y0 + H.y * k, a = Math.PI / 2 + (H.dir || 0) * Math.PI / 4;   // huong 0 = nam (xuong duoi)
  c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.beginPath();
  c.moveTo(hx + Math.cos(a) * 5, hy + Math.sin(a) * 5); c.lineTo(hx + Math.cos(a + 2.5) * 4, hy + Math.sin(a + 2.5) * 4); c.lineTo(hx + Math.cos(a - 2.5) * 4, hy + Math.sin(a - 2.5) * 4);
  c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = '#c8a45a'; c.strokeRect(x0 - 2, y0 - 2, s + 4, s + 4);
  c.font = '9px "IBM Plex Mono", monospace'; c.textAlign = 'center'; c.fillStyle = '#f3d88a';
  c.fillText(R.tower ? `Tháp · tầng ${R.tower.floor}` : zoneOf(Math.min(S.stage, STAGES)).n, x0 + s / 2, y0 + s + 11);
  c.restore();
}
const onScreen = (x, y, m = 120) => x > CAM.x - m && x < CAM.x + AR.w + m && y > CAM.y - m && y < CAM.y + AR.h + m;
function drawSprite(im, sz, x, y, scale, flip, alpha = 1) {
  if (!im || !im.complete || !im.naturalWidth) return false;
  const w = im.naturalWidth * scale, h = im.naturalHeight * scale;
  // diem chan lay tu tam spr; mot so spr co tam nam ngoai khung da cat -> dung giua-duoi anh
  const okFoot = sz && sz[2] >= 0 && sz[2] <= im.naturalWidth && sz[3] >= im.naturalHeight * 0.5 && sz[3] <= im.naturalHeight * 1.2;
  const fx = okFoot ? sz[2] * scale : w / 2, fy = okFoot ? sz[3] * scale : h * 0.95;
  CX.save(); CX.globalAlpha = alpha; CX.translate(x, y); if (flip) CX.scale(-1, 1);
  CX.drawImage(im, -fx, -fy, w, h); CX.restore();
  return true;
}
/* ---------- hoat anh 8 huong (img/a/<npcres>_<hanh dong>.webp) ----------
   huong 0 = quay mat ve nguoi xem, tang theo chieu kim dong ho: N(am), TN, T, TB, B, DB, D, DN */
const dirOf = (vx, vy) => (((Math.round(Math.atan2(-vx, vy) / (Math.PI / 4)) % 8) + 8) % 8);
const ONCE = { at: 1, hurt: 1, die: 1 };
function animLen(key, act) { const m = W.anim && W.anim[key] && W.anim[key][act]; return m ? m.n * m.ms / 1000 : 0; }
function drawAnim(key, act, dir, t, x, y, sc, alpha = 1) {
  const set = W.anim && W.anim[key]; if (!set) return false;
  const m = set[act] || set.st; if (!m) return false;
  const im = img('img/a/' + m.f); if (!im || !im.complete || !im.naturalWidth) return false;
  let fr = Math.floor(t * 1000 / m.ms); fr = ONCE[act] ? Math.min(fr, m.n - 1) : fr % m.n;
  const d = m.d >= 8 ? dir : Math.floor(dir * m.d / 8);
  const sx = Math.min(fr * m.w, Math.max(0, im.naturalWidth - m.w));
  const sy = Math.min(d * m.h, Math.max(0, im.naturalHeight - m.h));
  const sw = Math.min(m.w, im.naturalWidth - sx);
  const sh = Math.min(m.h, im.naturalHeight - sy);
  if (sw <= 0 || sh <= 0) return false;
  CX.globalAlpha = alpha;
  CX.drawImage(im, sx, sy, sw, sh, x - m.ax * sc, y - m.ay * sc, sw * sc, sh * sc);
  CX.globalAlpha = 1;
  return sh * sc;
}
function setAct(o, act) { if (o.act !== act) { o.act = act; o.actT = 0; } }
function stepAct(o, dt, idle) { // het hoat anh mot lan (danh / trung don) -> ve trang thai nen
  o.actT = (o.actT || 0) + dt;
  if ((o.act === 'at' || o.act === 'hurt') && o.actT >= Math.max(0.25, animLen(o.animKey, o.act))) setAct(o, idle);
}
/* ten tren dau (nhan vat, quai, dong hanh): chu mot nen, vien den cho de doc tren moi nen ban do */
const NAME_COL = { boss: '#ffb070', elite: '#8fc6ff', normal: '#e8dcc8', hero: '#fff3c0', pet: '#9fe36a', gold: '#ffd24a' };
/* Nhan (ten + thanh mau) tren dau: xep vao hang cho, cuoi khung moi tranh chong: nhan nao de len nhan khac thi day len cao hon.
   y = diem sat dau; thanh mau nam duoi cung, ten ngay tren thanh. hp < 0: khong ve thanh. */
const LABELS = [];
function label(x, y, text, col, size, hp, barCol) { LABELS.push({ x, y, text, col, size, hp, barCol }); }
function flushLabels() {
  if (!LABELS.length) return;
  CX.textAlign = 'center'; CX.lineJoin = 'round';
  const placed = [];
  for (const L of LABELS.sort((a, b) => b.y - a.y)) {                 // tu duoi len: nhan thap giu cho, nhan cao day len khi de
    CX.font = `${L.size}px "IBM Plex Mono", monospace`; L.w = Math.max(CX.measureText(L.text).width, 44); L.h = L.size + 4 + (L.hp >= 0 ? 7 : 0);
    let y = L.y;
    for (let k = 0; k < 8; k++) { const hit = placed.find(p => Math.abs(p.x - L.x) < (p.w + L.w) / 2 && y > p.top && y - L.h < p.y); if (!hit) break; y = hit.top - 1; }
    L.py = y; L.top = y - L.h; placed.push({ x: L.x, w: L.w, y, top: L.top });
  }
  for (const L of LABELS) {
    const y = L.py, bw = Math.min(L.w, 56);
    if (L.hp >= 0) { CX.fillStyle = '#000c'; CX.fillRect(L.x - bw / 2 - 1, y - 6, bw + 2, 6); CX.fillStyle = L.barCol; CX.fillRect(L.x - bw / 2, y - 5, bw * clamp(L.hp, 0, 1), 4); }
    CX.font = `${L.size}px "IBM Plex Mono", monospace`; CX.lineWidth = 3; CX.strokeStyle = '#000c';
    const ty = y - (L.hp >= 0 ? 8 : 1); CX.strokeText(L.text, L.x, ty); CX.fillStyle = L.col; CX.fillText(L.text, L.x, ty);
  }
  LABELS.length = 0;
}
function nameTag(x, y, text, col, size = 11) {
  CX.font = `${size}px "IBM Plex Mono", monospace`; CX.textAlign = 'center'; CX.lineJoin = 'round'; CX.lineWidth = 3; CX.strokeStyle = '#000c';
  CX.strokeText(text, x, y); CX.fillStyle = col; CX.fillText(text, x, y);
}
const enemyName = e => `${e.n} · Lv${e.L}`;
function bar(x, y, w, h, f, col) { CX.fillStyle = '#000a'; CX.fillRect(x, y, w, h); CX.fillStyle = col; CX.fillRect(x, y, w * clamp(f, 0, 1), h); }

/* ---------- HOẠT ẢNH & HIỂN THỊ CHIẾN MÃ (MOUNT RES) ---------- */
function drawHorseMount(c, x, y, dir, act, actT, mountData) {
  const tier = (mountData && mountData.tier) || (typeof S !== 'undefined' && S && S.mount ? S.mount.tier : 1);
  const cfg = (typeof PVK_MOUNTS !== 'undefined' && PVK_MOUNTS[tier - 1]) ? PVK_MOUNTS[tier - 1] : {
    col: '#ffd700', horseCol: '#ca8a04', maneCol: '#fef08a'
  };

  const isMoving = act === 'run';
  const gallopT = (actT || 0) * (isMoving ? 14 : 3);
  const bob = isMoving ? Math.sin(gallopT) * 3 : Math.sin(gallopT) * 1;
  const legCycle = isMoving ? Math.sin(gallopT) * 7 : Math.sin(gallopT) * 1.5;
  const flip = (dir >= 1 && dir <= 3); // Huong mat sang trai

  c.save();
  c.translate(x, y);
  if (flip) c.scale(-1, 1);

  // 1. Bóng ngựa dưới chân
  c.fillStyle = '#0008';
  c.beginPath();
  c.ellipse(0, 4, 22, 9, 0, 0, Math.PI * 2);
  c.fill();

  // 2. Vòng hào quang huyền ảo theo bậc ngựa (Tier >= 7)
  if (tier >= 7) {
    const auraCol = tier >= 11 ? '#f43f5e' : (tier >= 10 ? '#fb923c' : (tier >= 9 ? '#eab308' : (tier >= 8 ? '#f97316' : '#a855f7')));
    c.strokeStyle = auraCol;
    c.lineWidth = 2;
    c.globalAlpha = 0.6 + Math.sin(gallopT * 0.5) * 0.3;
    c.beginPath();
    c.ellipse(0, 4, 26 + (tier >= 9 ? 3 : 0), 10 + (tier >= 9 ? 2 : 0), 0, 0, Math.PI * 2);
    c.stroke();
    // Vệt hào quang móng ngựa
    c.fillStyle = auraCol;
    c.beginPath();
    c.arc(-14 + legCycle * 0.5, 4, 2.5, 0, Math.PI * 2);
    c.arc(14 - legCycle * 0.5, 4, 2.5, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
  }

  // 3. Chân sau xa & trước xa
  c.strokeStyle = cfg.horseCol;
  c.lineWidth = 3.8;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-11, -3 + bob);
  c.lineTo(-13 - legCycle, 4);
  c.stroke();
  c.beginPath();
  c.moveTo(10, -3 + bob);
  c.lineTo(12 + legCycle, 4);
  c.stroke();

  // 4. Thân ngựa (Body)
  c.fillStyle = cfg.horseCol;
  c.beginPath();
  c.ellipse(0, -5 + bob, 17, 8.5, -0.05, 0, Math.PI * 2);
  c.fill();

  // 5. Chân sau gần & trước gần
  c.beginPath();
  c.moveTo(-7, -3 + bob);
  c.lineTo(-7 + legCycle, 4);
  c.stroke();
  c.beginPath();
  c.moveTo(13, -3 + bob);
  c.lineTo(13 - legCycle, 4);
  c.stroke();

  // Móng ngựa
  c.fillStyle = tier >= 4 ? '#ffd700' : '#475569';
  c.fillRect(-7 + legCycle - 2, 2.5, 4, 2.5);
  c.fillRect(13 - legCycle - 2, 2.5, 4, 2.5);

  // 6. Cổ & Đầu ngựa
  c.beginPath();
  c.moveTo(9, -7 + bob);
  c.lineTo(17, -19 + bob);
  c.lineTo(23, -17 + bob);
  c.lineTo(15, -3 + bob);
  c.closePath();
  c.fill();

  // Đầu ngựa
  c.beginPath();
  c.ellipse(20, -18 + bob, 5.5, 3.8, 0.4, 0, Math.PI * 2);
  c.fill();

  // Bờm ngựa
  c.strokeStyle = cfg.maneCol;
  c.lineWidth = 3.2;
  c.beginPath();
  c.moveTo(11, -9 + bob);
  c.lineTo(16, -21 + bob);
  c.stroke();

  // Tai ngựa
  c.fillStyle = cfg.maneCol;
  c.beginPath();
  c.moveTo(16, -22 + bob);
  c.lineTo(18, -26 + bob);
  c.lineTo(20, -21 + bob);
  c.fill();

  // Đuôi ngựa
  c.strokeStyle = cfg.maneCol;
  c.lineWidth = 3.5;
  c.beginPath();
  c.moveTo(-15, -5 + bob);
  c.quadraticCurveTo(-23 - (isMoving ? 8 : 2), -3 + bob, -20 - (isMoving ? 6 : 0), 3 + bob);
  c.stroke();

  // 7. Yên cương
  c.fillStyle = '#b45309';
  c.beginPath();
  if (c.roundRect) c.roundRect(-7, -12 + bob, 14, 7, 2);
  else c.rect(-7, -12 + bob, 14, 7);
  c.fill();
  c.strokeStyle = '#ffd700';
  c.lineWidth = 0.9;
  c.stroke();

  c.restore();
  return bob;
}

function draw(dt) {
  const c = CX; c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, AR.w, AR.h);
  updateCamera(dt);
  c.setTransform(DPR, 0, 0, DPR, -Math.round(CAM.x + (CAM.sx || 0)) * DPR, -Math.round(CAM.y + (CAM.sy || 0)) * DPR);
  const bg = R.bgImg || (typeof zoneOf === 'function' && typeof S !== 'undefined' && S ? (R.bgImg = img(zoneOf(S.stage || 1).bg)) : null);
  drawTiledBg(c, bg);
  // do roi tren dat: vien theo do hiem, ten cho do khop bo loc / mon dang chon
  c.textAlign = 'center';
  for (const d of R.town ? [] : R.ground) {
    const im = d.it.ic ? img(d.it.ic) : null, match = lootMatch(d.it), sel = R.pickTarget === d;
    const bob = Math.sin((d.age + d.x) * 3) * 1.5;
    c.fillStyle = '#0008'; c.beginPath(); c.ellipse(d.x, d.y + 2, 11, 4, 0, 0, 7); c.fill();
    c.strokeStyle = RAR_COL[d.it.r]; c.lineWidth = sel ? 2.5 : match ? 1.6 : 0.8; c.globalAlpha = match || sel ? 1 : 0.55;
    c.beginPath(); c.ellipse(d.x, d.y + 2, 12, 5, 0, 0, 7); c.stroke();
    if (im && im.complete && im.naturalWidth) { const k = Math.min(26 / im.naturalWidth, 26 / im.naturalHeight); c.drawImage(im, d.x - im.naturalWidth * k / 2, d.y - im.naturalHeight * k + bob, im.naturalWidth * k, im.naturalHeight * k); }
    if (match || sel || d.it.r >= 2) { c.font = '9px "IBM Plex Mono", monospace'; c.fillStyle = '#000'; c.fillText(d.it.n, d.x + 1, d.y - 27); c.fillStyle = RAR_COL[d.it.r]; c.fillText(d.it.n, d.x, d.y - 28); }
    c.globalAlpha = 1;
  }
  // xac quai: phat hoat anh chet roi mo dan (xu ly nguoc de splice khong sinh rac GC)
  for (let i = R.corpses.length - 1; i >= 0; i--) {
    const e = R.corpses[i];
    e.actT += dt;
    if (e.actT >= 1.6) {
      R.corpses.splice(i, 1);
      continue;
    }
    const a = clamp(1.6 - e.actT, 0, 1);
    const sc = e.cls === 'boss' ? 1.15 : e.cls === 'elite' ? 0.95 : 0.8;
    if (!(e.animKey && drawAnim(e.animKey, 'die', e.dir || 0, e.actT, e.x, e.y, sc * MON_SCALE, a))) {
      c.globalAlpha = a * 0.5;
      drawSprite(e.img, e.sz, e.x, e.y, sc, e.face < 0);
      c.globalAlpha = 1;
    }
  }
  if (typeof drawCampfire === 'function') drawCampfire(c, dt);              // lua trai (pvk_upgrade.js)
  drawPet(c, dt);                                                           // dong hanh (rewards.js / pvk_upgrade.js)
  if (typeof updateOtherPlayers === 'function') updateOtherPlayers(dt);     // cap nhat vi tri nguoi choi khac
  if (typeof sendMove === 'function') sendMove(dt);                         // gui toa do nhan vat len server

  // Toi uu GC: Tai su dung mang _renderEnts thay vi tao moi 4 mang moi frame
  if (!window._renderEnts) {
    window._renderEnts = [];
    window._heroRenderEnt = { hero: true, y: 0 };
  }
  const ents = window._renderEnts;
  ents.length = 0;
  for (let i = 0; i < R.enemies.length; i++) {
    const e = R.enemies[i];
    if (!e.dead) ents.push(e);
  }
  window._heroRenderEnt.y = H.y;
  ents.push(window._heroRenderEnt);
  if (typeof getVisibleOtherPlayers === 'function') {
    const othersList = getVisibleOtherPlayers();
    for (let i = 0; i < othersList.length; i++) {
      const p = othersList[i];
      ents.push({ otherPlayer: true, p: p, y: p.y });
    }
  }
  // NPC Thành Thị & Thôn Trấn khi ở trong khu vực an toàn
  if (R.town && typeof TOWN_NPC !== 'undefined' && TOWN_NPC.getCurNpcs) {
    const townNpcs = TOWN_NPC.getCurNpcs();
    for (let i = 0; i < townNpcs.length; i++) {
      ents.push(townNpcs[i]);
    }
  }
  // Bạn Đồng Hành (Companion / Pet) xuất chiến đi theo sau
  if (typeof COMPANION_SYSTEM !== 'undefined' && COMPANION_SYSTEM.getActiveCompanion && COMPANION_SYSTEM.getActiveCompanion()) {
    ents.push({ companion: true, y: COMPANION_SYSTEM.petPos.y || H.y });
  }
  ents.sort((a, b) => a.y - b.y);
  for (let i = 0; i < ents.length; i++) {
    const e = ents[i];
    if (e.companion) {
      if (typeof COMPANION_SYSTEM !== 'undefined' && COMPANION_SYSTEM.drawPet) {
        COMPANION_SYSTEM.drawPet(c, dt);
      }
      continue;
    }
    if (e.isNpc) {
      if (typeof TOWN_NPC !== 'undefined' && TOWN_NPC.drawNpc) {
        TOWN_NPC.drawNpc(c, dt, e);
      }
      continue;
    }
    if (e.otherPlayer) {
      if (typeof drawSingleOtherPlayer === 'function') drawSingleOtherPlayer(c, dt, e.p);
      continue;
    }
    if (e.hero) {
      const hw = W.hero[S.fac];
      H.animKey = hw && hw.anim;
      const mvx = H.x - (H.px ?? H.x), mvy = H.y - (H.py ?? H.y); H.px = H.x; H.py = H.y;
      H.moving = Math.hypot(mvx, mvy) > 0.4; if (H.moving && H.act !== 'at') H.dir = dirOf(mvx, mvy);
      stepAct(H, dt, H.moving ? 'run' : 'st');
      if (R.deadT > 0) setAct(H, 'die'); else if (H.act !== 'at' && H.act !== 'hurt') setAct(H, H.moving ? 'run' : 'st');

      let heroY = H.y;
      if (S && S.mounted) {
        const bob = drawHorseMount(c, H.x, H.y, H.dir || 0, H.act || 'st', H.actT || 0, S.mount);
        heroY = H.y - 11 + bob;
      } else {
        c.fillStyle = '#0007'; c.beginPath(); c.ellipse(H.x, H.y, 16, 6, 0, 0, 7); c.fill();
      }

      // Vẽ Phi Phong hào quang & cánh áo choàng phát sáng
      if (typeof CLOAK_SYSTEM !== 'undefined' && CLOAK_SYSTEM.drawCloak) {
        CLOAK_SYSTEM.drawCloak(c, H.x, heroY, H.dir || 0);
      }

      // Vẽ hào quang buff đang active (pulse quanh nhân vật)
      if (R.buffs && Object.keys(R.buffs).length > 0) {
        const buffList = Object.values(R.buffs).filter(b => b.dur > 0);
        if (buffList.length > 0) {
          const t = Date.now() / 1000;
          buffList.forEach((b, i) => {
            const pulse = 0.35 + Math.sin(t * 2 + i * 1.2) * 0.2;
            const r = 22 + i * 6;
            c.globalAlpha = pulse;
            c.strokeStyle = b.col || '#38bdf8';
            c.lineWidth = 2;
            c.beginPath(); c.ellipse(H.x, H.y, r, r * 0.38, 0, 0, 7); c.stroke();
          });
          c.globalAlpha = 1;
        }
      }

      let drawn = false;
      let dollH = 0;
      if (typeof drawDoll === 'function') {
        const dollScale = (typeof HERO_DOLL_SCALE !== 'undefined') ? HERO_DOLL_SCALE : (1 / 0.6);
        dollH = drawDoll(c, H.x, heroY, H.act || 'st', H.dir || 0, H.actT || 0, dollScale, R.deadT > 0 ? 0.45 : 1, S);
        if (dollH > 0) drawn = dollH;
      }
      if (!drawn && hw && hw.anim && typeof drawAnim === 'function') {
        drawn = drawAnim(hw.anim, H.act || 'st', H.dir || 0, H.actT || 0, H.x, heroY, HERO_SCALE);
      }
      if (!drawn && hw && typeof drawSprite === 'function' && typeof img === 'function') {
        drawn = drawSprite(img(hw.img), hw.sz, H.x, heroY, 0.9, H.face < 0, R.deadT > 0 ? 0.35 : 1);
      }
      if (!drawn) {
        c.fillStyle = (typeof SERIES_COL !== 'undefined' && typeof heroSeries === 'function') ? SERIES_COL[heroSeries()] : '#ffd700';
        c.beginPath();
        c.arc(H.x, heroY - 20, 14, 0, 7);
        c.fill();
        drawn = 30;
      }

      // Vẽ Res Ngoại Trang phụ trợ (nếu Paperdoll chưa vẽ)
      if (!dollH && typeof drawHeroEquipment === 'function' && typeof S !== 'undefined' && S && S.eq) {
        drawHeroEquipment(c, H.x, heroY, H.dir || 0, H.face || 1, H.act || 'st', H.actT || 0, S.eq, (typeof heroSeries === 'function' ? heroSeries() : 0));
      }

      if (R.hurtT > 0) { c.fillStyle = '#f004'; c.beginPath(); c.arc(H.x, heroY - 24, 20, 0, 7); c.fill(); }

      const heroLabelY = heroY - (drawn ? Math.min(drawn, 90) * 0.9 : 52) - 6;
      let heroBarCol = '#4fd04f';
      let heroTagPrefix = '';
      let heroTagCol = NAME_COL.hero;
      if (S.pkMode === 'slaughter') {
        heroBarCol = '#ec4899'; // Hồng cánh sen Đồ Sát
        heroTagPrefix = '[Đồ sát] ';
        heroTagCol = '#f472b6';
      } else if (S.pkMode === 'pk') {
        heroBarCol = '#f59e0b'; // Vàng cam PK
        heroTagPrefix = '[PK] ';
        heroTagCol = '#fbbf24';
      }
      const heroMaxLife = (R.P && R.P.life) ? Math.max(1, R.P.life) : 100;
      label(H.x, heroLabelY, `${heroTagPrefix}${S.name || (FAC[S.fac] && FAC[S.fac].n) || ''} · Lv${S.lvl}`, heroTagCol, 12, R.life / heroMaxLife, heroBarCol);

      // Biển hiệu sạp hàng của bản thân (nếu đang bày bán)
      if (S.stall && S.stall.title) {
        const stallText = `🏪 [${S.stall.title}]`;
        c.font = 'bold 11px "IBM Plex Mono", sans-serif';
        const textW = c.measureText(stallText).width;
        const badgeW = textW + 16, badgeH = 20;
        const badgeX = H.x - badgeW / 2, badgeY = heroLabelY - 22;
        c.fillStyle = 'rgba(20, 15, 10, 0.9)';
        c.strokeStyle = '#eab308';
        c.lineWidth = 1.4;
        c.beginPath();
        if (c.roundRect) c.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
        else c.rect(badgeX, badgeY, badgeW, badgeH);
        c.fill();
        c.stroke();
        c.fillStyle = '#fef08a';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(stallText, H.x, badgeY + badgeH / 2);
      }
      continue;
    }
    const sc = e.cls === 'boss' ? 1.15 : e.cls === 'elite' ? 0.95 : 0.8;
    c.fillStyle = '#0007'; c.beginPath(); c.ellipse(e.x, e.y, e.r, e.r * 0.38, 0, 0, 7); c.fill();
    c.strokeStyle = SERIES_COL[e.series]; c.lineWidth = e.cls === 'normal' ? 1.2 : 2.4; c.beginPath(); c.ellipse(e.x, e.y, e.r, e.r * 0.38, 0, 0, 7); c.stroke();
    e.animKey = MON[e.tid].anim; stepAct(e, dt, e.moving ? 'run' : 'st');
    const ah = e.animKey && drawAnim(e.animKey, e.act || 'st', e.dir || 0, e.actT || 0, e.x, e.y, sc * MON_SCALE, e.hitT > 0 ? 0.75 : 1);
    if (!ah && !drawSprite(e.img, e.sz, e.x, e.y, sc, e.face < 0, e.hitT > 0 ? 0.6 : 1)) { c.fillStyle = SERIES_COL[e.series]; c.beginPath(); c.arc(e.x, e.y - e.r, e.r, 0, 7); c.fill(); }
    if (e.hitT > 0) e.hitT -= dt;
    const top = e.y - (ah ? Math.min(ah, 90) * 0.85 : e.img && e.img.naturalHeight ? e.img.naturalHeight * sc : e.r * 2) - 8;
    label(e.x, top, enemyName(e), e.goldBoss ? NAME_COL.gold : NAME_COL[e.cls] || NAME_COL.normal, e.cls === 'boss' ? 12 : 11, e.hp / e.max, e.cls === 'boss' ? '#ff5030' : '#e03a2a');
    if (e.poison > 0) { c.fillStyle = '#8fe34a'; c.fillRect(e.x - 22, top + 5, 44 * e.poison / 3, 2); }
  }
  // hieu ung
  R.fx = R.fx.filter(f => {
    if (f.k === 'spark') {
      f.life -= dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vy += 150 * dt; // gia toc roi nhe
      const a = clamp(f.life / f.max, 0, 1);
      c.globalAlpha = a;
      c.fillStyle = f.color;
      c.beginPath();
      c.arc(f.x, f.y, Math.max(0.6, f.size * a), 0, Math.PI * 2);
      c.fill();
      return f.life > 0;
    }
    if (f.k !== 'mis' && f.k !== 'boom') return true;
    const ok = stepFx(f, dt);
    if (ok) drawFx(f);
    return ok;
  });
  for (const f of R.fx) {
    if (f.k === 'mis' || f.k === 'boom' || f.k === 'spark') continue;
    f.life -= dt; const a = clamp(f.life / f.max, 0, 1);
    c.globalAlpha = a; c.strokeStyle = f.color;
    if (f.k === 'line') { c.lineWidth = 3; c.beginPath(); c.moveTo(f.x1, f.y1); c.lineTo(f.x2, f.y2); c.stroke(); }
    else { c.lineWidth = 2; c.beginPath(); c.arc(f.x, f.y - 10, 8 + (1 - a) * 30, 0, 7); c.stroke(); }
  }
  c.globalAlpha = 1; R.fx = R.fx.filter(f => f.life > 0);
  c.textAlign = 'center';
  flushLabels();                                                            // ten + thanh mau tren dau (chong chong nhau)
  if (typeof drawOtherPlayerSpeechBubbles === 'function') drawOtherPlayerSpeechBubbles(c); // bong bong chat nguoi choi khac
  for (const t of R.txt) { t.life -= dt; t.y -= 32 * dt; c.globalAlpha = clamp(t.life / 0.5, 0, 1); c.font = `${t.size}px "IBM Plex Mono", monospace`; c.fillStyle = '#000'; c.fillText(t.t, t.x + 1, t.y + 1); c.fillStyle = t.color; c.fillText(t.t, t.x, t.y); }
  c.globalAlpha = 1; R.txt = R.txt.filter(t => t.life > 0);
  c.setTransform(DPR, 0, 0, DPR, 0, 0);                                     // lop giao dien: toa do man hinh
  if (typeof drawJoystick === 'function') drawJoystick(c);
  // HUD buff icons: hiện buff đang active (góc trên trái, cạnh icon HP/MP)
  if (R.buffs) {
    const buffList = Object.entries(R.buffs).filter(([, b]) => b.dur > 0);
    if (buffList.length > 0) {
      const bx0 = 8, by0 = AR.top + 4, bsz = 22, bpad = 4;
      buffList.forEach(([, b], i) => {
        const bx = bx0 + i * (bsz + bpad);
        const dur = Math.max(0, b.dur), maxDur = 30;
        const frac = dur / maxDur;
        // Nền ô
        c.globalAlpha = 0.82;
        c.fillStyle = '#0a0806cc';
        c.strokeStyle = b.col || '#38bdf8';
        c.lineWidth = 1.5;
        c.beginPath();
        if (c.roundRect) c.roundRect(bx, by0, bsz, bsz, 4);
        else c.rect(bx, by0, bsz, bsz);
        c.fill(); c.stroke();
        // Vòng đếm ngược buff
        const cx = bx + bsz / 2, cy = by0 + bsz / 2, r = bsz / 2 - 2;
        c.globalAlpha = 0.55;
        c.fillStyle = (b.col || '#38bdf8') + '44';
        c.beginPath(); c.moveTo(cx, cy);
        c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); c.closePath(); c.fill();
        // Tên buff ngắn
        c.globalAlpha = 1;
        c.font = '6px "IBM Plex Mono", monospace';
        c.fillStyle = b.col || '#38bdf8';
        c.textAlign = 'center';
        const shortName = (b.name || '').slice(0, 4);
        c.fillText(shortName, cx, by0 + bsz - 4);
        // Thời gian còn
        if (dur > 0) {
          c.font = 'bold 7px "IBM Plex Mono", monospace';
          c.fillStyle = '#fff';
          c.fillText(Math.ceil(dur) + 's', cx, by0 + bsz / 2 + 2);
        }
      });
      c.globalAlpha = 1;
    }
  }
  drawMinimap(c);
  if (R.banner && R.banner.t > 0) {
    R.banner.t -= dt;
    c.globalAlpha = clamp(R.banner.t, 0, 1);
    c.font = 'bold 15px "IBM Plex Mono", monospace';
    const tw = Math.max(c.measureText(R.banner.text).width, R.banner.sub ? c.measureText(R.banner.sub).width : 0);
    const bw = Math.min(Math.max(tw + 48, 180), AR.w - 32);
    const bh = R.banner.sub ? 52 : 36;
    const bx = (AR.w - bw) / 2, by = AR.h * 0.35;

    // Dark radial/linear background with gold border
    const bgGrad = c.createLinearGradient(bx, by, bx, by + bh);
    bgGrad.addColorStop(0, '#2b1f13ee');
    bgGrad.addColorStop(0.5, '#15100cee');
    bgGrad.addColorStop(1, '#0a0806fa');
    c.fillStyle = bgGrad;
    c.beginPath();
    c.roundRect(bx, by, bw, bh, 8);
    c.fill();

    // Outer & inner gold stroke
    c.strokeStyle = '#c89b3c';
    c.lineWidth = 1.8;
    c.stroke();
    c.strokeStyle = '#5a4425';
    c.lineWidth = 1;
    c.strokeRect(bx + 3, by + 3, bw - 6, bh - 6);

    // Decorative corner dots
    c.fillStyle = '#ffd700';
    c.beginPath();
    c.arc(bx + 8, by + bh / 2, 2.5, 0, 7);
    c.arc(bx + bw - 8, by + bh / 2, 2.5, 0, 7);
    c.fill();

    // Text rendering
    c.textAlign = 'center';
    c.shadowColor = '#000000';
    c.shadowBlur = 4;
    c.fillStyle = '#ffd700';
    c.fillText(R.banner.text, AR.w / 2, by + (R.banner.sub ? 23 : 23));
    if (R.banner.sub) {
      c.font = '11px "IBM Plex Mono", monospace';
      c.fillStyle = '#e2d5b5';
      c.fillText(R.banner.sub, AR.w / 2, by + 41);
    }
    c.shadowBlur = 0;
    c.globalAlpha = 1;
  }
}
