import { subscribe, getState, initStore } from "./store.js";
import { getSession, logout } from "./auth.js";
import { isFirebase } from "./backend.js";
import { renderLogin } from "../pages/login.js";
import { mountAdmin, paintAdmin } from "../pages/admin.js";
import { renderDesigner } from "../pages/designer.js";
import { renderTV } from "../pages/tv.js";
import { renderOwner } from "../pages/owner.js";

const root = document.getElementById("app-root");
const header = document.getElementById("app-header");
const footer = document.getElementById("app-footer");

if (localStorage.getItem("vookuz_theme") === "dark") {
  document.body.classList.add("dark");
}

function render() {
  const sess = getSession();

  if (!sess) {
    header.style.display = "none";
    footer.style.display = "none";
    renderLogin(root, afterLogin);
    return;
  }

  header.style.display = "flex";
  footer.style.display = "block";
  renderHeader(sess);

  if (sess.role === "tv") {
    document.body.classList.add("tv-mode");
    setupTvHeader(header, footer);
  } else {
    document.body.classList.remove("tv-mode");
  }

  if (sess.role === "admin") mountAdmin(root, sess);
  else if (sess.role === "designer") renderDesigner(root, sess);
  else if (sess.role === "tv") renderTV(root);
  else if (sess.role === "owner") renderOwner(root, sess);
}

function renderHeader(sess) {
  const right =
    sess.role === "owner"
      ? `<span class="who" id="who-label">${sess.label} · READ ONLY</span>`
      : `<span class="who" id="who-label">${sess.label}</span>`;
  const isDark = document.body.classList.contains("dark");
  header.innerHTML = `
    <div class="brand"><span class="dot"></span>VOOKUZ <span>DQS</span></div>
    <div class="head-search"><input type="text" id="search-num" placeholder="Cari nomor..." spellcheck="false" /></div>
    <div class="head-right">
      <button id="fs-btn" class="btn ghost" style="margin-right:8px;" title="Layar Penuh">⛶</button>
      ${right}
      ${isFirebase() ? '<span class="mode-tag">LIVE</span>' : '<span class="mode-tag">OFFLINE</span>'}
      <button class="theme-toggle" id="theme" title="Ganti tema">
        ${isDark ? sunSvg() : moonSvg()}
      </button>
      <button class="btn ghost" id="logout">Keluar</button>
    </div>
  `;

  // Attach Fullscreen event listener
  const fsBtn = header.querySelector("#fs-btn");
  if (fsBtn) {
    fsBtn.onclick = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
          if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock("landscape").catch(e => console.log("Orientation lock failed:", e));
          }
        }).catch(e => console.warn(e));
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    };
  }
  header.querySelector("#logout").onclick = async () => {
    await logout();
    render();
  };
  header.querySelector("#theme").onclick = () => {
    const dark = document.body.classList.toggle("dark");
    localStorage.setItem("vookuz_theme", dark ? "dark" : "light");
    render();
  };
  wireSearch();
}

// Search
let searchValue = "";
let searchTimer = null;

function wireSearch() {
  const input = document.getElementById("search-num");
  if (!input) return;
  input.value = searchValue;
  input.oninput = () => {
    searchValue = input.value.trim();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => paint(), 200);
  };
}

function applySearch() {
  document.querySelectorAll(".search-hit").forEach((el) => el.classList.remove("search-hit"));
  if (!searchValue) return;
  const s = getState();
  const q = searchValue;
  // Check operators
  for (const id in s.designers) {
    const d = s.designers[id];
    const found =
      (d.current_processing && String(d.current_processing.v) === q) ||
      (d.queue || []).some((x) => String(x.v) === q) ||
      (d.wa_processing && String(d.wa_processing.v) === q) ||
      (d.wa_queue || []).some((x) => String(x.v) === q);
    if (found) {
      const col = document.querySelector(`#col-${id}`) || document.querySelector(`[data-col="${id}"]`);
      if (col) col.classList.add("search-hit");
    }
  }
  // Check pools
  const inDesign = (s.design_pool || []).some((x) => String(x.v) === q);
  const inCetak = (s.cetak_pool || []).some((x) => String(x.v) === q);
  if (inDesign) {
    const el = document.querySelector("#pool-col-design_pool");
    if (el) el.classList.add("search-hit");
  }
  if (inCetak) {
    const el = document.querySelector("#pool-col-cetak_pool");
    if (el) el.classList.add("search-hit");
  }
}

function moonSvg() {
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
}
function sunSvg() {
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
}

function afterLogin() {
  render();
}

let tvHideTimer = null;
function setupTvHeader(header, footer) {
  header.classList.add("tv-hidden");
  footer.classList.add("tv-hidden");
  const show = () => {
    header.classList.remove("tv-hidden");
    footer.classList.remove("tv-hidden");
    clearTimeout(tvHideTimer);
    tvHideTimer = setTimeout(() => {
      header.classList.add("tv-hidden");
      footer.classList.add("tv-hidden");
    }, 2500);
  };
  document.onmousemove = show;
  document.ontouchstart = show;
  show();
}

function paint() {
  const sess = getSession();
  if (!sess) return;
  
  // Update header badge dynamically
  const tag = document.querySelector(".mode-tag");
  if (tag) {
    if (isFirebase()) {
      tag.textContent = "LIVE";
      tag.style.background = "#28a745";
    } else {
      tag.textContent = "OFFLINE";
      tag.style.background = "#d6392e";
    }
  }

  if (sess.role === "admin") paintAdmin(root);
  else if (sess.role === "designer") renderDesigner(root, sess);
  else if (sess.role === "tv") renderTV(root);
  else if (sess.role === "owner") renderOwner(root, sess);
  requestAnimationFrame(() => applySearch());
}

subscribe(() => paint());

(async () => {
  render();
  initStore().catch((e) => console.warn("Firebase off, mode mock:", e));
})();
