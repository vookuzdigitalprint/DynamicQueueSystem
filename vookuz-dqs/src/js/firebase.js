import { backend } from "./backend.js";
import { createInitialState } from "./constants.js";

export const firebaseConfig = {
  apiKey: "AIzaSyBqO1T2qpCzsWWDbiX8xHQ1AD9hD-XCQl0",
  authDomain: "vookuzdqs.firebaseapp.com",
  databaseURL: "https://vookuzdqs-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "vookuzdqs",
  storageBucket: "vookuzdqs.firebasestorage.app",
  messagingSenderId: "586655135556",
  appId: "1:586655135556:web:2c2aed270797662a64c911",
  measurementId: "G-9W8VCSWJC2",
};

function url(path = "/") {
  const clean = path === "/" ? "/" : path;
  const base = "https://vookuzdqs-default-rtdb.asia-southeast1.firebasedatabase.app";
  return `${base}${clean}.json`;
}

let evtSource = null;

export async function connectFirebase() {
  try {
    const ok = await ensureSeed();
    if (ok) {
      backend.mode = "firebase";
      backend.db = { url };
    }
    return ok ? { db: backend.db } : null;
  } catch (e) {
    console.warn("Firebase REST gagal:", e);
    backend.mode = "mock";
    return null;
  }
}

export function getDb() {
  return backend.db;
}

export async function ensureSeed() {
  try {
    const res = await fetch(url("/"), { method: "GET" });
    if (!res.ok) return false;
    const data = await res.json();
    if (data === null || data === undefined) {
      await fetch(url("/"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createInitialState()),
      });
    }
    return true;
  } catch (e) {
    console.warn("ensureSeed gagal:", e);
    return false;
  }
}

export async function readAll() {
  const res = await fetch(url("/"), { method: "GET" });
  if (!res.ok) return null;
  return await res.json();
}

export async function writeAll(state) {
  await fetch(url("/"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
}

let pollTimer = null;
export function listenAll(onData) {
  if (pollTimer) clearInterval(pollTimer);
  const tick = async () => {
    try {
      const data = await readAll();
      if (data) onData(data);
    } catch (e) { /* ignore */ }
  };
  tick();
  pollTimer = setInterval(tick, 600);
  return { close: () => clearInterval(pollTimer) };
}

export function isFirebase() {
  return backend.mode === "firebase";
}
