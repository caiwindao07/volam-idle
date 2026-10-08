"use strict";

const JM_FPS = 18;
const JM_MAX = 160;
const JM_DIR = Math.PI * 2 / 64;
const JM_Z = 0.5;

const jmK = t => (typeof JFX !== "undefined" && JFX.k && JFX.k[t]) || (typeof JM_K_ADD !== "undefined" && JM_K_ADD[t]) || null;
const JM_SHADOW = {
  10: 5, 11: 5, 32: 5, 37: 5, 40: 5, 41: 5,
  267: 5, 271: 2, 318: 5, 320: 5, 322: 5, 323: 5, 324: 5, 325: 5,
  368: 5, 395: 5
};

if (typeof JFX !== "undefined") {
  if (JFX.f && JFX.f[10]) JFX.f[10].c = 140;
  if (JFX.s) JFX.s[10] = 140;
}

const JM_FLY = { 302: { t: 30, mid: 126, n: 8, form: 3 } };
const JM_K_ADD = {
  179: [0, 15, 0, 15, 0, 0, 0, 0, 1, 2, 0, 0],
  188: [0, 22, 0, 10, 0, 0, 0, 0, 1, 3, 0, 0],
  195: [0, 15, 0, 10, 0, 0, 1, 1, 0, 3, 0, 0]
};
const JM_FOLLOW = new Set([150, 179, 188, 195]);
const JM_COL = { 351: 352 };
let JM_OV = null;

const jmAng = (t, e) => Math.atan2(e * 2, t);

function jmGenTime(t, e, n) {
  const s = t ? t[5] : 0, f = t ? t[3] : 0, u = t ? t[4] : 0;
  switch (f) {
    case 1: return s + u;
    case 2: return s + e * u;
    case 3: return Math.max(0, s + e * u + (Math.random() < 0.5 ? Math.random() * u : -Math.random() * u / 2));
    case 4: return s + Math.random() * u;
    case 5: return n <= 1 ? s : s + Math.abs(e - Math.floor(n / 2)) * u;
  }
  return s;
}

function jmSpawn(t, e, n, s, f, u, r) {
  const l = typeof JFX !== "undefined" && JFX.m && JFX.m[t];
  if (!l || (typeof R !== "undefined" && (R.quiet || (R.fx && R.fx.length > 160)))) return null;
  const M = jmK(t) || [l.fly ? 1 : 0, 16, Math.round((l.spd || 360) / 18), 10, 0, 0, 1, 1, 0, 1, 0, 0];
  let [x, m, d, J, g, _, v, y, F, a] = M;
  if (!l.fly) { x = 0; m = 1; }
  if (JM_OV) {
    if (JM_OV.life) m = JM_OV.life;
    if (JM_OV.spd) d = JM_OV.spd;
  }
  m = typeof clamp === "function" ? clamp(m || 12, 1, 72) : Math.min(Math.max(m || 12, 1), 72);
  const i = {
    k: "jm",
    life: 1,
    m: l,
    mid: t,
    kind: x,
    lf: m,
    spd: d || 0,
    x: e,
    y: n,
    z: J * (_ ? 1 : 0),
    vz: g / 1024,
    za: _ / 1024,
    hz: _ ? 0 : J,
    loop: !v,
    cv: !y,
    ae: !F,
    cr: 10 + (a || 1) * 14,
    age: -(u || 0),
    ang: s,
    tgt: f || null,
    hit: false,
    cx: r && r.cx,
    cy: r && r.cy,
    rad: (r && r.rad) || 0,
    spin: (r && r.spin) || 1,
    sh: (JM_OV && JM_OV.sh) || 0,
    tr: []
  };
  if (x === 3 || x === 4) {
    i.cx = i.cx != null ? i.cx : (typeof H !== "undefined" ? H.x : e);
    i.cy = i.cy != null ? i.cy : (typeof H !== "undefined" ? H.y : n);
    i.rad = i.rad || Math.max(30, Math.hypot(e - i.cx, (n - i.cy) * 2));
  }
  if (typeof R !== "undefined" && R.fx) R.fx.push(i);
  return i;
}

