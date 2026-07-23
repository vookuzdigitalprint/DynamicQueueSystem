let permitted = false;

export function requestNotifyPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") permitted = true;
  else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((p) => { permitted = p === "granted"; });
  }
}

export function showNotification(title, body) {
  if (!permitted && Notification.permission === "granted") permitted = true;
  if (!permitted) return;
  try {
    playChime();
    const n = new Notification(title, { body, icon: "/favicon.ico" });
    setTimeout(() => n.close(), 3000);
  } catch (e) { /* ignore */ }
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, now);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) { /* ignore */ }
}
