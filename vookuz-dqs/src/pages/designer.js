import { getState, designerCount, waDesignerCount } from "../js/store.js";
import { requestNotifyPermission, showNotification } from "../js/notify.js";
import {
  callNumber,
  skipNumber,
  finishNumber,
  selfAdd,
  selfAddCetak,
  addWA,
  deleteWAItem,
  toggleWACheck,
} from "../js/queueLogic.js";

let lastBcastTs = null;

export function renderDesigner(root, sess) {
  const s = getState();
  const id = sess.designerId;
  const d = s.designers[id];
  requestNotifyPermission();

  const b = s.broadcast_trigger;
  if (b && b.timestamp !== lastBcastTs && b.designer_name === d.name) {
    lastBcastTs = b.timestamp;
    showNotification(`Antrian Baru — ${d.name}`, `${b.queue_number}`);
  }

  const count = designerCount(id);
  const waCount = waDesignerCount(id);

  const itemCls = (n) => n.p === "cetak" ? " cetak-item" : " design-item";
  const processing = d.current_processing
    ? `<div class="qnum processing big${itemCls(d.current_processing)}">${d.current_processing.v}</div>`
    : "";
  const queue = (d.queue || [])
    .map((n) => `<div class="qnum${itemCls(n)}">${n.v}</div>`)
    .join("");

  const flashTriggers = s.wa_flash_triggers || [];
  const checked = s.wa_checked || [];
  const accList = s.wa_acc || [];
  const waAll = [];
  if (d.wa_processing) waAll.push(d.wa_processing);
  if (d.wa_queue) waAll.push(...d.wa_queue);
  const waItems = waAll.map((n) => {
    const flashing = flashTriggers.some((t) => t.designerId === id && t.itemVal === n.v);
    const chk = checked.some((t) => t.designerId === id && t.itemVal === n.v);
    const acc = accList.some((t) => t.designerId === id && t.itemVal === n.v);
    return `<div class="qnum wa${itemCls(n)}${flashing ? " flash-blink" : ""}${chk ? " wa-checked" : ""}${acc ? " wa-acc" : ""}" draggable="true" data-wa="${n.v}">
      ${acc ? '<span class="wa-acc-badge">ACC</span>' : ""}
      <span class="wa-cb" data-wa-cb="${n.v}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${chk ? '<polyline points="20 6 9 17 4 12"/>' : '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>'}</svg></span>
      <span class="wa-num">${n.v}${n.name ? ` <span class="item-name">${n.name}</span>` : ""}</span>
    </div>`;
  }).join("");

  const oldDesignPool = root.querySelector("#self-pool-design");
  const wasDesignFocused = oldDesignPool && document.activeElement === oldDesignPool;
  const oldDesignVal = oldDesignPool ? oldDesignPool.value : "";
  const oldCetakPool = root.querySelector("#self-pool-cetak");
  const wasCetakFocused = oldCetakPool && document.activeElement === oldCetakPool;
  const oldCetakVal = oldCetakPool ? oldCetakPool.value : "";

  root.innerHTML = `
    <div class="designer-layout">
      <div class="designer-main">
        <!-- DESIGN QUEUE -->
        <div class="dcol ${d.status === "INACTIVE" ? "inactive" : ""}">
          <div class="dcol-title">${d.name} — OFFLINE</div>
          <div class="dcol-meta">
            <span class="status ${d.status === "ACTIVE" ? "on" : "off"}">${d.status === "INACTIVE" ? "CUTI" : "AKTIF"}</span>
            <span>${count}/5</span>
          </div>
          <div class="dcol-list tall">${processing}${queue || '<span class="empty">kosong</span>'}</div>
        </div>
        <!-- WA QUEUE -->
        <div class="dcol wa-col ${d.status === "INACTIVE" ? "inactive" : ""}">
          <div class="dcol-title wa">${d.name} — WA</div>
          <div class="dcol-meta">
            <span class="status ${d.status === "ACTIVE" ? "on" : "off"}">${d.status === "INACTIVE" ? "CUTI" : "AKTIF"}</span>
            <span>${waCount} antrian</span>
          </div>
          <div class="dcol-list tall">${waItems || '<span class="empty">kosong</span>'}</div>
        </div>
      </div>
      
      <div class="designer-sidebar">
        <div class="panel-box legend-box">
          <span class="legend-dot red"></span> design &nbsp; <span class="legend-dot blue"></span> cetak
        </div>
        <div class="panel-actions" style="margin-bottom:8px">
          <button class="btn ok lg" id="call" ${d.status !== "ACTIVE" || (d.current_processing == null && (d.queue || []).length === 0) ? "disabled" : ""}>PANGGIL</button>
          <button class="btn warn" id="skip" ${d.current_processing == null ? "disabled" : ""}>LEWATI</button>
          <button class="btn danger" id="finish" ${d.current_processing == null ? "disabled" : ""}>SELESAI</button>
        </div>
        
        <div class="panel-box">
          <h3 class="panel-title"><span class="pool-dot red"></span> Design Pool</h3>
          <div class="d-selfadd-sm">
            <input id="self-pool-design" class="input-design" type="text" placeholder="No / WA + Nama" value="${oldDesignVal}" />
            <button class="btn accent design-btn" id="self-add-design">+</button>
          </div>
        </div>
        <div class="panel-box">
          <h3 class="panel-title"><span class="pool-dot blue"></span> Cetak Pool</h3>
          <div class="d-selfadd-sm">
            <input id="self-pool-cetak" class="input-cetak" type="text" placeholder="No / WA + Nama" value="${oldCetakVal}" />
            <button class="btn accent cetak-btn" id="self-add-cetak">+</button>
          </div>
        </div>
        <div class="trash-zone" id="designer-trash">🗑 Hapus</div>
      </div>
    </div>
  `;

  // Design actions
  root.querySelector("#call").onclick = () => callNumber(id);
  root.querySelector("#skip").onclick = () => skipNumber(id);
  root.querySelector("#finish").onclick = () => finishNumber(id);

  // WA check (delegated)
  root.querySelectorAll(".wa-cb").forEach((el) => {
    el.onclick = (e) => { e.stopPropagation(); toggleWACheck(id, el.dataset.waCb); };
  });

  const autoAddOwn = (inputEl, isCetak) => {
    const raw = inputEl.value.trim();
    if (!raw) return;
    const match = raw.match(/^(\d+)\s*(.*)/);
    if (match) {
      const digits = match[1];
      const name = match[2].trim();
      if (digits.length <= 2) {
        const n = parseInt(digits, 10);
        if (n >= 1 && n <= 99) {
          if (isCetak) selfAddCetak(id, n);
          else selfAdd(id, n);
          inputEl.value = "";
        }
      } else {
        if (addWA(id, digits, name, isCetak ? "cetak" : "design")) inputEl.value = "";
      }
    } else {
      if (addWA(id, raw, "", isCetak ? "cetak" : "design")) inputEl.value = "";
    }
  };

  const designPoolInput = root.querySelector("#self-pool-design");
  root.querySelector("#self-add-design").onclick = () => autoAddOwn(designPoolInput, false);
  designPoolInput.onkeydown = (e) => { if (e.key === "Enter") autoAddOwn(designPoolInput, false); };

  const cetakPoolInput = root.querySelector("#self-pool-cetak");
  root.querySelector("#self-add-cetak").onclick = () => autoAddOwn(cetakPoolInput, true);
  cetakPoolInput.onkeydown = (e) => { if (e.key === "Enter") autoAddOwn(cetakPoolInput, true); };

  if (wasDesignFocused && designPoolInput) {
    designPoolInput.focus();
  } else if (wasCetakFocused && cetakPoolInput) {
    cetakPoolInput.focus();
  }

  // Trash zone drag-drop for WA items
  const trashZone = root.querySelector("#designer-trash");
  if (trashZone) {
    trashZone.addEventListener("dragover", (e) => { e.preventDefault(); trashZone.classList.add("drag-over"); });
    trashZone.addEventListener("dragleave", () => trashZone.classList.remove("drag-over"));
    trashZone.addEventListener("drop", (e) => {
      e.preventDefault();
      trashZone.classList.remove("drag-over");
      const wa = e.dataTransfer.getData("text/wa");
      if (wa) deleteWAItem(id, wa);
    });
  }
  // Make WA items set drag data
  root.querySelectorAll(".qnum.wa[draggable]").forEach((el) => {
    el.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/wa", el.dataset.wa);
      el.classList.add("dragging");
    });
    el.addEventListener("dragend", () => el.classList.remove("dragging"));
  });
}
