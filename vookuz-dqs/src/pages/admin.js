import { DESIGNERS, GLOBAL_LIMIT_PER_DESIGNER } from "../js/constants.js";
import { getState, designerCount, resetState } from "../js/store.js";
import {
  addToDesignPool,
  addToCetakPool,
  addWAtoDesignPool,
  addWAtoCetakPool,
  moveToDesigner,
  moveBetweenDesigners,
  toggleDesigner,
  returnToPool,
  returnToCetak,
  returnWAToPool,
  returnWAToCetak,
  deleteNumber,
  deleteWAItem,
  addWA,
  moveWABetweenDesigners,
} from "../js/queueLogic.js";

let dragData = null;
let mounted = false;

function renderPoolItem(item, pool) {
  const isWAItem = item.w === true;
  const val = item.v;
  const src = item.p || pool;
  const colorCls = src === "cetak" ? " cetak-item" : " design-item";
  const waCls = isWAItem ? " wa" : "";
  const data = isWAItem ? `data-wa="${val}"` : `data-num="${val}"`;
  return `<div class="qnum${waCls}${colorCls}" draggable="true" ${data} data-from="${pool}" data-iswa="${isWAItem ? 1 : 0}">${val}</div>`;
}

function poolColumn(id, title, dotClass, items, trash) {
  return `
    <div class="dcol pool-col" id="pool-col-${id}">
      <div class="dcol-title">${title} <span class="pool-dot ${dotClass}"></span></div>
      <div class="pool-tools">
        <input class="pool-input" id="new-${id}" type="text" autocomplete="off" spellcheck="false" placeholder="No / WA" />
        <button class="btn accent sm" id="add-${id}-btn">+</button>
      </div>
      <div class="dcol-list" id="${id}-list" data-drop="${id}">
        ${items.map((item) => renderPoolItem(item, id)).join("") || '<span class="empty">kosong</span>'}
      </div>
      ${trash ? '<div class="trash-inside" data-drop="trash">🗑️</div>' : ''}
    </div>`;
}

export function mountAdmin(root, sess) {
  if (!mounted) {
    mounted = true;
    const dp = getState().design_pool || [];
    const cp = getState().cetak_pool || [];

    root.innerHTML = `
      <div class="admin-grid" id="admin-grid">
        ${DESIGNERS.map((d) => `
          <div class="dcol-wrap" id="col-${d.id}" data-col="${d.id}">
            <div class="dcol-title">${d.name}</div>
            <div class="dcol-meta">
              <span class="status" id="st-${d.id}"></span>
              <span class="cnt" id="cnt-${d.id}"></span>
              <button class="btn ghost toggle" data-toggle="${d.id}"></button>
            </div>
            <div class="dcol-list" data-drop="${d.id}" data-q="design"></div>
            <div class="dcol-sub wa">WA</div>
            <div class="dcol-list wa" data-drop="${d.id}" data-q="wa"></div>
          </div>
        `).join("")}
        ${poolColumn("design_pool", "DESIGN", "red", dp, false)}
        ${poolColumn("cetak_pool", "CETAK", "blue", cp, true)}
      </div>
      <div class="admin-foot"><button class="btn ghost danger sm" id="reset-btn">Reset Semua</button></div>
    `;
    wire(root);
  }
  paintAdmin(root);
}

export function paintAdmin(root) {
  const s = getState();

  let total = (s.design_pool || []).length + (s.cetak_pool || []).length;
  for (const id in s.designers) {
    const d = s.designers[id];
    total += designerCount(id) + (d.wa_queue || []).length + (d.wa_processing != null ? 1 : 0);
  }
  const who = document.querySelector("#who-label");
  if (who) who.textContent = `Admin · ${(s.design_pool || []).length} dsg · ${(s.cetak_pool || []).length} ctk · total ${total}`;

  // Operator columns
  DESIGNERS.forEach((d) => {
    const st = s.designers[d.id];
    const count = designerCount(d.id);
    const locked = st.status === "ACTIVE" && count >= GLOBAL_LIMIT_PER_DESIGNER;
    const col = root.querySelector(`#col-${d.id}`);
    col.className = "dcol-wrap" + (st.status === "INACTIVE" ? " inactive" : locked ? " locked" : "");

    root.querySelector(`#st-${d.id}`).className = "status " + (st.status === "ACTIVE" ? "on" : "off");
    root.querySelector(`#st-${d.id}`).textContent = st.status === "INACTIVE" ? "CUTI" : locked ? "PENUH" : "AKTIF";
    root.querySelector(`#cnt-${d.id}`).textContent = `${count}/5`;
    col.querySelector(".toggle").textContent = st.status === "ACTIVE" ? "Cuti" : "Aktif";

    const designList = col.querySelector(`.dcol-list[data-q="design"]`);
    renderDesignList(designList, st.current_processing, st.queue, d.id);

    const waList = col.querySelector(`.dcol-list[data-q="wa"]`);
    waList.innerHTML = renderWAItems(st.wa_processing, st.wa_queue, d.id);
  });

  // Pool columns
  renderPoolList(root.querySelector("#design_pool-list"), s.design_pool || [], "design_pool");
  renderPoolList(root.querySelector("#cetak_pool-list"), s.cetak_pool || [], "cetak_pool");
}

function renderPoolList(el, items, pool) {
  if (!el) return;
  el.innerHTML = items.map((item) => renderPoolItem(item, pool)).join("") || '<span class="empty">kosong</span>';
}

