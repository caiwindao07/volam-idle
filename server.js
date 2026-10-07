/* ==========================================================================
   VÕ LÂM IDLE - SERVER TỔNG HỢP (NODE.JS + WEBSOCKET + TÀI KHOẢN & DATABASE)
   1. Phục vụ Web Server tĩnh cho toàn bộ game.
   2. Hệ thống Tài khoản (Đăng ký / Đăng nhập / Lưu trữ đám mây JSON DB).
   3. WebSocket Real-time Multiplayer (Đồng bộ tọa độ, môn phái, chat thế giới).
   ========================================================================== */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const { WebSocketServer } = require('ws');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml'
};

const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
let PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

// ==========================================
// 0. NẠP DỮ LIỆU GAME (THẾ GIỚI & QUÁI VẬT & VẬT CẢN)
// ==========================================
let JW = null;
let JX = null;
let JMO = null;
const zoneWalkable = new Map(); // zoneId -> Array<{ x, y }>

try {
  const worldPath = path.join(ROOT_DIR, 'world.js');
  const dataPath = path.join(ROOT_DIR, 'data.js');
  const jmoPath = path.join(ROOT_DIR, 'jmo.js');
  if (fs.existsSync(worldPath) && fs.existsSync(dataPath)) {
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(dataPath, 'utf8'), sandbox);
    vm.runInContext(fs.readFileSync(worldPath, 'utf8'), sandbox);
    if (fs.existsSync(jmoPath)) {
      vm.runInContext(fs.readFileSync(jmoPath, 'utf8'), sandbox);
    }
    JW = sandbox.window.JW;
    JX = sandbox.window.JX;
    JMO = sandbox.window.JMO;
    console.log(`[Multiplayer] Đã nạp dữ liệu thế giới (${JW.zones.length} bản đồ, ${Object.keys(JW.mon).length} quái vật).`);

    // Tiền xử lý các ô di chuyển an toàn không vướng vật cản cho từng bản đồ
    if (JMO) {
      for (const [zid, mData] of Object.entries(JMO)) {
        const bin = Buffer.from(mData.obs, 'base64');
        const n = mData.gw * mData.gh;
        const ok = new Uint8Array(n);
        for (let k = 0; k < n; k++) ok[k] = ((bin[k >> 3] >> (k & 7)) & 1) ? 0 : 1;
        const comp = new Int32Array(n).fill(-1), q = new Int32Array(n);
        let best = -1, bestN = 0, id = 0;
        for (let s = 0; s < n; s++) {
          if (!ok[s] || comp[s] >= 0) continue;
          let h = 0, t = 0; q[t++] = s; comp[s] = id;
          while (h < t) {
            const c = q[h++], cx = c % mData.gw, cy = (c / mData.gw) | 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
              if (!dx && !dy) continue;
              const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= mData.gw || y >= mData.gh) continue;
              const k = y * mData.gw + x; if (!ok[k] || comp[k] >= 0) continue;
              if (dx && dy && (!ok[cy * mData.gw + x] || !ok[y * mData.gw + cx])) continue;
              comp[k] = id; q[t++] = k;
            }
          }
          if (t > bestN) { bestN = t; best = id; }
          id++;
        }
        for (let k = 0; k < n; k++) ok[k] = comp[k] === best ? 1 : 0;
        const safeCells = [];
        for (let cy = 1; cy < mData.gh - 1; cy++) {
          for (let cx = 1; cx < mData.gw - 1; cx++) {
            const idx = cy * mData.gw + cx;
            if (ok[idx] && ok[idx - 1] && ok[idx + 1] && ok[idx - mData.gw] && ok[idx + mData.gw]) {
              safeCells.push({ x: Math.round((cx + 0.5) * mData.cw), y: Math.round((cy + 0.5) * mData.ch) });
            }
          }
        }
        zoneWalkable.set(Number(zid), safeCells);
      }
      console.log(`[Multiplayer] Đã phân tích vật cản và tạo bản đồ tọa độ an toàn cho ${zoneWalkable.size} khu vực.`);
    }
  }
} catch (e) {
  console.error('[Multiplayer] Lỗi khi nạp world.js / data.js / jmo.js:', e);
}

// ==========================================
// 1. DATABASE & QUẢN LÝ TÀI KHOẢN (JSON + MONGODB ATLAS)
// ==========================================
let db = { users: {} };
const sessions = new Map(); // token -> username
let mongoClient = null;
let mongoDb = null;
let mongoUsersCol = null;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://volam:Mitom1304@cluster0.tpppret.mongodb.net/volam-idle?retryWrites=true&w=majority';

async function initMongo() {
  if (!MONGODB_URI) return false;
  try {
    const { MongoClient } = require('mongodb');
    mongoClient = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    await mongoClient.connect();
    mongoDb = mongoClient.db('volam-idle');
    mongoUsersCol = mongoDb.collection('users');
    console.log('[DB] Đã kết nối thành công tới MongoDB Atlas trực tuyến!');
    return true;
  } catch (err) {
    console.warn('[DB] Không thể kết nối MongoDB Atlas, sử dụng chế độ lưu cục bộ:', err.message);
    mongoUsersCol = null;
    return false;
  }
}

async function loadDb() {
  try {
    // 1. Kết nối MongoDB Atlas
    const connected = await initMongo();
    if (connected && mongoUsersCol) {
      // Khi chạy online bằng MongoDB: dữ liệu tách biệt hoàn toàn, CHỈ lấy từ MongoDB Atlas
      db = { users: {} };
      const userDocs = await mongoUsersCol.find({}).toArray();
      for (const doc of userDocs) {
        const uKey = doc.username;
        if (uKey) {
          db.users[uKey] = {
            username: doc.username,
            passwordHash: doc.passwordHash,
            createdAt: doc.createdAt,
            lastLogin: doc.lastLogin,
            state: doc.state,
            token: doc.token
          };
        }
      }
      console.log(`[DB] Đang hoạt động chế độ Online (MongoDB Atlas). Số tài khoản: ${userDocs.length}.`);
    } else {
      // Chế độ Offline/Local khi không có Mongo: nạp từ db.json
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        db = JSON.parse(raw);
        if (!db.users) db.users = {};
      }
      console.log(`[DB] Đang hoạt động chế độ Cục bộ (db.json). Số tài khoản: ${Object.keys(db.users).length}.`);
    }

    for (const uKey in db.users) {
      if (db.users[uKey].token) {
        sessions.set(db.users[uKey].token, uKey);
      }
    }
  } catch (e) {
    console.error('[DB] Lỗi load database:', e);
  }
}

let _isSavingMongo = false;
let _pendingMongoSave = false;

async function syncToMongo() {
  if (!mongoUsersCol || _isSavingMongo) {
    if (!mongoUsersCol) return;
    _pendingMongoSave = true;
    return;
  }
  _isSavingMongo = true;
  try {
    const ops = [];
    for (const [username, userData] of Object.entries(db.users)) {
      ops.push({
        updateOne: {
          filter: { username },
          update: { $set: userData },
          upsert: true
        }
      });
    }
    if (ops.length > 0) {
      await mongoUsersCol.bulkWrite(ops);
    }
  } catch (err) {
    console.error('[DB] Lỗi khi lưu vào MongoDB Atlas:', err.message);
  } finally {
    _isSavingMongo = false;
    if (_pendingMongoSave) {
      _pendingMongoSave = false;
      syncToMongo();
    }
  }
}

function saveDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (e) {
    console.error('[DB] Lỗi ghi database cục bộ:', e);
  }

  // Tự động ghi đồng bộ lên MongoDB online
  if (mongoUsersCol) {
    syncToMongo();
  }
}

function hashPassword(pass) {
  return crypto.createHash('sha256').update(pass + '::vl_salt_2026_idle').digest('hex');
}

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

function createInitialHeroState(heroName, fac) {
  return {
    v: 1,
    name: heroName || 'Tân thủ',
    fac: fac || 'shaolin',
    sex: (fac === 'emei' || fac === 'cuiyan') ? 1 : 0,
    lvl: 1,
    xp: 0,
    gold: 500,
    attrPts: 0,
    attr: { str: 0, dex: 0, vit: 0, eng: 0 },
    skPts: 1,
    sk: {},
    main: 0,
    eq: {},
    inv: [],
    stage: 1,
    maxStage: 1,
    wave: 1,
    push: true,
    uid: 1,
    autoSell: 0,
    kps: 0.2,
    totalKills: 0,
    autoEquip: false,
    autoPts: false,
    autoMap: true,
    diff: 1,
    autoForge: false,
    autoBuy: true,
    tut: 0,
    hints: {},
    bakAt: 0,
    potOff: false,
    potUsed: 0,
    potStock: { life: {}, mana: {} },
    ctrl: 'auto',
    joy: 'fixed',
    slots: [0, 0, 0, 0],
    snd: { on: true, vol: 0.7, music: true, mvol: 0.4 },
    lootF: { minRar: 0, minLvl: 1, groups: [], series: [], auto: true },
    ground: [],
    mats: { ht: {}, ore: {}, shard: {}, misc: {} },
    camp: { wood: 5, wine: 2, fireT: 0, wineT: 0, fireX: 0, fireY: 0 },
    mount: { tier: 1, lvl: 1, exp: 0, fodder: 10 },
    rw: { stat: { kills: 0, elite: 0, boss: 0, chests: 0 }, fd: 0 },
    last: Date.now()
  };
}

// ==========================================
// ANTI-CHEAT & SERVER-AUTHORITATIVE LOGIC
// ==========================================
function getMaxAllowedDamage(lvl) {
  const L = Math.max(1, Math.min(99, Number(lvl) || 1));
  // Công thức sát thương tối đa cho phép mỗi đòn đánh của người chơi ở cấp L
  // Cấp 1: tối đa ~500, Cấp 50: ~35,000, Cấp 99: ~250,000
  return Math.max(500, Math.round((70 + L * 95 + Math.pow(L, 1.85) * 18) * 3.5));
}

