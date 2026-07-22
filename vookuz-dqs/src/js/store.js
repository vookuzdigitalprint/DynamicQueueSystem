import { backend } from "./backend.js";
import {
  connectFirebase,
  readAll,
  writeAll,
  listenAll,
} from "./firebase.js";
import { createInitialState, createEmptyState } from "./constants.js";

const listeners = new Set();
let cache = createInitialState();
let ready = false;
let writeCount = 0;

export async function initStore() {
  await connectFirebase();
  if (backend.mode === "firebase") {
    const data = await readAll();
    if (data) {
      cache = data;
      ready = true;
      notify();
    }
    listenAll((val) => {
      if (writeCount > 0) return;
      if (JSON.stringify(cache) === JSON.stringify(val)) return;
      cache = val;
      notify();
    });
  } else {
    ready = true;
  }
}

export function getState() {
  return cache;
}

export function setState(updater) {
  const next = typeof updater === "function" ? updater(cache) : updater;
  cache = next;
  writeCount++;
  notify();
  persist(next);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn(cache));
}

async function persist(state) {
  if (backend.mode !== "firebase") return;
  try {
    await writeAll(state);
  } catch (e) {
    console.warn("Gagal tulis ke Firebase:", e);
  } finally {
    writeCount--;
  }
}

export function isReady() {
  return ready;
}

export function designerCount(designer) {
  const d = cache.designers[designer];
  return (d.queue?.length || 0) + (d.current_processing != null ? 1 : 0);
}

export function waDesignerCount(designer) {
  const d = cache.designers[designer];
  return (d.wa_queue?.length || 0) + (d.wa_processing != null ? 1 : 0);
}

export function resetState() {
  setState(createEmptyState());
}
