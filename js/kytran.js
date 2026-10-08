"use strict";
const KNB_GOLD = 1e6,
  KNB_DAY = 1 / 0,
  DGT_KNB = 10,
  LDT_BUY_DAY = 5,
  ldtDay = () => {
    const i = RW(),
      n = dayKey(new Date());
    return ((!i.ldtBuy || i.ldtBuy.d !== n) && (i.ldtBuy = { d: n, n: 0 }), i.ldtBuy);
  },
  knbDay = () => {
    const i = RW(),
      n = dayKey(new Date());
    return ((!i.knbBuy || i.knbBuy.d !== n) && (i.knbBuy = { d: n, n: 0 }), i.knbBuy);
  },
  KTC = [
    {
      k: "knb",
      n: "Kim Nguyên Bảo",
      ic: "img/ep/knb.png",
      gold: 1e6,
      d: "Đổi ngân lượng lấy Kim Nguyên Bảo · không giới hạn",
      use: () => ((S.knb = (S.knb || 0) + 1), knbDay().n++, "Nhận 1 Kim Nguyên Bảo"),
    },
    {
      k: "tt",
      n: "Tiên Thảo Lộ",
      ic: "img/ep/tt.png",
      knb: 2,
      d: "+50% kinh nghiệm trong 60 phút (cộng dồn thời gian)",
      use: () => (addBuff("tt", 0.5, 60), "Tiên Thảo Lộ: +50% kinh nghiệm 60 phút"),
    },
    {
      k: "qht",
      n: "Quế Hoa Tửu",
      ic: "img/ep/qht.png",
      knb: 2,
      d: "+20 may mắn trong 60 phút: đồ rơi nhiều dòng / dòng tốt hơn, +10% tỉ lệ rơi đồ",
      use: () => (addBuff("luck", 20, 60), (R.dirty = !0), "Quế Hoa Tửu: +20 may mắn 60 phút"),
    },
    {
      k: "rht",
      n: "Rương Huyền Tinh",
      ic: "img/ep/box2.png",
      gold: 3e4,
      vio: 1,
      d: "2–3 Huyền Tinh Khoáng Thạch (cấp theo cấp nhân vật)",
      use: () => {
        const i = clamp(Math.floor(S.lvl / 15) + irnd(0, 1), 1, HT_MAX),
          n = irnd(2, 3);
        return (matAdd("ht", i, n), `Rương Huyền Tinh: ${n} Huyền Tinh cấp ${i}`);
      },
    },
    {
      k: "rda",
      n: "Rương Đá Thuộc Tính",
      ic: "img/ep/box3.png",
      gold: 5e4,
      vio: 1,
      d: "1–2 đá thuộc tính (hợp hệ / loại đồ đang mặc)",
      use: () => {
        const i = [forceOre(S.lvl)];
        return (Math.random() < 0.3 && i.push(forceOre(S.lvl)), "Rương Đá Thuộc Tính: " + i.join(", "));
      },
    },
    {
      k: "mt90",
      n: "Võ Lâm Mật Tịch 90",
      ic: "img/ep/mt90.png",
      knb: 5,
      d: "Lĩnh ngộ 1 võ công 90 từ cấp 80 (cấp 1, sau đó luyện)",
      use: () => (matAdd("misc", "bk90", 1), "Nhận 1 Võ Lâm Mật Tịch 90"),
    },
    {
      k: "ldt",
      n: "Lệnh Bài Dã Tẩu",
      ic: "img/ep/ldt.png",
      knb: 5,
      d: "Tối đa 5 / ngày · +20 lượt nhiệm vụ Dã Tẩu trong ngày (dùng ở thẻ Nhiệm vụ › Dã Tẩu, tại đây, hoặc tự dùng khi hết lượt)",
      use: () => (matAdd("misc", "ldt", 1), ldtDay().n++, "Nhận 1 Lệnh Bài Dã Tẩu"),
    },
    {
      k: "ldp",
      n: "Lệnh Bài Đổi Phái",
      ic: "img/ep/ldp.png",
      knb: 20,
      d: "Đổi sang môn phái khác (kể cả khác hệ). Giữ cấp, tiềm năng, trang bị; hoàn lại toàn bộ điểm kỹ năng",
      use: () => (matAdd("misc", "ldp", 1), "Nhận 1 Lệnh Bài Đổi Phái (dùng ở thẻ Nhân vật hoặc tại đây)"),
    },
    {
      k: "dgt",
      n: "Thẻ Đổi Giới Tính",
      ic: "img/ep/ldp.png",
      knb: 10,
      d: "Đổi Nam ↔ Nữ: đổi ngoại hình; đồ chỉ dành cho giới cũ tự tháo vào hành trang. Giữ cấp, điểm, võ công. Thiếu Lâm / Nga My / Thúy Yên không đổi được",
      use: () => (matAdd("misc", "dgt", 1), "Nhận 1 Thẻ Đổi Giới Tính"),
    },
    {
      k: "rngua",
      n: "Rương Ngựa",
      ic: "img/ep/box2.png",
      knb: 20,
      d: "Cất vào túi, bấm Dùng để mở 1 con ngựa (nguồn ngựa duy nhất) · Thường 56% · Tốt 31,5% · Quý 6% · Thần 3% · Danh mã 2% · Bảo mã 1% · Chí tôn 0,5% (Quý trở lên tự khóa; ngựa cấp yêu cầu cao cần Trùng Sinh). Còn rơi từ trùm, phó bản, mốc Dã Tẩu",
      use: () => (matAdd("misc", "rngua", 1), "Nhận 1 Rương Ngựa (bấm Dùng để mở)"),
    },
    {
      k: "dtbk",
      n: "Đại Thành Bí Kíp",
      ic: "img/ep/dtbk.png",
      knb: 25,
      d: "Đưa 1 võ công 90 đã học lên cấp 20 ngay, không cần luyện (dùng ở thẻ Võ công)",
      use: () => (matAdd("misc", "dtbk", 1), "Nhận 1 Đại Thành Bí Kíp"),
    },
  ];