function sanitizeAndValidateState(serverState, incomingState, username) {
  if (!serverState) return incomingState;
  if (!incomingState || typeof incomingState !== 'object') return serverState;

  // 1. Kiểm tra Cấp độ & Kinh nghiệm (Server-Authoritative Level)
  const sLvl = Math.max(1, Math.min(99, Number(serverState.lvl) || 1));
  const inLvl = Math.max(1, Math.min(99, Number(incomingState.lvl) || 1));

  if (inLvl > sLvl) {
    console.warn(`[Anti-Cheat] Chặn hack cấp độ từ "${username}": client báo Lv.${inLvl}, server giữ Lv.${sLvl}.`);
    incomingState.lvl = sLvl;
    incomingState.xp = Number(serverState.xp) || 0;
  } else if (inLvl === sLvl) {
    const maxExp = (JX && JX.exp && JX.exp[sLvl - 1]) ? JX.exp[sLvl - 1] : (sLvl * 1000);
    incomingState.xp = Math.max(0, Math.min(maxExp, Number(incomingState.xp) || 0));
  } else {
    incomingState.lvl = sLvl;
    incomingState.xp = Number(serverState.xp) || 0;
  }

  // 2. Kiểm tra Ngân sách Điểm Tiềm Năng (Str, Dex, Vit, Eng + attrPts)
  const rebornCount = (serverState.rw && serverState.rw.stat && Number(serverState.rw.stat.reborn)) || 0;
  const maxAttrBudget = (incomingState.lvl - 1) * 5 + (rebornCount * 20);
  const clientAttr = incomingState.attr || {};
  const str = Math.max(0, Math.floor(Number(clientAttr.str) || 0));
  const dex = Math.max(0, Math.floor(Number(clientAttr.dex) || 0));
  const vit = Math.max(0, Math.floor(Number(clientAttr.vit) || 0));
  const eng = Math.max(0, Math.floor(Number(clientAttr.eng) || 0));
  const spentAttr = str + dex + vit + eng;
  const inAttrPts = Math.max(0, Math.floor(Number(incomingState.attrPts) || 0));

  if (spentAttr + inAttrPts > maxAttrBudget) {
    console.warn(`[Anti-Cheat] Chặn hack tiềm năng từ "${username}": Chiếm ${spentAttr + inAttrPts} điểm (Lv.${incomingState.lvl} tối đa ${maxAttrBudget}).`);
    if (spentAttr <= maxAttrBudget) {
      incomingState.attrPts = maxAttrBudget - spentAttr;
    } else {
      incomingState.attr = { str: 0, dex: 0, vit: 0, eng: 0 };
      incomingState.attrPts = maxAttrBudget;
    }
  } else {
    incomingState.attr = { str, dex, vit, eng };
    incomingState.attrPts = inAttrPts;
  }

  // 3. Kiểm tra Ngân sách Điểm Kỹ Năng (skPts + sum(sk))
  const maxSkBudget = 1 + (incomingState.lvl - 1) * 1;
  const clientSk = incomingState.sk || {};
  let spentSk = 0;
  for (const skId in clientSk) {
    const pts = Math.max(0, Math.min(20, Math.floor(Number(clientSk[skId]) || 0)));
    clientSk[skId] = pts;
    spentSk += pts;
  }
  const inSkPts = Math.max(0, Math.floor(Number(incomingState.skPts) || 0));

  if (spentSk + inSkPts > maxSkBudget) {
    console.warn(`[Anti-Cheat] Chặn hack kỹ năng từ "${username}": Chiếm ${spentSk + inSkPts} điểm (Lv.${incomingState.lvl} tối đa ${maxSkBudget}).`);
    if (spentSk <= maxSkBudget) {
      incomingState.skPts = maxSkBudget - spentSk;
    } else {
      incomingState.sk = {};
      incomingState.skPts = maxSkBudget;
    }
  } else {
    incomingState.sk = clientSk;
    incomingState.skPts = inSkPts;
  }

  // 4. Kiểm tra Ngân Lượng (Server-Authoritative Gold)
  const sGold = Math.max(0, Math.floor(Number(serverState.gold) || 0));
  const inGold = Math.max(0, Math.floor(Number(incomingState.gold) || 0));

  if (inGold > sGold) {
    const delta = inGold - sGold;
    const elapsedSec = Math.max(1, Math.min(300, (Date.now() - (serverState.lastSyncT || serverState.lastSave || Date.now())) / 1000));
    
    // Dung sai bán vật phẩm từ hành trang: người chơi có thể bán sạch túi 40-60 món trang bị cùng lúc
    const soldCount = Array.isArray(serverState.inv) && Array.isArray(incomingState.inv)
      ? Math.max(0, serverState.inv.length - incomingState.inv.length)
      : 0;
    const soldValueAllowance = soldCount * 30000; // Mỗi món trang bị có thể bán được tới 30,000 lượng
    
    // Tối đa 500 vàng/giây từ quái + dung sai cơ bản 25,000 + giá trị đồ đã bán
    const maxAllowedGain = Math.round(elapsedSec * 500 + 25000 + soldValueAllowance);

    if (delta > maxAllowedGain) {
      console.warn(`[Anti-Cheat] Chặn hack ngân lượng từ "${username}": Tăng bất thường +${delta} lượng (Server giữ ${sGold}, cho phép tối đa +${maxAllowedGain}).`);
      incomingState.gold = sGold + Math.min(delta, maxAllowedGain);
    } else {
      incomingState.gold = inGold;
    }
  } else {
    // Tiêu xài hợp lệ (mua thuốc, rèn, cường hóa, bày bán)
    incomingState.gold = inGold;
  }

  // 5. Cập nhật các trường dữ liệu hợp lệ vào serverState
  serverState.gold = incomingState.gold;
  serverState.lvl = incomingState.lvl;
  serverState.xp = incomingState.xp;
  serverState.attrPts = incomingState.attrPts;
  serverState.attr = incomingState.attr;
  serverState.skPts = incomingState.skPts;
  serverState.sk = incomingState.sk;
  if (incomingState.eq) serverState.eq = incomingState.eq;
  if (incomingState.inv) serverState.inv = incomingState.inv;
  if (incomingState.stage) serverState.stage = incomingState.stage;
  if (incomingState.maxStage) serverState.maxStage = Math.max(serverState.maxStage || 1, incomingState.maxStage);
  if (incomingState.mats) serverState.mats = incomingState.mats;
  if (incomingState.mount) serverState.mount = incomingState.mount;
  if (incomingState.camp) serverState.camp = incomingState.camp;
  if (incomingState.auto) serverState.auto = incomingState.auto;
  if (incomingState.fac) serverState.fac = String(incomingState.fac);
  if (incomingState.sex !== undefined) serverState.sex = Number(incomingState.sex) || 0;
  if (incomingState.main !== undefined) serverState.main = Number(incomingState.main) || 0;
  if (incomingState.slots) serverState.slots = incomingState.slots;
  if (incomingState.push !== undefined) serverState.push = !!incomingState.push;
  if (incomingState.rw) serverState.rw = incomingState.rw;
  serverState.lastSyncT = Date.now();
  serverState.lastSave = Date.now();

  return serverState;
}

loadDb();

// Định kỳ lưu cơ sở dữ liệu xuống ổ đĩa mỗi 30 giây
setInterval(saveDb, 30000);

// ==========================================
// 2. HTTP SERVER & REST API
// ==========================================
function sendJson(res, statusCode, obj) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-cache'
  });
  res.end(JSON.stringify(obj));
}

function parseJsonBody(req, callback) {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 5 * 1024 * 1024) req.destroy(); // tối đa 5MB cho save file
  });
  req.on('end', () => {
    try {
      const data = JSON.parse(body || '{}');
      callback(null, data);
    } catch (e) {
      callback(e);
    }
  });
}

function getAuthUser(req) {
  const auth = req.headers['authorization'];
  if (!auth) return null;
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  const username = sessions.get(token);
  if (!username || !db.users[username]) return null;
  return { username, user: db.users[username], token };
}

const server = http.createServer((req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    });
    res.end();
    return;
  }

  const urlParts = req.url.split('?');
  const pathname = urlParts[0];

  // API ROUTING
  if (pathname.startsWith('/api/')) {
    // 1. Đăng ký tài khoản
    if (pathname === '/api/register' && req.method === 'POST') {
      parseJsonBody(req, (err, data) => {
        if (err || !data.username || !data.password) {
          return sendJson(res, 400, { ok: false, error: 'Thiếu tên tài khoản hoặc mật khẩu!' });
        }
        const uKey = String(data.username).trim().toLowerCase();
        if (uKey.length < 3 || uKey.length > 20) {
          return sendJson(res, 400, { ok: false, error: 'Tên tài khoản phải từ 3 đến 20 ký tự!' });
        }
        if (data.password.length < 4) {
          return sendJson(res, 400, { ok: false, error: 'Mật khẩu phải từ 4 ký tự trở lên!' });
        }
        if (db.users[uKey]) {
          return sendJson(res, 400, { ok: false, error: 'Tên tài khoản này đã được sử dụng!' });
        }

        const heroName = String(data.heroName || data.username).trim().slice(0, 20);
        const fac = String(data.fac || 'shaolin');
        const initialHero = createInitialHeroState(heroName, fac);
        const token = generateToken();

        const newUser = {
          username: String(data.username).trim(),
          passwordHash: hashPassword(data.password),
          heroName: heroName,
          fac: fac,
          state: initialHero,
          token: token,
          createdAt: Date.now(),
          lastLogin: Date.now()
        };

        db.users[uKey] = newUser;
        sessions.set(token, uKey);
        saveDb();

        console.log(`[Auth] Đăng ký thành công tài khoản: ${newUser.username} (${heroName})`);
        return sendJson(res, 200, {
          ok: true,
          token: token,
          user: {
            username: newUser.username,
            heroName: newUser.heroName,
            fac: newUser.fac
          },
          state: newUser.state
        });
      });
      return;
    }

    // 2. Đăng nhập tài khoản
    if (pathname === '/api/login' && req.method === 'POST') {
      parseJsonBody(req, (err, data) => {
        if (err || !data.username || !data.password) {
          return sendJson(res, 400, { ok: false, error: 'Thiếu tên tài khoản hoặc mật khẩu!' });
        }
        const uKey = String(data.username).trim().toLowerCase();
        const u = db.users[uKey];
        if (!u) {
          return sendJson(res, 400, { ok: false, error: 'Tài khoản không tồn tại! Vui lòng đăng ký mới.' });
        }

        const hashed = hashPassword(data.password);
        if (u.passwordHash !== hashed) {
          return sendJson(res, 400, { ok: false, error: 'Mật khẩu không chính xác!' });
        }

        const token = generateToken();
        u.token = token;
        u.lastLogin = Date.now();
        sessions.set(token, uKey);
        saveDb();

        console.log(`[Auth] Đăng nhập thành công: ${u.username}`);
        return sendJson(res, 200, {
          ok: true,
          token: token,
          user: {
            username: u.username,
            heroName: u.heroName,
            fac: u.fac
          },
          state: u.state
        });
      });
      return;
    }

    // 3. Lấy thông tin tài khoản hiện tại qua token
    if (pathname === '/api/me' && req.method === 'GET') {
      const session = getAuthUser(req);
      if (!session) {
        return sendJson(res, 401, { ok: false, error: 'Chưa đăng nhập hoặc phiên đã hết hạn' });
      }
      return sendJson(res, 200, {
        ok: true,
        user: {
          username: session.user.username,
          heroName: session.user.heroName,
          fac: session.user.fac
        },
        state: session.user.state
      });
    }

    // 4. Lưu dữ liệu nhân vật lên máy chủ (Cloud Save)
    if (pathname === '/api/save' && req.method === 'POST') {
      const session = getAuthUser(req);
      if (!session) {
        return sendJson(res, 401, { ok: false, error: 'Chưa đăng nhập!' });
      }

      parseJsonBody(req, (err, data) => {
        if (err || !data || !data.state) {
          return sendJson(res, 400, { ok: false, error: 'Dữ liệu không hợp lệ!' });
        }
        // Xác thực và chuẩn hóa toàn bộ dữ liệu lưu theo thẩm quyền của Server
        session.user.state = sanitizeAndValidateState(session.user.state, data.state, session.username);
        if (session.user.state.name) session.user.heroName = session.user.state.name;
        if (session.user.state.fac) session.user.fac = session.user.state.fac;
        session.user.lastSave = Date.now();
        saveDb();
        return sendJson(res, 200, {
          ok: true,
          msg: 'Đã lưu đám mây thành công',
          state: session.user.state
        });
      });
      return;
    }

    // 5. Đăng xuất
    if (pathname === '/api/logout' && req.method === 'POST') {
      const auth = req.headers['authorization'];
      if (auth) {
        const token = auth.replace(/^Bearer\s+/i, '').trim();
        const uKey = sessions.get(token);
        if (uKey && db.users[uKey]) {
          delete db.users[uKey].token;
          saveDb();
        }
        sessions.delete(token);
      }
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 404, { ok: false, error: 'API không tồn tại' });
  }

  // PHỤC VỤ FILE TĨNH WEB
  let reqPath = pathname.replace(/^\/+/, '');
  if (!reqPath || reqPath === '') reqPath = 'index.html';

  const decodedPath = decodeURIComponent(reqPath).replace(/\//g, path.sep);
  const filePath = path.join(ROOT_DIR, decodedPath);

  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found: ${reqPath}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

// ==========================================
// 3. WEBSOCKET REAL-TIME MULTIPLAYER
// ==========================================
const wss = new WebSocketServer({ server });

const players = new Map(); // ws -> playerObj
let nextPlayerId = 1000;

function broadcast(msg, senderWs = null) {
  const json = typeof msg === 'string' ? msg : JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client !== senderWs && client.readyState === 1) { // OPEN
      client.send(json);
    }
  }
}

function broadcastToZone(zoneId, msg, senderWs = null) {
  const json = typeof msg === 'string' ? msg : JSON.stringify(msg);
  for (const [ws, player] of players.entries()) {
    if (player.zoneId === zoneId && ws !== senderWs && ws.readyState === 1) {
      ws.send(json);
    }
  }
}

// Quản lý quái vật thế giới theo từng bản đồ (zoneId)
const zoneMobs = new Map(); // zoneId -> Map(mobId -> mob)
let nextMobId = 5000;

// Hệ thống Chợ Đen giao dịch người chơi
const serverMarket = [];
let nextMarketId = 1000;

// Hệ thống Tổ Đội (Party Multiplayer)
const serverParties = new Map(); // partyId -> { id, leaderId, leaderName, members: [ { id, name, fac, series, lvl, x, y } ] }
let nextPartyId = 100;

function getPlayerParty(playerId) {
  for (const party of serverParties.values()) {
    if (party.members.some(m => m.id === playerId)) return party;
  }
  return null;
}

