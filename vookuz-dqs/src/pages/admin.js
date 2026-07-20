import { DESIGNERS, GLOBAL_LIMIT_PER_DESIGNER } from "../js/constants.js";
import { getState, designerCount } from "../js/store.js";
import {
  addToWaitingPool,
  moveToDesigner,
  moveBetweenDesigners,
  toggleDesigner,
  returnToPool,
} from "../js/queueLogic.js";

let dragData = null;
let mounted = false;

export function mountAdmin(root, sess) {
  if (!mounted) {
    mounted = true;
    root.innerHTML = `
      <div class="page-head">
        <h2 class="page-title">Dashboard Admin</h2>
        <span class="who" id="total-badge"></span>
      </div>
      <div class="admin-grid" id="admin-grid">
        ${DESIGNERS.map((d) => `
          <div class="dcol" id="col-${d.id}" data-col="${d.id}">
            <div class="dcol-title">${d.name}</div>
            <div class="dcol-meta">
              <span class="status" id="st-${d.id}"></span>
              <span class="cnt" id="cnt-${d.id}"></span>
              <button class="btn ghost toggle" data-toggle="${d.id}"></button>
            </div>
            <div class="dcol-list" data-drop="${d.id}"></div>
          </div>
        `).join("")}
        <div class="dcol pool" id="col-pool">
          <div class="dcol-title">POOL TUNGGU</div>
          <div class="pool-tools">
            <input id="new-num" type="text" autocomplete="off" spellcheck="false" placeholder="Cari No" />
            <button class="btn accent sm" id="add-btn">+</button>
          </div>
          <div class="dcol-list" data-drop="waiting" id="pool-list"></div>
        </div>
      </div>
    `;
    wire(root);
  }
  paintAdmin(root);
}

export function paintAdmin(root) {
  const s = getState();

  const badge = root.querySelector("#total-badge");
  if (badge) badge.textContent = `${(s.waiting_pool || []).length} di pool · total ${totalToday(s)} antrian`;

  DESIGNERS.forEach((d) => {
    const st = s.designers[d.id];
    const count = designerCount(d.id);
    const locked = st.status === "ACTIVE" && count >= GLOBAL_LIMIT_PER_DESIGNER;
    const col = root.querySelector(`#col-${d.id}`);
    col.className = "dcol" + (st.status === "INACTIVE" ? " inactive" : locked ? " locked" : "");
    const stEl = root.querySelector(`#st-${d.id}`);
    stEl.className = "status " + (st.status === "ACTIVE" ? "on" : "off");
    stEl.textContent = st.status === "INACTIVE" ? "CUTI" : locked ? "PENUH" : "AKTIF";
    root.querySelector(`#cnt-${d.id}`).textContent = `${count}/5`;
    const tg = col.querySelector(".toggle");
    tg.textContent = st.status === "ACTIVE" ? "Cuti" : "Aktif";
    renderList(col.querySelector(".dcol-list"), st.current_processing, st.queue, d.id);
  });

  const poolList = root.querySelector("#pool-list");
  renderList(poolList, null, s.waiting_pool || [], "waiting");
}

function renderList(el, processing, queue, from) {
  if (!el) return;
  const proc = processing != null
    ? `<div class="qnum processing" draggable="true" data-num="${processing}" data-from="${from}">${processing}</div>`
    : "";
  const items = (queue || [])
    .map((n) => `<div class="qnum" draggable="true" data-num="${n}" data-from="${from}">${n}</div>`)
    .join("");
  el.innerHTML = proc + (items || '<span class="empty">kosong</span>');
}

function totalToday(s) {
  let t = (s.waiting_pool || []).length;
  for (const id in s.designers) t += designerCount(id);
  return t;
}

function wire(root) {
  const input = root.querySelector("#new-num");
  const addBtn = root.querySelector("#add-btn");
  if (input && addBtn) {
    const resolveNum = (raw) => {
      const digits = String(raw).replace(/[^0-9]/g, "");
      if (!digits) return null;
      const target = parseInt(digits, 10);
      if (target < 1 || target > 100) return null;
      let best = target, bestDist = Infinity;
      for (let n = 1; n <= 100; n++) {
        const dd = Math.abs(n - target);
        if (dd < bestDist) { bestDist = dd; best = n; }
      }
      return best;
    };
    const doAdd = () => {
      const num = resolveNum(input.value);
      if (num != null && addToWaitingPool(num)) { input.value = ""; input.focus(); }
    };
    addBtn.onclick = doAdd;
    input.onkeydown = (e) => { if (e.key === "Enter") doAdd(); };
    setTimeout(() => input.focus(), 50);
  }

  const grid = root.querySelector("#admin-grid");
  grid.addEventListener("click", (e) => {
    const tg = e.target.closest(".toggle");
    if (tg) toggleDesigner(tg.dataset.toggle);
  });

  grid.addEventListener("dragstart", (e) => {
    const el = e.target.closest(".qnum");
    if (!el) return;
    dragData = { num: Number(el.dataset.num), from: el.dataset.from };
    el.classList.add("dragging");
  });
  grid.addEventListener("dragend", (e) => {
    const el = e.target.closest(".qnum");
    if (el) el.classList.remove("dragging");
  });
  grid.addEventListener("dragover", (e) => {
    if (e.target.closest(".dcol-list")) e.preventDefault();
  });
  grid.addEventListener("drop", (e) => {
    const zone = e.target.closest(".dcol-list");
    if (!zone || !dragData) return;
    e.preventDefault();
    const to = zone.dataset.drop;
    const { num, from } = dragData;
    if (from === "waiting" && to !== "waiting") moveToDesigner(num, to);
    else if (from !== "waiting" && to === "waiting") returnToPool(num, from);
    else if (from !== "waiting" && to !== "waiting" && from !== to)
      moveBetweenDesigners(num, from, to);
    dragData = null;
  });
}
