/* ==========================================================================
   HỆ THỐNG DASHBOARD "HÔM NAY" & NHẬT KÝ 7 NGÀY (TODAY & 7-DAY JOURNAL)
   Ported & Enhanced from N.T.T (hoainiem2003.net/vltk)
   - Bảng tổng hợp hoạt động ngày với nút "Tự Cày" (Vượt ải + Tự nhặt + Xoay chiêu)
   - Nhật ký 7 ngày theo dõi thời gian chơi, exp, tiền, quái diệt, đồ hiếm nhặt
   ========================================================================== */
'use strict';

(function () {
  const MAX_DAYS = 7;

  function dayString(ts = Date.now()) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function getJournal() {
    if (typeof S === 'undefined' || !S) return null;
    if (!S.journal) S.journal = { days: {}, deaths: [] };
    const today = dayString();
    if (!S.journal.days[today]) {
      S.journal.days[today] = { sec: 0, off: 0, xp: 0, gold: 0, kills: 0, r2: 0, r3: 0, set: 0, dead: 0 };
    }
    // Prune days > 7
    const keys = Object.keys(S.journal.days).sort();
    while (keys.length > MAX_DAYS) {
      delete S.journal.days[keys.shift()];
    }
    return S.journal;
  }

  function journalAdd(field, amount = 1) {
    const j = getJournal();
    if (!j) return;
    const today = dayString();
    if (j.days[today]) {
      j.days[today][field] = (j.days[today][field] || 0) + amount;
    }
  }
  window.journalAdd = journalAdd;

  // Track playtime every 10 seconds
  setInterval(() => {
    if (typeof S !== 'undefined' && S && S.fac) {
      journalAdd("sec", 10);
    }
  }, 10000);

  function fmtSecs(s) {
    s = Math.round(s || 0);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h ? `${h}h${String(m).padStart(2, "0")}m` : `${m} phút`;
  }

  // 1. NHẬT KÝ 7 NGÀY
  function openJournalModal() {
    const j = getJournal();
    if (!j) return;
    const days = Object.keys(j.days).sort().reverse();

    const totals = { sec: 0, off: 0, xp: 0, gold: 0, kills: 0, r2: 0, r3: 0, set: 0, dead: 0 };
    for (const dk of days) {
      const d = j.days[dk];
      for (const k in totals) totals[k] += (d[k] || 0);
    }

    const todayStr = dayString();
    const yesterdayStr = dayString(Date.now() - 86400000);

    const rowsHtml = days.map(dk => {
      const d = j.days[dk];
      const isToday = dk === todayStr;
      const isYesterday = dk === yesterdayStr;
      const label = isToday ? "Hôm nay" : isYesterday ? "Hôm qua" : dk.slice(5);

      return `
        <tr style="border-bottom:1px solid #334155;background:${isToday ? 'rgba(56,189,248,0.08)' : 'transparent'};">
          <td style="padding:6px 8px;font-weight:${isToday ? 'bold' : 'normal'};color:${isToday ? '#38bdf8' : '#e2e8f0'};">${label}</td>
          <td style="padding:6px 8px;font-size:12px;">${fmtSecs(d.sec)}${d.off ? `<br><small style="color:#aaa;">+${fmtSecs(d.off)} vắng</small>` : ''}</td>
          <td style="padding:6px 8px;color:#a3e635;font-size:12px;">${typeof fmt === 'function' ? fmt(d.xp) : d.xp}</td>
          <td style="padding:6px 8px;color:#facc15;font-size:12px;">${typeof fmt === 'function' ? fmt(d.gold) : d.gold}</td>
          <td style="padding:6px 8px;font-size:12px;">${d.kills || 0}</td>
          <td style="padding:6px 8px;font-size:12px;">
            <span style="color:#facc15;">${d.r2 || 0}</span> / 
            <span style="color:#c084fc;">${d.r3 || 0}</span> / 
            <span style="color:#fbbf24;font-weight:bold;">${d.set || 0}</span>
          </td>
          <td style="padding:6px 8px;color:${d.dead ? '#f87171' : '#94a3b8'};font-size:12px;">${d.dead || 0}</td>
        </tr>
      `;
    }).join("");

    const html = `
      <div style="font-family:inherit;padding:4px;">
        <h3 style="color:#38bdf8;margin-top:0;display:flex;align-items:center;gap:6px;">📖 Nhật Ký Cày Cuốc 7 Ngày</h3>
        
        <div style="overflow-x:auto;margin-bottom:12px;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;text-align:center;">
            <thead>
              <tr style="background:#1e293b;color:#94a3b8;border-bottom:2px solid #475569;">
                <th style="padding:6px 8px;text-align:left;">Ngày</th>
                <th style="padding:6px 8px;">Online</th>
                <th style="padding:6px 8px;">Kinh nghiệm</th>
                <th style="padding:6px 8px;">Ngân lượng</th>
                <th style="padding:6px 8px;">Quái</th>
                <th style="padding:6px 8px;">Đồ V/T/HK</th>
                <th style="padding:6px 8px;">Tử trận</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
            <tfoot>
              <tr style="background:#0f172a;border-top:2px solid #64748b;font-weight:bold;color:#f8fafc;">
                <td style="padding:6px 8px;text-align:left;">Tổng tuần</td>
                <td style="padding:6px 8px;">${fmtSecs(totals.sec)}</td>
                <td style="padding:6px 8px;color:#a3e635;">${typeof fmt === 'function' ? fmt(totals.xp) : totals.xp}</td>
                <td style="padding:6px 8px;color:#facc15;">${typeof fmt === 'function' ? fmt(totals.gold) : totals.gold}</td>
                <td style="padding:6px 8px;">${totals.kills}</td>
                <td style="padding:6px 8px;">${totals.r2} / ${totals.r3} / ${totals.set}</td>
                <td style="padding:6px 8px;color:${totals.dead ? '#f87171' : '#94a3b8'};">${totals.dead}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="btnrow" style="display:flex;justify-content:space-between;">
          <button class="btn sm" id="btnBackToToday">◀ Về Bảng Hôm Nay</button>
          <button class="btn sm on" onclick="closeModal(true)">Đóng</button>
        </div>
      </div>
    `;

    if (typeof modal === 'function') {
      modal(html, () => {
        const bBack = document.getElementById("btnBackToToday");
        if (bBack) bBack.onclick = openTodayDashboardModal;
      }, true);
    }
  }

  // 2. DASHBOARD HÔM NAY (TODAY OVERVIEW)
  function isAutoGrindOn() {
    const f = typeof lootFilter === 'function' ? lootFilter() : (S && S.lootF) || {};
    return !!(S && S.push && S.rot !== false && f.auto);
  }

  function toggleAutoGrind() {
    const on = !isAutoGrindOn();
    if (typeof S !== 'undefined') {
      S.push = on;
      S.rot = on;
      const f = typeof lootFilter === 'function' ? lootFilter() : (S.lootF || (S.lootF = {}));
      f.auto = on;
      if (on && typeof manual === 'function' && manual()) {
        if (typeof setCtrl === 'function') setCtrl("auto", true);
      }
      if (typeof save === 'function') save();
      if (typeof toast === 'function') {
        toast(on ? "🔄 Tự cày: ĐÃ BẬT (Vượt ải + Tự nhặt + Xoay chiêu)" : "🔄 Tự cày: ĐÃ TẮT");
      }
    }
  }

  function openTodayDashboardModal() {
    if (typeof S === 'undefined' || !S || !S.fac) {
      if (typeof toast === 'function') toast("Chưa vào thế giới game!");
      return;
    }

    const autoOn = isAutoGrindOn();
    const warData = (typeof getWarData === 'function') ? getWarData() : (S.war || {});
    const tkLeft = Math.max(0, 14 - (warData.tk || 0));
    const sgLeft = Math.max(0, 7 - (warData.sg || 0));
    const curMut = (typeof getTodayMutation === 'function') ? getTodayMutation() : { ic: "✨", n: "Bình Thường", d: "" };

    const activities = [
      {
        ic: "🌗",
        name: "Đột Biến Hôm Nay",
        desc: `${curMut.ic} <b>${curMut.n}</b>: ${curMut.d}`,
        ready: false,
        action: () => (typeof openMutationsModal === 'function') ? openMutationsModal() : null
      },
      {
        ic: "⚔️",
        name: "Chiến Trường Tống Kim",
        desc: `Còn <b>${tkLeft}/14</b> lượt tuần này · ${warData.merit || 0} Quân công`,
        ready: tkLeft > 0,
        action: () => (typeof openWarModal === 'function') ? openWarModal("tk") : null
      },
      {
        ic: "🏯",
        name: "Chiến Trường Công Thành",
        desc: `Còn <b>${sgLeft}/7</b> lượt tuần này`,
        ready: sgLeft > 0,
        action: () => (typeof openWarModal === 'function') ? openWarModal("sg") : null
      },
      {
        ic: "🎮",
        name: "Khu Giải Trí (Arcade)",
        desc: "Rắn Săn Mồi & Xếp Gạch (AFK tiết kiệm pin)",
        ready: false,
        action: () => (typeof openArcadeModal === 'function') ? openArcadeModal() : null
      },
      {
        ic: "👑",
        name: "Phó Bản & Tháp Kiếm Vực",
        desc: "Thử thách tầng tháp & Boss phụ bản nhận trang bị",
        ready: true,
        action: () => (typeof openActivityHub === 'function') ? openActivityHub() : null
      },
      {
        ic: "🔮",
        name: "Lò Ép Đồ & Huyền Tinh",
        desc: "Nâng cấp Huyền Tinh, khảm nạm trang bị Tím",
        ready: false,
        action: () => (typeof epModal === 'function') ? epModal() : null
      },
      {
        ic: "🎁",
        name: "Phần Thưởng & Quà Tặng",
        desc: "Nhận quà mốc cấp độ, thành tựu giang hồ",
        ready: false,
        action: () => (typeof giftModal === 'function') ? giftModal() : null
      }
    ];

    const actListHtml = activities.map((act, i) => `
      <div style="background:rgba(30,41,59,0.8);border:1.5px solid ${act.ready ? '#38bdf8' : '#334155'};border-radius:6px;padding:8px 10px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:20px;">${act.ic}</span>
          <div>
            <b style="color:#f8fafc;font-size:13.5px;">${act.name}</b>
            <div style="font-size:12px;color:#94a3b8;">${act.desc}</div>
          </div>
        </div>
        <button class="btn sm ${act.ready ? 'on' : ''}" data-act="${i}">Đi</button>
      </div>
    `).join("");

    const html = `
      <div style="font-family:inherit;padding:4px;">
        <h3 style="color:#fbbf24;margin-top:0;display:flex;align-items:center;gap:6px;">📅 Việc Hôm Nay</h3>

        <button id="btnToggleAutoGrind" class="btn ${autoOn ? 'on' : ''}" style="width:100%;padding:10px;margin-bottom:12px;font-size:14px;border-radius:8px;">
          🔄 Tự Cày 1-Click: <b>${autoOn ? 'ĐANG BẬT' : 'ĐANG TẮT'}</b>
          <small style="display:block;font-size:11.5px;color:${autoOn ? '#fef08a' : '#cbd5e1'};">Tự động đánh quái · Vượt ải · Tự nhặt đồ lọc · Tự xoay chiêu</small>
        </button>

        <div style="margin-bottom:12px;">${actListHtml}</div>

        <div class="btnrow" style="display:flex;justify-content:space-between;">
          <button class="btn sm" id="btnOpen7DayJournal">📖 Nhật Ký 7 Ngày</button>
          <button class="btn sm on" onclick="closeModal(true)">Đóng</button>
        </div>
      </div>
    `;

    if (typeof modal === 'function') {
      modal(html, () => {
        const btnAuto = document.getElementById("btnToggleAutoGrind");
        if (btnAuto) {
          btnAuto.onclick = () => {
            toggleAutoGrind();
            openTodayDashboardModal();
          };
        }

        document.querySelectorAll("[data-act]").forEach(b => {
          b.onclick = () => {
            closeModal(true);
            const idx = +b.dataset.act;
            if (activities[idx] && activities[idx].action) activities[idx].action();
          };
        });

        const btnJr = document.getElementById("btnOpen7DayJournal");
        if (btnJr) btnJr.onclick = openJournalModal;
      }, true);
    }
  }

  window.openTodayDashboardModal = openTodayDashboardModal;
  window.openJournalModal = openJournalModal;
})();
