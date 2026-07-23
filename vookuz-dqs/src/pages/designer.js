import { getState, designerCount, waDesignerCount } from "../js/store.js";
import {
  callNumber,
  skipNumber,
  finishNumber,
  requestFromPool,
  requestFromCetak,
  selfAdd,
  deleteWAItem,
  addWA,
  toggleWACheck,
} from "../js/queueLogic.js";

export function renderDesigner(root, sess) {
  const s = getState();
  const id = sess.designerId;
  const d = s.designers[id];
  const count = designerCount(id);
  const waCount = waDesignerCount(id);
  const empty = (d.queue || []).length === 0 && d.current_processing == null;
  const waEmpty = (d.wa_queue || []).length === 0 && d.wa_processing == null;

  const itemCls = (n) => n.p === "cetak" ? " cetak-item" : " design-item";
  const processing = d.current_processing
    ? `<div class="qnum processing big${itemCls(d.current_processing)}">${d.current_processing.v}</div>`
    : "";
  const queue = (d.queue || [])
    .map((n) => `<div class="qnum${itemCls(n)}">${n.v}</div>`)
    .join("");

  const flashTriggers = s.wa_flash_triggers || [];
  const checked = s.wa_checked || [];
  const waAll = [];
  if (d.wa_processing) waAll.push(d.wa_processing);
  if (d.wa_queue) waAll.push(...d.wa_queue);
  const waItems = waAll.map((n) => {
    const flashing = flashTriggers.some((t) => t.designerId === id && t.itemVal === n.v);
    const chk = checked.some((t) => t.designerId === id && t.itemVal === n.v);
    return `<div class="qnum wa${itemCls(n)}${flashing ? " flash-blink" : ""}${chk ? " wa-checked" : ""}">
      <span class="wa-cb" data-wa-cb="${n.v}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${chk ? '<polyline points="20 6 9 17 4 12"/>' : '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>'}</svg></span>
      <span class="wa-num">${n.v}${n.name ? ` <span class="item-name">${n.name}</span>` : ""}</span>
      <span class="wa-del" data-wa-del="${n.v}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>
    </div>`;
  }).join("");

  const oldInput = root.querySelector("#self-num");
  const wasFocused = oldInput && document.activeElement === oldInput;
  const oldVal = oldInput ? oldInput.value : "";
  const oldWAInput = root.querySelector("#self-wa");
  const wasWAFocused = oldWAInput && document.activeElement === oldWAInput;
  const oldWAVal = oldWAInput ? oldWAInput.value : "";

  root.innerHTML = `
    <div class="designer-layout">
      <div class="designer-main">
        <!-- DESIGN QUEUE -->
        <div class="dcol ${d.status === "INACTIVE" ? "inactive" : ""}">
          <div class="dcol-title">${d.name} — DESIGN</div>
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
        <div class="panel-box">
          <h3 class="panel-title">Aksi Design</h3>
          <div class="panel-actions">
            <button class="btn ok lg" id="call" ${d.status !== "ACTIVE" || (d.current_processing == null && (d.queue || []).length === 0) ? "disabled" : ""}>PANGGIL</button>
            <button class="btn warn" id="skip" ${d.current_processing == null ? "disabled" : ""}>LEWATI</button>
            <button class="btn danger" id="finish" ${d.current_processing == null ? "disabled" : ""}>SELESAI</button>
            <button class="btn ghost" id="req" ${!empty || d.status !== "ACTIVE" ? "disabled" : ""}>MINTA DESIGN</button>
            <button class="btn ghost" id="req-cetak" ${!empty || d.status !== "ACTIVE" ? "disabled" : ""}>MINTA CETAK</button>
          </div>
          <div id="empty-toast" class="empty-toast"></div>
        </div>
        
        <div class="panel-box">
          <h3 class="panel-title">Tambah Antrian Design</h3>
          <div class="d-selfadd-sm">
            <input id="self-num" type="number" min="1" max="100" placeholder="No pelanggan" value="${oldVal}" />
            <button class="btn accent" id="self-add" ${d.status !== "ACTIVE" || count >= 5 ? "disabled" : ""}>Tambah</button>
          </div>
        </div>
        <div class="panel-box">
          <h3 class="panel-title">Tambah WA</h3>
          <div class="d-selfadd-sm">
            <input id="self-wa" type="text" placeholder="WA + Nama" value="${oldWAVal}" />
            <button class="btn ok" id="self-add-wa" ${d.status !== "ACTIVE" ? "disabled" : ""}>+WA</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Design actions
  root.querySelector("#call").onclick = () => callNumber(id);
  root.querySelector("#skip").onclick = () => skipNumber(id);
  root.querySelector("#finish").onclick = () => finishNumber(id);
  root.querySelector("#req").onclick = () => {
    if (!(s.design_pool || []).length) { showToast(root); return; }
    requestFromPool(id);
  };
  root.querySelector("#req-cetak").onclick = () => {
    if (!(s.cetak_pool || []).length) { showToast(root); return; }
    requestFromCetak(id);
  };

  function showToast(root) {
    const el = root.querySelector("#empty-toast");
    if (!el) return;
    el.textContent = "antrian kosong";
    el.classList.add("show");
    setTimeout(() => { el.classList.remove("show"); }, 1500);
  }

  // WA delete + WA check (delegated)
  root.querySelectorAll(".wa-del").forEach((el) => {
    el.onclick = (e) => { e.stopPropagation(); deleteWAItem(id, el.dataset.waDel); };
  });
  root.querySelectorAll(".wa-cb").forEach((el) => {
    el.onclick = (e) => { e.stopPropagation(); toggleWACheck(id, el.dataset.waCb); };
  });

  // Self add design
  const input = root.querySelector("#self-num");
  const doSelf = () => {
    const val = input.value;
    input.value = "";
    selfAdd(id, val);
  };
  root.querySelector("#self-add").onclick = doSelf;
  input.onkeydown = (e) => { if (e.key === "Enter") doSelf(); };

  // Self add WA
  const waInput = root.querySelector("#self-wa");
  const doSelfWA = () => {
    const raw = waInput.value.trim();
    if (!raw) return;
    const match = raw.match(/^(\d+)\s*(.*)/);
    if (match && match[1].length >= 3 && match[1].length <= 4) {
      if (addWA(id, match[1], match[2].trim())) waInput.value = "";
    } else {
      if (addWA(id, raw)) waInput.value = "";
    }
  };
  root.querySelector("#self-add-wa").onclick = doSelfWA;
  waInput.onkeydown = (e) => { if (e.key === "Enter") doSelfWA(); };

  if (wasFocused && input) {
    input.focus();
  } else if (wasWAFocused && waInput) {
    waInput.focus();
  }
}
