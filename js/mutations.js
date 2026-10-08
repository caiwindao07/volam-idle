/* ==========================================================================
   HỆ THỐNG ĐỘT BIẾN HÀNG NGÀY & LUẬT TUẦN (MUTATIONS & WEEKLY RULES)
   Ported & Enhanced from N.T.T (hoainiem2003.net/vltk)
   - Đột biến hàng ngày: Thay đổi mỗi ngày (Mưa Vàng, Rừng Đồ, Quái Cuồng...)
   - Luật tuần: Đổi vào mỗi thứ Hai (áp dụng Tháp & Chiến trường)
   ========================================================================== */
'use strict';

(function () {
  const DAILY_MUTATIONS = [
    { k: "gold", ic: "💰", n: "Mưa Vàng", d: "Ngân lượng rơi ×3 khi đánh quái", gold: 3 },
    { k: "loot", ic: "🎁", n: "Rừng Đồ", d: "Tỉ lệ rơi đồ tăng gấp đôi (×2)", drop: 2 },
    { k: "luck", ic: "🍀", n: "Gió Lộc", d: "Chỉ số May Mắn nhân vật +25", luck: 25 },
    { k: "gb",   ic: "👑", n: "Trùm Đại Náo", d: "Trùm Hoàng Kim xuất hiện nhanh gấp đôi", gb: 2 },
    { k: "wild", ic: "😡", n: "Quái Cuồng", d: "Quái mạnh hơn 25% nhưng kinh nghiệm ×2", mob: 1.25, xp: 2 },
    { k: "calm", ic: "🕊️", n: "Ngày Thái Bình", d: "Quái yếu đi 20%, ngân lượng rơi ×1.5", mob: 0.8, gold: 1.5 }
  ];

  const WEEKLY_RULES = [
    { k: "armor", ic: "🛡️", n: "Giáp Dày", d: "Quái kháng mọi hệ ngũ hành +25%" },
    { k: "rage",  ic: "💢", n: "Cuồng Bạo", d: "Quái đánh đau hơn 30% nhưng máu giảm 20%" },
    { k: "regen", ic: "💚", n: "Hồi Huyết", d: "Quái hồi phục 1.2% máu tối đa mỗi giây" },
    { k: "elem",  ic: "☯️", n: "Hệ Thịnh", d: "Quái cùng một hệ; phái khắc hệ đó nhận ×1.25 EXP và Ngân lượng" }
  ];

  function strHash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
    }
    return h;
  }

  function dayKey(timestamp = Date.now()) {
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function mondayKey(timestamp = Date.now()) {
    const d = new Date(timestamp);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (d.getDay() + 6) % 7);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function getMutationForDate(timestamp) {
    const dk = dayKey(timestamp);
    const h = strHash("dm" + dk);
    let idx = h % DAILY_MUTATIONS.length;
    // Tránh trùng 2 ngày liên tiếp
    const prevH = strHash("dm" + dayKey(timestamp - 86400000));
    if (idx === (prevH % DAILY_MUTATIONS.length)) {
      idx = (idx + 1) % DAILY_MUTATIONS.length;
    }
    return DAILY_MUTATIONS[idx];
  }

  let _cachedToday = null;
  function getTodayMutation() {
    const today = dayKey();
    if (!_cachedToday || _cachedToday.key !== today) {
      _cachedToday = {
        key: today,
        m: getMutationForDate(Date.now())
      };
    }
    return _cachedToday.m;
  }

  let _cachedWeek = null;
  function getWeeklyRules() {
    const wk = mondayKey();
    if (_cachedWeek && _cachedWeek.key === wk) return _cachedWeek;
    const h = strHash("wk" + wk);
    const e = h % WEEKLY_RULES.length;
    const i = (e + 1 + (h >>> 3) % (WEEKLY_RULES.length - 1)) % WEEKLY_RULES.length;
    _cachedWeek = {
      key: wk,
      list: [WEEKLY_RULES[e], WEEKLY_RULES[i]],
      series: (h >>> 7) % 5
    };
    return _cachedWeek;
  }

  function isWeeklyRuleActive(key) {
    return getWeeklyRules().list.some(r => r.k === key);
  }

  // Hook multipliers
  window.mutationGoldMul = function () {
    if (typeof R !== 'undefined' && (R.tower || (R.war && R.war.active))) return 1;
    const m = getTodayMutation();
    return m.gold || 1;
  };

  window.mutationXpMul = function () {
    if (typeof R !== 'undefined' && (R.tower || (R.war && R.war.active))) return 1;
    const m = getTodayMutation();
    return m.xp || 1;
  };

  window.mutationDropMul = function () {
    if (typeof R !== 'undefined' && (R.tower || (R.war && R.war.active))) return 1;
    const m = getTodayMutation();
    return m.drop || 1;
  };

  window.mutationLuckBonus = function () {
    const m = getTodayMutation();
    return m.luck || 0;
  };

  window.mutationMobMul = function () {
    if (typeof R !== 'undefined' && (R.tower || (R.war && R.war.active))) return 1;
    const m = getTodayMutation();
    return m.mob || 1;
  };

  window.mutationBossSpawnMul = function () {
    const m = getTodayMutation();
    return m.gb || 1;
  };

  window.getTodayMutation = getTodayMutation;
  window.getWeeklyRules = getWeeklyRules;
  window.isWeeklyRuleActive = isWeeklyRuleActive;

  // Modal hiển thị
  function openMutationsModal() {
    const m = getTodayMutation();
    const wk = getWeeklyRules();
    const seriesCol = ["#f3d35b", "#6fd46a", "#5fb8ff", "#ff6a3a", "#c8965a"];
    const seriesName = ["Kim", "Mộc", "Thủy", "Hỏa", "Thổ"];
    const mySeries = (typeof heroSeries === 'function') ? heroSeries() : 0;

    const futureDays = Array.from({ length: 6 }, (_, i) => {
      const ts = Date.now() + 86400000 * (i + 1);
      const mut = getMutationForDate(ts);
      const d = new Date(ts);
      return `<span style="background:rgba(255,255,255,0.06);border:1px solid #444;border-radius:6px;padding:3px 8px;font-size:12px;display:inline-flex;align-items:center;gap:4px;">
        <span style="color:#aaa;">${d.getDate()}/${d.getMonth() + 1}:</span> ${mut.ic} <b>${mut.n}</b>
      </span>`;
    }).join("");

    const rulesDesc = wk.list.map(r => {
      let extra = "";
      if (r.k === "elem") {
        const targetSeries = wk.series;
        const targetName = seriesName[targetSeries];
        const isCounter = (typeof counters === 'function') ? counters(mySeries, targetSeries) : false;
        extra = ` (Hệ <b style="color:${seriesCol[targetSeries]}">${targetName}</b>${isCounter ? ', <span style="color:#4ade80;">bạn khắc hệ này!</span>' : ""})`;
      }
      return `<div>${r.ic} <b>${r.n}</b>: ${r.d}${extra}</div>`;
    }).join("<hr style='border:0;border-top:1px dashed #444;margin:6px 0;'>");

    const html = `
      <div style="font-family:inherit;padding:4px;">
        <h3 style="color:#fbbf24;margin-top:0;display:flex;align-items:center;gap:6px;">🌗 Đột Biến & Luật Tuần</h3>
        
        <div style="background:rgba(251,191,36,0.1);border:1.5px solid #fbbf24;border-radius:8px;padding:12px;margin-bottom:12px;">
          <div style="font-size:16px;font-weight:bold;color:#fef08a;margin-bottom:4px;">
            ${m.ic} Đột biến hôm nay: <span style="color:#fff;">${m.n}</span>
          </div>
          <div style="font-size:13.5px;color:#ddd;line-height:1.4;">${m.d}</div>
          <small style="color:#9ca3af;display:block;margin-top:4px;">Áp dụng khi đánh quái bản đồ, phó bản, săn Boss Hoàng Kim.</small>
        </div>

        <div style="margin-bottom:14px;">
          <div style="font-size:12px;color:#aaa;margin-bottom:6px;">Dự báo đột biến các ngày tới:</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">${futureDays}</div>
        </div>

        <div style="background:rgba(99,102,241,0.1);border:1.5px solid #818cf8;border-radius:8px;padding:12px;margin-bottom:12px;">
          <div style="font-size:15px;font-weight:bold;color:#c7d2fe;margin-bottom:6px;">
            ⚔️ Luật tuần này (Tháp Thử Thách & Chiến Trường)
          </div>
          <div style="font-size:13px;color:#e0e7ff;line-height:1.5;">${rulesDesc}</div>
          <small style="color:#9ca3af;display:block;margin-top:6px;">Luật tuần tự động đổi mới vào 00:00 mỗi thứ Hai hàng tuần.</small>
        </div>

        <div class="btnrow" style="display:flex;justify-content:flex-end;">
          <button class="btn on" onclick="closeModal(true)">Đã hiểu</button>
        </div>
      </div>
    `;

    if (typeof modal === 'function') {
      modal(html, () => {}, true);
    }
  }

  window.openMutationsModal = openMutationsModal;

  // Tự động hiển thị thẻ Mutation trên màn hình nếu có
  function updateMutationTag() {
    const el = document.getElementById("mobStatusEvent");
    if (el) {
      const m = getTodayMutation();
      el.innerHTML = `${m.ic} ${m.n}`;
      el.onclick = openMutationsModal;
      el.style.cursor = "pointer";
      el.title = `${m.n}: ${m.d} (Bấm để xem chi tiết)`;
    }
  }
  setTimeout(updateMutationTag, 1000);
})();