function renderDesignList(el, processing, queue, from) {
  if (!el) return;
  const proc = processing
    ? `<div class="qnum processing ${processing.p === "cetak" ? "cetak-item" : "design-item"}" draggable="true" data-num="${processing.v}" data-from="${from}">${processing.v}</div>`
    : "";
  const items = (queue || [])
    .map((n) => `<div class="qnum ${n.p === "cetak" ? "cetak-item" : "design-item"}" draggable="true" data-num="${n.v}" data-from="${from}">${n.v}</div>`)
    .join("");
  el.innerHTML = proc + (items || '<span class="empty">kosong</span>');
}

function renderWAItems(processing, queue, from) {
  const colorCls = (n) => n.p === "cetak" ? " cetak-item" : " design-item";
  const all = [];
  if (processing) all.push(processing);
  if (queue) all.push(...queue);
  return all.map((n) =>
    `<div class="qnum wa ${colorCls(n)}" draggable="true" data-wa="${n.v}" data-from="${from}" data-q="wa">
      ${n.v}
      <span class="wa-del" data-wa-del="${n.v}" data-from="${from}">&times;</span>
    </div>`
  ).join("") || '<span class="empty">kosong</span>';
}

function autoAdd(poolKey, raw) {
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return false;
  if (digits.length <= 2) {
    const n = parseInt(digits, 10);
    if (n < 1 || n > 99) return false;
    return poolKey === "cetak_pool" ? addToCetakPool(n) : addToDesignPool(n);
  }
  return poolKey === "cetak_pool" ? addWAtoCetakPool(digits) : addWAtoDesignPool(digits);
}

function wire(root) {
  // Pool inputs (auto-detect: 1-2 digit → queue number, 3-4 digit → WA)
  wirePoolInput(root, "#new-design_pool", "#add-design_pool-btn", "design_pool");
  wirePoolInput(root, "#new-cetak_pool", "#add-cetak_pool-btn", "cetak_pool");

  const grid = root.querySelector("#admin-grid");

  // Toggle designer + WA delete
  grid.addEventListener("click", (e) => {
    const tg = e.target.closest(".toggle");
    if (tg) { toggleDesigner(tg.dataset.toggle); return; }
    const del = e.target.closest(".wa-del");
    if (del) { deleteWAItem(del.dataset.from, del.dataset.waDel); }
  });

  // Drag & Drop
  const handleDragStart = (e) => {
    const el = e.target.closest("[draggable]");
    if (!el) return;
    const isWAItem = el.dataset.iswa === "1" || el.dataset.wa !== undefined;
    const num = isWAItem ? (el.dataset.wa || el.dataset.num) : Number(el.dataset.num);
    dragData = { num, from: el.dataset.from, isWA: isWAItem };
    el.classList.add("dragging");
  };

  const handleDragEnd = (e) => {
    const el = e.target.closest("[draggable]");
    if (el) el.classList.remove("dragging");
  };

  const handleDragOver = (e) => {
    const target = e.target.closest(".dcol-list, .trash-inside");
    if (target) e.preventDefault();
  };

  const handleDrop = (e) => {
    const dropTarget = e.target.closest(".dcol-list, .trash-inside");
    if (!dropTarget || !dragData) return;
    e.preventDefault();
    const { num, from, isWA } = dragData;

    // Trash
    if (dropTarget.classList.contains("trash-inside") || dropTarget.dataset.drop === "trash") {
      deleteNumber(num, from);
      dragData = null;
      return;
    }

    const to = dropTarget.dataset.drop; // designer id or pool key
    const toQ = dropTarget.dataset.q || "design";

    // Dropped on pool column → return to pool
    if (to === "design_pool" || to === "cetak_pool") {
      if (from !== to && from !== "design_pool" && from !== "cetak_pool") {
        if (isWA) {
          if (to === "cetak_pool") returnWAToCetak(num, from);
          else returnWAToPool(num, from);
        } else {
          if (to === "cetak_pool") returnToCetak(num, from);
          else returnToPool(num, from);
        }
      }
      dragData = null;
      return;
    }

    // Dropped on operator column
    if (isWA) {
      if (toQ === "wa") {
        if (from === "design_pool" || from === "cetak_pool") {
          moveToDesigner(num, to, from);
        } else if (from !== to) {
          moveWABetweenDesigners(num, from, to);
        }
      }
      dragData = null;
      return;
    }

    // Design items
    if (toQ === "wa") {
      dragData = null;
      return;
    }

    if (from === "design_pool" || from === "cetak_pool") {
      moveToDesigner(num, to, from);
    } else if (from !== to) {
      moveBetweenDesigners(num, from, to);
    }
    dragData = null;
  };

  document.addEventListener("dragstart", handleDragStart);
  document.addEventListener("dragend", handleDragEnd);
  document.addEventListener("dragover", handleDragOver);
  document.addEventListener("drop", handleDrop);

  const resetBtn = root.querySelector("#reset-btn");
  if (resetBtn) {
    resetBtn.onclick = () => {
      if (confirm("Reset semua antrian? Semua data akan dihapus.")) {
        resetState();
      }
    };
  }

  setTimeout(() => {
    const first = root.querySelector(".pool-input");
    if (first && !document.querySelector(":focus")) first.focus();
  }, 50);
}

function wirePoolInput(root, inputSel, btnSel, poolKey) {
  const input = root.querySelector(inputSel);
  const btn = root.querySelector(btnSel);
  if (!input || !btn) return;
  const doAdd = () => {
    if (autoAdd(poolKey, input.value)) { input.value = ""; input.focus(); }
  };
  btn.onclick = doAdd;
  input.onkeydown = (e) => { if (e.key === "Enter") doAdd(); };
}