function useDaiThanh(i) {
  const n = SK[i];
  if (!n || n.tier !== 90 || !S.sk[i] || matHave("misc", "dtbk") < 1) return;
  const t = SKL(),
    c = t[i] || (t[i] = { lv: S.sk[i], xp: 0 });
  if (c.lv >= n.max) {
    toast("Đã đại thành");
    return;
  }
  (matAdd("misc", "dtbk", -1),
    (c.lv = n.max),
    (c.xp = 0),
    (S.sk[i] = n.max),
    (R.dirty = !0),
    recalc(),
    log(`📕 Dùng Đại Thành Bí Kíp: <b style="color:#ffd24a">${esc(n.n)}</b> đại thành cấp ${n.max}!`),
    toast(`${n.n} cấp ${n.max}`),
    uiSfx("levelup"),
    save(),
    refresh());
}
// daily limit per item: i.lim (admin config, js/gcfg/shops.js), else Lệnh Bài Dã Tẩu 5 / day; -1 = none
const ktcLim = (i) => (i.lim != null ? i.lim : i.k === "ldt" ? LDT_BUY_DAY : -1),
  ktcDay = () => {
    const i = RW(),
      n = dayKey(new Date());
    return ((!i.ktcDay || i.ktcDay.d !== n) && (i.ktcDay = { d: n, n: {} }), i.ktcDay);
  },
  ktcDayN = (i) => (i.k === "knb" ? knbDay().n : i.k === "ldt" ? ldtDay().n : ktcDay().n[i.k] || 0),
  ktcOk = (i) => !i.vio || verVio(),
  ktcCost = (i) => (i.knb ? `${i.knb} KNB` : fmtL(i.gold)),
  ktcCan = (i, n = 1) =>
    (i.knb ? (S.knb || 0) >= i.knb * n : S.gold >= i.gold * n) &&
    (ktcLim(i) < 0 || ktcDayN(i) + n <= ktcLim(i));
