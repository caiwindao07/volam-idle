// js/jxstate.js
'use strict';

/* hieu ung trang thai vo cong tu client (jxmap) */
window.JXST = {"15": {"f": "fx/st_0.webp", "n": 13, "w": 342, "h": 239, "ax": 177, "ay": 168, "ms": 92, "pos": "body"}, "16": {"f": "fx/st_1.webp", "n": 10, "w": 107, "h": 75, "ax": 50, "ay": 37, "ms": 120, "pos": "foot"}, "33": {"f": "fx/st_2.webp", "n": 10, "w": 36, "h": 40, "ax": 16, "ay": 116, "ms": 120, "pos": "head"}, "42": {"f": "fx/st_3.webp", "n": 20, "w": 75, "h": 78, "ax": 35, "ay": 72, "ms": 60, "pos": "body"}, "64": {"f": "fx/st_4.webp", "n": 24, "w": 87, "h": 109, "ax": 41, "ay": 158, "ms": 50, "pos": "head"}, "67": {"f": "fx/st_5.webp", "n": 24, "w": 93, "h": 123, "ax": 44, "ay": 163, "ms": 50, "pos": "head"}, "69": {"f": "fx/st_6.webp", "n": 24, "w": 115, "h": 104, "ax": 55, "ay": 50, "ms": 50, "pos": "foot"}, "70": {"f": "fx/st_7.webp", "n": 24, "w": 89, "h": 117, "ax": 42, "ay": 161, "ms": 50, "pos": "head"}, "72": {"f": "fx/st_8.webp", "n": 24, "w": 83, "h": 109, "ax": 39, "ay": 159, "ms": 50, "pos": "head"}, "73": {"f": "fx/st_9.webp", "n": 20, "w": 101, "h": 86, "ax": 55, "ay": 77, "ms": 60, "pos": "body"}, "86": {"f": "fx/st_10.webp", "n": 16, "w": 91, "h": 64, "ax": 47, "ay": 35, "ms": 75, "pos": "foot"}, "89": {"f": "fx/st_11.webp", "n": 16, "w": 92, "h": 65, "ax": 47, "ay": 35, "ms": 75, "pos": "foot"}, "90": {"f": "fx/st_12.webp", "n": 15, "w": 37, "h": 43, "ax": 18, "ay": 109, "ms": 80, "pos": "head"}, "92": {"f": "fx/st_13.webp", "n": 15, "w": 99, "h": 75, "ax": 51, "ay": 43, "ms": 80, "pos": "foot"}, "100": {"f": "fx/st_14.webp", "n": 16, "w": 139, "h": 100, "ax": 70, "ay": 95, "ms": 75, "pos": "body"}, "109": {"f": "fx/st_15.webp", "n": 16, "w": 122, "h": 138, "ax": 59, "ay": 102, "ms": 75, "pos": "body"}, "130": {"f": "fx/st_16.webp", "n": 16, "w": 130, "h": 98, "ax": 68, "ay": 83, "ms": 75, "pos": "body"}, "136": {"f": "fx/st_17.webp", "n": 5, "w": 75, "h": 58, "ax": -121, "ay": -82, "ms": 240, "pos": "head"}, "137": {"f": "fx/st_18.webp", "n": 15, "w": 64, "h": 52, "ax": 31, "ay": 117, "ms": 80, "pos": "head"}, "140": {"f": "fx/st_19.webp", "n": 15, "w": 67, "h": 55, "ax": 34, "ay": 119, "ms": 80, "pos": "head"}, "143": {"f": "fx/st_20.webp", "n": 15, "w": 69, "h": 56, "ax": 32, "ay": 114, "ms": 80, "pos": "head"}, "150": {"f": "fx/st_21.webp", "n": 15, "w": 62, "h": 74, "ax": 32, "ay": 128, "ms": 80, "pos": "head"}, "157": {"f": "fx/st_22.webp", "n": 24, "w": 92, "h": 96, "ax": 43, "ay": 139, "ms": 50, "pos": "head"}, "159": {"f": "fx/st_23.webp", "n": 24, "w": 104, "h": 82, "ax": 53, "ay": 43, "ms": 50, "pos": "foot"}, "171": {"f": "fx/st_24.webp", "n": 15, "w": 110, "h": 95, "ax": 52, "ay": 87, "ms": 80, "pos": "body"}, "173": {"f": "fx/st_25.webp", "n": 20, "w": 129, "h": 115, "ax": 65, "ay": 110, "ms": 60, "pos": "body"}, "174": {"f": "fx/st_26.webp", "n": 15, "w": 39, "h": 45, "ax": 19, "ay": 111, "ms": 80, "pos": "head"}, "175": {"f": "fx/st_27.webp", "n": 15, "w": 25, "h": 50, "ax": 13, "ay": 129, "ms": 80, "pos": "head"}, "178": {"f": "fx/st_28.webp", "n": 24, "w": 94, "h": 100, "ax": 46, "ay": 79, "ms": 50, "pos": "body"}, "273": {"f": "fx/st_29.webp", "n": 15, "w": 168, "h": 167, "ax": 85, "ay": 168, "ms": 80, "pos": "head"}, "277": {"f": "fx/st_30.webp", "n": 15, "w": 68, "h": 41, "ax": 29, "ay": 56, "ms": 80, "pos": "body"}, "282": {"f": "fx/st_31.webp", "n": 20, "w": 81, "h": 73, "ax": 40, "ay": 79, "ms": 60, "pos": "body"}, "332": {"f": "fx/st_32.webp", "n": 20, "w": 130, "h": 78, "ax": 66, "ay": 37, "ms": 60, "pos": "foot"}, "356": {"f": "fx/st_27.webp", "n": 15, "w": 25, "h": 50, "ax": 13, "ay": 129, "ms": 80, "pos": "head"}, "364": {"f": "fx/st_33.webp", "n": 15, "w": 60, "h": 51, "ax": 25, "ay": 68, "ms": 80, "pos": "body"}, "390": {"f": "fx/st_34.webp", "n": 20, "w": 52, "h": 46, "ax": 23, "ay": 97, "ms": 60, "pos": "head"}, "391": {"f": "fx/st_35.webp", "n": 18, "w": 74, "h": 45, "ax": 36, "ay": 21, "ms": 67, "pos": "foot"}, "392": {"f": "fx/st_36.webp", "n": 15, "w": 38, "h": 49, "ax": 19, "ay": 111, "ms": 80, "pos": "head"}, "393": {"f": "fx/st_37.webp", "n": 15, "w": 37, "h": 45, "ax": 18, "ay": 111, "ms": 80, "pos": "head"}, "394": {"f": "fx/st_38.webp", "n": 8, "w": 133, "h": 128, "ax": 64, "ay": 102, "ms": 150, "pos": "body"}, "716": {"f": "fx/st_39.webp", "n": 24, "w": 355, "h": 264, "ax": 171, "ay": 204, "ms": 50, "pos": "body"}};

