import { DESIGNERS, TV_OVERLAY_MS } from "../js/constants.js";
import { getState } from "../js/store.js";

let lastBroadcast = null;
let audioQueue = [];
let speaking = false;
let overlayTimer = null;

export function renderTV(root) {
  const s = getState();

  const cards = DESIGNERS.map((d) => {
    const st = s.designers[d.id];
    let offlineBody;
    if (st.status === "INACTIVE") offlineBody = `<div class="tv-off">TUTUP</div>`;
    else if (st.current_processing == null) offlineBody = `<div class="tv-empty">KOSONG</div>`;
    else {
      const p = st.current_processing;
      const colorCls = p.p === "cetak" ? "cetak" : "design";
      offlineBody = `<div class="tv-num ${colorCls}">${p.v}</div>`;
    }
    let waBody;
    if (st.status === "INACTIVE") waBody = ``;
    else {
      const waAll = [];
      if (st.wa_processing) waAll.push(st.wa_processing);
      if (st.wa_queue) waAll.push(...st.wa_queue);
      if (waAll.length === 0) waBody = `<div class="tv-wa-empty">—</div>`;
      else waBody = `<div class="tv-wa-grid">${waAll.map((n) => `<span class="tv-wa-box${n.p === "cetak" ? " cetak" : " design"}">${n.v}</span>`).join("")}</div>`;
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

  root.innerHTML = `
    <div class="tv-header">WELCOME TO VOOKUZ</div>
    <div class="tv-grid">${cards}</div>
    <div class="tv-overlay hidden" id="tv-overlay"></div>
  `;

  handleBroadcast(s, root);
}

function handleBroadcast(s, root) {
  const b = s.broadcast_trigger;
  if (!b) return;

  // Ignore the initial stale broadcast on page load to prevent autoplay blocking deadlocks
  if (lastBroadcast == null) {
    lastBroadcast = b;
    return;
  }

  if (b.timestamp === lastBroadcast.timestamp) return;

  lastBroadcast = b;
  audioQueue.push(b);
  showOverlay(root, b);
  processAudio();
}

function showOverlay(root, b) {
  const ov = root.querySelector("#tv-overlay");
  if (!ov) return;
  ov.innerHTML = `NOMOR ANTRIAN ${b.queue_number}<br>MENUJU ${b.designer_name.toUpperCase()}`;
  ov.classList.remove("hidden");
  clearTimeout(overlayTimer);
  overlayTimer = setTimeout(() => ov.classList.add("hidden"), TV_OVERLAY_MS);
}

let currentUtterance = null;
let watchdogTimer = null;

function processAudio() {
  if (speaking || !audioQueue.length) return;
  const b = audioQueue.shift();
  speaking = true;
  const u = new SpeechSynthesisUtterance(
    `Nomor antrian ${terbilang(b.queue_number)}. Silakan menuju ke ${namaTerbilang(b.designer_name)}.`
  );
  
  window.currentUtterance = u;

  u.lang = "id-ID";
  
  const cleanup = () => {
    clearTimeout(watchdogTimer);
    speaking = false;
    processAudio();
  };

  u.onend = cleanup;
  u.onerror = (e) => { 
    console.warn("Audio error:", e);
    cleanup();
  };
  
  clearTimeout(watchdogTimer);
  watchdogTimer = setTimeout(() => {
    if (speaking) {
      window.speechSynthesis.cancel();
      cleanup();
    }
  }, 15000);

  window.speechSynthesis.speak(u);
}

function terbilang(n) {
  const m = ["nol","satu","dua","tiga","empat","lima","enam","tujuh","delapan","sembilan"];
  return String(n).split("").map((d) => m[Number(d)]).join(" ");
}
function namaTerbilang(name) {
  const n = name.replace("Operator ", "");
  const m = ["nol","satu","dua","tiga","empat","lima","enam","tujuh","delapan","sembilan"];
  return `operator ${m[Number(n)]}`;
}