function ktcBuy(i, n = 1) {
  const t = KTC.find((e) => e.k === i);
  if (!t || !ktcOk(t)) return;
  let c = 0;
  const a = [];
  for (let e = 0; e < n && ktcCan(t); e++)
    (t.knb ? (S.knb -= t.knb) : (S.gold -= t.gold),
      a.push(t.use()),
      c++,
      t.k !== "knb" && t.k !== "ldt" && (ktcDay().n[t.k] = (ktcDay().n[t.k] || 0) + 1));
  if (!c) {
    toast(t.knb ? "Không đủ Kim Nguyên Bảo" : "Không đủ ngân lượng");
    return;
  }
  RW().stat.ktc = (RW().stat.ktc || 0) + c;
  const o = a[a.length - 1];
  (log(
    `🏮 Kỳ Trân Các: ${c > 1 ? `mua ${c} × ${esc(t.n)} · ` : ""}${esc(c > 1 && t.k.startsWith("r") ? a.join(" · ") : o)} (−${t.knb ? t.knb * c + " Kim Nguyên Bảo" : fmtL(t.gold * c) + " lượng"})`,
  ),
    toast(c > 1 ? `${t.n} ×${c}` : o),
    uiSfx("learn"),
    (R.dirty = !0),
    (invDirty = !0),
    save(),
    ktcModal());
}
function ktcModal() {
  const i = R.P ? Math.round(R.P.lucky) : 0;
  modal(
    `<h3>🏮 Kỳ Trân Các <small><img src="img/ep/knb.png" alt="" style="height:14px;vertical-align:middle;image-rendering:pixelated"> ${S.knb || 0} Kim Nguyên Bảo · ${fmtL(S.gold)} lượng</small></h3>
    <p class="desc">Giá cố định. Mua bằng <b>Kim Nguyên Bảo</b> (rơi từ trùm 10%, trùm Hoàng Kim / boss tuần 50%); Rương Huyền Tinh và Rương Đá Thuộc Tính mua bằng ngân lượng. Rương Huyền Tinh / Đá mở ngay khi mua; Rương Ngựa cất vào túi, bấm Dùng để mở.</p>
    ${buffText() ? `<div class="card small">Đang có: ${buffText()}</div>` : ""}
    <div class="shoplist">${KTC.map((n) => {
      const t = ktcOk(n),
        c =
          n.k === "mt90"
            ? matHave("misc", "bk90")
            : n.k === "dtbk"
              ? matHave("misc", "dtbk")
              : n.k === "ldp"
                ? matHave("misc", "ldp")
                : n.k === "ldt"
                  ? matHave("misc", "ldt")
                  : n.k === "dgt"
                    ? matHave("misc", "dgt")
                    : n.k === "rngua"
                      ? matHave("misc", "rngua")
                      : n.k === "knb"
                        ? `${knbDay().n} hôm nay (${ktcLim(n) < 0 ? "không giới hạn" : "tối đa " + ktcLim(n)})`
                        : null;
      return `<div class="shoprow ktc${t ? "" : " bad"}"><img src="${n.ic}" alt="" style="image-rendering:pixelated"><span><b>${esc(n.n)}</b><small>${esc(n.d)}${c != null ? (n.k === "knb" ? ` · đã đổi ${c}` : ` · có ${c}`) : ""}${ktcLim(n) >= 0 && n.k !== "knb" ? ` · hôm nay ${ktcDayN(n)}/${ktcLim(n)}` : ""}${t ? "" : " · cần phiên bản 2 (đổi ở thẻ Khác)"}</small></span>
        <span class="btnrow"><button class="btn sm${n.knb ? " knb" : ""}" data-ktc="${n.k}" ${t && ktcCan(n) ? "" : "disabled"}>${ktcCost(n)}</button>${n.k === "ldp" && c ? '<button class="btn sm on" id="ktcLdp">Dùng</button>' : ""}${n.k === "ldt" && c ? '<button class="btn sm on" id="ktcLdt">Dùng</button>' : ""}${n.k === "rngua" && c ? '<button class="btn sm on" id="ktcRngua">Dùng</button>' + (c > 1 ? `<button class="btn sm on" id="ktcRngua10">Dùng ×${Math.min(10, c)}</button>` : "") : ""}${n.k === "mt90" && c ? '<button class="btn sm on" id="ktcMt">Lĩnh ngộ</button>' : ""}${n.k === "dgt" && c ? '<button class="btn sm on" id="ktcDgt">Dùng</button>' : ""}${n.k === "dtbk" && c ? '<button class="btn sm on" id="ktcDtbk">Dùng</button>' : ""}${n.k === "dtbk" || n.k === "ldp" || n.k === "dgt" ? "" : `<button class="btn sm" data-ktc10="${n.k}" ${t && ktcCan(n, 10) ? "" : "disabled"}>×10</button>`}</span></div>`;
    }).join("")}</div>
    <p class="dim small">May mắn hiện tại: <b>${i}</b> (trang bị + Quế Hoa Tửu). Mỗi điểm: đồ rơi có nhiều dòng / dòng cấp cao hơn, +0,5% tỉ lệ rơi đồ.</p>`,
    () => {
      (document.querySelectorAll("#mBody [data-ktc]").forEach((l) => (l.onclick = () => ktcBuy(l.dataset.ktc, 1))),
        document
          .querySelectorAll("#mBody [data-ktc10]")
          .forEach((l) => (l.onclick = () => ktcBuy(l.dataset.ktc10, 10))));
      const n = $("#ktcLdp");
      n && (n.onclick = doiPhaiModal);
      const t = $("#ktcMt");
      t &&
        (t.onclick = () => {
          if (S.lvl < 80 && !rebornN()) {
            toast("Võ công 90 cần cấp 80");
            return;
          }
          (closeModal(!0), showTab("skill"), toast("Bấm + ở võ công 90 để lĩnh ngộ (không tốn điểm)"));
        });
      const c = $("#ktcDgt");
      c && (c.onclick = doiGioiTinhModal);
      const a = $("#ktcDtbk");
      a &&
        (a.onclick = () => {
          (closeModal(!0), showTab("skill"), toast("Bấm 📕 ở võ công 90 đã học để đại thành cấp 20"));
        });
      const o = $("#ktcRngua");
      o &&
        (o.onclick = () => {
          (horseBoxUse(1), ktcModal());
        });
      const e = $("#ktcRngua10");
      e &&
        (e.onclick = () => {
          (horseBoxUse(10), ktcModal());
        });
      const s = $("#ktcLdt");
      s &&
        (s.onclick = () => {
          if (S.lvl < DT_LV) {
            toast(`Dã Tẩu mở từ cấp ${DT_LV}`);
            return;
          }
          (dtUseLdt(!1), ktcModal());
        });
    },
  );
}
function doiPhaiModal() {
  if (!S.fac || isNovice()) {
    toast("Vô Môn Phái: gia nhập môn phái ở cấp " + NOVICE_LV);
    return;
  }
  const i = matHave("misc", "ldp"),
    n = FACTIONS.filter((t) => !t.novice)
      .map((t) => {
        const c = facAllowed(t, S.sex) && t.key !== S.fac,
          a = t.starter && SK[t.starter];
        return `<button data-dp="${t.key}" ${c && i ? "" : "disabled"} style="--c:${SERIES_COL[t.series]}"><img src="${(W.hero[t.key] || {}).img || ""}" alt=""><b>${esc(t.n)}</b><small>${t.key === S.fac ? "Môn phái hiện tại" : facAllowed(t, S.sex) ? `Hệ ${SERIES[t.series]} · ${weaponTypeName(t)}${a ? " · " + esc(a.n) : ""}` : "Không nhận giới tính này"}</small></button>`;
      })
      .join("");
  modal(
    `<h3>Đổi môn phái <small>${i} Lệnh Bài Đổi Phái</small></h3>
    <p class="desc">Dùng 1 Lệnh Bài Đổi Phái: chuyển sang phái mới (đổi cả hệ ngũ hành nếu khác hệ). <b>Giữ</b> cấp, tiềm năng, trang bị, cấp võ công 90 đã luyện; <b>hoàn lại toàn bộ điểm kỹ năng</b> để học võ công phái mới; nhận chiêu nhập môn + vũ khí phái mới.</p>
    ${i ? "" : '<p class="bad small">Chưa có Lệnh Bài Đổi Phái — mua ở Kỳ Trân Các.</p>'}<div class="facpick">${n}</div>`,
    () => {
      document.querySelectorAll("#mBody [data-dp]").forEach(
        (t) =>
          (t.onclick = () => {
            const c = FAC[t.dataset.dp];
            confirm(`Đổi sang ${c.n}? Toàn bộ điểm kỹ năng được hoàn lại.`) && changeFaction(c.key);
          }),
      );
    },
  );
}
function changeFaction(i) {
  const n = FAC[i],
    t = FAC[S.fac];
  if (!n || n.novice || i === S.fac || !facAllowed(n, S.sex) || matHave("misc", "ldp") < 1) return;
  if (R.dg || R.tower) {
    toast("Ra khỏi phó bản / tháp rồi đổi phái");
    return;
  }
  matAdd("misc", "ldp", -1);
  const c = S.bkOk || (S.bkOk = {});
  for (const s in S.sk)
    (SK[s] && SK[s].book && (c[s] = 1),
      (S.skPts += SK[s] && SK[s].tier === 90 && !(typeof isBr90 == "function" && isBr90(s)) ? 0 : S.sk[s]));
  ((S.sk = {}),
    (S.fac = i),
    (S.main = 0),
    (S.mainLock = !1),
    (S.slots = [0, 0, 0, 0]),
    (S.auraOff = {}),
    (R.sks = null),
    n.starter && ((S.sk[n.starter] = 1), (S.skPts = Math.max(0, S.skPts - 1)), (S.main = n.starter)));
  const a = facWeaponDP(n),
    o = (s) => makeItem(a[0], a[1], s, 0);
  let e = null;
  for (let s = clamp(Math.round(S.lvl / 12) + 1, 1, 10); s >= 1 && ((e = o(s)), !(e && reqOk(e))); s--);
  (e && (S.inv.unshift(e), (invDirty = !0), reqOk(e) && equip(e, !0)),
    (R.dirty = !0),
    recalc(),
    typeof autoEquipAll == "function" && autoEquipAll(),
    S.autoPts === !0 && autoSpendSkills(),
    fillSlots(),
    (R.dirty = !0),
    recalc(),
    (R.life = Math.min(R.life, R.P.life)),
    (R.mana = Math.min(R.mana, R.P.mana)),
    closeModal(!0),
    renderPad(),
    refresh(),
    save(),
    uiSfx("levelup"),
    (R.banner = {
      t: 2.8,
      text: "Gia nhập " + n.n,
      sub: `Rời ${t ? t.n : ""} · ${S.skPts} điểm kỹ năng chờ phân phối`,
    }),
    log(
      `🏮 Lệnh Bài Đổi Phái: rời <b>${esc(t ? t.n : "")}</b>, gia nhập <b style="color:${SERIES_COL[n.series]}">${esc(n.n)}</b> (hệ ${SERIES[n.series]}). Hoàn lại ${S.skPts} điểm kỹ năng.`,
    ));
}
function doiGioiTinhModal() {
  const i = matHave("misc", "dgt"),
    n = S.sex ? 0 : 1,
    t = S.fac && S.fac in FAC_SEX,
    c = Object.entries(S.eq)
      .filter(([a, o]) => o && a !== "horse" && !sexReqOkFor(o, n))
      .map(([, a]) => a);
  modal(
    `<h3>Đổi giới tính <small>${i} thẻ</small></h3>
    <p class="desc">${S.sex ? "Nữ" : "Nam"} → <b>${n ? "Nữ" : "Nam"}</b>. Giữ cấp, tiềm năng, võ công, trang bị.</p>
    ${t ? `<p class="reqbad">${esc(FAC[S.fac].n)} chỉ nhận ${FAC_SEX[S.fac] ? "Nữ" : "Nam"}: cần đổi phái trước.</p>` : ""}
    ${c.length ? `<p class="small">Sẽ tháo vào hành trang (chỉ dành cho ${S.sex ? "Nữ" : "Nam"}): ${c.map((a) => esc(a.n)).join(", ")}</p>` : ""}
    <div class="btnrow"><button class="btn red" id="dgtGo" ${i && !t ? "" : "disabled"}>Đổi sang ${n ? "Nữ" : "Nam"}</button><button class="btn" id="dgtNo">Đóng</button></div>`,
    () => {
      (($("#dgtNo").onclick = () => ktcModal()),
        ($("#dgtGo").onclick = () => {
          if (!(!(matHave("misc", "dgt") > 0) || t)) {
            if (S.inv.length + c.length > INV_MAX) {
              toast("Hành trang không đủ chỗ cho đồ phải tháo");
              return;
            }
            (matAdd("misc", "dgt", -1), (S.sex = n));
            for (const [a, o] of Object.entries(S.eq)) o && c.includes(o) && (delete S.eq[a], S.inv.unshift(o));
            ((invDirty = !0),
              (R.dirty = !0),
              recalc(),
              typeof autoEquipAll == "function" && autoEquipAll(),
              (R.dirty = !0),
              recalc(),
              renderPad(),
              save(),
              log(
                `🎭 Dùng Thẻ Đổi Giới Tính: nhân vật đổi sang <b>${n ? "Nữ" : "Nam"}</b>${c.length ? ` (tháo ${c.length} món)` : ""}.`,
              ),
              toast(`Đã đổi sang ${n ? "Nữ" : "Nam"}`),
              uiSfx("levelup"),
              closeModal(!0),
              refresh());
          }
        }));
    },
  );
}
