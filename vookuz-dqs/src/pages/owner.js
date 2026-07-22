import { DESIGNERS } from "../js/constants.js";
import { getState, designerCount, waDesignerCount } from "../js/store.js";

let view = "tv";

function itemClass(item) {
  if (!item) return "";
  const c = item.p === "cetak" ? " cetak-item" : " design-item";
  return item.w === true ? " wa" + c : c;
}

function renderItem(item, cls = "") {
  if (!item) return "";
  return `<div class="qnum${itemClass(item)}${cls}">${item.v}</div>`;
}

export function renderOwner(root, sess) {
  const nav = `
    <div class="owner-nav">
      <button class="btn ghost ${view === "tv" ? "active" : ""}" data-v="tv">Layar TV</button>
      <button class="btn ghost ${view === "admin" ? "active" : ""}" data-v="admin">Dashboard Admin</button>
      ${DESIGNERS.map((d) => `<button class="btn ghost ${view === d.id ? "active" : ""}" data-v="${d.id}">${d.name}</button>`).join("")}
    </div>`;

  root.innerHTML = `<div class="owner-wrap"><div class="page-head"><h2 class="page-title">Owner Monitor</h2><div class="readonly-badge">READ ONLY</div></div>${nav}${body()}</div>`;
  wire(root);
}

function body() {
  const s = getState();
  if (view === "tv") return tvView(s);
  if (view === "admin") return adminView(s);
  return designerView(s, view);
}

function tvView(s) {
  const cards = DESIGNERS.map((d) => {
    const st = s.designers[d.id];
    const body = st.status === "INACTIVE" ? `<div class="tv-off">TUTUP</div>` :
      !st.current_processing ? `<div class="tv-empty">KOSONG</div>` :
      `<div class="tv-num">${st.current_processing.v}</div>`;
    return `<div class="tv-card ${st.status === "INACTIVE" ? "inactive" : ""}"><div class="tv-name">${d.name}</div><div class="tv-body">${body}</div></div>`;
  }).join("");
  return `<div class="tv-grid static">${cards}</div>`;
}

function adminView(s) {
  const cols = [
    ...DESIGNERS.map((d) => {
      const st = s.designers[d.id];
      const processing = st.current_processing ? renderItem(st.current_processing, " processing") : "";
      const queue = (st.queue || []).map((n) => renderItem(n)).join("");
      const waAll = [];
      if (st.wa_processing) waAll.push(st.wa_processing);
      if (st.wa_queue) waAll.push(...st.wa_queue);
      const waItems = waAll.map((n) => renderItem(n)).join("");
      return `<div class="dcol ${st.status === "INACTIVE" ? "inactive" : ""}">
        <div class="dcol-title">${d.name}</div>
        <div class="dcol-meta"><span class="status ${st.status === "ACTIVE" ? "on" : "off"}">${st.status === "INACTIVE" ? "CUTI" : "AKTIF"}</span><span>${designerCount(d.id)}/5</span></div>
        <div class="dcol-list">${processing}${queue || '<span class="empty">kosong</span>'}</div>
        <div class="dcol-sub wa">WA</div>
        <div class="dcol-list wa">${waItems || '<span class="empty">kosong</span>'}</div>
      </div>`;
    }),
    `<div class="dcol"><div class="dcol-title">DESIGN <span class="pool-dot red"></span></div><div class="dcol-meta">${(s.design_pool || []).length} antrian</div><div class="dcol-list">${(s.design_pool || []).map((n) => renderItem(n)).join("") || '<span class="empty">kosong</span>'}</div></div>`,
    `<div class="dcol"><div class="dcol-title">CETAK <span class="pool-dot blue"></span></div><div class="dcol-meta">${(s.cetak_pool || []).length} antrian</div><div class="dcol-list">${(s.cetak_pool || []).map((n) => renderItem(n)).join("") || '<span class="empty">kosong</span>'}</div></div>`,
  ].join("");
  return `<div class="admin-grid static">${cols}</div>`;
}

function designerView(s, id) {
  const d = s.designers[id];
  const processing = d.current_processing ? renderItem(d.current_processing, " processing big") : "";
  const queue = (d.queue || []).map((n) => renderItem(n)).join("");
  const waAll = [];
  if (d.wa_processing) waAll.push(d.wa_processing);
  if (d.wa_queue) waAll.push(...d.wa_queue);
  const waItems = waAll.map((n) => renderItem(n)).join("");
  return `<div class="d-single-grid">
    <div class="dcol ${d.status === "INACTIVE" ? "inactive" : ""}">
      <div class="dcol-title">${d.name} — DESIGN</div>
      <div class="dcol-meta"><span class="status ${d.status === "ACTIVE" ? "on" : "off"}">${d.status === "INACTIVE" ? "CUTI" : "AKTIF"}</span><span>${designerCount(id)}/5</span></div>
      <div class="dcol-list tall">${processing}${queue || '<span class="empty">kosong</span>'}</div>
    </div>
    <div class="dcol wa-col ${d.status === "INACTIVE" ? "inactive" : ""}">
      <div class="dcol-title wa">${d.name} — WA</div>
      <div class="dcol-meta"><span class="status ${d.status === "ACTIVE" ? "on" : "off"}">${d.status === "INACTIVE" ? "CUTI" : "AKTIF"}</span><span>${waDesignerCount(id)} antrian</span></div>
      <div class="dcol-list tall">${waItems || '<span class="empty">kosong</span>'}</div>
    </div>
  </div>`;
}

function wire(root) {
  root.querySelectorAll(".owner-nav button").forEach(
    (b) => (b.onclick = () => { view = b.dataset.v; renderOwner(root); })
  );
}
