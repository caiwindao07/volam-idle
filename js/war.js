/* ==========================================================================
   HỆ THỐNG CHIẾN TRƯỜNG: TỐNG KIM & CÔNG THÀNH + CỬA HÀNG QUÂN CÔNG
   - Tống Kim: 4 đợt quân + Nguyên Soái, tính điểm chiến công, nhận Quân Công
   - Công Thành: 4 cấp độ thành trì (Trấn nhỏ -> Kinh thành), hạ Chủ tướng
   - Cửa Hàng Quân Công: Đổi điểm Quân Công lấy Mảnh HK, Đồ HK, Huyền Tinh...
   ========================================================================== */
'use strict';

(function () {
  const REQ_LV = 40;
  const MAX_TK = 14; // lượt Tống Kim / tuần
  const MAX_SG = 7;  // lượt Công thành / tuần
  const TK_WAVES = 4; // 4 đợt lính + 1 đợt Nguyên Soái

  const CITIES = [
    { id: "tran",  n: "Trấn Nhỏ",   lv: 40,  k: 1.0,  rew: 1.0, ic: "🏘️" },
    { id: "thanh", n: "Thành Vừa",  lv: 70,  k: 1.15, rew: 1.4, ic: "🏯" },
    { id: "trong", n: "Trọng Trấn", lv: 100, k: 1.3,  rew: 1.9, ic: "🏰" },
    { id: "kinh",  n: "Kinh Thành", lv: 130, k: 1.45, rew: 2.6, ic: "👑" }
  ];

  function getMondayKey(timestamp = Date.now()) {
    const d = new Date(timestamp);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (d.getDay() + 6) % 7);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function getWarData() {
    if (typeof S === 'undefined' || !S) return { week: "", tk: 0, sg: 0, merit: 0, bought: {}, tkWins: 0, tkBest: 0, sgWins: {} };
    if (!S.war) {
      S.war = {
        week: getMondayKey(),
        tk: 0,
        sg: 0,
        merit: 0,
        bought: {},
        tkWins: 0,
        tkBest: 0,
        sgWins: {}
      };
    }
    const currentWeek = getMondayKey();
    if (S.war.week !== currentWeek) {
      S.war.week = currentWeek;
      S.war.tk = 0;
      S.war.sg = 0;
      S.war.bought = {};
    }
    if (!S.war.sgWins) S.war.sgWins = {};
    if (!S.war.bought) S.war.bought = {};
    return S.war;
  }

  const WAR_SHOP = [
    {
      id: "pot",
      merit: 20,
      name: "50 bình máu cao cấp",
      buy: function () {
        if (typeof takeStock === 'function') {
          // Add 50 HP potions
          if (typeof matAdd === 'function') matAdd('potion', 'hp_pot', 50);
        }
        if (typeof S !== 'undefined') S.gold = (S.gold || 0) + 5000;
        return true;
      }
    },
    {
      id: "ht",
      merit: 30,
      name: "2 Huyền Tinh (cấp theo nhân vật)",
      buy: function () {
        const lvl = Math.min(10, Math.max(1, Math.floor((S.lvl || 1) / 15) + 1));
        if (typeof matAdd === 'function') matAdd('ht', lvl, 2);
        if (typeof log === 'function') log(`🎁 Nhận được <b style="color:#60a5fa">2 Huyền Tinh cấp ${lvl}</b> từ Cửa hàng Quân công!`);
        return true;
      }
    },
    {
      id: "fd",
      merit: 45,
      name: "25 Phúc Duyên",
      buy: function () {
        if (typeof S !== 'undefined') S.fd = (S.fd || 0) + 25;
        if (typeof log === 'function') log(`🎁 Nhận được <b style="color:#fbbf24">25 Phúc Duyên</b>!`);
        return true;
      }
    },
    {
      id: "xp",
      merit: 60,
      name: "Đan Kinh Nghiệm (+30% cấp hiện tại)",
      buy: function () {
        if (typeof J !== 'undefined' && J.exp && S && S.lvl) {
          const need = J.exp[Math.min(S.lvl - 1, J.exp.length - 1)] || 1000;
          if (typeof gainXp === 'function') gainXp(need * 0.3);
          if (typeof log === 'function') log(`🎁 Đã dùng Đan Kinh Nghiệm: <b style="color:#4ade80">+30% EXP</b> cấp hiện tại!`);
        }
        return true;
      }
    },
    {
      id: "pts",
      merit: 90,
      name: "5 điểm tiềm năng",
      buy: function () {
        if (typeof S !== 'undefined') {
          S.attrPts = (S.attrPts || 0) + 5;
          if (typeof log === 'function') log(`🎁 Nhận được <b style="color:#f59e0b">+5 Điểm tiềm năng</b>!`);
        }
        return true;
      }
    },
    {
      id: "shard",
      merit: 150,
      name: "2 Mảnh Hoàng Kim",
      buy: function () {
        if (typeof matAdd === 'function') {
          matAdd('shard', 'gold_shard', 2);
          if (typeof log === 'function') log(`🎁 Nhận được <b style="color:#ffd700">+2 Mảnh Hoàng Kim</b>!`);
        }
        return true;
      }
    },
    {
      id: "set",
      merit: 300,
      name: "1 Món Hoàng Kim (môn phái của mình)",
      buy: function () {
        if (typeof rollSetItem === 'function') {
          const item = rollSetItem();
          if (item && typeof addItem === 'function') {
            addItem(item, true);
            if (typeof log === 'function') log(`🎁 Mở được trang bị Hoàng Kim: <b style="color:#ffd700">${item.n || 'Trang bị Hoàng Kim'}</b>!`);
            return true;
          }
        }
        if (typeof matAdd === 'function') {
          matAdd('shard', 'gold_shard', 5);
          if (typeof log === 'function') log(`🎁 Đã nhận +5 Mảnh Hoàng Kim thay thế!`);
        }
        return true;
      }
    }
  ];

  let currentTab = "tk"; // 'tk' | 'sg' | 'shop'

  function openWarModal(tab = "tk") {
    currentTab = tab;
    const w = getWarData();
    const curLv = (typeof S !== 'undefined' && S && S.lvl) ? S.lvl : 1;
    const isLocked = curLv < REQ_LV;
    const inWar = typeof R !== 'undefined' && R.war && R.war.active;

    let contentHtml = "";

    if (currentTab === "tk") {
      const remaining = Math.max(0, MAX_TK - w.tk);
      contentHtml = `
        <div style="background:rgba(20,16,12,0.85);border:1.5px solid #d97706;border-radius:8px;padding:12px;margin-bottom:12px;">
          <p style="margin-top:0;font-size:13.5px;color:#fde68a;line-height:1.5;">
            Chiến trường Tống Kim rực lửa: Người chơi chọn ngẫu nhiên phe <b>Tống</b> hoặc <b>Kim</b>, đánh tan <b>${TK_WAVES} đợt</b> quân địch rồi hạ gục <b>Nguyên Soái</b> đối phương!
            Mỗi địch hạ gục cộng điểm chiến công (Lính: 1, Tướng: 3, Nguyên Soái: 20).
            Thắng nhận đủ điểm chiến công chuyển thành Quân Công + 30 Quân Công thưởng.
          </p>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;background:rgba(0,0,0,0.4);padding:8px;border-radius:6px;text-align:center;font-size:12.5px;">
            <div><span style="color:#aaa;">Lượt tuần:</span><br><b style="color:#fff;">${remaining}/${MAX_TK}</b></div>
            <div><span style="color:#aaa;">Thắng tuần:</span><br><b style="color:#4ade80;">${w.tkWins || 0}</b></div>
            <div><span style="color:#aaa;">Điểm cao nhất:</span><br><b style="color:#ffd700;">${w.tkBest || 0}</b></div>
            <div><span style="color:#aaa;">Quân công:</span><br><b style="color:#fbbf24;">${w.merit || 0}</b></div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:12px;color:#aaa;">Reset lượt mỗi thứ Hai hàng tuần.</div>
          <button class="btn on" id="btnStartTk" ${isLocked || inWar || remaining <= 0 ? "disabled" : ""}>
            ${isLocked ? `Cần Cấp ${REQ_LV}` : inWar ? "Đang Trong Chiến Trường" : remaining <= 0 ? "Hết Lượt Tuần" : "⚔ Vào Chiến Trường Tống Kim"}
          </button>
        </div>
      `;
    } else if (currentTab === "sg") {
      const remainingSg = Math.max(0, MAX_SG - w.sg);
      const citiesHtml = CITIES.map(c => {
        const cLock = curLv < c.lv;
        const wins = (w.sgWins && w.sgWins[c.id]) || 0;
        return `
          <div style="background:rgba(20,16,12,0.85);border:1.5px solid ${cLock ? '#3d2f1d' : '#eab308'};border-radius:6px;padding:8px 10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;opacity:${cLock ? 0.6 : 1};">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:24px;">${c.ic}</span>
              <div>
                <b style="color:#fef08a;font-size:14px;">${c.n}</b>
                <div style="font-size:12px;color:#ccc;">Cấp ${c.lv}+ · Quân ×${c.k} · Thưởng ×${c.rew} ${wins ? `· <span style="color:#4ade80;">Hạ ${wins} lần</span>` : ""}</div>
              </div>
            </div>
            <button class="btn sm" data-sg="${c.id}" ${cLock || inWar || remainingSg <= 0 ? "disabled" : ""}>
              ${cLock ? `Cấp ${c.lv}` : "Tiến Đánh"}
            </button>
          </div>
        `;
      }).join("");

      contentHtml = `
        <div style="font-size:13px;color:#ddd;margin-bottom:10px;">
          Công thành xưng bá: Đánh tan các phòng tuyến <b>Thủ vệ → Đội trưởng → Chủ tướng</b>.
          Thành càng lớn quân càng mạnh, thưởng càng nhiều (có cơ hội nhặt đồ Hoàng Kim).
          Lượt tuần còn: <b>${remainingSg}/${MAX_SG}</b> · Quân công hiện có: <b style="color:#fbbf24;">${w.merit || 0}</b>.
        </div>
        <div>${citiesHtml}</div>
      `;
    } else if (currentTab === "shop") {
      const itemsHtml = WAR_SHOP.map(it => {
        const bought = !!(w.bought && w.bought[it.id]);
        const canBuy = !bought && (w.merit >= it.merit);
        return `
          <div style="background:rgba(20,16,12,0.85);border:1.5px solid #d97706;border-radius:6px;padding:8px 10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <b style="color:#fef08a;font-size:13.5px;">${it.name}</b>
              <div style="font-size:12px;color:#aaa;">Giá: <b style="color:#fbbf24;">${it.merit} Quân công</b> ${bought ? '· <span style="color:#ef4444;">Đã mua tuần này</span>' : ''}</div>
            </div>
            <button class="btn sm" data-buy="${it.id}" ${!canBuy ? "disabled" : ""}>
              ${bought ? "Đã Mua" : "Đổi Ngay"}
            </button>
          </div>
        `;
      }).join("");

      contentHtml = `
        <div style="font-size:13px;color:#ddd;margin-bottom:10px;display:flex;justify-content:space-between;">
          <span>Đổi Quân Công lấy vật phẩm quý (mỗi món mua 1 lần mỗi tuần):</span>
          <span>Quân công: <b style="color:#fbbf24;">${w.merit || 0}</b></span>
        </div>
        <div>${itemsHtml}</div>
      `;
    }

    const inWarBanner = inWar ? `
      <div style="background:#7f1d1d;border:1.5px solid #ef4444;border-radius:6px;padding:8px 12px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <b style="color:#fecaca;">Đang trong chiến trường: ${R.war.name}</b>
          <div style="font-size:12px;color:#fca5a5;">Đợt ${R.war.wave}/${R.war.waves} · Điểm chiến công: ${R.war.score || 0}</div>
        </div>
        <button class="btn sm red" id="btnWarQuit">Rút Lui</button>
      </div>
    ` : "";

    const modalHtml = `
      <div style="font-family:inherit;padding:4px;">
        <h3 style="color:#fbbf24;margin-top:0;display:flex;align-items:center;gap:6px;">⚔️ Chiến Trường & Quân Công</h3>
        
        ${isLocked ? `<div style="background:#3b1d1d;border:1px solid #ef4444;color:#fca5a5;padding:8px;border-radius:6px;margin-bottom:10px;font-size:13px;">🔒 Chiến trường mở ở <b>Cấp ${REQ_LV}</b>. Cần luyện thêm ${REQ_LV - curLv} cấp nữa!</div>` : ""}

        <div class="rktabs" style="display:flex;gap:6px;margin-bottom:12px;">
          <button class="btn ${currentTab === 'tk' ? 'on' : ''}" id="tabWarTk">⚔️ Tống Kim</button>
          <button class="btn ${currentTab === 'sg' ? 'on' : ''}" id="tabWarSg">🏯 Công Thành</button>
          <button class="btn ${currentTab === 'shop' ? 'on' : ''}" id="tabWarShop">🏪 Cửa Hàng Quân Công</button>
        </div>

        ${inWarBanner}
        ${contentHtml}

        <div class="btnrow" style="display:flex;justify-content:flex-end;margin-top:12px;">
          <button class="btn" onclick="closeModal(true)">Đóng</button>
        </div>
      </div>
    `;

    if (typeof modal === 'function') {
      modal(modalHtml, () => {
        const tTk = document.getElementById("tabWarTk");
        if (tTk) tTk.onclick = () => openWarModal("tk");
        const tSg = document.getElementById("tabWarSg");
        if (tSg) tSg.onclick = () => openWarModal("sg");
        const tShop = document.getElementById("tabWarShop");
        if (tShop) tShop.onclick = () => openWarModal("shop");

        const btnTk = document.getElementById("btnStartTk");
        if (btnTk) btnTk.onclick = () => startWar("tk");

        document.querySelectorAll("[data-sg]").forEach(btn => {
          btn.onclick = () => startWar("siege", btn.dataset.sg);
        });

        document.querySelectorAll("[data-buy]").forEach(btn => {
          btn.onclick = () => buyWarShop(btn.dataset.buy);
        });

        const btnQuit = document.getElementById("btnWarQuit");
        if (btnQuit) btnQuit.onclick = () => finishWar(false, "quit");
      }, true);
    }
  }

  function buyWarShop(itemId) {
    const it = WAR_SHOP.find(x => x.id === itemId);
    const w = getWarData();
    if (!it || !w) return;
    if (w.bought && w.bought[it.id]) {
      if (typeof toast === 'function') toast("Món này đã mua trong tuần rồi!");
      return;
    }
    if (w.merit < it.merit) {
      if (typeof toast === 'function') toast(`Cần ${it.merit} Quân công để đổi!`);
      return;
    }
    const ok = it.buy();
    if (ok) {
      w.merit -= it.merit;
      w.bought[it.id] = true;
      if (typeof save === 'function') save();
      if (typeof toast === 'function') toast(`Đã đổi thành công: ${it.name}!`);
      openWarModal("shop");
    }
  }

  function startWar(kind, cityId) {
    if (typeof S === 'undefined' || S.lvl < REQ_LV) {
      if (typeof toast === 'function') toast(`Cần đạt đẳng cấp ${REQ_LV}!`);
      return;
    }
    if (typeof R === 'undefined') return;
    if (R.war && R.war.active) {
      if (typeof toast === 'function') toast("Đang trong trận chiến trường!");
      return;
    }
    if (R.tower && R.tower.active) {
      if (typeof toast === 'function') toast("Hãy hoàn thành Tháp trước!");
      return;
    }

    const w = getWarData();

    if (kind === "tk") {
      if (w.tk >= MAX_TK) {
        if (typeof toast === 'function') toast("Đã hết lượt Tống Kim tuần này!");
        return;
      }
      w.tk++;
      const side = Math.random() < 0.5 ? "Tống" : "Kim";
      const foe = side === "Tống" ? "Kim" : "Tống";
      R.war = {
        active: true,
        kind: "tk",
        id: "tk",
        name: `Tống Kim (${side} vs ${foe})`,
        side: side,
        foe: foe,
        wave: 1,
        waves: TK_WAVES,
        L: Math.max(40, S.lvl),
        score: 0,
        t0: Date.now()
      };
      if (typeof closeModal === 'function') closeModal(true);
      if (typeof toast === 'function') toast(`Gia nhập phe ${side} tiến vào Tống Kim!`);
      if (typeof log === 'function') log(`⚔️ Gia nhập phe <b style="color:#fbbf24">${side}</b> xuất trận Tống Kim đánh quân <b>${foe}</b>!`);
    } else {
      const city = CITIES.find(x => x.id === cityId);
      if (!city) return;
      if (S.lvl < city.lv) {
        if (typeof toast === 'function') toast(`Cần đạt cấp ${city.lv} để công ${city.n}!`);
        return;
      }
      if (w.sg >= MAX_SG) {
        if (typeof toast === 'function') toast("Đã hết lượt Công thành tuần này!");
        return;
      }
      w.sg++;
      R.war = {
        active: true,
        kind: "siege",
        id: city.id,
        name: `Công Thành · ${city.n}`,
        city: city,
        wave: 1,
        waves: 2, // 2 đợt thủ vệ + 1 đợt Chủ tướng
        L: Math.max(city.lv, S.lvl),
        score: 0,
        t0: Date.now()
      };
      if (typeof closeModal === 'function') closeModal(true);
      if (typeof toast === 'function') toast(`Tiến đánh ${city.n}!`);
      if (typeof log === 'function') log(`🏰 Bắt đầu công thành <b style="color:#fbbf24">${city.n}</b>!`);
    }

    if (typeof save === 'function') save();
    spawnWarWave();
  }

  function spawnWarWave() {
    if (!R.war || !R.war.active) return;
    R.enemies = [];
    R.stall = 0;
    const war = R.war;
    const around = (r0, r1) => {
      const a = Math.random() * Math.PI * 2, r = r0 + Math.random() * (r1 - r0);
      return (typeof inWorld === 'function') ? inWorld(H.x + Math.cos(a) * r, H.y + Math.sin(a) * r) : [H.x + 100, H.y];
    };

    const L = war.L;

    if (war.kind === "tk") {
      const isBossWave = war.wave > war.waves;
      if (isBossWave) {
        // Nguyên Soái Boss
        const bp = around(200, 240);
        const boss = {
          id: Math.random(),
          tid: 1,
          n: `Nguyên Soái ${war.foe}`,
          img: null,
          sz: 2,
          L: L + 3,
          cls: "boss",
          series: Math.floor(Math.random() * 5),
          res: { phys: 60, poison: 60, cold: 60, fire: 60, light: 60 },
          hp: 25000 + L * 800,
          max: 25000 + L * 800,
          dmg: 450 + L * 25,
          ar: 500 + L * 15,
          def: 300 + L * 10,
          x: bp[0], y: bp[1], r: 32,
          spd: 55, atkCd: 1.0, cd: 2.0,
          stun: 0, poison: 0, poisonDmg: 0, hitT: 0, face: 1,
          warScore: 20
        };
        R.enemies.push(boss);
        if (typeof log === 'function') log(`👑 <b style="color:#ef4444">Nguyên Soái ${war.foe}</b> đã đích thân xuất trận! Tiêu diệt để giành chiến thắng!`);
        if (typeof toast === 'function') toast(`Nguyên Soái ${war.foe} xuất hiện!`);
      } else {
        // Quân lính đợt 1-4
        const titles = ["Binh sĩ", "Tiên phong", "Đội trưởng", "Phó tướng"];
        const title = titles[war.wave - 1] || "Binh sĩ";
        const count = 5 + war.wave;
        for (let i = 0; i < count; i++) {
          const sp = around(140, 220);
          const isElite = (i === 0);
          R.enemies.push({
            id: Math.random(),
            tid: 2,
            n: `${title} ${war.foe} #${i + 1}`,
            img: null,
            sz: 1,
            L: L,
            cls: isElite ? "elite" : "normal",
            series: Math.floor(Math.random() * 5),
            res: { phys: 40, poison: 40, cold: 40, fire: 40, light: 40 },
            hp: (isElite ? 6000 : 2500) + L * (isElite ? 200 : 80),
            max: (isElite ? 6000 : 2500) + L * (isElite ? 200 : 80),
            dmg: 180 + L * 12,
            ar: 350 + L * 10,
            def: 200 + L * 6,
            x: sp[0], y: sp[1], r: isElite ? 24 : 18,
            spd: 50, atkCd: 1.2, cd: 2.2,
            stun: 0, poison: 0, poisonDmg: 0, hitT: 0, face: 1,
            warScore: isElite ? 3 : 1
          });
        }
        if (typeof log === 'function') log(`⚔️ Đợt ${war.wave}/${war.waves}: Quân ${war.foe} ồ ạt kéo đến!`);
      }
    } else {
      // Công thành
      const isBossWave = war.wave > war.waves;
      const city = war.city || CITIES[0];
      if (isBossWave) {
        const bp = around(200, 240);
        R.enemies.push({
          id: Math.random(),
          tid: 1,
          n: `Chủ Tướng ${city.n}`,
          img: null,
          sz: 2,
          L: L + 4,
          cls: "boss",
          series: Math.floor(Math.random() * 5),
          res: { phys: 65, poison: 65, cold: 65, fire: 65, light: 65 },
          hp: (30000 + L * 1000) * city.k,
          max: (30000 + L * 1000) * city.k,
          dmg: (500 + L * 30) * city.k,
          ar: 550 + L * 18,
          def: 350 + L * 12,
          x: bp[0], y: bp[1], r: 32,
          spd: 55, atkCd: 1.0, cd: 2.0,
          stun: 0, poison: 0, poisonDmg: 0, hitT: 0, face: 1,
          warScore: 30
        });
        if (typeof log === 'function') log(`🏰 <b style="color:#ffd700">Chủ Tướng ${city.n}</b> xuất hiện trấn thủ!`);
      } else {
        const count = 6;
        for (let i = 0; i < count; i++) {
          const sp = around(140, 220);
          const isElite = (i === 0);
          R.enemies.push({
            id: Math.random(),
            tid: 2,
            n: war.wave === 1 ? `Thủ Vệ ${city.n}` : `Đội Trưởng ${city.n}`,
            img: null,
            sz: 1,
            L: L,
            cls: isElite ? "elite" : "normal",
            series: Math.floor(Math.random() * 5),
            res: { phys: 45, poison: 45, cold: 45, fire: 45, light: 45 },
            hp: ((isElite ? 7000 : 3000) + L * 100) * city.k,
            max: ((isElite ? 7000 : 3000) + L * 100) * city.k,
            dmg: (200 + L * 14) * city.k,
            ar: 380 + L * 10,
            def: 220 + L * 8,
            x: sp[0], y: sp[1], r: isElite ? 24 : 18,
            spd: 50, atkCd: 1.2, cd: 2.2,
            stun: 0, poison: 0, poisonDmg: 0, hitT: 0, face: 1,
            warScore: isElite ? 5 : 2
          });
        }
      }
    }
  }

  function checkWarMonsterKill(enemy) {
    if (!R.war || !R.war.active) return;
    const addScore = enemy.warScore || (enemy.cls === 'boss' ? 20 : enemy.cls === 'elite' ? 3 : 1);
    R.war.score = (R.war.score || 0) + addScore;

    // Kiểm tra toàn bộ quái trong đợt đã bị hạ gục chưa
    const remainingEnemies = (R.enemies || []).filter(e => !e.dead && e.hp > 0 && e !== enemy);
    if (remainingEnemies.length === 0) {
      if (R.war.wave <= R.war.waves) {
        R.war.wave++;
        setTimeout(spawnWarWave, 1000);
      } else {
        // Đã hạ Boss cuối cùng!
        setTimeout(() => finishWar(true, "win"), 1000);
      }
    }
  }

  function finishWar(won = true, reason = "win") {
    if (!R.war || !R.war.active) return;
    const war = R.war;
    R.war = { active: false };
    R.enemies = [];
    const w = getWarData();
    const L = war.L || 40;

    if (war.kind === "tk") {
      const score = war.score || 0;
      const gainedMerit = won ? (score + 30) : Math.max(5, Math.round(score * 0.5));
      w.merit = (w.merit || 0) + gainedMerit;
      if (won) {
        w.tkWins = (w.tkWins || 0) + 1;
        w.tkBest = Math.max(w.tkBest || 0, score);
      }
      const expGain = won ? (60 * (typeof expFor === 'function' ? expFor(L) : 500)) : (25 * (typeof expFor === 'function' ? expFor(L) : 500));
      const goldGain = won ? (5000 + L * 50) : 2000;
      if (typeof gainXp === 'function') gainXp(expGain);
      if (typeof S !== 'undefined') S.gold = (S.gold || 0) + goldGain;

      if (won) {
        if (typeof toast === 'function') toast(`Chiến thắng Tống Kim! +${gainedMerit} Quân công!`);
        if (typeof log === 'function') log(`🎉 <b style="color:#4ade80">Phe ${war.side} Đại Thắng Tống Kim!</b> Chiến công: ${score} → <b style="color:#fbbf24">+${gainedMerit} Quân công</b>, +${Math.round(expGain)} EXP, +${goldGain} lượng.`);
      } else {
        if (typeof toast === 'function') toast(`Tống Kim kết thúc (+${gainedMerit} Quân công).`);
        if (typeof log === 'function') log(`⚠️ Phe ${war.side} thất bại trận Tống Kim (${reason}). Nhận an ủi: <b style="color:#fbbf24">+${gainedMerit} Quân công</b>, +${goldGain} lượng.`);
      }
    } else {
      // Công thành
      const city = war.city || CITIES[0];
      if (won) {
        const gainedMerit = Math.round(40 * city.rew);
        w.merit = (w.merit || 0) + gainedMerit;
        w.sgWins[city.id] = (w.sgWins[city.id] || 0) + 1;
        const expGain = 100 * (typeof expFor === 'function' ? expFor(L) : 800) * city.rew;
        const goldGain = Math.round((10000 + L * 100) * city.rew);
        const fdGain = Math.round(5 * city.rew);
        if (typeof gainXp === 'function') gainXp(expGain);
        if (typeof S !== 'undefined') {
          S.gold = (S.gold || 0) + goldGain;
          S.fd = (S.fd || 0) + fdGain;
        }

        let extraReward = "";
        if (Math.random() < 0.15 * city.rew && typeof rollSetItem === 'function') {
          const setIt = rollSetItem();
          if (setIt && typeof addItem === 'function') {
            addItem(setIt, true);
            extraReward = ` và nhặt được <b style="color:#ffd700">${setIt.n}</b>`;
          }
        }

        if (typeof toast === 'function') toast(`Hạ thành ${city.n}! +${gainedMerit} Quân công!`);
        if (typeof log === 'function') log(`🏰 <b style="color:#4ade80">Chiếm thành công ${city.n}!</b> Nhận: <b style="color:#fbbf24">+${gainedMerit} Quân công</b>, +${Math.round(expGain)} EXP, +${goldGain} lượng, +${fdGain} Phúc Duyên${extraReward}!`);
      } else {
        w.merit = (w.merit || 0) + 10;
        if (typeof toast === 'function') toast("Công thành thất bại (+10 Quân công).");
        if (typeof log === 'function') log(`⚠️ Công thành ${city.n} thất bại (${reason}). Nhận +10 Quân công an ủi.`);
      }
    }

    if (typeof save === 'function') save();
    if (typeof refresh === 'function') refresh();
  }

  window.openWarModal = openWarModal;
  window.checkWarMonsterKill = checkWarMonsterKill;
  window.finishWar = finishWar;
  window.getWarData = getWarData;
})();
