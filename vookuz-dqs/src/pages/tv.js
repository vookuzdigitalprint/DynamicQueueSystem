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
    let body;
    if (st.status === "INACTIVE") body = `<div class="tv-off">TUTUP</div>`;
    else if (st.current_processing == null) body = `<div class="tv-empty">KOSONG</div>`;
    else body = `<div class="tv-num">${st.current_processing}</div>`;
    return `<div class="tv-card ${st.status === "INACTIVE" ? "inactive" : ""}">
      <div class="tv-name">${d.name}</div>
      <div class="tv-body">${body}</div>
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