function broadcastParty(party) {
  if (!party) return;
  const json = JSON.stringify({
    type: 'party_sync',
    party: {
      id: party.id,
      leaderId: party.leaderId,
      leaderName: party.leaderName,
      members: party.members
    }
  });
  for (const [ws, pl] of players.entries()) {
    if (party.members.some(m => m.id === pl.id) && ws.readyState === 1) {
      ws.send(json);
    }
  }
}

function getActivePlayersInZone(zoneId) {
  const list = [];
  for (const pl of players.values()) {
    if (pl.zoneId === zoneId && pl.x != null && pl.y != null) {
      list.push(pl);
    }
  }
  return list;
}

function getSafeMobSpawnPos(zoneId, nearX, nearY) {
  const safeList = zoneWalkable.get(zoneId);
  if (!safeList || !safeList.length) {
    return { x: 1792, y: 1792 };
  }
  // 75% cơ hội xuất hiện trong bán kính 100-450px quanh người chơi để có quái đánh liên tục
  if (nearX != null && nearY != null && Math.random() < 0.75) {
    const minR2 = 90 * 90, maxR2 = 450 * 450;
    const candidates = [];
    for (let i = 0; i < 150; i++) {
      const pt = safeList[Math.floor(Math.random() * safeList.length)];
      const d2 = (pt.x - nearX) ** 2 + (pt.y - nearY) ** 2;
      if (d2 >= minR2 && d2 <= maxR2) {
        candidates.push(pt);
        if (candidates.length >= 10) break;
      }
    }
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }
  // Ngược lại xuất hiện ngẫu nhiên rải rác khắp toàn bộ bản đồ
  return safeList[Math.floor(Math.random() * safeList.length)];
}

function spawnOneMob(zoneId, nearX, nearY) {
  if (!JW || !JW.zones) return null;
  if (JW.town && (zoneId === JW.town.id || zoneId === 37)) return null;
  const z = JW.zones.find(x => x.id === zoneId);
  if (!z) return null;
  let map = zoneMobs.get(zoneId);
  if (!map) {
    map = new Map();
    zoneMobs.set(zoneId, map);
  }
  const mobId = ++nextMobId;
  const tid = (z.m && z.m.length) ? z.m[Math.floor(Math.random() * z.m.length)] : 1;
  const monDef = (JW.mon && JW.mon[tid]) ? JW.mon[tid] : {};
  const L = Math.round((z.lo + z.hi) / 2);
  const cls = Math.random() < 0.12 ? 'elite' : 'normal';
  const pos = getSafeMobSpawnPos(zoneId, nearX, nearY);
  // Cân bằng lại HP quái thế giới: giảm 35% để đánh dễ thở và vừa sức
  const baseHp = Math.round(75 + L * 28 * (cls === 'elite' ? 2.0 : 1));

  const mob = {
    id: mobId,
    zoneId: zoneId,
    tid: tid,
    n: monDef.n || 'Quái vật',
    L: L,
    cls: cls,
    series: Math.floor(Math.random() * 5),
    hp: baseHp,
    maxHp: baseHp,
    x: pos.x,
    y: pos.y
  };
  map.set(mobId, mob);
  return mob;
}

function ensureZoneMobs(zoneId, nearX, nearY) {
  if (!JW || !JW.zones) return [];
  if (JW.town && (zoneId === JW.town.id || zoneId === 37)) return [];
  let map = zoneMobs.get(zoneId);
  if (!map) {
    map = new Map();
    zoneMobs.set(zoneId, map);
  }
  const zonePlayers = getActivePlayersInZone(zoneId);
  const maxMobs = Math.min(80, Math.max(45, zonePlayers.length * 15)); // Mở rộng bãi quái theo số lượng người online (45-80 quái)
  while (map.size < maxMobs) {
    let px = nearX, py = nearY;
    if (zonePlayers.length > 0) {
      const pl = zonePlayers[Math.floor(Math.random() * zonePlayers.length)];
      px = pl.x;
      py = pl.y;
    }
    spawnOneMob(zoneId, px, py);
  }
  return Array.from(map.values());
}

// Định kỳ 4 giây đảm bảo các bãi quái luôn duy trì đủ số lượng cho các người chơi đang online
setInterval(() => {
  if (!JW || !JW.zones) return;
  const activeZoneIds = new Set();
  for (const p of players.values()) {
    if (p.initialized && p.zoneId && (!JW.town || (p.zoneId !== JW.town.id && p.zoneId !== 37))) {
      activeZoneIds.add(p.zoneId);
    }
  }
  for (const zId of activeZoneIds) {
    const list = ensureZoneMobs(zId);
  }
}, 4000);

// ==========================================
// HỆ THỐNG GIAO DỊCH (PLAYER TRADE)
// ==========================================
let nextTradeId = 200;
const activeTrades = new Map(); // tradeId -> session
const playerTradeMap = new Map(); // playerId -> tradeId

function getTradeSession(playerId) {
  const tid = playerTradeMap.get(playerId);
  return tid ? activeTrades.get(tid) : null;
}

function cancelTradeSession(tid, reason) {
  const s = activeTrades.get(tid);
  if (!s) return;
  activeTrades.delete(tid);
  playerTradeMap.delete(s.p1.id);
  playerTradeMap.delete(s.p2.id);
  const e1 = Array.from(players.entries()).find(([w, pl]) => pl.id === s.p1.id);
  const e2 = Array.from(players.entries()).find(([w, pl]) => pl.id === s.p2.id);
  if (e1 && e1[0].readyState === 1) e1[0].send(JSON.stringify({ type: 'trade_cancelled', reason: reason || 'Giao dịch đã kết thúc' }));
  if (e2 && e2[0].readyState === 1) e2[0].send(JSON.stringify({ type: 'trade_cancelled', reason: reason || 'Giao dịch đã kết thúc' }));
}

function syncTradeSession(s) {
  const e1 = Array.from(players.entries()).find(([w, pl]) => pl.id === s.p1.id);
  const e2 = Array.from(players.entries()).find(([w, pl]) => pl.id === s.p2.id);
  if (e1 && e1[0].readyState === 1) {
    e1[0].send(JSON.stringify({
      type: 'trade_sync',
      session: {
        id: s.id,
        partner: { id: s.p2.id, name: s.p2.name, lvl: s.p2.lvl },
        myItems: s.p1.items,
        myMoney: s.p1.money,
        myLocked: s.p1.locked,
        myConfirmed: s.p1.confirmed,
        partnerItems: s.p2.items,
        partnerMoney: s.p2.money,
        partnerLocked: s.p2.locked,
        partnerConfirmed: s.p2.confirmed
      }
    }));
  }
  if (e2 && e2[0].readyState === 1) {
    e2[0].send(JSON.stringify({
      type: 'trade_sync',
      session: {
        id: s.id,
        partner: { id: s.p1.id, name: s.p1.name, lvl: s.p1.lvl },
        myItems: s.p2.items,
        myMoney: s.p2.money,
        myLocked: s.p2.locked,
        myConfirmed: s.p2.confirmed,
        partnerItems: s.p1.items,
        partnerMoney: s.p1.money,
        partnerLocked: s.p1.locked,
        partnerConfirmed: s.p1.confirmed
      }
    }));
  }
}

// ==========================================
// HỆ THỐNG DÃ TẨU (DA TAU QUEST SYSTEM)
// ==========================================
function ensurePlayerDatau(uState) {
  if (!uState) return null;
  if (!uState.datau) {
    uState.datau = {
      streak: 0,
      totalDone: 0,
      curTask: null,
      completed: false,
      lastReward: null
    };
  }
  return uState.datau;
}

const DATAU_COMMON_ITEMS = [
  { n: 'Hoàng Ngọc Giới Chỉ', k: 0, lvl: 1, ic: 'img/i/g1.png' },
  { n: 'Phù Dung Thạch Giới Chỉ', k: 0, lvl: 3, ic: 'img/i/g3.png' },
  { n: 'Thúy Lựu Thạch Giới Chỉ', k: 0, lvl: 5, ic: 'img/i/g5.png' },
  { n: 'Lam Bảo Thạch Giới Chỉ', k: 0, lvl: 8, ic: 'img/i/g8.png' },
  { n: 'Ngân Hạng Liễm', k: 1, lvl: 2, ic: 'img/i/g12.png' },
  { n: 'Kim Hạng Liễm', k: 1, lvl: 3, ic: 'img/i/g13.png' },
  { n: 'Ngọc Châu Hạng Liễm', k: 1, lvl: 5, ic: 'img/i/g15.png' },
  { n: 'Trân Châu Hạng Liễm', k: 1, lvl: 8, ic: 'img/i/g18.png' },
  { n: 'Lục Du Ngọc Bội', k: 2, lvl: 1, ic: 'img/i/g21.png' },
  { n: 'Kinh Bạch Ngọc Bội', k: 2, lvl: 3, ic: 'img/i/g23.png' },
  { n: 'Ngũ Sắc Ngọc Bội', k: 2, lvl: 5, ic: 'img/i/g25.png' },
  { n: 'Bích Ngọc Ngọc Bội', k: 2, lvl: 7, ic: 'img/i/g27.png' },
  { n: 'San Hô Hộ Thân Phù', k: 3, lvl: 2, ic: 'img/i/g32.png' },
  { n: 'Miêu Nhãn Hộ Thân Phù', k: 3, lvl: 4, ic: 'img/i/g34.png' },
  { n: 'Hổ Phách Hộ Thân Phù', k: 3, lvl: 6, ic: 'img/i/g36.png' },
  { n: 'Tử Phỉ Thúy Hộ Thân Phù', k: 3, lvl: 9, ic: 'img/i/g39.png' }
];

const DATAU_MATERIALS = [
  { n: 'Lam Thủy Tinh', ic: 'img/i/g51.png' },
  { n: 'Tử Thủy Tinh', ic: 'img/i/g52.png' },
  { n: 'Tiên Thảo Lộ', ic: 'img/i/g53.png' },
  { n: 'Quế Hoa Tửu', ic: 'img/i/g54.png' },
  { n: 'Phúc Duyên Lộ', ic: 'img/i/g55.png' },
  { n: 'Huyền Tinh khoáng thạch', ic: 'img/i/g56.png' }
];

function generateDatauTask(pLvl) {
  const roll = Math.random();
  if (roll < 0.45) {
    let validZones = (JW && JW.zones) ? JW.zones.filter(z => z.id !== 37 && z.id !== 386) : [];
    if (validZones.length === 0) validZones = [{ id: 2, n: 'Hoa Sơn' }];
    let zObj = validZones[0];
    if (pLvl >= 120 && validZones.find(z => z.id === 224)) zObj = validZones.find(z => z.id === 224);
    else if (pLvl >= 90 && validZones.find(z => z.id === 56)) zObj = validZones.find(z => z.id === 56);
    else if (pLvl >= 60 && validZones.find(z => z.id === 90)) zObj = validZones.find(z => z.id === 90);
    else if (pLvl >= 30 && validZones.find(z => z.id === 7)) zObj = validZones.find(z => z.id === 7);
    else zObj = validZones[Math.floor(Math.random() * Math.min(3, validZones.length))];

    const count = 15 + Math.floor(Math.random() * 15);
    return {
      type: 'monster',
      typeName: 'Diệt Quái',
      desc: `Hãy đến [${zObj.n}] tiêu diệt ${count} quái vật để trừ gian diệt ác.`,
      zoneId: zObj.id,
      zoneName: zObj.n,
      targetCount: count,
      progress: 0
    };
  } else if (roll < 0.70) {
    const item = DATAU_COMMON_ITEMS[Math.floor(Math.random() * DATAU_COMMON_ITEMS.length)];
    return {
      type: 'equip_common',
      typeName: 'Thu Thập Trang Bị',
      desc: `Lão phu đang cần 1 [${item.n}]. Hãy tìm và giao nộp cho lão phu.`,
      itemName: item.n,
      itemIcon: item.ic,
      targetCount: 1,
      progress: 0
    };
  } else if (roll < 0.85) {
    const mat = DATAU_MATERIALS[Math.floor(Math.random() * DATAU_MATERIALS.length)];
    return {
      type: 'material',
      typeName: 'Giao Bảo Thạch',
      desc: `Lão phu cần 1 [${mat.n}] để luyện dược. Hãy mang tới cho lão phu.`,
      itemName: mat.n,
      itemIcon: mat.ic,
      targetCount: 1,
      progress: 0
    };
  } else {
    const expNeed = pLvl * 5000;
    return {
      type: 'exp',
      typeName: 'Luyện Công',
      desc: `Võ học vô biên, hãy rèn luyện tích lũy thêm ${fmt(expNeed)} điểm kinh nghiệm.`,
      targetCount: expNeed,
      progress: 0
    };
  }
}

