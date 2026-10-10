const fs = require('fs');

const js = fs.readFileSync('assets/game.qgMu3pAn.js', 'utf8');

// Check absolute paths starting with /assets, /ui, /img
const slashAssets = js.match(/["']\/(assets|ui|img|sound|audio)\/[^"']+["']/g) || [];
console.log('Slash paths in JS bundle:', slashAssets.length);
if (slashAssets.length > 0) {
  console.log('Samples:', slashAssets.slice(0, 10));
}

// Check where quick icons are referenced
const quickMatches = js.match(/["'](?:\/)?ui\/quick\/[^"']+["']/g) || [];
console.log('Quick icons referenced:', quickMatches.length);
console.log('Samples of quick icons:', quickMatches.slice(0, 10));

// Check any external URLs referenced
const httpMatches = js.match(/https?:\/\/[a-zA-Z0-9_\-\.\/]+/g) || [];
console.log('HTTP URLs in bundle:', new Set(httpMatches));
