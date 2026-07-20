import { getState, designerCount } from "../js/store.js";
import {
  callNumber,
  skipNumber,
  finishNumber,
  requestFromPool,
  selfAdd,
} from "../js/queueLogic.js";

export function renderDesigner(root, sess) {
  const s = getState();
  const id = sess.designerId;
  const d = s.designers[id];
  const count = designerCount(id);
  const empty = (d.queue || []).length === 0 && d.current_processing == null;

  const processing = d.current_processing != null
    ? `<div class="qnum processing big">${d.current_processing}</div>`
    : "";
  const queue = (d.queue || [])
    .map((n) => `<div class="qnum">${n}</div>`)
    .join("");

  const oldInput = root.querySelector("#self-num");
  const wasFocused = oldInput && document.activeElement === oldInput;
  const oldVal = oldInput ? oldInput.value : "";

  root.innerHTML = `
    <div class="designer-layout">
      <div class="designer-main">
        <div class="dcol ${d.status === "INACTIVE" ? "inactive" : ""}">
          <div class="dcol-title">${d.name}</div>
          <div class="dcol-meta">
            <span class="status ${d.status === "ACTIVE" ? "on" : "off"}">${d.status === "INACTIVE" ? "CUTI" : "AKTIF"}</span>
            <span>${count}/5</span>
          </div>
          <div class="dcol-list tall">${processing}${queue || '<span class="empty">kosong</span>'}</div>
        </div>
      </div>
      
      <div class="designer-sidebar">
        <div class="panel-box">
          <h3 class="panel-title">Aksi Antrian</h3>
          <div class="panel-actions">
            <button class="btn ok lg" id="call" ${d.status !== "ACTIVE" || (d.current_processing == null && (d.queue || []).length === 0) ? "disabled" : ""}>PANGGIL</button>
            <button class="btn warn" id="skip" ${d.current_processing == null ? "disabled" : ""}>LEWATI</button>
            <button class="btn danger" id="finish" ${d.current_processing == null ? "disabled" : ""}>SELESAI</button>
            <button class="btn ghost" id="req" ${!empty || d.status !== "ACTIVE" ? "disabled" : ""}>MINTA ANTRIAN</button>
          </div>
        </div>
        
        <div class="panel-box">
          <h3 class="panel-title">Tambah Antrian</h3>
          <div class="d-selfadd-sm">
            <input id="self-num" type="number" min="1" max="100" placeholder="No pelanggan" value="${oldVal}" />
            <button class="btn accent" id="self-add" ${d.status !== "ACTIVE" || count >= 5 ? "disabled" : ""}>Tambah</button>
          </div>
        </div>
      </div>
    </div>
  `;

  root.querySelector("#call").onclick = () => callNumber(id);
  root.querySelector("#skip").onclick = () => skipNumber(id);
  root.querySelector("#finish").onclick = () => finishNumber(id);
  root.querySelector("#req").onclick = () => requestFromPool(id);
  const input = root.querySelector("#self-num");
  const doSelf = () => { 
    const val = input.value;
    input.value = ""; 
    selfAdd(id, val); 
  };
  root.querySelector("#self-add").onclick = doSelf;
  input.onkeydown = (e) => { if (e.key === "Enter") doSelf(); };
  
  if (wasFocused && input) {
    input.focus();
  }
}
