/* ==========================================================================
   HỆ THỐNG XUẤT / NHẬP KHO CHUNG (STASH EXPORT & IMPORT)
   - Xuất toàn bộ trang bị trong kho + nguyên liệu + ngân lượng ra file .jxkho
   - Nạp file kho vào tài khoản khác an toàn, tự động cấp mã UID mới chống trùng lặp
   ========================================================================== */
'use strict';

(function () {
  function computeHash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
    }
    return h.toString(16);
  }

  function exportStashToFile(clearLocal = false) {
    if (typeof S === 'undefined' || !S) {
      if (typeof toast === 'function') toast("Chưa vào thế giới game!");
      return;
    }

    const boxItems = (S.box || S.fbox || []).slice();
    const mats = S.mats || {};
    const gold = S.gold || 0;

    if (boxItems.length === 0 && Object.keys(mats).length === 0 && gold === 0) {
      if (typeof toast === 'function') toast("Kho hiện tại đang trống, không có gì để xuất!");
      return;
    }

    const exportData = {
      version: 1,
      appName: "VoLamIdle",
      charName: S.name || "NhanVat",
      exportedAt: new Date().toISOString(),
      gold: gold,
      items: boxItems,
      mats: mats
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const checksum = computeHash(jsonStr);
    const payload = JSON.stringify({
      data: exportData,
      checksum: checksum
    }, null, 2);

    const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${(S.name || "VoLam").replace(/[^a-zA-Z0-9]/g, "_")}_KhoChung_${dStr}.jxkho`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (clearLocal) {
      if (S.box) S.box = [];
      if (S.fbox) S.fbox = [];
      if (typeof toast === 'function') toast(`Đã xuất và làm trống kho (${boxItems.length} món)!`);
      if (typeof log === 'function') log(`📦 Đã chuyển toàn bộ <b>${boxItems.length} món đồ</b> trong kho ra file!`);
    } else {
      if (typeof toast === 'function') toast(`Đã xuất sao lưu kho (${boxItems.length} món)!`);
      if (typeof log === 'function') log(`📦 Đã xuất file sao lưu kho thành công.`);
    }

    if (typeof save === 'function') save();
    if (typeof refresh === 'function') refresh();
  }

  function importStashFromFile() {
    if (typeof S === 'undefined' || !S) {
      if (typeof toast === 'function') toast("Chưa vào game!");
      return;
    }

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".jxkho,.json";
    fileInput.style.display = "none";
    document.body.appendChild(fileInput);

    fileInput.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = evt => {
        try {
          const raw = JSON.parse(evt.target.result);
          let data = null;
          if (raw.checksum && raw.data) {
            // Có checksum
            const testCheck = computeHash(JSON.stringify(raw.data, null, 2));
            if (testCheck !== raw.checksum) {
              if (typeof toast === 'function') toast("Cảnh báo: File kho có dấu hiệu bị chỉnh sửa!");
            }
            data = raw.data;
          } else if (raw.items || raw.version) {
            data = raw;
          } else {
            throw new Error("Định dạng file kho không hợp lệ");
          }

          const importedItems = Array.isArray(data.items) ? data.items : [];
          if (!S.box) S.box = [];
          
          let addedCount = 0;
          for (const it of importedItems) {
            // Gán UID mới duy nhất để tránh xung đột
            it.uid = (S.uid = (S.uid || 1000) + 1);
            S.box.push(it);
            addedCount++;
          }

          // Nhập nguyên liệu nếu có
          if (data.mats && typeof data.mats === 'object') {
            if (!S.mats) S.mats = {};
            for (const category in data.mats) {
              S.mats[category] = S.mats[category] || {};
              for (const k in data.mats[category]) {
                S.mats[category][k] = (S.mats[category][k] || 0) + (data.mats[category][k] || 0);
              }
            }
          }

          if (data.gold && typeof data.gold === 'number') {
            S.gold = (S.gold || 0) + data.gold;
          }

          if (typeof save === 'function') save();
          if (typeof refresh === 'function') refresh();
          if (typeof toast === 'function') toast(`Nạp thành công ${addedCount} món đồ vào kho!`);
          if (typeof log === 'function') log(`🎉 <b style="color:#4ade80">Nạp kho thành công!</b> Đã thêm <b>+${addedCount} món đồ</b> từ file.`);
        } catch (err) {
          console.error("Lỗi đọc file kho:", err);
          if (typeof toast === 'function') toast("Lỗi: Không thể đọc file kho này!");
        } finally {
          document.body.removeChild(fileInput);
        }
      };
      reader.readAsText(file);
    };

    fileInput.click();
  }

  function openStashIoModal() {
    const boxCount = ((S && (S.box || S.fbox)) || []).length;
    const goldCount = (S && S.gold) || 0;

    const html = `
      <div style="font-family:inherit;padding:4px;">
        <h3 style="color:#fbbf24;margin-top:0;display:flex;align-items:center;gap:6px;">🧰 Xuất / Nhập Kho Đồ (File .jxkho)</h3>
        
        <p style="font-size:13px;color:#cbd5e1;line-height:1.5;">
          Tính năng cho phép bạn sao lưu toàn bộ trang bị, nguyên liệu trong kho thành file tải về máy, hoặc chuyển kho sang thiết bị khác an toàn không bị mất đồ.
        </p>

        <div style="background:rgba(30,41,59,0.8);border:1px solid #475569;border-radius:6px;padding:10px;margin-bottom:12px;font-size:13px;">
          <div>Kho hiện có: <b style="color:#ffd700;">${boxCount} món trang bị</b></div>
          <div>Ngân lượng: <b style="color:#fde047;">${typeof fmt === 'function' ? fmt(goldCount) : goldCount} lượng</b></div>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
          <button class="btn on" id="btnExportStashBackup" style="padding:10px;text-align:left;">
            💾 <b>Xuất file Sao Lưu kho</b>
            <small style="display:block;color:#fef08a;font-size:11.5px;">Tải file .jxkho về máy (vẫn giữ nguyên đồ trong kho hiện tại)</small>
          </button>

          <button class="btn" id="btnExportStashTransfer" style="padding:10px;text-align:left;">
            📦 <b>Chuyển kho ra file</b>
            <small style="display:block;color:#cbd5e1;font-size:11.5px;">Xuất toàn bộ ra file và làm trống kho để chuyển sang acc/máy khác</small>
          </button>

          <button class="btn" id="btnImportStash" style="padding:10px;text-align:left;border:1.5px solid #22c55e;">
            📥 <b>Nạp file kho vào tài khoản</b>
            <small style="display:block;color:#86efac;font-size:11.5px;">Chọn file .jxkho đã lưu để cộng thêm đồ vào kho hiện tại</small>
          </button>
        </div>

        <div class="btnrow" style="display:flex;justify-content:flex-end;">
          <button class="btn" onclick="closeModal(true)">Đóng</button>
        </div>
      </div>
    `;

    if (typeof modal === 'function') {
      modal(html, () => {
        const bBackup = document.getElementById("btnExportStashBackup");
        if (bBackup) bBackup.onclick = () => { closeModal(true); exportStashToFile(false); };

        const bTransfer = document.getElementById("btnExportStashTransfer");
        if (bTransfer) bTransfer.onclick = () => { closeModal(true); exportStashToFile(true); };

        const bImport = document.getElementById("btnImportStash");
        if (bImport) bImport.onclick = () => { closeModal(true); importStashFromFile(); };
      }, true);
    }
  }

  window.openStashIoModal = openStashIoModal;
  window.exportStashToFile = exportStashToFile;
  window.importStashFromFile = importStashFromFile;
})();