function jmBoom(t, e, n) {
  const s = t && t.m && t.m.hit;
  if (!s || (typeof R !== "undefined" && R.fx && R.fx.length > 160)) return;
  const dur = typeof animDur === "function" ? animDur(s) : 0.4;
  (R.fxQ || (R.fxQ = [])).push({ k: "boom", s, x: e, y: n, t: 0, life: dur, dir: 0 });
}

function jmFrame(t) {
  if (t.kind === 0 && JM_FOLLOW.has(t.mid) && t.tgt && !t.tgt.dead) {
    t.x = t.tgt.x;
    t.y = t.tgt.y - 14;
  }
  if (t.sh) {
    t.tr.push([t.x, t.y]);
    if (t.tr.length > t.sh) t.tr.shift();
  }
  const e = (n, s) => {
    t.x += Math.cos(n) * s;
    t.y += Math.sin(n) * s / 2;
  };
  switch (t.kind) {
    case 1:
    case 7:
    case 8:
    case 100:
      e(t.ang, t.spd);
      break;
    case 5:
      if (t.tgt && !t.tgt.dead && Math.floor(t.age) % 8 === 0) {
        t.ang = jmAng(t.tgt.x - t.x, t.tgt.y - 14 - t.y);
      }
      e(t.ang, t.spd);
      break;
    case 2:
      t.ang += (Math.random() - 0.5) * 0.9;
      e(t.ang, t.spd);
      break;
    case 3:
    case 4: {
      t.ang += JM_DIR * t.spin;
      if (t.kind === 4) t.rad += (t.spd + 50) * JM_DIR;
      const n = t.kind === 3 ? (typeof H !== "undefined" ? H.x : t.cx) : t.cx;
      const s = t.kind === 3 ? (typeof H !== "undefined" ? H.y : t.cy) : t.cy;
      t.x = n + Math.cos(t.ang) * t.rad;
      t.y = s - 14 + Math.sin(t.ang) * t.rad / 2;
      break;
    }
  }
  if (t.za) {
    t.z = Math.max(0, t.z + t.vz);
    t.vz -= t.za;
  }
}

function jmStep(t, e) {
  const n = t.age;
  t.age += e * 18;
  if (t.age < 0) return true;
  if (typeof OBS !== "undefined" && OBS.g && t.kind && t.kind !== 3 && t.kind !== 4 && typeof obsAt === "function" && !obsAt(t.x, t.y + 14)) return false;
  for (let f = Math.max(0, Math.floor(n)) + 1; f <= Math.floor(t.age) && f <= t.lf; f++) jmFrame(t);
  const s = t.tgt;
  if (s && !t.hit && t.kind && !(t.za && t.z > 20) && Math.hypot(t.x - s.x, (t.y - (s.y - 14)) * 2) < t.cr) {
    t.hit = true;
    jmBoom(t, s.x, s.y - 14);
    if (t.cv) return false;
  }
  if (t.age >= t.lf) {
    if (!t.hit && (t.ae || !t.kind || t.za)) jmBoom(t, t.x, t.y);
    return false;
  }
  return true;
}

function jmDraw(t) {
  if (t.age < 0) return;
  const e = t.m && t.m.fly;
  if (!e) return;
  const n = e.n, s = Math.max(1, Math.round(e.ms / (1000 / 18)));
  const f = t.loop ? Math.floor(t.age / s) % n : Math.min(n - 1, Math.floor(n * t.age / t.lf));
  const u = e.d > 1 && typeof dir16 === "function" ? dir16(Math.cos(t.ang), Math.sin(t.ang) / 2) : 0;
  if (t.sh && t.tr.length && typeof CX !== "undefined") {
    const r = CX, l = r.globalAlpha;
    t.tr.forEach((M, x) => {
      r.globalAlpha = l * 0.55 * (x + 1) / (t.tr.length + 1);
      if (typeof drawFxSprite === "function") {
        drawFxSprite(e, u, (f + 0.5) * e.ms / 1000, M[0], M[1] - (t.z + t.hz) * JM_Z, false);
      }
    });
    r.globalAlpha = l;
  }
  if (typeof drawFxSprite === "function") {
    drawFxSprite(e, u, (f + 0.5) * e.ms / 1000, t.x, t.y - (t.z + t.hz) * JM_Z, false);
  }
}

