const fs = require('fs');
const path = require('path');

const js = fs.readFileSync('assets/game.qgMu3pAn.js', 'utf8');
const matches = js.match(/(?:[a-zA-Z0-9_\-\.\/]+)\.(?:png|jpg|jpeg|webp|gif|svg|mp3|wav|ogg)/g) || [];
const BASE_URL = 'https://volam.vinarpg.com';

const candidates = new Set();
for (const m of matches) {
  let clean = m.replace(/^\/+/, '');
  if (clean.startsWith('http')) continue;
  // keep sensible path starts
  if (clean.startsWith('img/') || clean.startsWith('ui/') || clean.startsWith('assets/') || clean.startsWith('sound/') || clean.startsWith('audio/')) {
    candidates.add(clean);
  }
}

console.log('Total candidate assets found in JS:', candidates.size);

const missing = [];
for (const c of candidates) {
  const p = path.join(process.cwd(), c);
  if (!fs.existsSync(p)) {
    missing.push(c);
  }
}

console.log('Missing candidate assets:', missing.length);
if (missing.length > 0) {
  console.log('Sample missing (up to 30):', missing.slice(0, 30));
}

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function downloadMissing() {
  if (missing.length === 0) {
    console.log('All candidates exist locally!');
    return;
  }
  let ok = 0, fail = 0;
  for (const f of missing) {
    const url = `${BASE_URL}/${f}`;
    const p = path.join(process.cwd(), f);
    try {
      const buf = await fetchBuffer(url);
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(p, buf);
      console.log(`[OK] Downloaded: ${f} (${buf.length} bytes)`);
      ok++;
    } catch (e) {
      // remote might also not have it (e.g. obsolete string or relative to another base)
      // console.log(`[404] ${f}`);
      fail++;
    }
  }
  console.log(`Download round complete: ${ok} downloaded, ${fail} failed/404`);
}

downloadMissing();
