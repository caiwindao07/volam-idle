const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://volam.vinarpg.com';

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function downloadFile(relPath) {
  const cleanRel = relPath.split('?')[0].replace(/^\//, '');
  const targetPath = path.join(process.cwd(), cleanRel);
  if (fs.existsSync(targetPath)) {
    // console.log(`Already exists: ${cleanRel}`);
    return true;
  }
  const fullUrl = `${BASE_URL}/${cleanRel}`;
  try {
    const buf = await fetchBuffer(fullUrl);
    ensureDir(targetPath);
    fs.writeFileSync(targetPath, buf);
    console.log(`[OK] Downloaded: ${cleanRel} (${buf.length} bytes)`);
    return true;
  } catch (err) {
    console.warn(`[WARN] Failed ${fullUrl}: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('--- Step 1: Fetch HTML ---');
  const html = await fetchText(BASE_URL + '/');
  fs.writeFileSync('vinarpg_raw.html', html, 'utf8');

  // Extract scripts & links from HTML
  const assetRegex = /(?:src|href|content)=["']([^"']+\.(?:js|css|webp|png|jpg|jpeg|svg|ico|json|mp3|wav|ogg)(?:\?[^"']*)?)["']/gi;
  const assetsToDownload = new Set();
  let match;
  while ((match = assetRegex.exec(html)) !== null) {
    const url = match[1];
    if (!url.startsWith('http') || url.includes('volam.vinarpg.com')) {
      const rel = url.replace(BASE_URL, '').replace(/^\//, '');
      assetsToDownload.add(rel);
    }
  }

  // Explicit quick images list
  const quickImages = [
    'ui/quick/tower.png',
    'ui/quick/tong-kim.png',
    'ui/quick/dungeon.png',
    'ui/quick/boat.png',
    'ui/quick/weekly-boss.png',
    'ui/quick/clan.png',
    'ui/quick/quest.png',
    'ui/quick/guild.png',
    'ui/quick/journal.png',
    'ui/quick/forge.png',
    'ui/quick/storage.png',
    'ui/quick/encyclopedia.png',
    'ui/quick/tai-xiu.png',
    'ui/quick/training.png',
    'ui/quick/companion.png',
    'ui/quick/tyvo.png',
    'ui/quick/than-ma.png',
    'ui/rewards/equipment-five-affixes.png',
    'ui/yuanbao.png',
    'img/ep/knb.png',
    'img/ep/tt.png',
    'img/ep/box2.png',
    'img/ep/box3.png'
  ];
  quickImages.forEach(q => assetsToDownload.add(q));

  console.log('--- Step 2: Fetch and scan JS bundle ---');
  const jsBundlePath = 'assets/game.qgMu3pAn.js';
  const jsText = await fetchText(`${BASE_URL}/${jsBundlePath}`);
  ensureDir(path.join(process.cwd(), jsBundlePath));
  fs.writeFileSync(path.join(process.cwd(), jsBundlePath), jsText, 'utf8');
  console.log(`Saved JS bundle: ${jsBundlePath} (${jsText.length} bytes)`);

  const jsAssetRegex = /["']((?:assets|ui|img|sound|audio)\/[^"']+\.(?:webp|png|jpg|jpeg|svg|ico|json|mp3|wav|ogg)(?:\?[^"']*)?)["']/gi;
  while ((match = jsAssetRegex.exec(jsText)) !== null) {
    assetsToDownload.add(match[1]);
  }

  console.log('--- Step 3: Fetch and scan CSS ---');
  const cssPath = 'assets/game.RLVgPLdE.css';
  const cssText = await fetchText(`${BASE_URL}/${cssPath}`);
  ensureDir(path.join(process.cwd(), cssPath));
  fs.writeFileSync(path.join(process.cwd(), cssPath), cssText, 'utf8');
  console.log(`Saved CSS: ${cssPath} (${cssText.length} bytes)`);

  const cssAssetRegex = /url\(["']?([^"')]+\.(?:webp|png|jpg|jpeg|svg|ico|woff2?|ttf)(?:\?[^"')]*)?)["']?\)/gi;
  while ((match = cssAssetRegex.exec(cssText)) !== null) {
    let u = match[1];
    if (u.startsWith('data:')) continue;
    if (u.startsWith('/')) u = u.slice(1);
    assetsToDownload.add(u);
  }

  console.log(`Total unique assets queued for download: ${assetsToDownload.size}`);

  let successCount = 0;
  let failCount = 0;
  for (const asset of assetsToDownload) {
    const ok = await downloadFile(asset);
    if (ok) successCount++;
    else failCount++;
  }

  console.log(`Download finished! Success: ${successCount}, Failed: ${failCount}`);
}

main().catch(console.error);