var ST_HIT_T = 2.5, ST_K = 0.6;
if (window.JXST && window.JXST[390] && !window.JXST[76]) window.JXST[76] = window.JXST[390];
if (typeof JFX !== 'undefined' && JFX.f) {
  if (!JFX.f[272] || !JFX.f[272].c) JFX.f[272] = { form: 8, num: 1, c: (JFX.f[10] || {}).c };
  if (!JFX.f[325] || !JFX.f[325].c) JFX.f[325] = { form: 12, num: 1, c: (JFX.f[324] || {}).c };
}

function heroStates() {
  if (typeof S === 'undefined' || !S || !S.sk || S.lookFx === false) return [];
  const live = id => typeof skApplies !== 'function' || (skKind(SK[id]) !== 'curse' && skApplies(SK[id]) && !R.buffAssume);
  const ids0 = Object.keys(S.sk).map(Number).filter(id => S.sk[id] > 0 && JXST[id] && SK[id] && !isAttack(SK[id]) && live(id));
  const key = ids0.join(',');
  if (R.stKey === key) return R.stList || [];
  const ids = ids0.sort((a, b) => (SK[b].req || 0) - (SK[a].req || 0));
  const seen = {}, out = [];
  for (const id of ids) {
    const s = JXST[id];
    if (!s) continue;
    const k = seen[s.pos] || [];
    if (k.length >= 3 || k.includes(s.f)) continue;
    k.push(s.f);
    seen[s.pos] = k;
    out.push(s);
  }
  R.stKey = key;
  R.stList = out;
  return out;
}

function drawState(c, s, x, y, h, t, sc, alpha = 1) {
  if (!s || !s.f) return;
  const im = img(s.f);
  if (!im || !im.complete || !im.naturalWidth) return;
  const fr = Math.floor(t * 1000 / (s.ms || 80)) % (s.n || 1);
  const yy = y;
  sc = (sc || 1) * ST_K;
  const prevA = c.globalAlpha;
  c.globalAlpha = clamp(alpha * prevA, 0, 1);
  c.drawImage(im, fr * s.w, 0, s.w, s.h, x - s.ax * sc, yy - s.ay * sc, s.w * sc, s.h * sc);
  c.globalAlpha = prevA;
}

function drawHeroStates(c, layer, h) {
  if (typeof S !== 'undefined' && S && S.lowFx && layer !== 'under') return;
  const t = R.clock || (Date.now() / 1000);
  const list = heroStates();
  for (const s of list) {
    if ((s.pos === 'foot') === (layer === 'under')) {
      drawState(c, s, H.x, H.y, h, t, typeof HERO_SCALE !== 'undefined' ? HERO_SCALE : 1.35, s.pos === 'foot' ? 0.85 : 0.9);
    }
  }
}

function stateOnHit(a, e) {
  if (!a || !a.id || (typeof S !== 'undefined' && S && S.lowFx)) return;
  const s = JXST && JXST[a.id];
  if (s && typeof isAttack === 'function' && typeof SK !== 'undefined' && SK[a.id] && isAttack(SK[a.id])) {
    e.stFx = s;
    e.stT = ST_HIT_T;
  }
}

function drawEnemyCurses(c, e, sc) {
  if (!e || !e.curse || (typeof S !== 'undefined' && S && S.lookFx === false)) return;
  const now = R.clock || (Date.now() / 1000), seen = {};
  for (const id in e.curse) {
    if (e.curse[id] <= now) continue;
    const s = JXST && JXST[id];
    if (!s || seen[s.pos]) continue;
    seen[s.pos] = 1;
    drawState(c, s, e.x, e.y, 0, now, sc, Math.min(0.9, (e.curse[id] - now) / 1.5));
  }
}

function drawEnemyState(c, e, h, sc, dt) {
  if (!e || !e.stFx) return;
  e.stT -= dt;
  if (e.stT <= 0) { e.stFx = null; return; }
  drawState(c, e.stFx, e.x, e.y, h, R.clock || (Date.now() / 1000), sc, clamp(e.stT, 0, 1));
}