function jmCast(t, e, n, s, f, u, r) {
  const l = f.x, M = f.y - 20, x = u.x, m = u.y - 14;
  const d = jmAng(x - l, m - M);
  const J = s ? s[1] : 0, g = s ? s[2] : 0;
  const _ = jmK(t), v = _ ? _[0] !== 0 : !!(typeof JFX !== "undefined" && JFX.m && JFX.m[t] && JFX.m[t].fly);
  const y = a => jmGenTime(s, a, n);
  const F = (a, i, c, h) => [a + Math.cos(c) * h, i + Math.sin(c) * h / 2];

  if (e === 8 && v) {
    for (let a = 0; a < n; a++) jmSpawn(t, l, M, d, r, a * Math.max(3, J || 4), null);
    return;
  }
  if (e >= 8) {
    for (let a = 0; a < n; a++) jmSpawn(t, x + (n > 1 && typeof rnd === "function" ? rnd(-14, 14) : 0), m + (n > 1 && typeof rnd === "function" ? rnd(-8, 8) : 0), d, r, a * Math.max(3, J || 4), null);
    return;
  }
  switch (e) {
    case 0: {
      const a = J || 32, i = d + Math.PI / 2, [c, h] = v ? [l, M] : [x, m];
      for (let z = 0; z < n; z++) {
        const p = (z - (n - 1) / 2) * a, [X, o] = F(c, h, i, p);
        jmSpawn(t, X, o, g ? d : i, r, y(z));
      }
      return;
    }
    case 1: {
      const a = J || 24;
      for (let i = 0; i < n; i++) {
        let c, h;
        if (g) {
          const z = i % 2 ? 1 : -1, p = Math.ceil(i / 2);
          [c, h] = F(l, M, d + Math.PI / 2, z * p * a);
        } else {
          [c, h] = F(l, M, d, a * i);
        }
        jmSpawn(t, c, h, d, r, y(i));
      }
      return;
    }
    case 2: {
      const a = (J || 2) * JM_DIR, [i, c] = F(l, M, d, g || 0);
      for (let h = 0; h < n; h++) jmSpawn(t, i, c, d + (h - Math.floor(n / 2)) * a, r, y(h));
      return;
    }
    case 3: {
      for (let a = 0; a < n; a++) {
        const i = d + a * Math.PI * 2 / n, [c, h] = F(l, M, i, g || 20);
        jmSpawn(t, c, h, i, null, y(a), { cx: l, cy: M + 14 });
      }
      return;
    }
    case 4:
      for (let a = 0; a < n; a++) jmSpawn(t, x + (n > 1 && typeof rnd === "function" ? rnd(-50, 50) : 0), m + (n > 1 && typeof rnd === "function" ? rnd(-26, 26) : 0), d, r, y(a) + (s ? 0 : a * 2));
      return;
    default: {
      const [a, i] = e === 7 ? [l, M + 20] : [x, m], c = Math.min(n, 6), h = [];
      for (let p = 0; p < c; p++) {
        for (let X = 0; X < c; X++) {
          if (J === 1 && c > 2 && (p - (c - 1) / 2) ** 2 + (X - (c - 1) / 2) ** 2 > c * c / 4) continue;
          h.push([p * c + X, a + (X - (c - 1) / 2) * 32, i + (p - (c - 1) / 2) * 16]);
        }
      }
      const z = h.length > 20 ? h.sort(() => Math.random() - 0.5).slice(0, 20) : h;
      for (const [p, X, o] of z) jmSpawn(t, X + (c > 1 && typeof rnd === "function" ? rnd(-6, 6) : 0), o + (c > 1 && typeof rnd === "function" ? rnd(-4, 4) : 0), d, r, y(p));
    }
  }
}