// ==========================================
// HỆ THỐNG CHIẾN TRƯỜNG TỐNG KIM (SONG-JIN)
// Chu kỳ: Mỗi giờ 1 trận (60 phút / chu kỳ, diễn ra 30 phút):
// - Phút :00 -> :05 (5 phút = 300s): Báo Danh
// - Phút :05 -> :08 (3 phút = 180s): Vào Doanh Trại Đợi (Hậu doanh Tống / Kim)
// - Phút :08 -> :28 (20 phút = 1200s): Giao Tranh Quyết Liệt (Boss xuất hiện ở phút thứ 18)
// - Phút :28 -> :30 (2 phút = 120s): Kết Thúc & Trao Thưởng
// - Phút :30 -> :00 (30 phút = 1800s): Nghỉ Ngơi & Đếm Ngược Đến Trận Sau
// ==========================================
const TONGKIM_SERVER = {
  round: 1,
  phase: 'idle',           // 'register' | 'staging' | 'battle' | 'ended' | 'idle'
  phaseName: 'Chờ trận kế',
  timeLeft: 0,
  songScore: 0,
  jinScore: 0,
  bossSpawned: false,
  rewardGiven: false,
  players: new Map(),
  quancoBalances: new Map()
};

function getTongkimSchedule() {
  const now = new Date();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const secInHour = m * 60 + s;

  if (secInHour < 300) {
    // 00:00 -> 04:59 (5 phút)
    return {
      phase: 'register',
      phaseName: 'BÁO DANH',
      timeLeft: 300 - secInHour,
      totalPhaseTime: 300,
      bossSpawned: false
    };
  } else if (secInHour < 480) {
    // 05:00 -> 07:59 (3 phút)
    return {
      phase: 'staging',
      phaseName: 'DOANH TRẠI ĐỢI',
      timeLeft: 480 - secInHour,
      totalPhaseTime: 180,
      bossSpawned: false
    };
  } else if (secInHour < 1680) {
    // 08:00 -> 27:59 (20 phút)
    return {
      phase: 'battle',
      phaseName: 'GIAO TRANH',
      timeLeft: 1680 - secInHour,
      totalPhaseTime: 1200,
      bossSpawned: secInHour >= 1080 // Boss xuất hiện ở phút thứ 18 (sau 10 phút đánh)
    };
  } else if (secInHour < 1800) {
    // 28:00 -> 29:59 (2 phút)
    return {
      phase: 'ended',
      phaseName: 'KẾT THÚC & TRAO THƯỞNG',
      timeLeft: 1800 - secInHour,
      totalPhaseTime: 120,
      bossSpawned: false
    };
  } else {
    // 30:00 -> 59:59 (30 phút nghỉ)
    return {
      phase: 'idle',
      phaseName: 'NGHỈ NGƠI CHỜ TRẬN KẾ',
      timeLeft: 3600 - secInHour, // Đếm ngược đến đầu giờ sau (:00)
      totalPhaseTime: 1800,
      bossSpawned: false
    };
  }
}

function getPlayerQuanco(uKey) {
  if (!uKey) return 0;
  return TONGKIM_SERVER.quancoBalances.get(uKey) || 0;
}

function addPlayerQuanco(uKey, amt) {
  if (!uKey) return;
  const cur = getPlayerQuanco(uKey);
  TONGKIM_SERVER.quancoBalances.set(uKey, Math.max(0, cur + amt));
}

function getTongkimLadder() {
  const arr = Array.from(TONGKIM_SERVER.players.values());
  arr.sort((a, b) => (b.score || 0) - (a.score || 0));
  return arr.slice(0, 10).map((p, i) => ({
    rank: i + 1,
    id: p.id,
    name: p.name,
    camp: p.camp,
    kills: p.kills,
    score: p.score
  }));
}

function syncTongkimToAll() {
  const ladder = getTongkimLadder();
  for (const [ws, pl] of players.entries()) {
    if (ws.readyState !== 1) continue;
    const tkP = TONGKIM_SERVER.players.get(pl.id);
    const inBattle = (pl.zoneId === 386) || !!tkP;
    const qBal = pl.uKey ? getPlayerQuanco(pl.uKey) : 0;
    ws.send(JSON.stringify({
      type: 'tongkim_sync',
      phase: TONGKIM_SERVER.phase,
      phaseName: TONGKIM_SERVER.phaseName,
      inBattle: inBattle,
      camp: tkP ? tkP.camp : null,
      timeLeft: TONGKIM_SERVER.timeLeft,
      songScore: TONGKIM_SERVER.songScore,
      jinScore: TONGKIM_SERVER.jinScore,
      myScore: tkP ? tkP.score : 0,
      myKills: tkP ? tkP.kills : 0,
      myCombo: tkP ? tkP.combo : 0,
      quanco: qBal,
      ladder: ladder.map(item => ({ ...item, isMe: item.id === pl.id }))
    }));
  }
}

setInterval(() => {
  const sched = getTongkimSchedule();
  const prevPhase = TONGKIM_SERVER.phase;
  TONGKIM_SERVER.phase = sched.phase;
  TONGKIM_SERVER.phaseName = sched.phaseName;
  TONGKIM_SERVER.timeLeft = sched.timeLeft;

  // Xử lý chuyển đổi giai đoạn (Phase transitions)
  if (prevPhase !== sched.phase) {
    if (sched.phase === 'register') {
      // Bắt đầu 5 phút báo danh trận mới
      TONGKIM_SERVER.songScore = 0;
      TONGKIM_SERVER.jinScore = 0;
      TONGKIM_SERVER.bossSpawned = false;
      TONGKIM_SERVER.rewardGiven = false;
      for (const tkP of TONGKIM_SERVER.players.values()) {
        tkP.kills = 0; tkP.score = 0; tkP.combo = 0;
      }
      broadcast({
        type: 'player_chat',
        fromId: 0,
        fromName: '📢 [Tống Kim]',
        text: '⚔️ CHIẾN TRƯỜNG TỐNG KIM ĐÃ MỞ BÁO DANH (5 phút)! Đại hiệp hãy đến NPC Mộ Binh Quan tại Biện Kinh ghi danh chọn phe!',
        global: true
      });
    } else if (sched.phase === 'staging') {
      // Hết giờ báo danh, vào doanh trại đợi 3 phút
      broadcast({
        type: 'player_chat',
        fromId: 0,
        fromName: '📢 [Tống Kim]',
        text: '⏳ ĐÃ HẾT GIỜ BÁO DANH! Các hiệp khách tập kết tại Đại Doanh chuẩn bị xuất kích! Trận chiến sẽ bắt đầu sau 3 phút!',
        global: true
      });
      // Tập kết người chơi đã tham gia về Hậu Doanh
      for (const [pId, tkP] of TONGKIM_SERVER.players.entries()) {
        const plEntry = Array.from(players.entries()).find(([w, pl]) => pl.id === pId);
        if (plEntry) {
          const pl = plEntry[1];
          pl.zoneId = 386;
          pl.x = tkP.camp === 'song' ? 800 : 2600;
          pl.y = 1100;
          broadcastToZone(386, { type: 'player_enter', player: pl });
        }
      }
    } else if (sched.phase === 'battle') {
      // Khai chiến! Giao tranh 20 phút!
      broadcast({
        type: 'player_chat',
        fromId: 0,
        fromName: '📢 [Tống Kim]',
        text: '🔥 HIỆU LỆNH XUẤT KÍCH! Cửa đại doanh đã mở! Toàn quân Tống - Kim tràn ra chiến trường giao tranh (20 phút)!',
        global: true
      });
    } else if (sched.phase === 'ended') {
      // Trận đấu kết thúc, trao thưởng
      if (!TONGKIM_SERVER.rewardGiven) {
        TONGKIM_SERVER.rewardGiven = true;
        const winner = TONGKIM_SERVER.songScore > TONGKIM_SERVER.jinScore ? 'song' :
                       TONGKIM_SERVER.jinScore > TONGKIM_SERVER.songScore ? 'jin' : 'draw';
        const winName = winner === 'song' ? 'Phe TỐNG ĐẠI THẮNG' : winner === 'jin' ? 'Phe KIM ĐẠI THẮNG' : 'HAI BÊN BẤT PHÂN THẮNG BẠI';

        broadcast({
          type: 'player_chat',
          fromId: 0,
          fromName: '📢 [Tống Kim]',
          text: `🏆 TRẬN CHIẾN TỐNG KIM KẾT THÚC! ${winName}! (Tống ${TONGKIM_SERVER.songScore} : ${TONGKIM_SERVER.jinScore} Kim)`,
          global: true
        });

        for (const [pId, tkP] of TONGKIM_SERVER.players.entries()) {
          const plEntry = Array.from(players.entries()).find(([w, pl]) => pl.id === pId);
          if (plEntry && plEntry[1].uKey) {
            const uKey = plEntry[1].uKey;
            const isWin = (tkP.camp === winner);
            const winBonus = isWin ? 150 : 80;
            const scoreBonus = Math.floor(tkP.score / 2);
            const totalQ = winBonus + scoreBonus;
            addPlayerQuanco(uKey, totalQ);

            if (db.users[uKey] && db.users[uKey].state) {
              const uSt = db.users[uKey].state;
              const expR = tkP.score * 1500;
              const goldR = tkP.score * 500;
              uSt.xp = (uSt.xp || 0) + expR;
              uSt.gold = (uSt.gold || 0) + goldR;
              if (plEntry[0].readyState === 1) {
                plEntry[0].send(JSON.stringify({
                  type: 'state_sync',
                  xp: uSt.xp,
                  gold: uSt.gold
                }));
              }
            }
          }
        }
        saveDb();
      }
    } else if (sched.phase === 'idle') {
      broadcast({
        type: 'player_chat',
        fromId: 0,
        fromName: '📢 [Tống Kim]',
        text: '🌿 Trận chiến đã khép lại. Nghỉ ngơi dưỡng sức! Trận tiếp theo sẽ mở báo danh vào đầu giờ kế tiếp (:00)!',
        global: true
      });
    }
  }

  // Boss xuất hiện ở phút thứ 18 (khi sched.bossSpawned và chưa spawn)
  if (sched.bossSpawned && !TONGKIM_SERVER.bossSpawned) {
    TONGKIM_SERVER.bossSpawned = true;
    broadcast({
      type: 'player_chat',
      fromId: 0,
      fromName: '📢 [Chiến Trường]',
      zoneId: 386,
      text: '⚔️ ĐẠI BOSS TỐNG KIM ĐÃ XUẤT HIỆN! Trương Tông Chính & Liễu Thanh Thanh trấn giữ trung tâm!',
      global: true
    });
  }

  // Đồng bộ mỗi 2 giây
  if (TONGKIM_SERVER.timeLeft % 2 === 0) {
    syncTongkimToAll();
  }
}, 1000);

