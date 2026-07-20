import { DESIGNERS } from "../js/constants.js";
import { getState, designerCount } from "../js/store.js";

let view = "tv";

export function renderOwner(root, sess) {
  const nav = `
    <div class="owner-nav">
      <button class="btn ghost ${view === "tv" ? "active" : ""}" data-v="tv">Layar TV</button>
      <button class="btn ghost ${view === "admin" ? "active" : ""}" data-v="admin">Dashboard Admin</button>
      ${DESIGNERS.map((d) => `<button class="btn ghost ${view === d.id ? "active" : ""}" data-v="${d.id}">${d.name}</button>`).join("")}
    </div>`;

  root.innerHTML = `<div class="owner-wrap"><div class="page-head"><h2 class="page-title">Owner Monitor</h2><div class="readonly-badge">READ ONLY &mdash; hanya pantau</div></div>${nav}${body()}</div>`;
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
      st.current_processing == null ? `<div class="tv-empty">KOSONG</div>` :
      `<div class="tv-num">${st.current_processing}</div>`;
    return `<div class="tv-card ${st.status === "INACTIVE" ? "inactive" : ""}"><div class="tv-name">${d.name}</div><div class="tv-body">${body}</div></div>`;
  }).join("");
  return `<div class="tv-grid static">${cards}</div>`;
}

function adminView(s) {
  const cols = [
    ...DESIGNERS.map((d) => {
      const st = s.designers[d.id];
      const processing = st.current_processing != null ? `<div class="qnum processing">${st.current_processing}</div>` : "";
      const queue = (st.queue || []).map((n) => `<div class="qnum">${n}</div>`).join("");
      return `<div class="dcol ${st.status === "INACTIVE" ? "inactive" : ""}"><div class="dcol-title">${d.name}</div><div class="dcol-meta"><span class="status ${st.status === "ACTIVE" ? "on" : "off"}">${st.status === "INACTIVE" ? "CUTI" : "AKTIF"}</span><span>${designerCount(d.id)}/5</span></div><div class="dcol-list">${processing}${queue || '<span class="empty">kosong</span>'}</div></div>`;
    }),
    `<div class="dcol pool"><div class="dcol-title">POOL TUNGGU</div><div class="dcol-meta">${(s.waiting_pool || []).length} nomor</div><div class="dcol-list">${(s.waiting_pool || []).map((n) => `<div class="qnum">${n}</div>`).join("") || '<span class="empty">kosong</span>'}</div></div>`,
  ].join("");
  return `<div class="admin-grid static">${cols}</div>`;
}

function designerView(s, id) {
  const d = s.designers[id];
  const processing = d.current_processing != null ? `<div class="qnum processing big">${d.current_processing}</div>` : "";
  const queue = (d.queue || []).map((n) => `<div class="qnum">${n}</div>`).join("");
  return `<div class="d-single"><div class="dcol ${d.status === "INACTIVE" ? "inactive" : ""}"><div class="dcol-title">${d.name}</div><div class="dcol-meta"><span class="status ${d.status === "ACTIVE" ? "on" : "off"}">${d.status === "INACTIVE" ? "CUTI" : "AKTIF"}</span><span>${designerCount(id)}/5</span></div><div class="dcol-list tall">${processing}${queue || '<span class="empty">kosong</span>'}</div></div></div>`;
}

function wire(root) {
  root.querySelectorAll(".owner-nav button").forEach(
    (b) => (b.onclick = () => { view = b.dataset.v; renderOwner(root); })
  );
}
