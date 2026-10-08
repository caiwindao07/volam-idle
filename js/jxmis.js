// js/jxmis.js
var jmGenTime = function jmGenTime(g, i, n) {
  const wait = g ? g[5] : 0, st = g ? g[3] : 0, d = g ? g[4] : 0;
  switch (st) {
    case 1: return wait + d;
    case 2: return wait + i * d;
    case 3: return Math.max(0, wait + i * d + (Math.random() < 0.5 ? Math.random() * d : -Math.random() * d / 2));
    case 4: return wait + Math.random() * d;
    case 5: return n <= 1 ? wait : wait + Math.abs(i - Math.floor(n / 2)) * d;
  }
  return wait;
};
var jmSpawn = function jmSpawn(mid, x, y, ang, tgt, delay, opt) {
  const m = JFX.m[mid]; if (!m || R.quiet || R.fx.length > JM_MAX) return null;
  const k = jmK(mid) || [m.fly ? 1 : 0, 16, Math.round((m.spd || 360) / JM_FPS), 10, 0, 0, 1, 1, 0, 1, 0, 0];
  let [kind, life, spd, h, zs, za, loop, cv, ae, cr] = k;
  if (!m.fly) { kind = 0; life = 1; }                                   // chi co hinh no: phat no ngay
  if (JM_OV) { if (JM_OV.life) life = JM_OV.life; if (JM_OV.spd) spd = JM_OV.spd; }   // cap chieu ghi de LifeTime / Speed (KSkill: missle_lifetime_v, missle_speed_v)
  life = clamp(life || 12, 1, 72);                                      // toi da 4 giay (vd Nghiep Hoa 181 khung)
  const o = { k: 'jm', life: 1, m, mid, kind, lf: life, spd: spd || 0, x, y, z: h * (za ? 1 : 0), vz: zs / 1024, za: za / 1024, hz: za ? 0 : h,
    loop: !!loop, cv: !!cv, ae: !!ae, cr: 10 + (cr || 1) * 14, age: -(delay || 0), ang, tgt: tgt || null, hit: false,
    cx: opt && opt.cx, cy: opt && opt.cy, rad: opt && opt.rad || 0, spin: opt && opt.spin || 1, sh: JM_OV && JM_OV.sh || 0, tr: [] };
  if (kind === 3 || kind === 4) { o.cx = o.cx != null ? o.cx : H.x; o.cy = o.cy != null ? o.cy : H.y; o.rad = o.rad || Math.max(30, Math.hypot(x - o.cx, (y - o.cy) * 2)); }
  R.fx.push(o); return o;
};
var jmBoom = function jmBoom(o, x, y) {
  const s = o.m.hit; if (!s || R.fx.length > JM_MAX) return;
  (R.fxQ || (R.fxQ = [])).push({ k: 'boom', s, x, y, t: 0, life: animDur(s), dir: 0 });   // goi trong luc loc R.fx: xep hang, them sau
};
var jmFrame = function jmFrame(o) {
  if (o.sh) { o.tr.push([o.x, o.y]); if (o.tr.length > o.sh) o.tr.shift(); }
  const step = (a, sp) => { o.x += Math.cos(a) * sp; o.y += Math.sin(a) * sp / 2; };
  switch (o.kind) {
    case 1: case 7: case 8: case 100: step(o.ang, o.spd); break;
    case 5: if (o.tgt && !o.tgt.dead && Math.floor(o.age) % 8 === 0) o.ang = jmAng(o.tgt.x - o.x, o.tgt.y - 14 - o.y); step(o.ang, o.spd); break;   // duoi muc tieu (doi huong moi 8 khung)
    case 2: o.ang += (Math.random() - 0.5) * 0.9; step(o.ang, o.spd); break;
    case 3: case 4: {                                                   // vong quanh nguoi ra chieu / xoan oc no rong dan
      o.ang += JM_DIR * o.spin; if (o.kind === 4) o.rad += (o.spd + 50) * JM_DIR;
      const cx = o.kind === 3 ? H.x : o.cx, cy = o.kind === 3 ? H.y : o.cy;
      o.x = cx + Math.cos(o.ang) * o.rad; o.y = cy - 14 + Math.sin(o.ang) * o.rad / 2; break;
    }
  }
  if (o.za) { o.z = Math.max(0, o.z + o.vz); o.vz -= o.za; }               // KMissle::ZAxisMove
};
var jmStep = function jmStep(o, dt) {
  const prev = o.age; o.age += dt * JM_FPS; if (o.age < 0) return true;
  if (OBS.g && o.kind && o.kind !== 3 && o.kind !== 4 && !obsAt(o.x, o.y + 14)) return false;   // dan cham tuong: tan (TestBarrier)
  for (let f = Math.max(0, Math.floor(prev)) + 1; f <= Math.floor(o.age) && f <= o.lf; f++) jmFrame(o);
  const t = o.tgt;
  if (t && !o.hit && o.kind && !(o.za && o.z > 20)) {                    // va cham (CheckCollision): dan bay toi quai
    if (Math.hypot(o.x - t.x, (o.y - (t.y - 14)) * 2) < o.cr) { o.hit = true; jmBoom(o, t.x, t.y - 14); if (o.cv) return false; }
  }
  if (o.age >= o.lf) {                                                   // het doi: no (AutoExplode / dan dung yen / roi cham dat)
    if (!o.hit && (o.ae || !o.kind || o.za)) jmBoom(o, o.x, o.y);
    return false;
  }
  return true;
};
var jmDraw = function jmDraw(o) {
  if (o.age < 0) return;
  const s = o.m.fly; if (!s) return;
  const n = s.n, itv = Math.max(1, Math.round(s.ms / (1000 / JM_FPS)));
  const fr = o.loop ? Math.floor(o.age / itv) % n : Math.min(n - 1, Math.floor(n * o.age / o.lf));   // KMissleRes::Draw
  const dir = s.d > 1 ? dir16(Math.cos(o.ang), Math.sin(o.ang) / 2) : 0;
  if (o.sh && o.tr.length) { const c = CX, a0 = c.globalAlpha;   // bong mo: cac vi tri truoc, mo dan
    o.tr.forEach((p, i) => { c.globalAlpha = a0 * 0.55 * (i + 1) / (o.tr.length + 1); drawFxSprite(s, dir, (fr + 0.5) * s.ms / 1000, p[0], p[1] - (o.z + o.hz) * JM_Z, false); });
    c.globalAlpha = a0; }
  drawFxSprite(s, dir, (fr + 0.5) * s.ms / 1000, o.x, o.y - (o.z + o.hz) * JM_Z, false);
};
var jmCast = function jmCast(mid, form, n, g, a, b, tgt) {
  const ax = a.x, ay = a.y - 20, bx = b.x, by = b.y - 14, ang = jmAng(bx - ax, by - ay);
  const v1 = g ? g[1] : 0, v2 = g ? g[2] : 0, kin = jmK(mid), moving = kin ? kin[0] !== 0 : !!(JFX.m[mid] || {}).fly;
  const T = i => jmGenTime(g, i, n);
  const off = (x, y, a2, d) => [x + Math.cos(a2) * d, y + Math.sin(a2) * d / 2];
  if (form === 8 && moving) {                                            // Melee_AttackWithBlur: dan bay tu nguoi ra chieu toi muc tieu (doi ngan, de bong mo)
    for (let i = 0; i < n; i++) jmSpawn(mid, ax, ay, ang, tgt, i * Math.max(3, v1 || 4), null);
    return;
  }
  if (form >= 8) {                                                       // can chien: n don lien tiep vao muc tieu
    for (let i = 0; i < n; i++) jmSpawn(mid, bx + (n > 1 ? rnd(-14, 14) : 0), by + (n > 1 ? rnd(-8, 8) : 0), ang, tgt, i * Math.max(3, v1 || 4), null);
    return;
  }
  switch (form) {
    case 0: {                                                            // tuong vuong goc huong ban
      const sp = v1 || 32, pa = ang + Math.PI / 2, [cx, cy] = moving ? [ax, ay] : [bx, by];
      for (let i = 0; i < n; i++) { const d = (i - (n - 1) / 2) * sp, [x, y] = off(cx, cy, pa, d); jmSpawn(mid, x, y, v2 ? ang : pa, tgt, T(i)); }
      return;
    }
    case 1: {                                                            // hang doc theo huong ban
      const sp = v1 || 24;
      for (let i = 0; i < n; i++) {
        let x, y;
        if (v2) { const side = i % 2 ? 1 : -1, k = Math.ceil(i / 2); [x, y] = off(ax, ay, ang + Math.PI / 2, side * k * sp); }
        else [x, y] = off(ax, ay, ang, sp * i);
        jmSpawn(mid, x, y, ang, tgt, T(i));
      }
      return;
    }
    case 2: {                                                            // quat: lech v1 huong (64 huong / vong)
      const st = (v1 || 2) * JM_DIR, [x, y] = off(ax, ay, ang, v2 || 0);
      for (let i = 0; i < n; i++) jmSpawn(mid, x, y, ang + (i - Math.floor(n / 2)) * st, tgt, T(i));
      return;
    }
    case 3: {                                                            // vong tron quanh nguoi ra chieu
      for (let i = 0; i < n; i++) { const a2 = ang + i * Math.PI * 2 / n, [x, y] = off(ax, ay, a2, v2 || 20); jmSpawn(mid, x, y, a2, null, T(i), { cx: ax, cy: ay + 14 }); }
      return;
    }
    case 4: for (let i = 0; i < n; i++) jmSpawn(mid, bx + (n > 1 ? rnd(-50, 50) : 0), by + (n > 1 ? rnd(-26, 26) : 0), ang, tgt, T(i) + (g ? 0 : i * 2)); return;
    default: {                                                           // 5 vung, 6 tai muc tieu, 7 tai nguoi: luoi n x n o 32 diem MPS
      const [cx, cy] = form === 7 ? [ax, ay + 20] : [bx, by], N = Math.min(n, 6), all = [];
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        if (v1 === 1 && N > 2 && ((i - (N - 1) / 2) ** 2 + (j - (N - 1) / 2) ** 2) > N * N / 4) continue;   // vung tron
        all.push([i * N + j, cx + (j - (N - 1) / 2) * 32, cy + (i - (N - 1) / 2) * 16]);
      }
      const pick = all.length > 20 ? all.sort(() => Math.random() - 0.5).slice(0, 20) : all;
      for (const [k, x, y] of pick) jmSpawn(mid, x + (N > 1 ? rnd(-6, 6) : 0), y + (N > 1 ? rnd(-4, 4) : 0), ang, tgt, T(k));
    }
  }
};
var skillFx = function skillFx(a, b, atk) {
  const f = (atk.id && JFX.f && JFX.f[atk.id]) || {}, mid = f.c || JFX.s[atk.id], m = atk.id && JFX.m[mid];
  castFx(atk);
  if (!m || R.quiet) { fxLine(a, b, atk); return; }
  const g = JFX.g && JFX.g[atk.id], form = g ? g[0] : (f.form === undefined ? 1 : f.form);
  const n = clamp(atk.nMis > 1 ? Math.max(atk.nMis, 1) : (g && g[6]) || f.num || 1, 1, 16);
  const sk = SK[atk.id], lv = atk.L || 1, sv = k => (sk && sk.attr && sk.attr[k] ? (skVal(sk, k, lv) || [0])[0] : 0);
  JM_OV = window.NO_JMOV ? null : form === 8 || JM_FLY[atk.id] ? { life: sv('missle_lifetime_v'), spd: sv('missle_speed_v'), sh: JM_SHADOW[atk.id] || 0 } : { sh: JM_SHADOW[atk.id] || 0 };   // chieu can chien bong mo (form 8): doi / toc do dan theo cap chieu
  const fly = JM_FLY[atk.id], life = JM_OV && JM_OV.life;
  try { jmCast(mid, form, S.lowFx ? Math.min(n, 3) : n, g, a, b, b); } finally { JM_OV = null; }
  if (fly && life >= fly.t) { const at = { x: b.x, y: b.y + 6 }; for (let k = fly.t; k <= life; k += fly.t) setTimeout(() => { if (!R.quiet) jmCast(fly.mid, fly.form, fly.n, null, at, b, null); }, k / JM_FPS * 1000); }   // FlyEvent: kim toa ra   // che do hieu ung nhe: toi da 3 dan
  if (f.sub && String(f.sub.c) !== String(mid)) setTimeout(() => { if (!R.quiet) jmCast(f.sub.c, f.sub.form === 3 ? 3 : 4, clamp(f.sub.n || 1, 1, 8), null, { x: b.x, y: b.y + 6 }, b, null); }, 250);   // chieu con theo su kien (Tu Tuong Dong Quy: 4 cuc bang toa ra)
};

if (typeof window !== 'undefined') {
  window.skillFx = skillFx;
  window.jmSpawn = jmSpawn;
  window.jmBoom = jmBoom;
  window.jmFrame = jmFrame;
  window.jmStep = jmStep;
  window.jmDraw = jmDraw;
  window.jmCast = jmCast;
}