wss.on('connection', (ws) => {
  const pId = ++nextPlayerId;
  const pData = {
    id: pId,
    username: null,
    name: `Hiệp Khách ${pId}`,
    fac: 'shaolin',
    series: 0,
    lvl: 1,
    vip: 1,
    x: 768,
    y: 768,
    stage: 1,
    zoneId: 2,
    dir: 0,
    face: 1,
    act: 'st',
    chat: '',
    chatT: 0,
    pkMode: 'peace',
    initialized: false,
    lastUpdate: Date.now()
  };
  players.set(ws, pData);

  // Gửi danh sách người chơi đã khởi tạo cho client vừa vào (sẽ lọc zone sau khi nhận profile)
  const allActivePlayers = Array.from(players.values()).filter(x => x.id === pId || x.initialized);
  ws.send(JSON.stringify({
    type: 'init',
    myId: pId,
    players: allActivePlayers  // client sẽ tự lọc theo zoneId
  }));

  console.log(`[Multiplayer] Kết nối mới #${pId}. Tổng client: ${players.size}`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const p = players.get(ws);
      if (!p) return;

      const now = Date.now();

      // Cập nhật thông tin / Xác thực từ client
      if (data.type === 'auth' || data.type === 'profile') {
        const wasInit = p.initialized;
        if (data.token) {
          const uKey = sessions.get(data.token);
          if (uKey && db.users[uKey]) {
            p.username = db.users[uKey].username;
            p.uKey = uKey;
            // Áp đặt thông tin nhân vật từ cơ sở dữ liệu server
            const uState = db.users[uKey].state;
            if (uState) {
              p.lvl = Math.max(1, Math.min(99, Number(uState.lvl) || 1));
              if (uState.name) p.name = String(uState.name).slice(0, 20);
              if (uState.fac) p.fac = String(uState.fac);
            }
          }
        }

        // Chống trùng lặp (Duplicate session): Nếu tài khoản này đã có phiên mở trước đó, đá phiên cũ ra!
        if (p.username) {
          for (const [otherWs, otherP] of players.entries()) {
            if (otherWs !== ws && otherP.username === p.username) {
              if (otherWs.readyState === 1) {
                console.log(`[Multiplayer] Tài khoản "${p.username}" mở ở tab/kết nối mới (#${p.id}). Ngắt kết nối tab cũ (#${otherP.id}).`);
                try {
                  otherWs.send(JSON.stringify({
                    type: 'kicked',
                    message: 'Tài khoản của bạn đã được mở ở một tab hoặc cửa sổ khác!'
                  }));
                  otherWs.close();
                } catch (e) {}
              }
              players.delete(otherWs);
              broadcast({
                type: 'player_leave',
                id: otherP.id
              });
            }
          }
        }

        if (data.name && !p.uKey) p.name = String(data.name).slice(0, 20);
        if (data.fac) {
          p.fac = String(data.fac);
          if (p.uKey && db.users[p.uKey] && db.users[p.uKey].state) {
            db.users[p.uKey].state.fac = p.fac;
          }
        }
        if (data.series != null) p.series = Number(data.series);
        if (data.lvl != null && !p.uKey) p.lvl = Number(data.lvl);
        if (data.vip != null) p.vip = Number(data.vip);
        if (data.zoneId != null) {
          p.zoneId = Number(data.zoneId);
          ws.send(JSON.stringify({
            type: 'zone_mobs_sync',
            zoneId: p.zoneId,
            mobs: ensureZoneMobs(p.zoneId, p.x, p.y)
          }));
        }

        ws.send(JSON.stringify({
          type: 'market_sync',
          items: serverMarket
        }));

        // Gửi gói tin đồng bộ chuẩn từ Server tới Client ngay khi kết nối
        if (p.uKey && db.users[p.uKey] && db.users[p.uKey].state) {
          const uState = db.users[p.uKey].state;
          ws.send(JSON.stringify({
            type: 'state_sync',
            gold: uState.gold,
            lvl: uState.lvl,
            xp: uState.xp,
            attrPts: uState.attrPts,
            skPts: uState.skPts,
            attr: uState.attr,
            sk: uState.sk
          }));
        }

        // Nếu client gửi tọa độ ban đầu, đồng bộ ngay
        if (data.x != null && data.y != null) {
          p.x = Number(data.x);
          p.y = Number(data.y);
        }
        if (data.mounted !== undefined) p.mounted = !!data.mounted;
        if (data.mountTier != null) p.mountTier = Number(data.mountTier) || 1;
        if (data.mount) p.mount = data.mount;
        if (data.cloakTier != null) p.cloakTier = Number(data.cloakTier) || 1;
        if (data.cloak) p.cloak = data.cloak;
        if (data.pkMode) p.pkMode = String(data.pkMode);
        p.initialized = true;

        if (!wasInit) {
          // Chỉ thông báo xuất hiện tới người chơi CÙNG ZONE
          broadcastToZone(p.zoneId, {
            type: 'player_join',
            player: p
          }, ws);
          console.log(`[Multiplayer] Người chơi #${p.id} (${p.name} - ${p.username || 'Khách'}) đã vào thế giới (zone ${p.zoneId}).`);
        } else {
          // player_update chỉ gửi cho người cùng zone
          broadcastToZone(p.zoneId, {
            type: 'player_update',
            player: p
          }, ws);
        }
      } else if (data.type === 'move') {
        // Đồng bộ tọa độ & hành động
        const dt = (now - p.lastUpdate) / 1000;
        p.lastUpdate = now;

        const newX = Number(data.x);
        const newY = Number(data.y);

        if (!p.initialized || data.teleport) {
          p.x = newX;
          p.y = newY;
          p.initialized = true;
        } else {
          // Cho phép khoảng cách di chuyển thực tế kể cả giật lag
          const dist = Math.hypot(newX - p.x, newY - p.y);
          const maxDist = Math.max(350, 1200 * dt);
          if (dist <= maxDist) {
            p.x = newX;
            p.y = newY;
          } else {
            // Khi nhảy vọt quá xa (chuyển bản đồ / hồi thành), cập nhật luôn
            p.x = newX;
            p.y = newY;
          }
        }

        if (data.dir != null) p.dir = Number(data.dir);
        if (data.face != null) p.face = Number(data.face);
        if (data.act) p.act = String(data.act);
        if (data.stage != null) p.stage = Number(data.stage);
        if (data.mounted !== undefined) p.mounted = !!data.mounted;
        if (data.mountTier != null) p.mountTier = Number(data.mountTier) || 1;
        if (data.mount) p.mount = data.mount;
        if (data.cloakTier != null) p.cloakTier = Number(data.cloakTier) || 1;
        if (data.cloak) p.cloak = data.cloak;
        if (data.pkMode) p.pkMode = String(data.pkMode);
        if (data.hp != null) p.hp = Number(data.hp);
        if (data.maxHp != null) p.maxHp = Number(data.maxHp);
        if (data.mp != null) p.mp = Number(data.mp);
        if (data.maxMp != null) p.maxMp = Number(data.maxMp);

        const curParty = getPlayerParty(p.id);
        if (curParty) {
          const mem = curParty.members.find(m => m.id === p.id);
          if (mem) {
            mem.x = p.x;
            mem.y = p.y;
            mem.lvl = p.lvl;
            mem.fac = p.fac;
            mem.zoneId = p.zoneId;
            if (p.hp != null) mem.hp = p.hp;
            if (p.maxHp != null) mem.maxHp = p.maxHp;
            if (p.mp != null) mem.mp = p.mp;
            if (p.maxMp != null) mem.maxMp = p.maxMp;
          }
        }
        if (data.zoneId != null) {
          const oldZone = p.zoneId;
          p.zoneId = Number(data.zoneId);
          if (oldZone !== p.zoneId) {
            // Thông báo cho zone CŨ: người chơi rời đi
            broadcastToZone(oldZone, {
              type: 'player_leave',
              id: p.id
            }, ws);
            // Sync quái vật cho zone mới
            ws.send(JSON.stringify({
              type: 'zone_mobs_sync',
              zoneId: p.zoneId,
              mobs: ensureZoneMobs(p.zoneId, p.x, p.y)
            }));
            // Thông báo cho zone MỚI: người chơi xuất hiện
            broadcastToZone(p.zoneId, {
              type: 'player_join',
              player: p
            }, ws);
            // Gửi cho client mới vào zone: danh sách người chơi cùng zone
            const zonePlayers = Array.from(players.values())
              .filter(pl => pl.zoneId === p.zoneId && pl.id !== p.id && pl.initialized);
            ws.send(JSON.stringify({
              type: 'zone_players_sync',
              players: zonePlayers
            }));
          }
        }

        // Chỉ broadcast move tới người chơi CÙNG ZONE
        broadcastToZone(p.zoneId, {
          type: 'player_move',
          id: p.id,
          x: p.x,
          y: p.y,
          dir: p.dir,
          face: p.face,
          act: p.act,
          stage: p.stage,
          zoneId: p.zoneId,
          mounted: p.mounted,
          mountTier: p.mountTier,
          mount: p.mount,
          cloakTier: p.cloakTier,
          pkMode: p.pkMode,
          hp: p.hp,
          maxHp: p.maxHp
        }, ws);
      } else if (data.type === 'pk_mode_change') {
        p.pkMode = String(data.pkMode || 'peace');
        broadcastToZone(p.zoneId, {
          type: 'player_pk_mode',
          id: p.id,
          pkMode: p.pkMode
        });
      } else if (data.type === 'pvp_hit') {
        const targetId = Number(data.targetId);
        let targetWs = null, targetP = null;
        for (const [otherWs, otherP] of players.entries()) {
          if (otherP.id === targetId) {
            targetWs = otherWs;
            targetP = otherP;
            break;
          }
        }
        if (targetP && targetWs && targetP.zoneId === p.zoneId && targetP.zoneId !== 37) {
          let dmg = Number(data.dmg) || 10;
          const maxDmg = getMaxAllowedDamage(p.lvl || 1);
          if (dmg > maxDmg) dmg = maxDmg;

          targetP.hp = Math.max(0, (targetP.hp != null ? targetP.hp : 100) - dmg);

          // Gửi cho nạn nhân
          try {
            targetWs.send(JSON.stringify({
              type: 'pvp_damaged',
              attackerId: p.id,
              attackerName: p.name,
              attackerPkMode: p.pkMode || 'peace',
              dmg: dmg,
              hp: targetP.hp,
              skillId: data.skillId
            }));
          } catch (e) {}

          // Broadcast số máu cập nhật cho zone
          broadcastToZone(p.zoneId, {
            type: 'player_damaged',
            id: targetId,
            dmg: dmg,
            hp: targetP.hp,
            attackerId: p.id
          }, targetWs);

          if (targetP.hp <= 0) {
            const zoneName = (JX && JX.zones && JX.zones.find(z => z.id === p.zoneId)) ? JX.zones.find(z => z.id === p.zoneId).n : 'Giang Hồ';
            const killMsg = p.pkMode === 'slaughter'
              ? `🩸 [Đồ Sát] ${p.name} đã hạ sát ${targetP.name} tại ${zoneName}!`
              : `⚔️ [Tỉ Võ PK] ${p.name} đã đánh bại ${targetP.name} tại ${zoneName}!`;
            broadcast({
              type: 'player_chat',
              fromId: 0,
              fromName: '📢 [Giang Hồ]',
              chan: 'world',
              text: killMsg,
              global: true
            });
          }
        }
      } else if (data.type === 'skill') {
        const skillId = Number(data.skillId) || 0;
        const tx = Number(data.tx);
        const ty = Number(data.ty);
        if (data.x != null) p.x = Number(data.x);
        if (data.y != null) p.y = Number(data.y);
        if (data.dir != null) p.dir = Number(data.dir);
        if (data.face != null) p.face = Number(data.face);
        p.act = 'at';

        // Chỉ gửi gói tin skill tới người chơi cùng bản đồ
        broadcastToZone(p.zoneId, {
          type: 'player_skill',
          id: p.id,
          skillId: skillId,
          tx: tx,
          ty: ty,
          x: p.x,
          y: p.y,
          dir: p.dir,
          face: p.face
        }, ws);
      } else if (data.type === 'mob_hit') {
        const mobId = Number(data.mobId);
        let dmg = Number(data.dmg) || 0;
        const zoneId = p.zoneId;
        const map = zoneMobs.get(zoneId);

        // Anti-Cheat: Giới hạn tốc độ đánh tối đa 8 lần / giây
        if (!p.hitWindowT || (now - p.hitWindowT > 1000)) {
          p.hitWindowT = now;
          p.hitsInSec = 0;
        }
        p.hitsInSec++;
        if (p.hitsInSec > 8) {
          // Vượt ngưỡng tốc độ đánh cho phép
          return;
        }

        // Anti-Cheat: Giới hạn sát thương tối đa cho phép theo cấp độ
        const maxDmg = getMaxAllowedDamage(p.lvl || 1);
        if (dmg > maxDmg) {
          console.warn(`[Anti-Cheat] Phát hiện dame ảo từ "${p.name}" (Lv.${p.lvl}): ${dmg} (Max cho phép: ${maxDmg}).`);
          dmg = maxDmg;
        }

        if (map && map.has(mobId)) {
          const mob = map.get(mobId);
          mob.hp = Math.max(0, mob.hp - dmg);

          broadcastToZone(zoneId, {
            type: 'mob_damage',
            mobId: mobId,
            hp: mob.hp,
            dmg: dmg,
            attackerId: p.id
          });

          if (mob.hp <= 0) {
            map.delete(mobId);
            const reqExp = (JX && JX.exp && JX.exp[mob.L - 1]) ? JX.exp[mob.L - 1] : (mob.L * 300);
            const party = getPlayerParty(p.id);
            const partyMul = (party && party.members.length > 1) ? (1 + (party.members.length - 1) * 0.1) : 1;
            const expGain = Math.round((reqExp / Math.max(2, 6 + mob.L * 0.12)) * (mob.cls === 'elite' ? 3.5 : 1.5) * partyMul);
            const goldDrop = Math.round(mob.L * 35 * (mob.cls === 'elite' ? 4 : 2));

            // Server-Authoritative: Cập nhật trực tiếp vào cơ sở dữ liệu nhân vật
            let updatedState = null;
            if (p.uKey && db.users[p.uKey] && db.users[p.uKey].state) {
              const uState = db.users[p.uKey].state;
              uState.gold = (uState.gold || 0) + goldDrop;
              const curLvl = Math.max(1, Math.min(99, Number(uState.lvl) || 1));
              const expNeeded = (JX && JX.exp && JX.exp[curLvl - 1]) ? JX.exp[curLvl - 1] : (curLvl * 1000);
              uState.xp = (uState.xp || 0) + expGain;
              let didLevelUp = false;
              while (uState.lvl < 99 && uState.xp >= expNeeded) {
                uState.xp -= expNeeded;
                uState.lvl++;
                uState.attrPts = (uState.attrPts || 0) + 5;
                uState.skPts = (uState.skPts || 0) + 1;
                didLevelUp = true;
              }
              if (didLevelUp) {
                p.lvl = uState.lvl;
                broadcastToZone(p.zoneId, {
                  type: 'player_update',
                  player: p
                });
              }
              updatedState = {
                gold: uState.gold,
                lvl: uState.lvl,
                xp: uState.xp,
                attrPts: uState.attrPts,
                skPts: uState.skPts,
                didLevelUp
              };
            }

            broadcastToZone(zoneId, {
              type: 'mob_die',
              mobId: mobId,
              killerId: p.id,
              killerName: p.name,
              exp: expGain,
              gold: goldDrop
            });

            // Hook nhiệm vụ Dã Tẩu: Tăng tiến độ tiêu diệt quái vật
            if (p.uKey && db.users[p.uKey] && db.users[p.uKey].state) {
              const dSt = db.users[p.uKey].state.datau;
              if (dSt && dSt.curTask && dSt.curTask.type === 'monster' && !dSt.completed) {
                if (!dSt.curTask.zoneId || dSt.curTask.zoneId === zoneId) {
                  dSt.curTask.progress = (dSt.curTask.progress || 0) + 1;
                  if (dSt.curTask.progress >= dSt.curTask.targetCount) {
                    dSt.curTask.progress = dSt.curTask.targetCount;
                    dSt.completed = true;
                  }
                  if (ws.readyState === 1) {
                    ws.send(JSON.stringify({
                      type: 'datau_sync',
                      streak: dSt.streak,
                      totalDone: dSt.totalDone,
                      curTask: dSt.curTask,
                      completed: dSt.completed
                    }));
                  }
                }
              }
            }

            // Hook Chiến Trường Tống Kim: Cộng điểm hạ quái chiến trường
            if (zoneId === 386) {
              const tkP = TONGKIM_SERVER.players.get(p.id);
              if (tkP) {
                tkP.mobKills = (tkP.mobKills || 0) + 1;
                const pts = 2;
                tkP.score = (tkP.score || 0) + pts;
                if (tkP.camp === 'song') TONGKIM_SERVER.songScore += pts;
                else if (tkP.camp === 'jin') TONGKIM_SERVER.jinScore += pts;
                syncTongkimToAll();
              }
            }

            // Gửi gói tin đồng bộ chuẩn từ server cho người hạ gục
            if (updatedState && ws.readyState === 1) {
              ws.send(JSON.stringify({
                type: 'state_sync',
                gold: updatedState.gold,
                lvl: updatedState.lvl,
                xp: updatedState.xp,
                attrPts: updatedState.attrPts,
                skPts: updatedState.skPts,
                didLevelUp: updatedState.didLevelUp
              }));
            }

            setTimeout(() => {
              if (players.size > 0) {
                const newMob = spawnOneMob(zoneId, p.x, p.y);
                if (newMob) {
                  broadcastToZone(zoneId, {
                    type: 'mob_spawn',
                    zoneId: zoneId,
                    mob: newMob
                  });
                }
              }
            }, 200);
          }
        }
      } else if (data.type === 'alloc_attr') {
        if (p.uKey && db.users[p.uKey] && db.users[p.uKey].state) {
          const uState = db.users[p.uKey].state;
          const key = String(data.attr);
          const amount = Math.max(1, Math.floor(Number(data.amount) || 1));
          if (['str', 'dex', 'vit', 'eng'].includes(key) && (uState.attrPts || 0) >= amount) {
            uState.attrPts -= amount;
            if (!uState.attr) uState.attr = { str: 0, dex: 0, vit: 0, eng: 0 };
            uState.attr[key] = (uState.attr[key] || 0) + amount;
            ws.send(JSON.stringify({
              type: 'state_sync',
              attrPts: uState.attrPts,
              attr: uState.attr
            }));
          }
        }
      } else if (data.type === 'alloc_skill') {
        if (p.uKey && db.users[p.uKey] && db.users[p.uKey].state) {
          const uState = db.users[p.uKey].state;
          const skillId = Number(data.skillId);
          if (skillId && (uState.skPts || 0) >= 1) {
            if (!uState.sk) uState.sk = {};
            const curRank = uState.sk[skillId] || 0;
            if (curRank < 20) {
              uState.skPts -= 1;
              uState.sk[skillId] = curRank + 1;
              ws.send(JSON.stringify({
                type: 'state_sync',
                skPts: uState.skPts,
                sk: uState.sk
              }));
            }
          }
        }
      } else if (data.type === 'change_faction') {
        const fac = String(data.fac);
        if (fac) {
          p.fac = fac;
          if (data.series != null) p.series = Number(data.series);
          if (p.uKey && db.users[p.uKey] && db.users[p.uKey].state) {
            db.users[p.uKey].state.fac = fac;
            db.users[p.uKey].fac = fac;
            if (data.sk) db.users[p.uKey].state.sk = data.sk;
            if (data.skPts != null) db.users[p.uKey].state.skPts = Number(data.skPts);
            if (data.main != null) db.users[p.uKey].state.main = Number(data.main);
            if (data.slots) db.users[p.uKey].state.slots = data.slots;
            saveDb();
            // Xác nhận trạng thái chuẩn sau khi đổi phái
            ws.send(JSON.stringify({
              type: 'state_sync',
              skPts: db.users[p.uKey].state.skPts,
              sk: db.users[p.uKey].state.sk
            }));
          }
          broadcastToZone(p.zoneId, {
            type: 'player_update',
            player: p
          });
          console.log(`[Multiplayer] Người chơi #${p.id} (${p.name}) đã chuyển sang môn phái ${fac}.`);
        }
      } else if (data.type === 'get_zone_mobs') {
        const zoneId = p.zoneId || 2;
        const mobs = ensureZoneMobs(zoneId, p.x, p.y);
        ws.send(JSON.stringify({
          type: 'zone_mobs_sync',
          zoneId: zoneId,
          mobs: mobs
        }));
      } else if (data.type === 'chat') {
        const text = String(data.text || '').trim().slice(0, 80);
        if (!text) return;

        p.chat = text;
        p.chatT = now;
        const chan = data.chan === 'trade' ? 'trade' : (data.chan || 'world');

        console.log(`[Chat] [${chan}] [VIP ${p.vip}] ${p.name}: ${text}`);

        broadcast({
          type: 'player_chat',
          id: p.id,
          name: p.name,
          vip: p.vip,
          chan: chan,
          text: text
        });
      } else if (data.type === 'market_post') {
        const price = Math.max(10, Math.floor(Number(data.price) || 100));
        const itemObj = {
          id: ++nextMarketId,
          sellerId: p.id,
          sellerName: p.name,
          it: data.it,
          price: price,
          time: now
        };
        serverMarket.push(itemObj);
        if (serverMarket.length > 60) serverMarket.shift();

        broadcast({
          type: 'market_sync',
          items: serverMarket
        });

        broadcast({
          type: 'player_chat',
          id: p.id,
          name: p.name,
          vip: p.vip,
          chan: 'trade',
          text: `Vừa đăng bán [${data.it ? data.it.n : 'Trang Bị'}] giá ${price} lượng lên Chợ Đen!`
        });
      } else if (data.type === 'market_buy') {
        const marketId = Number(data.marketId);
        const idx = serverMarket.findIndex(x => x.id === marketId);
        if (idx !== -1) {
          const itemObj = serverMarket[idx];
          serverMarket.splice(idx, 1);
          broadcast({
            type: 'market_sync',
            items: serverMarket
          });
          // Gửi tiền cho người bán nếu đang online
          for (const [otherWs, otherP] of players.entries()) {
            if (otherP.id === itemObj.sellerId && otherWs.readyState === 1) {
              otherWs.send(JSON.stringify({
                type: 'market_sold',
                gold: itemObj.price,
                itemName: itemObj.it.n
              }));
              break;
            }
          }
        }
      } else if (data.type === 'market_cancel') {
        const marketId = Number(data.marketId);
        const idx = serverMarket.findIndex(x => x.id === marketId && x.sellerId === p.id);
        if (idx !== -1) {
          serverMarket.splice(idx, 1);
          broadcast({
            type: 'market_sync',
            items: serverMarket
          });
        }
      } else if (data.type === 'party_create') {
        let party = getPlayerParty(p.id);
        if (!party) {
          const partyId = ++nextPartyId;
          party = {
            id: partyId,
            leaderId: p.id,
            leaderName: p.name,
            members: [{
              id: p.id,
              name: p.name,
              fac: p.fac,
              series: p.series,
              lvl: p.lvl,
              x: p.x,
              y: p.y,
              hp: p.hp || 100,
              maxHp: p.maxHp || 100,
              mp: p.mp || 100,
              maxMp: p.maxMp || 100,
              zoneId: p.zoneId
            }]
          };
          serverParties.set(partyId, party);
        }
        broadcastParty(party);
      } else if (data.type === 'party_invite') {
        const targetId = Number(data.targetId);
        const targetEntry = Array.from(players.entries()).find(([w, pl]) => pl.id === targetId);
        if (targetEntry) {
          let party = getPlayerParty(p.id);
          if (!party) {
            const partyId = ++nextPartyId;
            party = {
              id: partyId,
              leaderId: p.id,
              leaderName: p.name,
              members: [{
                id: p.id,
                name: p.name,
                fac: p.fac,
                series: p.series,
                lvl: p.lvl,
                x: p.x,
                y: p.y,
                hp: p.hp || 100,
                maxHp: p.maxHp || 100,
                mp: p.mp || 100,
                maxMp: p.maxMp || 100,
                zoneId: p.zoneId
              }]
            };
            serverParties.set(partyId, party);
            broadcastParty(party);
          }
          if (targetEntry[0].readyState === 1) {
            targetEntry[0].send(JSON.stringify({
              type: 'party_invite_req',
              fromId: p.id,
              fromName: p.name,
              partyId: party.id
            }));
          }
        }
      } else if (data.type === 'party_accept') {
        const partyId = Number(data.partyId);
        const party = serverParties.get(partyId);
        if (party && party.members.length < 8) {
          const oldParty = getPlayerParty(p.id);
          if (oldParty && oldParty.id !== partyId) {
            oldParty.members = oldParty.members.filter(m => m.id !== p.id);
            if (oldParty.members.length === 0) serverParties.delete(oldParty.id);
            else broadcastParty(oldParty);
          }
          if (!party.members.some(m => m.id === p.id)) {
            party.members.push({
              id: p.id,
              name: p.name,
              fac: p.fac,
              series: p.series,
              lvl: p.lvl,
              x: p.x,
              y: p.y,
              hp: p.hp || 100,
              maxHp: p.maxHp || 100,
              mp: p.mp || 100,
              maxMp: p.maxMp || 100,
              zoneId: p.zoneId
            });
          }
          broadcastParty(party);
        }
      } else if (data.type === 'party_leave') {
        const party = getPlayerParty(p.id);
        if (party) {
          party.members = party.members.filter(m => m.id !== p.id);
          ws.send(JSON.stringify({ type: 'party_sync', party: null }));
          if (party.members.length === 0) {
            serverParties.delete(party.id);
          } else {
            if (party.leaderId === p.id) {
              party.leaderId = party.members[0].id;
              party.leaderName = party.members[0].name;
            }
            broadcastParty(party);
          }
        }
      } else if (data.type === 'party_kick') {
        const party = getPlayerParty(p.id);
        const targetId = Number(data.targetId);
        if (party && party.leaderId === p.id && targetId !== p.id) {
          party.members = party.members.filter(m => m.id !== targetId);
          const targetEntry = Array.from(players.entries()).find(([w, pl]) => pl.id === targetId);
          if (targetEntry && targetEntry[0].readyState === 1) {
            targetEntry[0].send(JSON.stringify({ type: 'party_sync', party: null }));
          }
          broadcastParty(party);
        }
      } else if (data.type === 'party_transfer') {
        const party = getPlayerParty(p.id);
        const targetId = Number(data.targetId);
        if (party && party.leaderId === p.id && targetId !== p.id) {
          const targetMem = party.members.find(m => m.id === targetId);
          if (targetMem) {
            party.leaderId = targetId;
            party.leaderName = targetMem.name;
            broadcastParty(party);
          }
        }
      // ==========================================
      // XỬ LÝ GIAO DỊCH (TRADE MESSAGES)
      // ==========================================
      } else if (data.type === 'trade_req') {
        const targetId = Number(data.targetId);
        if (playerTradeMap.has(p.id)) {
          ws.send(JSON.stringify({ type: 'toast', msg: 'Bạn đang trong một giao dịch khác' }));
          return;
        }
        if (playerTradeMap.has(targetId)) {
          ws.send(JSON.stringify({ type: 'toast', msg: 'Đối phương đang bận giao dịch' }));
          return;
        }
        const tEntry = Array.from(players.entries()).find(([w, pl]) => pl.id === targetId);
        if (tEntry && tEntry[0].readyState === 1) {
          tEntry[0].send(JSON.stringify({
            type: 'trade_req_prompt',
            fromId: p.id,
            fromName: p.name,
            fromLvl: p.lvl
          }));
        }
      } else if (data.type === 'trade_accept') {
        const targetId = Number(data.targetId);
        if (playerTradeMap.has(p.id) || playerTradeMap.has(targetId)) return;
        const tEntry = Array.from(players.entries()).find(([w, pl]) => pl.id === targetId);
        if (!tEntry) return;
        const targetPl = tEntry[1];
        const tid = ++nextTradeId;
        const session = {
          id: tid,
          p1: { id: targetPl.id, name: targetPl.name, lvl: targetPl.lvl, uKey: targetPl.uKey, items: [], money: 0, locked: false, confirmed: false },
          p2: { id: p.id, name: p.name, lvl: p.lvl, uKey: p.uKey, items: [], money: 0, locked: false, confirmed: false }
        };
        activeTrades.set(tid, session);
        playerTradeMap.set(p.id, tid);
        playerTradeMap.set(targetPl.id, tid);
        syncTradeSession(session);
      } else if (data.type === 'trade_decline') {
        const targetId = Number(data.targetId);
        const tEntry = Array.from(players.entries()).find(([w, pl]) => pl.id === targetId);
        if (tEntry && tEntry[0].readyState === 1) {
          tEntry[0].send(JSON.stringify({ type: 'trade_cancelled', reason: `${p.name} đã từ chối giao dịch` }));
        }
      } else if (data.type === 'trade_set_item') {
        const s = getTradeSession(p.id);
        if (!s) return;
        const me = (s.p1.id === p.id) ? s.p1 : s.p2;
        if (me.locked) return;
        const uState = (p.uKey && db.users[p.uKey]) ? db.users[p.uKey].state : null;
        if (!uState || !uState.inv) return;

        if (data.action === 'add') {
          const it = uState.inv.find(x => x.uid === Number(data.itemUid));
          if (it && !me.items.some(x => x.uid === it.uid) && me.items.length < 16) {
            me.items.push(it);
            s.p1.locked = false; s.p2.locked = false;
            s.p1.confirmed = false; s.p2.confirmed = false;
            syncTradeSession(s);
          }
        } else if (data.action === 'remove') {
          me.items = me.items.filter(x => x.uid !== Number(data.itemUid));
          s.p1.locked = false; s.p2.locked = false;
          s.p1.confirmed = false; s.p2.confirmed = false;
          syncTradeSession(s);
        }
      } else if (data.type === 'trade_set_money') {
        const s = getTradeSession(p.id);
        if (!s) return;
        const me = (s.p1.id === p.id) ? s.p1 : s.p2;
        if (me.locked) return;
        const uState = (p.uKey && db.users[p.uKey]) ? db.users[p.uKey].state : null;
        const maxGold = uState ? (uState.gold || 0) : 0;
        const amt = Math.max(0, Math.min(maxGold, Math.floor(Number(data.money) || 0)));
        me.money = amt;
        s.p1.locked = false; s.p2.locked = false;
        s.p1.confirmed = false; s.p2.confirmed = false;
        syncTradeSession(s);
      } else if (data.type === 'trade_lock') {
        const s = getTradeSession(p.id);
        if (!s) return;
        const me = (s.p1.id === p.id) ? s.p1 : s.p2;
        me.locked = true;
        syncTradeSession(s);
      } else if (data.type === 'trade_confirm') {
        const s = getTradeSession(p.id);
        if (!s) return;
        if (!s.p1.locked || !s.p2.locked) return;
        const me = (s.p1.id === p.id) ? s.p1 : s.p2;
        me.confirmed = true;
        syncTradeSession(s);

        if (s.p1.confirmed && s.p2.confirmed) {
          const u1 = (s.p1.uKey && db.users[s.p1.uKey]) ? db.users[s.p1.uKey].state : null;
          const u2 = (s.p2.uKey && db.users[s.p2.uKey]) ? db.users[s.p2.uKey].state : null;
          if (u1 && u2) {
            const p1Uids = new Set(s.p1.items.map(x => x.uid));
            const p2Uids = new Set(s.p2.items.map(x => x.uid));

            u1.inv = (u1.inv || []).filter(x => !p1Uids.has(x.uid)).concat(s.p2.items);
            u2.inv = (u2.inv || []).filter(x => !p2Uids.has(x.uid)).concat(s.p1.items);

            u1.gold = (u1.gold || 0) - s.p1.money + s.p2.money;
            u2.gold = (u2.gold || 0) - s.p2.money + s.p1.money;

            saveDb();
          }

          const e1 = Array.from(players.entries()).find(([w, pl]) => pl.id === s.p1.id);
          const e2 = Array.from(players.entries()).find(([w, pl]) => pl.id === s.p2.id);

          if (e1 && e1[0].readyState === 1) {
            e1[0].send(JSON.stringify({ type: 'trade_complete' }));
            if (u1) e1[0].send(JSON.stringify({ type: 'state_sync', gold: u1.gold, inv: u1.inv }));
          }
          if (e2 && e2[0].readyState === 1) {
            e2[0].send(JSON.stringify({ type: 'trade_complete' }));
            if (u2) e2[0].send(JSON.stringify({ type: 'state_sync', gold: u2.gold, inv: u2.inv }));
          }

          activeTrades.delete(s.id);
          playerTradeMap.delete(s.p1.id);
          playerTradeMap.delete(s.p2.id);
        }
      } else if (data.type === 'trade_cancel') {
        const s = getTradeSession(p.id);
        if (s) cancelTradeSession(s.id, `${p.name} đã hủy giao dịch`);
      // ==========================================
      // XỬ LÝ NHIỆM VỤ DÃ TẨU (DA TAU MESSAGES)
      // ==========================================
      } else if (data.type === 'datau_info') {
        const uSt = (p.uKey && db.users[p.uKey]) ? db.users[p.uKey].state : (p.state = p.state || { lvl: p.lvl, gold: 100000 });
        const dSt = ensurePlayerDatau(uSt);
        ws.send(JSON.stringify({
          type: 'datau_sync',
          streak: dSt.streak,
          totalDone: dSt.totalDone,
          curTask: dSt.curTask,
          completed: dSt.completed
        }));
      } else if (data.type === 'datau_accept') {
        const uSt = (p.uKey && db.users[p.uKey]) ? db.users[p.uKey].state : (p.state = p.state || { lvl: p.lvl, gold: 100000 });
        const dSt = ensurePlayerDatau(uSt);
        if (!dSt.curTask) {
          dSt.curTask = generateDatauTask(p.lvl || 1);
          dSt.completed = false;
          if (p.uKey) saveDb();
        }
        ws.send(JSON.stringify({
          type: 'datau_sync',
          streak: dSt.streak,
          totalDone: dSt.totalDone,
          curTask: dSt.curTask,
          completed: dSt.completed
        }));
      } else if (data.type === 'datau_check') {
        if (p.uKey && db.users[p.uKey]) {
          const uSt = db.users[p.uKey].state;
          const dSt = ensurePlayerDatau(uSt);
          if (dSt.curTask && !dSt.completed) {
            if (dSt.curTask.type === 'monster' || dSt.curTask.type === 'exp') {
              if ((dSt.curTask.progress || 0) >= dSt.curTask.targetCount) {
                dSt.completed = true;
              }
            } else if (dSt.curTask.type === 'equip_common' && uSt.inv) {
              const idx = uSt.inv.findIndex(x => x.n === dSt.curTask.itemName);
              if (idx >= 0) {
                uSt.inv.splice(idx, 1);
                dSt.progress = 1;
                dSt.completed = true;
                saveDb();
                ws.send(JSON.stringify({ type: 'state_sync', inv: uSt.inv }));
              }
            } else if (dSt.curTask.type === 'material') {
              const idx = (uSt.inv || []).findIndex(x => x.n && x.n.includes(dSt.curTask.itemName));
              if (idx >= 0) {
                uSt.inv.splice(idx, 1);
                dSt.progress = 1;
                dSt.completed = true;
                saveDb();
                ws.send(JSON.stringify({ type: 'state_sync', inv: uSt.inv }));
              }
            }
            ws.send(JSON.stringify({
              type: 'datau_sync',
              streak: dSt.streak,
              totalDone: dSt.totalDone,
              curTask: dSt.curTask,
              completed: dSt.completed
            }));
          }
        }
      } else if (data.type === 'datau_claim') {
        if (p.uKey && db.users[p.uKey]) {
          const uSt = db.users[p.uKey].state;
          const dSt = ensurePlayerDatau(uSt);
          if (dSt.completed) {
            const pLvl = uSt.lvl || 1;
            const choice = data.choice || 'exp';
            if (choice === 'exp') {
              const expR = pLvl * 8000 * (1 + (dSt.streak % 100) * 0.02);
              uSt.xp = (uSt.xp || 0) + expR;
            } else if (choice === 'money') {
              const goldR = pLvl * 2000 * (1 + (dSt.streak % 100) * 0.02);
              uSt.gold = (uSt.gold || 0) + goldR;
            } else {
              const roll = Math.random();
              const gem = roll < 0.5 ? 'Lam Thủy Tinh' : roll < 0.8 ? 'Tử Thủy Tinh' : 'Lục Thủy Tinh';
              const rewardItem = { uid: Date.now(), n: gem, k: 4, ic: 'img/i/g51.png', r: 3, price: 50000 };
              uSt.inv = (uSt.inv || []).concat([rewardItem]);
            }

            dSt.streak = (dSt.streak || 0) + 1;
            dSt.totalDone = (dSt.totalDone || 0) + 1;

            const milestones = [10, 20, 50, 100, 200, 500, 1000];
            if (milestones.includes(dSt.streak)) {
              uSt.gold = (uSt.gold || 0) + dSt.streak * 5000;
              uSt.xp = (uSt.xp || 0) + dSt.streak * 15000;
              broadcast({
                type: 'player_chat',
                fromId: 0,
                fromName: '📢 [Dã Tẩu]',
                zoneId: p.zoneId,
                text: `Chúc mừng hiệp khách ${p.name} đã hoàn thành mốc ${dSt.streak} chuỗi nhiệm vụ Dã Tẩu!`,
                global: true
              });
            }

            dSt.curTask = null;
            dSt.completed = false;
            saveDb();

            ws.send(JSON.stringify({
              type: 'datau_sync',
              streak: dSt.streak,
              totalDone: dSt.totalDone,
              curTask: null,
              completed: false
            }));
            ws.send(JSON.stringify({
              type: 'state_sync',
              gold: uSt.gold,
              xp: uSt.xp,
              inv: uSt.inv
            }));
          }
        }
      } else if (data.type === 'datau_skip') {
        if (p.uKey && db.users[p.uKey]) {
          const uSt = db.users[p.uKey].state;
          const dSt = ensurePlayerDatau(uSt);
          if ((uSt.gold || 0) >= 10000) {
            uSt.gold -= 10000;
            dSt.curTask = null;
            dSt.completed = false;
            saveDb();
            ws.send(JSON.stringify({
              type: 'datau_sync',
              streak: dSt.streak,
              totalDone: dSt.totalDone,
              curTask: null,
              completed: false
            }));
            ws.send(JSON.stringify({ type: 'state_sync', gold: uSt.gold }));
          }
        }
      // ==========================================
      // XỬ LÝ CHIẾN TRƯỜNG TỐNG KIM (TONG KIM)
      // ==========================================
      } else if (data.type === 'tongkim_join') {
        if (TONGKIM_SERVER.phase === 'idle') {
          const mins = Math.ceil(TONGKIM_SERVER.timeLeft / 60);
          ws.send(JSON.stringify({
            type: 'player_chat',
            fromId: 0,
            fromName: '📢 [Tống Kim]',
            text: `Chiến trường hiện đang tạm nghỉ. Trận kế tiếp sẽ mở báo danh sau ${mins} phút nữa (vào đầu giờ tiếp theo)!`
          }));
          return;
        }
        let camp = data.camp;
        if (!camp || camp === 'auto') {
          let songC = 0, jinC = 0;
          for (const pl of TONGKIM_SERVER.players.values()) {
            if (pl.camp === 'song') songC++;
            else jinC++;
          }
          camp = songC <= jinC ? 'song' : 'jin';
        }
        TONGKIM_SERVER.players.set(p.id, {
          id: p.id,
          name: p.name,
          fac: p.fac,
          camp: camp,
          kills: 0,
          score: 0,
          combo: 0
        });
        p.zoneId = 386;
        p.x = camp === 'song' ? 800 : 2600;
        p.y = TONGKIM_SERVER.phase === 'staging' ? 1100 : 1350;
        broadcastToZone(386, { type: 'player_enter', player: p });
        syncTongkimToAll();
      } else if (data.type === 'tongkim_leave') {
        TONGKIM_SERVER.players.delete(p.id);
        p.zoneId = 37;
        p.x = 1000; p.y = 1000;
        broadcastToZone(37, { type: 'player_enter', player: p });
        syncTongkimToAll();
      } else if (data.type === 'tongkim_pvp_kill') {
        const victimId = Number(data.victimId);
        const killerTK = TONGKIM_SERVER.players.get(p.id);
        const victimTK = TONGKIM_SERVER.players.get(victimId);
        if (killerTK && victimTK && killerTK.camp !== victimTK.camp) {
          killerTK.kills = (killerTK.kills || 0) + 1;
          killerTK.combo = (killerTK.combo || 0) + 1;
          victimTK.combo = 0;
          const pts = 20;
          killerTK.score = (killerTK.score || 0) + pts;
          if (killerTK.camp === 'song') TONGKIM_SERVER.songScore += pts;
          else TONGKIM_SERVER.jinScore += pts;

          let comboTitle = '';
          if (killerTK.combo === 3) comboTitle = '⚔️ LIÊN TRẢM (3 mạng)';
          else if (killerTK.combo === 5) comboTitle = '🔥 ĐẠI SÁT TỨ PHƯƠNG (5 mạng)';
          else if (killerTK.combo >= 10) comboTitle = '⚡ THIÊN HẠ VÔ SONG (10+ mạng)';

          if (comboTitle) {
            broadcast({
              type: 'player_chat',
              fromId: 0,
              fromName: '📢 [Tống Kim]',
              zoneId: 386,
              text: `${p.name} (${killerTK.camp === 'song' ? 'Tống' : 'Kim'}) đạt ${comboTitle}!`,
              global: true
            });
          }
          syncTongkimToAll();
        }
      } else if (data.type === 'tongkim_buy') {
        const uKey = p.uKey;
        if (uKey && db.users[uKey]) {
          const uSt = db.users[uKey].state;
          const bal = getPlayerQuanco(uKey);
          const itemId = data.itemId;
          const PRICES = { mount: 1000, card: 250, box: 300, potion: 100 };
          const cost = PRICES[itemId] || 999999;
          if (bal >= cost) {
            addPlayerQuanco(uKey, -cost);
            if (itemId === 'mount') {
              uSt.mount = { id: 'tk_horse', n: 'Chiến Mã Tống Kim', spd: 1.5, dodge: 150 };
            } else if (itemId === 'box') {
              const roll = Math.random();
              const gem = roll < 0.4 ? 'Lam Thủy Tinh' : roll < 0.7 ? 'Tử Thủy Tinh' : 'Huyền Tinh cấp 5';
              uSt.inv = (uSt.inv || []).concat([{ uid: Date.now(), n: gem, k: 4, ic: 'img/i/g51.png', r: 3 }]);
            }
            saveDb();
            ws.send(JSON.stringify({
              type: 'toast',
              msg: `Đổi thành công vật phẩm Quân Nhu! Điểm Quân Công còn: ${getPlayerQuanco(uKey)}`
            }));
            ws.send(JSON.stringify({ type: 'state_sync', inv: uSt.inv, mount: uSt.mount }));
            syncTongkimToAll();
          } else {
            ws.send(JSON.stringify({ type: 'toast', msg: `Không đủ Điểm Quân Công (Cần ${cost})!` }));
          }
        }
      // ==========================================
      // XỬ LÝ BÀY BÁN HÀNG RONG (PLAYER STALL)
      // ==========================================
      } else if (data.type === 'stall_open') {
        const title = String(data.title || 'Tiệm Tạp Hóa').slice(0, 32);
        const items = Array.isArray(data.items) ? data.items.slice(0, 12) : [];
        p.stall = { title, items };
        broadcastToZone(p.zoneId, {
          type: 'stall_sync',
          playerId: p.id,
          stall: p.stall
        });
        ws.send(JSON.stringify({ type: 'toast', msg: `Mở sạp hàng [${title}] thành công!` }));
      } else if (data.type === 'stall_close') {
        p.stall = null;
        broadcastToZone(p.zoneId, {
          type: 'stall_sync',
          playerId: p.id,
          stall: null
        });
      } else if (data.type === 'stall_buy') {
        const sellerId = Number(data.sellerId);
        const itemUid = Number(data.itemUid);
        let seller = null, sellerWs = null;
        for (const [sock, pl] of players.entries()) {
          if (pl.id === sellerId) { seller = pl; sellerWs = sock; break; }
        }

        if (!seller || !seller.stall || !Array.isArray(seller.stall.items)) {
          ws.send(JSON.stringify({ type: 'toast', msg: 'Sạp hàng này không tồn tại hoặc đã đóng!' }));
        } else {
          const stallIt = seller.stall.items.find(x => x.uid === itemUid);
          if (!stallIt) {
            ws.send(JSON.stringify({ type: 'toast', msg: 'Vật phẩm đã được người khác mua trước!' }));
          } else {
            const price = Number(stallIt.price) || 0;
            const buyerUser = (p.uKey && db.users[p.uKey]) ? db.users[p.uKey] : null;
            const sellerUser = (seller.uKey && db.users[seller.uKey]) ? db.users[seller.uKey] : null;

            if (!buyerUser || !sellerUser) {
              ws.send(JSON.stringify({ type: 'toast', msg: 'Lỗi đồng bộ tài khoản!' }));
            } else if ((buyerUser.state.gold || 0) < price) {
              ws.send(JSON.stringify({ type: 'toast', msg: 'Không đủ ngân lượng để thanh toán!' }));
            } else {
              // Thực hiện giao dịch nguyên tử
              buyerUser.state.gold -= price;
              sellerUser.state.gold = (sellerUser.state.gold || 0) + price;

              // Chuyển vật phẩm
              if (!Array.isArray(buyerUser.state.inv)) buyerUser.state.inv = [];
              if (Array.isArray(sellerUser.state.inv)) {
                sellerUser.state.inv = sellerUser.state.inv.filter(x => x.uid !== itemUid);
              }
              buyerUser.state.inv.push(stallIt);

              // Cập nhật sạp hàng của người bán
              seller.stall.items = seller.stall.items.filter(x => x.uid !== itemUid);
              saveDb();

              // Gửi cập nhật cho người mua
              ws.send(JSON.stringify({
                type: 'state_sync',
                gold: buyerUser.state.gold,
                inv: buyerUser.state.inv
              }));
              ws.send(JSON.stringify({
                type: 'toast',
                msg: `Mua thành công [${stallIt.n}] với giá ${price} lượng!`
              }));

              // Gửi cập nhật cho người bán
              if (sellerWs && sellerWs.readyState === 1) {
                sellerWs.send(JSON.stringify({
                  type: 'state_sync',
                  gold: sellerUser.state.gold,
                  inv: sellerUser.state.inv
                }));
                sellerWs.send(JSON.stringify({
                  type: 'toast',
                  msg: `[Sạp Hàng] Hiệp khách ${p.name} đã mua [${stallIt.n}] (+${price} lượng)!`
                }));
              }

              // Đồng bộ lại sạp hàng trên toàn khu vực
              broadcastToZone(seller.zoneId, {
                type: 'stall_sync',
                playerId: seller.id,
                stall: seller.stall.items.length > 0 ? seller.stall : null
              });
            }
          }
        }
      }
    } catch (e) {
      console.error('[Multiplayer] Message error:', e);
    }
  });

  ws.on('close', () => {
    const p = players.get(ws);
    if (p) {
      console.log(`[Multiplayer] Người chơi #${p.id} (${p.name}) đã rời game.`);
      // Tự động đóng sạp hàng nếu đang mở
      if (p.stall) {
        p.stall = null;
        broadcastToZone(p.zoneId, {
          type: 'stall_sync',
          playerId: p.id,
          stall: null
        });
      }
      // Tự động hủy giao dịch nếu đang mở
      const tid = playerTradeMap.get(p.id);
      if (tid) cancelTradeSession(tid, `${p.name} đã ngắt kết nối`);
      // Rời khỏi Tống Kim nếu đang tham gia
      if (TONGKIM_SERVER.players.has(p.id)) {
        TONGKIM_SERVER.players.delete(p.id);
        syncTongkimToAll();
      }
      // Tự động rời tổ đội
      const party = getPlayerParty(p.id);
      if (party) {
        party.members = party.members.filter(m => m.id !== p.id);
        if (party.members.length === 0) {
          serverParties.delete(party.id);
        } else {
          if (party.leaderId === p.id) {
            party.leaderId = party.members[0].id;
            party.leaderName = party.members[0].name;
          }
          broadcastParty(party);
        }
      }
      players.delete(ws);
      broadcast({
        type: 'player_leave',
        id: p.id
      });
    }
  });

  ws.on('error', (err) => {
    console.error(`[Multiplayer] Socket error:`, err);
  });
});

