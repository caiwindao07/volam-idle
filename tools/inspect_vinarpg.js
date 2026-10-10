const fs = require('fs');

async function run() {
  const r = await fetch('https://volam.vinarpg.com/assets/game.qgMu3pAn.js');
  const t = await r.text();
  console.log('Bundle len:', t.length);

  // find all asset paths
  const re = /["']([^"']+\.(png|webp|svg|jpg|mp3|wav|ogg|json)[^"']*)["']/g;
  const set = new Set();
  let m;
  while ((m = re.exec(t)) !== null) {
    set.add(m[1]);
  }
  console.log('Total unique assets found in bundle:', set.size);
  const arr = Array.from(set);
  console.log('Sample assets (first 20):', arr.slice(0, 20));

  // Check what quick images are referenced
  const quick = arr.filter(x => x.includes('quick'));
  console.log('Quick images referenced:', quick);
}

run().catch(console.error);