function skillFx(t, e, n) {
  if (!n) return;
  let s = (n.id && typeof JFX !== "undefined" && JFX.f && JFX.f[n.id]) || {};
  let f = typeof JFX !== "undefined" && JFX.g && JFX.g[n.id];
  const u = typeof SK !== "undefined" && SK[n.id];
  const r = u && u.child;
  const l = r && typeof JFX !== "undefined" && JFX.g && JFX.g[r];
  let M = false;

  if (f && f[0] === 12 && l && JFX.f && JFX.f[r] && JFX.f[r].c) {
    s = Object.assign({}, JFX.f[r], { pre: s.pre });
    f = l;
    M = true;
  }

  const x = s.c || (typeof JFX !== "undefined" && JFX.s && JFX.s[n.id]);
  const m = n.id && typeof JFX !== "undefined" && JFX.m && JFX.m[x];

  if (typeof castFx === "function") castFx(n, t);
  if (!m || (typeof R !== "undefined" && R.quiet)) {
    if (typeof fxLine === "function") fxLine(t, e, n);
    return;
  }

  const d = f ? f[0] : (s.form === undefined ? 1 : s.form);
  const countLim = clamp(!M && n.nMis > 1 ? Math.max(n.nMis, 1) : (f && f[6]) || s.num || 1, 1, 16);
  const J = countLim;
  const g = typeof SK !== "undefined" && SK[n.id];
  const _ = n.L || 1;
  const v = a => (g && g.attr && g.attr[a] && typeof skVal === "function" ? (skVal(g, a, _) || [0])[0] : 0);

  JM_OV = (typeof window !== "undefined" && window.NO_JMOV) ? null : (d === 8 || JM_FLY[n.id] ? {
    life: v("missle_lifetime_v"),
    spd: v("missle_speed_v"),
    sh: JM_SHADOW[n.id] || 0
  } : {
    sh: JM_SHADOW[n.id] || 0
  });

  const y = JM_FLY[n.id];
  const F = JM_OV && JM_OV.life;

  try {
    const castCount = (typeof S !== "undefined" && S && S.lowFx) ? Math.min(J, 3) : J;
    jmCast(x, d, castCount, f, t, e, e);
  } finally {
    JM_OV = null;
  }

  if (y && F && v("skill_flyevent")) {
    const a = { x: e.x, y: e.y + 6 };
    for (let i = 0; i < F; i += y.t) {
      setTimeout(() => {
        if (typeof R !== "undefined" && !R.quiet) jmCast(y.mid, y.form, y.n, null, a, e, null);
      }, i / 18 * 1000);
    }
  }

  if (JM_COL[n.id] && typeof ev2Cast === "function" && e && e.x != null) {
    ev2Cast(e, n, { sid: JM_COL[n.id] });
  }

  if (s.sub && String(s.sub.c) !== String(x)) {
    setTimeout(() => {
      if (typeof R !== "undefined" && !R.quiet) {
        jmCast(s.sub.c, s.sub.form === 3 ? 3 : 4, clamp(s.sub.n || 1, 1, 8), null, { x: e.x, y: e.y + 6 }, e, null);
      }
    }, 250);
  }
}

if (typeof window !== "undefined") {
  window.skillFx = skillFx;
  window.jmSpawn = jmSpawn;
  window.jmBoom = jmBoom;
  window.jmFrame = jmFrame;
  window.jmStep = jmStep;
  window.jmDraw = jmDraw;
  window.jmCast = jmCast;
}
