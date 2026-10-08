// js/skillfx.js
var heroStates = function heroStates() {
  if (!S || !S.sk || S.lookFx === false) return [];
  // chi trang thai dang co hieu luc: bi dong, vong sang dang bat, bua loi con thoi gian (khong ve bua hai len nhan vat)
  const live = id => typeof skApplies !== 'function' || (skKind(SK[id]) !== 'curse' && skApplies(SK[id]) && !R.buffAssume);
  const ids0 = Object.keys(S.sk).map(Number).filter(id => S.sk[id] > 0 && JXST[id] && SK[id] && !isAttack(SK[id]) && live(id));
  const key = ids0.join(',');
  if (R.stKey === key) return R.stList;
  const ids = ids0.sort((a, b) => SK[b].req - SK[a].req);
  const seen = {}, out = [];
  for (const id of ids) { const s = JXST[id], k = seen[s.pos] || []; if (k.length >= 3 || k.includes(s.f)) continue; k.push(s.f); seen[s.pos] = k; out.push(s); }   // nhieu vong sang cung luc: chong toi da 3 hinh moi vi tri
  R.stKey = key; R.stList = out; return out;
};
var drawState = function drawState(c, s, x, y, h, t, sc, alpha = 1) {
  const im = img(s.f); if (!im.complete || !im.naturalWidth) return;
  const fr = Math.floor(t * 1000 / s.ms) % s.n;
  const yy = y;   // spr trang thai JX1 da can tam theo chan nhan vat (ke ca loai tren dau)
  sc *= ST_K;   // hinh trang thai xuat o kich thuoc goc, cac hinh khac o 0.6
  c.globalAlpha = alpha; c.drawImage(im, fr * s.w, 0, s.w, s.h, x - s.ax * sc, yy - s.ay * sc, s.w * sc, s.h * sc); c.globalAlpha = 1;
};
var drawHeroStates = function drawHeroStates(c, layer, h) {   // layer: 'under' (chan) | 'over' (than, dau)
  const t = R.clock || 0;
  for (const s of heroStates()) if ((s.pos === 'foot') === (layer === 'under')) drawState(c, s, H.x, H.y, h, t, HERO_SCALE, s.pos === 'foot' ? 0.85 : 0.9);
};
var stateOnHit = function stateOnHit(a, e) { if (!a || !a.id || S.lowFx) return; const s = JXST[a.id]; if (s && isAttack(SK[a.id])) { e.stFx = s; e.stT = ST_HIT_T; } };
var drawEnemyCurses = function drawEnemyCurses(c, e, sc) {
  if (!e.curse || S.lookFx === false) return;
  const now = R.clock || 0, seen = {};
  for (const id in e.curse) { if (e.curse[id] <= now) continue; const s = JXST[id]; if (!s || seen[s.pos]) continue; seen[s.pos] = 1;
    drawState(c, s, e.x, e.y, 0, now, sc, Math.min(0.9, (e.curse[id] - now) / 1.5)); }
};
var drawEnemyState = function drawEnemyState(c, e, h, sc, dt) {
  if (!e.stFx) return; e.stT -= dt; if (e.stT <= 0) { e.stFx = null; return; }
  drawState(c, e.stFx, e.x, e.y, h, R.clock || 0, sc, clamp(e.stT, 0, 1));
};
/* ======================= HIEU UNG TRANG THAI VO CONG (kieu JX1) =======================
   Hinh tu client (状态图形对照表.txt: StateSpecialId cua skills.txt -> spr) xuat bang jxmap/states.py -> fx/st_*.webp + jxstate.js (window.JXST).
   - Noi tai / hao quang da hoc (Kim Chung Trao, La Han Tran, Phat Tam Tu Huu, That Tinh Tran...): ve lien tuc quanh nhan vat
     (moi vi tri chan / than / dau mot hieu ung, uu tien chieu cap cao).
   - Chieu tan cong co trang thai (Bang Lam Huyen Tinh, Cuu Thien Cuong Loi...): hien tren quai trung chieu vai giay.
   Tat cung "Hieu ung ngoai hinh" (S.lookFx) / giam hieu ung (S.lowFx: chi giu hieu ung tren nhan vat). */
'use strict';
var JXST = window.JXST || {};
var ST_HIT_T = 2.5, ST_K = 0.6;
/* chieu thieu hinh trong ban trich: muon hinh cung trang thai / cung kieu danh */
if (JXST[390] && !JXST[76]) JXST[76] = JXST[390];                               // Di Hoa Tiep Ngoc: cung trang thai 12 voi 390
if (typeof JFX !== 'undefined' && JFX.f) {
  if (!JFX.f[272] || !JFX.f[272].c) JFX.f[272] = { form: 8, num: 1, c: (JFX.f[10] || {}).c };     // Long Trao Ho Trao: chem can chien Thieu Lam
  if (!JFX.f[325] || !JFX.f[325].c) JFX.f[325] = { form: 12, num: 1, c: (JFX.f[324] || {}).c };   // Truy Phong Quyet: thuong Thien Vuong
}
                       
                                                   
                                                                                                                        
                                                                                                                           
                                                                                                                               
                             
                                       
                                                         
                            
                                                                                                                                                                                                                               
                                            
 
/* ve 1 trang thai tai chan (x, y), h = chieu cao nhan vat da ve */
                                                     
                                                                    
                                               
                                                                                           
                                                                             
                                                                                                                                      
 
                                                                                      
                         
                                                                                                                                                           
 
                                                                                                                                                      
/* bua hai dang co tren quai: ve hieu ung trang thai cua tung bua (moi vi tri chan / than / dau mot hieu ung) */