// Định kỳ 8 giây gửi gói tin xác thực trạng thái (Authoritative State Sync) tới tất cả người chơi
setInterval(() => {
  for (const [ws, p] of players.entries()) {
    if (ws.readyState === 1 && p.uKey && db.users[p.uKey] && db.users[p.uKey].state) {
      const uState = db.users[p.uKey].state;
      try {
        ws.send(JSON.stringify({
          type: 'state_sync',
          gold: uState.gold,
          lvl: uState.lvl,
          xp: uState.xp,
          attrPts: uState.attrPts,
          skPts: uState.skPts,
          attr: uState.attr,
          sk: uState.sk
        }));
      } catch (e) {}
    }
  }
}, 8000);

// ==========================================
// 4. KHỞI ĐỘNG SERVER
// ==========================================
function startListening(port) {
  server.listen(port, '0.0.0.0', () => {
    PORT = port;
    const url = `http://localhost:${port}/`;
    console.log(`==================================================`);
    console.log(`  VO LAM IDLE - GAME SERVER & MULTIPLAYER ONLINE! `);
    console.log(`  Web & WebSocket: port ${port}                   `);
    console.log(`==================================================`);
    try {
      if (process.platform === 'win32' && !process.env.PORT) {
        require('child_process').exec(`start ${url}`);
      }
    } catch (e) {}
  });

  server.on('error', (err) => {
    if ((err.code === 'EADDRINUSE' || err.code === 'EACCES') && !process.env.PORT) {
      console.log(`Port ${port} đang bận, thử port ${port + 1}...`);
      startListening(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startListening(PORT);
