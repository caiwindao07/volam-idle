/* ==========================================================================
   KHU GIẢI TRÍ: MINI-GAMES RẮN SĂN MỒI (SNAKE) & XẾP GẠCH (TETRIS)
   Ported & Enhanced from N.T.T (hoainiem2003.net/vltk)
   - Chơi mini game giải trí trong lúc nhân vật vẫn tự động cày quái ngầm.
   - Hỗ trợ cả phím bấm bàn phím (WASD / Mũi tên / Space) và phím cảm ứng di động.
   - Tự động lưu kỷ lục điểm cao vào dữ liệu nhân vật (S.arc).
   ========================================================================== */
'use strict';

(function () {
  const ARC_COLORS = ["#1e293b", "#38bdf8", "#facc15", "#c084fc", "#4ade80", "#f87171", "#60a5fa", "#fb923c"];

  // Dữ liệu kỷ lục
  function getArcadeData() {
    if (typeof S === 'undefined' || !S) return { snake: 0, tetris: 0 };
    if (!S.arc) S.arc = { snake: 0, tetris: 0 };
    return S.arc;
  }

  let activeGame = null; // { kind, raf, loopInterval, canvas, ctx, state, ... }

  // ==========================================================================
  // 1. RẮN SĂN MỒI (SNAKE)
  // ==========================================================================
  const GRID_W = 16, GRID_H = 16;
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // 0: Right, 1: Down, 2: Left, 3: Up

  function createSnakeGame() {
    const game = {
      kind: 'snake',
      body: [[8, 8], [7, 8], [6, 8]],
      dir: 0,
      nextDir: 0,
      food: [12, 8],
      score: 0,
      speed: 150, // ms per tick
      dead: false,
      paused: false
    };
    spawnFood(game);
    return game;
  }

  function spawnFood(g) {
    let emptyCells = [];
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (!g.body.some(b => b[0] === x && b[1] === y)) {
          emptyCells.push([x, y]);
        }
      }
    }
    if (emptyCells.length > 0) {
      g.food = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    } else {
      g.dead = true; // Win / full board
    }
  }

  function tickSnake(g) {
    if (g.dead || g.paused) return;
    g.dir = g.nextDir;
    const head = g.body[0];
    const d = DIRS[g.dir];
    const newHead = [head[0] + d[0], head[1] + d[1]];

    // Đâm vào tường
    if (newHead[0] < 0 || newHead[0] >= GRID_W || newHead[1] < 0 || newHead[1] >= GRID_H) {
      g.dead = true;
      return;
    }
    // Cắn vào thân
    if (g.body.some(b => b[0] === newHead[0] && b[1] === newHead[1])) {
      g.dead = true;
      return;
    }

    g.body.unshift(newHead);
    // Ăn mồi
    if (newHead[0] === g.food[0] && newHead[1] === g.food[1]) {
      g.score += 10;
      g.speed = Math.max(70, 150 - Math.floor(g.score / 20) * 8);
      spawnFood(g);
    } else {
      g.body.pop();
    }
  }

  // ==========================================================================
  // 2. XẾP GẠCH (TETRIS)
  // ==========================================================================
  const TET_COLS = 10, TET_ROWS = 20;
  const PIECES = [
    // I
    [[[0,1],[1,1],[2,1],[3,1]], [[1,0],[1,1],[1,2],[1,3]], [[0,2],[1,2],[2,2],[3,2]], [[2,0],[2,1],[2,2],[2,3]]],
    // J
    [[[0,0],[0,1],[1,1],[2,1]], [[1,0],[2,0],[1,1],[1,2]], [[0,1],[1,1],[2,1],[2,2]], [[1,0],[1,1],[0,2],[1,2]]],
    // L
    [[[2,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[1,2],[2,2]], [[0,1],[1,1],[2,1],[0,2]], [[0,0],[1,0],[1,1],[1,2]]],
    // O
    [[[1,0],[2,0],[1,1],[2,1]], [[1,0],[2,0],[1,1],[2,1]], [[1,0],[2,0],[1,1],[2,1]], [[1,0],[2,0],[1,1],[2,1]]],
    // S
    [[[1,0],[2,0],[0,1],[1,1]], [[1,0],[1,1],[2,1],[2,2]], [[1,1],[2,1],[0,2],[1,2]], [[0,0],[0,1],[1,1],[1,2]]],
    // T
    [[[1,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[2,1],[1,2]], [[0,1],[1,1],[2,1],[1,2]], [[1,0],[0,1],[1,1],[1,2]]],
    // Z
    [[[0,0],[1,0],[1,1],[2,1]], [[2,0],[1,1],[2,1],[1,2]], [[0,1],[1,1],[1,2],[2,2]], [[1,0],[0,1],[1,1],[0,2]]]
  ];

  function createTetrisGame() {
    const game = {
      kind: 'tetris',
      board: Array.from({ length: TET_ROWS }, () => new Array(TET_COLS).fill(0)),
      pieceType: Math.floor(Math.random() * 7),
      rotation: 0,
      px: 3,
      py: 0,
      score: 0,
      lines: 0,
      speed: 400, // ms per drop
      dead: false,
      paused: false
    };
    return game;
  }

  function canFit(g, pType, rot, px, py) {
    const shape = PIECES[pType][rot];
    for (const [bx, by] of shape) {
      const x = px + bx, y = py + by;
      if (x < 0 || x >= TET_COLS || y < 0 || y >= TET_ROWS) return false;
      if (g.board[y][x] !== 0) return false;
    }
    return true;
  }

  function lockPiece(g) {
    const shape = PIECES[g.pieceType][g.rotation];
    for (const [bx, by] of shape) {
      const x = g.px + bx, y = g.py + by;
      if (y >= 0 && y < TET_ROWS && x >= 0 && x < TET_COLS) {
        g.board[y][x] = g.pieceType + 1;
      }
    }
    // Xóa hàng đầy
    let cleared = 0;
    for (let y = TET_ROWS - 1; y >= 0; y--) {
      if (g.board[y].every(cell => cell !== 0)) {
        g.board.splice(y, 1);
        g.board.unshift(new Array(TET_COLS).fill(0));
        cleared++;
        y++; // check same row index again
      }
    }
    if (cleared > 0) {
      const pts = [0, 100, 300, 500, 800];
      g.lines += cleared;
      g.score += pts[cleared] || (cleared * 200);
      g.speed = Math.max(120, 400 - Math.floor(g.lines / 5) * 25);
    }

    // Spawn piece mới
    g.pieceType = Math.floor(Math.random() * 7);
    g.rotation = 0;
    g.px = 3;
    g.py = 0;
    if (!canFit(g, g.pieceType, g.rotation, g.px, g.py)) {
      g.dead = true;
    }
  }

  function tickTetris(g) {
    if (g.dead || g.paused) return;
    if (canFit(g, g.pieceType, g.rotation, g.px, g.py + 1)) {
      g.py++;
    } else {
      lockPiece(g);
    }
  }

  // ==========================================================================
  // 3. RENDER & CONTROLS
  // ==========================================================================
  function openArcadeModal(gameChoice = null) {
    const arcData = getArcadeData();

    if (!gameChoice) {
      // Menu chọn game
      const html = `
        <div style="font-family:inherit;padding:4px;">
          <h3 style="color:#38bdf8;margin-top:0;display:flex;align-items:center;gap:6px;">🎮 Khu Giải Trí Arcade</h3>
          <p style="font-size:13px;color:#cbd5e1;line-height:1.4;">
            Chơi mini-game thư giãn trong khi nhân vật vẫn <b>tự động cày quái & nhặt đồ ngầm</b> dưới nền (hệ thống tự động kích hoạt chế độ siêu tiết kiệm pin).
          </p>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
            <div style="background:rgba(30,41,59,0.8);border:1.5px solid #38bdf8;border-radius:8px;padding:12px;text-align:center;">
              <div style="font-size:36px;margin-bottom:6px;">🐍</div>
              <b style="color:#f8fafc;font-size:15px;">Rắn Săn Mồi</b>
              <div style="font-size:12px;color:#94a3b8;margin:6px 0;">Ăn mồi dài thân, tránh đâm vào tường.</div>
              <div style="font-size:12px;color:#fde047;margin-bottom:8px;">Kỷ lục: <b>${arcData.snake || 0}</b> điểm</div>
              <button class="btn on" id="btnPlaySnake" style="width:100%;">▶ Chơi Ngay</button>
            </div>

            <div style="background:rgba(30,41,59,0.8);border:1.5px solid #a855f7;border-radius:8px;padding:12px;text-align:center;">
              <div style="font-size:36px;margin-bottom:6px;">🧱</div>
              <b style="color:#f8fafc;font-size:15px;">Xếp Gạch (Tetris)</b>
              <div style="font-size:12px;color:#94a3b8;margin:6px 0;">Xếp gạch đầy hàng để xóa và ghi điểm.</div>
              <div style="font-size:12px;color:#fde047;margin-bottom:8px;">Kỷ lục: <b>${arcData.tetris || 0}</b> điểm</div>
              <button class="btn on" id="btnPlayTetris" style="width:100%;">▶ Chơi Ngay</button>
            </div>
          </div>

          <div class="btnrow" style="display:flex;justify-content:flex-end;">
            <button class="btn" onclick="closeModal(true)">Đóng</button>
          </div>
        </div>
      `;

      if (typeof modal === 'function') {
        modal(html, () => {
          const bSnake = document.getElementById("btnPlaySnake");
          if (bSnake) bSnake.onclick = () => launchArcade('snake');
          const bTetris = document.getElementById("btnPlayTetris");
          if (bTetris) bTetris.onclick = () => launchArcade('tetris');
        }, true);
      }
      return;
    }

    launchArcade(gameChoice);
  }

  function launchArcade(kind) {
    stopCurrentGame();
    const g = kind === 'snake' ? createSnakeGame() : createTetrisGame();

    const isMobile = window.matchMedia && window.matchMedia("(max-width: 640px)").matches;
    const canvasW = kind === 'snake' ? 288 : 220;
    const canvasH = kind === 'snake' ? 288 : 360;

    const html = `
      <div style="font-family:inherit;padding:2px;display:flex;flex-direction:column;align-items:center;">
        <div style="width:100%;display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <b style="color:#38bdf8;font-size:15px;">${kind === 'snake' ? '🐍 Rắn Săn Mồi' : '🧱 Xếp Gạch'}</b>
          <div style="font-size:14px;color:#fde047;">Điểm: <b id="arcScore">0</b></div>
        </div>

        <div style="position:relative;background:#0f172a;border:2px solid #334155;border-radius:6px;box-shadow:inset 0 0 10px #000;">
          <canvas id="arcCanvas" width="${canvasW}" height="${canvasH}" style="display:block;"></canvas>
          <div id="arcGameOver" style="display:none;position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);flex-direction:column;align-items:center;justify-content:center;color:#ef4444;font-size:20px;font-weight:bold;">
            TRÒ CHƠI KẾT THÚC!
            <button class="btn sm on" id="btnRestartArc" style="margin-top:10px;">Chơi Lại</button>
          </div>
        </div>

        <!-- Phím ảo điều khiển -->
        <div style="margin-top:8px;display:flex;flex-direction:column;align-items:center;gap:4px;width:100%;">
          ${kind === 'snake' ? `
            <div><button class="btn sm" id="padUp" style="padding:8px 18px;">▲</button></div>
            <div style="display:flex;gap:12px;">
              <button class="btn sm" id="padLeft" style="padding:8px 18px;">◀</button>
              <button class="btn sm" id="padDown" style="padding:8px 18px;">▼</button>
              <button class="btn sm" id="padRight" style="padding:8px 18px;">▶</button>
            </div>
          ` : `
            <div style="display:flex;gap:6px;justify-content:center;width:100%;">
              <button class="btn sm" id="padRot" style="padding:8px 14px;">🔄 Xoay</button>
              <button class="btn sm" id="padLeft" style="padding:8px 14px;">◀ Trái</button>
              <button class="btn sm" id="padRight" style="padding:8px 14px;">▶ Phải</button>
              <button class="btn sm" id="padDown" style="padding:8px 14px;">▼ Xuống</button>
              <button class="btn sm on" id="padDrop" style="padding:8px 14px;">⚡ Rơi</button>
            </div>
          `}
        </div>

        <div class="btnrow" style="display:flex;justify-content:space-between;width:100%;margin-top:8px;">
          <button class="btn sm" id="btnBackToMenu">Trở lại menu</button>
          <button class="btn sm red" onclick="closeModal(true)">Đóng</button>
        </div>
      </div>
    `;

    if (typeof modal === 'function') {
      modal(html, () => {
        const cv = document.getElementById("arcCanvas");
        if (!cv) return;
        const ctx = cv.getContext("2d");

        activeGame = {
          kind: kind,
          g: g,
          cv: cv,
          ctx: ctx,
          lastTick: Date.now(),
          running: true
        };

        // Bind control buttons
        bindArcadeControls(activeGame);

        // Game loop
        function loop() {
          if (!activeGame || !activeGame.running) return;
          const now = Date.now();
          if (now - activeGame.lastTick >= activeGame.g.speed) {
            activeGame.lastTick = now;
            if (activeGame.kind === 'snake') tickSnake(activeGame.g);
            else tickTetris(activeGame.g);
            checkArcadeScore(activeGame);
          }
          renderArcade(activeGame);
          activeGame.raf = requestAnimationFrame(loop);
        }
        activeGame.raf = requestAnimationFrame(loop);
      }, true);
    }
  }

  function checkArcadeScore(ag) {
    const scEl = document.getElementById("arcScore");
    if (scEl) scEl.textContent = ag.g.score;

    if (ag.g.dead) {
      const overEl = document.getElementById("arcGameOver");
      if (overEl) overEl.style.display = "flex";
      // Update high score
      const d = getArcadeData();
      if (ag.g.score > (d[ag.kind] || 0)) {
        d[ag.kind] = ag.g.score;
        if (typeof save === 'function') save();
        if (typeof toast === 'function') toast(`🎉 Kỷ lục mới: ${ag.g.score} điểm (${ag.kind === 'snake' ? 'Rắn' : 'Xếp gạch'})!`);
      }
    }
  }

  function renderArcade(ag) {
    const ctx = ag.ctx;
    const g = ag.g;
    const cv = ag.cv;

    if (ag.kind === 'snake') {
      const cell = cv.width / GRID_W;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, cv.width, cv.height);

      // Grid
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      for (let i = 0; i < GRID_W; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, cv.height);
        ctx.moveTo(0, i * cell); ctx.lineTo(cv.width, i * cell);
        ctx.stroke();
      }

      // Food
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(g.food[0] * cell + cell / 2, g.food[1] * cell + cell / 2, cell / 2 - 2, 0, Math.PI * 2);
      ctx.fill();

      // Snake Body
      g.body.forEach((b, i) => {
        ctx.fillStyle = i === 0 ? "#4ade80" : "#22c55e";
        ctx.fillRect(b[0] * cell + 1, b[1] * cell + 1, cell - 2, cell - 2);
      });
    } else {
      // Tetris
      const cell = cv.height / TET_ROWS;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, cv.width, cv.height);

      // Board
      for (let y = 0; y < TET_ROWS; y++) {
        for (let x = 0; x < TET_COLS; x++) {
          const val = g.board[y][x];
          if (val !== 0) {
            ctx.fillStyle = ARC_COLORS[val % ARC_COLORS.length];
            ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
          } else {
            ctx.strokeStyle = "rgba(255,255,255,0.03)";
            ctx.strokeRect(x * cell, y * cell, cell, cell);
          }
        }
      }

      // Falling piece
      if (!g.dead) {
        const shape = PIECES[g.pieceType][g.rotation];
        ctx.fillStyle = ARC_COLORS[(g.pieceType + 1) % ARC_COLORS.length];
        for (const [bx, by] of shape) {
          const x = g.px + bx, y = g.py + by;
          ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
        }
      }
    }
  }

  function bindArcadeControls(ag) {
    const handleKey = e => {
      if (!ag || !ag.running || ag.g.dead) return;
      if (ag.kind === 'snake') {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { if (ag.g.dir !== 1) ag.g.nextDir = 3; }
        else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { if (ag.g.dir !== 3) ag.g.nextDir = 1; }
        else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { if (ag.g.dir !== 0) ag.g.nextDir = 2; }
        else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { if (ag.g.dir !== 2) ag.g.nextDir = 0; }
      } else {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          if (canFit(ag.g, ag.g.pieceType, ag.g.rotation, ag.g.px - 1, ag.g.py)) ag.g.px--;
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          if (canFit(ag.g, ag.g.pieceType, ag.g.rotation, ag.g.px + 1, ag.g.py)) ag.g.px++;
        } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          const nextRot = (ag.g.rotation + 1) % 4;
          if (canFit(ag.g, ag.g.pieceType, nextRot, ag.g.px, ag.g.py)) ag.g.rotation = nextRot;
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          if (canFit(ag.g, ag.g.pieceType, ag.g.rotation, ag.g.px, ag.g.py + 1)) ag.g.py++;
        } else if (e.key === ' ' || e.code === 'Space') {
          while (canFit(ag.g, ag.g.pieceType, ag.g.rotation, ag.g.px, ag.g.py + 1)) ag.g.py++;
          lockPiece(ag.g);
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    ag.keyHandler = handleKey;

    // Pad buttons
    const bindBtn = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.onclick = fn;
    };

    if (ag.kind === 'snake') {
      bindBtn("padUp", () => { if (ag.g.dir !== 1) ag.g.nextDir = 3; });
      bindBtn("padDown", () => { if (ag.g.dir !== 3) ag.g.nextDir = 1; });
      bindBtn("padLeft", () => { if (ag.g.dir !== 0) ag.g.nextDir = 2; });
      bindBtn("padRight", () => { if (ag.g.dir !== 2) ag.g.nextDir = 0; });
    } else {
      bindBtn("padRot", () => {
        const nextRot = (ag.g.rotation + 1) % 4;
        if (canFit(ag.g, ag.g.pieceType, nextRot, ag.g.px, ag.g.py)) ag.g.rotation = nextRot;
      });
      bindBtn("padLeft", () => {
        if (canFit(ag.g, ag.g.pieceType, ag.g.rotation, ag.g.px - 1, ag.g.py)) ag.g.px--;
      });
      bindBtn("padRight", () => {
        if (canFit(ag.g, ag.g.pieceType, ag.g.rotation, ag.g.px + 1, ag.g.py)) ag.g.px++;
      });
      bindBtn("padDown", () => {
        if (canFit(ag.g, ag.g.pieceType, ag.g.rotation, ag.g.px, ag.g.py + 1)) ag.g.py++;
      });
      bindBtn("padDrop", () => {
        while (canFit(ag.g, ag.g.pieceType, ag.g.rotation, ag.g.px, ag.g.py + 1)) ag.g.py++;
        lockPiece(ag.g);
      });
    }

    bindBtn("btnRestartArc", () => launchArcade(ag.kind));
    bindBtn("btnBackToMenu", () => openArcadeModal());
  }

  function stopCurrentGame() {
    if (activeGame) {
      activeGame.running = false;
      if (activeGame.raf) cancelAnimationFrame(activeGame.raf);
      if (activeGame.keyHandler) window.removeEventListener('keydown', activeGame.keyHandler);
      activeGame = null;
    }
  }

  window.openArcadeModal = openArcadeModal;
})();
