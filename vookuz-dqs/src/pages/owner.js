import { DESIGNERS } from "../js/constants.js";
import { getState, designerCount, waDesignerCount } from "../js/store.js";
import { toggleWACheck } from "../js/queueLogic.js";

let view = "tv";

function colorCls(item) {
  if (!item) return "";
  return item.p === "cetak" ? " cetak-item" : " design-item";
}

export function renderOwner(root, sess) {
  const nav = `
    <div class="owner-nav">
      <button class="btn ghost ${view === "tv" ? "active" : ""}" data-v="tv">Layar TV</button>
      <button class="btn ghost ${view === "admin" ? "active" : ""}" data-v="admin">Dashboard Admin</button>
      ${DESIGNERS.map((d) => `<button class="btn ghost ${view === d.id ? "active" : ""}" data-v="${d.id}">${d.name}</button>`).join("")}
    </div>`;

  root.innerHTML = `<div class="owner-wrap"><div class="page-head"><h2 class="page-title">Owner Monitor</h2><div class="readonly-badge">READ ONLY</div></div>${nav}${body(root)}</div>`;
  wire(root);
}

function body(root) {
  const s = getState();
  if (view === "tv") return tvView(s);
  if (view === "admin") return adminView(s);
  return designerView(s, view);
}

function tvView(s) {
  const cards = DESIGNERS.map((d) => {
    const st = s.designers[d.id];
    let offlineBody;
    if (st.status === "INACTIVE") offlineBody = `<div class="tv-off">TUTUP</div>`;
    else if (st.current_processing == null) offlineBody = `<div class="tv-empty">KOSONG</div>`;
    else {
      const p = st.current_processing;
      const c = p.p === "cetak" ? "cetak" : "design";
      offlineBody = `<div class="tv-num ${c}">${p.v}</div>`;
    }
    let waBody;
    if (st.status === "INACTIVE") waBody = ``;
    else {
      const waAll = [];
      if (st.wa_processing) waAll.push(st.wa_processing);
      if (st.wa_queue) waAll.push(...st.wa_queue);
      if (waAll.length === 0) waBody = `<div class="tv-wa-empty">—</div>`;
      else waBody = `<div class="tv-wa-grid">${waAll.map((n) => `<span class="tv-wa-box${n.p === "cetak" ? " cetak" : " design"}">${n.v}${n.name ? `<br><small>${n.name}</small>` : ""}</span>`).join("")}</div>`;
    }
    return `<div class="tv-card ${st.status === "INACTIVE" ? "inactive" : ""}">
      <div class="tv-name">${d.name}</div>
      <div class="tv-body">
        <div class="tv-section tv-section-offline">${offlineBody}</div>
        <div class="tv-section-divider"></div>
        <div class="tv-section tv-section-wa">${waBody}</div>
      </div>
    </div>`;
  }).join("");
  return `<div class="tv-grid">${cards}</div>`;
}

function adminView(s) {
  const cols = DESIGNERS.map((d) => {
    const st = s.designers[d.id];
    const count = designerCount(d.id);
    const locked = st.status === "ACTIVE" && count >= 5;
    const processing = st.current_processing
      ? `<div class="qnum processing ${st.current_processing.p === "cetak" ? "cetak-item" : "design-item"}">${st.current_processing.v}</div>`
      : "";
    const queue = (st.queue || []).map((n) => `<div class="qnum ${n.p === "cetak" ? "cetak-item" : "design-item"}">${n.v}</div>`).join("");
    const waAll = [];
    if (st.wa_processing) waAll.push(st.wa_processing);
    if (st.wa_queue) waAll.push(...st.wa_queue);
    const checked = s.wa_checked || [];
    const waItems = waAll.map((n) => {
      const chk = checked.some((t) => t.designerId === d.id && t.itemVal === n.v);
      return `<div class="qnum wa ${n.p === "cetak" ? "cetak-item" : "design-item"}${chk ? " wa-checked" : ""}">
        <span class="wa-cb" data-wa-cb="${n.v}" data-from="${d.id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${chk ? '<polyline points="20 6 9 17 4 12"/>' : '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>'}</svg></span>
        <span class="wa-num">${n.v}${n.name ? ` <span class="item-name">${n.name}</span>` : ""}</span>
      </div>`;
    }).join("");
    return `<div class="dcol-wrap${st.status === "INACTIVE" ? " inactive" : ""}">
      <div class="dcol-title">${d.name}</div>
      <div class="dcol-meta"><span class="status ${st.status === "ACTIVE" ? "on" : "off"}">${st.status === "INACTIVE" ? "CUTI" : locked ? "PENUH" : "AKTIF"}</span><span>${count}/5</span></div>
      <div class="dcol-list" data-q="design">${processing}${queue || '<span class="empty">kosong</span>'}</div>
      <div class="dcol-sub wa">WA</div>
      <div class="dcol-list wa" data-q="wa">${waItems || '<span class="empty">kosong</span>'}</div>
    </div>`;
  }).join("");
  const poolItem = (item) => `<div class="qnum${item.w ? " wa" : ""}${item.p === "cetak" ? " cetak-item" : " design-item"}">${item.v}${item.name ? ` <span class="item-name">${item.name}</span>` : ""}</div>`;
  return `<div class="admin-grid" id="owner-admin-grid">
    ${cols}
    <div class="dcol pool-col" id="pool-col-design_pool">
      <div class="dcol-title">DESIGN <span class="pool-dot red"></span></div>
      <div class="dcol-meta">${(s.design_pool || []).length} antrian</div>
      <div class="dcol-list">${(s.design_pool || []).map((n) => poolItem(n)).join("") || '<span class="empty">kosong</span>'}</div>
    </div>
    <div class="dcol pool-col" id="pool-col-cetak_pool">
      <div class="dcol-title">CETAK <span class="pool-dot blue"></span></div>
      <div class="dcol-meta">${(s.cetak_pool || []).length} antrian</div>
      <div class="dcol-list">${(s.cetak_pool || []).map((n) => poolItem(n)).join("") || '<span class="empty">kosong</span>'}</div>
    </div>
  </div>`;
}

function designerView(s, id) {
  const d = s.designers[id];
  const processing = d.current_processing
    ? `<div class="qnum processing big${d.current_processing.p === "cetak" ? " cetak-item" : " design-item"}">${d.current_processing.v}</div>`
    : "";
  const queue = (d.queue || []).map((n) => `<div class="qnum${n.p === "cetak" ? " cetak-item" : " design-item"}">${n.v}</div>`).join("");
  const waAll = [];
  if (d.wa_processing) waAll.push(d.wa_processing);
  if (d.wa_queue) waAll.push(...d.wa_queue);
  const chkList = s.wa_checked || [];
  const waItems = waAll.map((n) => {
    const chk = chkList.some((t) => t.designerId === id && t.itemVal === n.v);
    return `<div class="qnum wa${n.p === "cetak" ? " cetak-item" : " design-item"}${chk ? " wa-checked" : ""}">
      <span class="wa-cb" data-wa-cb="${n.v}" data-from="${id}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${chk ? '<polyline points="20 6 9 17 4 12"/>' : '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>'}</svg></span>
      <span class="wa-num">${n.v}${n.name ? ` <span class="item-name">${n.name}</span>` : ""}</span>
    </div>`;
  }).join("");
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
  root.querySelectorAll(".wa-cb").forEach((el) => {
    el.onclick = (e) => { e.stopPropagation(); toggleWACheck(el.dataset.from || el.closest("[data-col]")?.dataset.col, el.dataset.waCb); };
  });
}
