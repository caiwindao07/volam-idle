const http = require('http');
const fs = require('fs');
const path = require('path');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';
  let filePath = path.join(process.cwd(), reqPath);
  
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found: ' + reqPath);
    return;
  }
  
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(8088, '127.0.0.1', () => {
  console.log('Test server listening on http://127.0.0.1:8088');
  
  // Test critical assets
  const testUrls = [
    '/',
    '/assets/game.qgMu3pAn.js',
    '/assets/game.RLVgPLdE.css',
    '/assets/modulepreload-polyfill.P2Xu9kJm.js',
    '/js/doll-data.js',
    '/ui/quick/tower.png',
    '/ui/quick/tong-kim.png',
    '/ui/quick/dungeon.png',
    '/ui/quick/boat.png',
    '/ui/quick/weekly-boss.png',
    '/ui/quick/clan.png',
    '/ui/quick/quest.png',
    '/ui/quick/guild.png',
    '/ui/quick/forge.png',
    '/ui/quick/storage.png',
    '/ui/quick/tai-xiu.png',
    '/ui/quick/training.png',
    '/ui/quick/companion.png',
    '/ui/quick/tyvo.png',
    '/ui/quick/than-ma.png',
    '/img/ep/knb.png',
    '/img/ep/tt.png',
    '/ui/rewards/equipment-five-affixes.png',
    '/assets/yuanbao.DU2sugRX.png',
    '/assets/st_0.Cvy0aYvo.webp',
    '/assets/st_1.eyNLLve3.webp'
  ];

  Promise.all(testUrls.map(u => fetch('http://127.0.0.1:8088' + u).then(r => ({ url: u, status: r.status }))))
    .then(results => {
      let allOk = true;
      for (const r of results) {
        if (r.status !== 200) {
          console.error(`[FAIL] ${r.url} returned ${r.status}`);
          allOk = false;
        }
      }
      if (allOk) {
        console.log(`[PASS] All ${results.length} critical assets loaded with 200 OK!`);
      }
      server.close();
      process.exit(allOk ? 0 : 1);
    })
    .catch(err => {
      console.error(err);
      server.close();
      process.exit(1);
    });
});
