import { GLOBAL_LIMIT_PER_DESIGNER } from "./constants.js";
import { getState, setState, designerCount, waDesignerCount } from "./store.js";

// Item format: {v: number|string, p: "design"|"cetak", w?: true}
function isWA(item) { return item && item.w === true; }
function val(item) { return item && item.v; }
function poolOf(item) { return item && item.p; }

// Check if a value exists in an array of items
function hasItem(arr, v) { return arr && arr.some((x) => x.v === v); }

// Filter items by value, return new array
function without(arr, v) { return (arr || []).filter((x) => x.v !== v); }

// Helper: assign item to designer's appropriate queue
function assignItem(s, designerId, item) {
  const d = s.designers[designerId];
  if (d.status !== "ACTIVE") return null;
  if (isWA(item)) {
    if (waDesignerCount(designerId) >= GLOBAL_LIMIT_PER_DESIGNER) return null;
    if (hasItem(d.wa_queue, item.v) || d.wa_processing === item.v) return null;
    let wa_processing = d.wa_processing;
    let wa_queue = [...(d.wa_queue || [])];
    if (wa_processing == null) wa_processing = item;
    else wa_queue.push(item);
    return { ...d, wa_queue, wa_processing };
  } else {
    if (designerCount(designerId) >= GLOBAL_LIMIT_PER_DESIGNER) return null;
    if (hasItem(d.queue, item.v) || (d.current_processing && d.current_processing.v === item.v)) return null;
    let current_processing = d.current_processing;
    let queue = [...(d.queue || [])];
    if (current_processing == null) current_processing = item;
    else queue.push(item);
    return { ...d, queue, current_processing };
  }
}

// ========== POOL ADD ==========

export function addToDesignPool(number) {
  const n = Number(number);
  if (!Number.isInteger(n) || n < 1 || n > 100) return false;
  setState((s) => {
    if (hasItem(s.design_pool, n)) return s;
    return { ...s, design_pool: [...(s.design_pool || []), { v: n, p: "design" }] };
  });
  return true;
}

export function addToCetakPool(number) {
  const n = Number(number);
  if (!Number.isInteger(n) || n < 1 || n > 100) return false;
  setState((s) => {
    if (hasItem(s.cetak_pool, n)) return s;
    return { ...s, cetak_pool: [...(s.cetak_pool || []), { v: n, p: "cetak" }] };
  });
  return true;
}

export function addWAtoDesignPool(wa) {
  const raw = String(wa).replace(/\D/g, "");
  if (raw.length < 1 || raw.length > 4) return false;
  const padded = raw.padStart(4, "0");
  setState((s) => {
    if (hasItem(s.design_pool, padded)) return s;
    return { ...s, design_pool: [...(s.design_pool || []), { v: padded, p: "design", w: true }] };
  });
  return true;
}

export function addWAtoCetakPool(wa) {
  const raw = String(wa).replace(/\D/g, "");
  if (raw.length < 1 || raw.length > 4) return false;
  const padded = raw.padStart(4, "0");
  setState((s) => {
    if (hasItem(s.cetak_pool, padded)) return s;
    return { ...s, cetak_pool: [...(s.cetak_pool || []), { v: padded, p: "cetak", w: true }] };
  });
  return true;
}

// ========== MOVE FROM POOL TO DESIGNER ==========

export function moveToDesigner(itemVal, designerId, poolKey = "design_pool") {
  const pk = poolKey === "cetak_pool" ? "cetak_pool" : "design_pool";
  setState((s) => {
    const d = s.designers[designerId];
    if (d.status !== "ACTIVE") return s;
    const src = s[pk] || [];
    const item = src.find((x) => x.v === itemVal);
    if (!item) return s;
    const remaining = src.filter((x) => x.v !== itemVal);
    const updated = assignItem(s, designerId, item);
    if (!updated) return s;
    let broadcast_trigger = s.broadcast_trigger;
    if (!isWA(item)) {
      broadcast_trigger = { queue_number: item.v, designer_name: d.name, timestamp: Date.now() };
    }
    return { ...s, [pk]: remaining, designers: { ...s.designers, [designerId]: updated }, broadcast_trigger };
  });
}

// ========== MOVE BETWEEN DESIGNERS (design queue) ==========

export function moveBetweenDesigners(itemVal, fromId, toId) {
  setState((s) => {
    const from = s.designers[fromId];
    const to = s.designers[toId];
    if (to.status !== "ACTIVE") return s;
    if (designerCount(toId) >= GLOBAL_LIMIT_PER_DESIGNER) return s;
    const item = (from.queue || []).find((x) => x.v === itemVal) || from.current_processing;
    if (!item) return s;
    if (hasItem(to.queue, itemVal) || (to.current_processing && to.current_processing.v === itemVal)) return s;
    const fromQueue = without(from.queue, itemVal);
    const fromProcessing = from.current_processing && from.current_processing.v === itemVal ? null : from.current_processing;
    let current_processing = to.current_processing;
    let toQueue = [...(to.queue || [])];
    let broadcast_trigger = s.broadcast_trigger;
    if (current_processing == null) {
      current_processing = item;
      broadcast_trigger = { queue_number: item.v, designer_name: to.name, timestamp: Date.now() };
    } else {
      toQueue.push(item);
    }
    return { ...s, designers: { ...s.designers, [fromId]: { ...from, queue: fromQueue, current_processing: fromProcessing }, [toId]: { ...to, queue: toQueue, current_processing } }, broadcast_trigger };
  });
}

// ========== TOGGLE DESIGNER ==========

export function toggleDesigner(designerId) {
  setState((s) => {
    const d = s.designers[designerId];
    const nextStatus = d.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    let design_pool = s.design_pool || [];
    if (nextStatus === "INACTIVE") {
      const returned = [...(d.queue || [])];
      if (d.current_processing) returned.push(d.current_processing);
      design_pool = [...(s.design_pool || []), ...returned];
      return { ...s, design_pool, designers: { ...s.designers, [designerId]: { ...d, status: "INACTIVE", current_processing: null, queue: [], wa_processing: null, wa_queue: [] } } };
    }
    return { ...s, designers: { ...s.designers, [designerId]: { ...d, status: "ACTIVE" } } };
  });
}

// ========== DESIGN QUEUE ACTIONS ==========

export function callNumber(designerId) {
  setState((s) => {
    const d = s.designers[designerId];
    if (d.status !== "ACTIVE") return s;
    let processing = d.current_processing;
    let queue = [...(d.queue || [])];
    if (processing == null) {
      if (queue.length === 0) return s;
      processing = queue.shift();
    }
    return { ...s, designers: { ...s.designers, [designerId]: { ...d, current_processing: processing, queue } }, broadcast_trigger: { queue_number: processing.v, designer_name: d.name, timestamp: Date.now() } };
  });
}

export function skipNumber(designerId) {
  setState((s) => {
    const d = s.designers[designerId];
    if (!d.current_processing) return s;
    const skipped = d.current_processing;
    const queue = [...(d.queue || [])];
    queue.splice(1, 0, skipped);
    const next = queue.shift();
    return { ...s, designers: { ...s.designers, [designerId]: { ...d, current_processing: next, queue } }, broadcast_trigger: { queue_number: next.v, designer_name: d.name, timestamp: Date.now() } };
  });
}

export function finishNumber(designerId) {
  setState((s) => {
    const d = s.designers[designerId];
    if (!d.current_processing) return s;
    const [next, ...rest] = (d.queue || []);
    const designers = { ...s.designers, [designerId]: { ...d, current_processing: next ?? null, queue: next == null ? [] : rest } };
    if (next) return { ...s, designers, broadcast_trigger: { queue_number: next.v, designer_name: d.name, timestamp: Date.now() } };
    return { ...s, designers };
  });
}

export function requestFromPool(designerId) {
  setState((s) => {
    const d = s.designers[designerId];
    if (d.status !== "ACTIVE") return s;
    if ((d.queue || []).length || d.current_processing || d.wa_queue.length || d.wa_processing) return s;
    if (!(s.design_pool || []).length) return s;
    const [first, ...rest] = s.design_pool || [];
    const updated = assignItem(s, designerId, first);
    if (!updated) return s;
    let bt = s.broadcast_trigger;
    if (!isWA(first)) bt = { queue_number: first.v, designer_name: d.name, timestamp: Date.now() };
    return { ...s, design_pool: rest, designers: { ...s.designers, [designerId]: updated }, broadcast_trigger: bt };
  });
}

export function requestFromCetak(designerId) {
  setState((s) => {
    const d = s.designers[designerId];
    if (d.status !== "ACTIVE") return s;
    if ((d.queue || []).length || d.current_processing || d.wa_queue.length || d.wa_processing) return s;
    if (!(s.cetak_pool || []).length) return s;
    const [first, ...rest] = s.cetak_pool || [];
    const updated = assignItem(s, designerId, first);
    if (!updated) return s;
    let bt = s.broadcast_trigger;
    if (!isWA(first)) bt = { queue_number: first.v, designer_name: d.name, timestamp: Date.now() };
    return { ...s, cetak_pool: rest, designers: { ...s.designers, [designerId]: updated }, broadcast_trigger: bt };
  });
}

export function selfAdd(designerId, number) {
  const n = Number(number);
  if (!Number.isInteger(n) || n < 1 || n > 100) return false;
  setState((s) => {
    const d = s.designers[designerId];
    if (d.status !== "ACTIVE") return s;
    if (designerCount(designerId) >= GLOBAL_LIMIT_PER_DESIGNER) return s;
    if (hasItem(d.queue, n) || (d.current_processing && d.current_processing.v === n)) return s;
    const item = { v: n, p: "design" };
    let current_processing = d.current_processing;
    let queue = [...(d.queue || [])];
    if (current_processing == null) current_processing = item;
    else queue.push(item);
    return { ...s, designers: { ...s.designers, [designerId]: { ...d, queue, current_processing } } };
  });
  return true;
}

// ========== RETURN TO POOL ==========

export function returnToPool(itemVal, fromId, poolKey = "design_pool") {
  const pk = poolKey === "cetak_pool" ? "cetak_pool" : "design_pool";
  setState((s) => {
    const from = s.designers[fromId];
    const item = (from.queue || []).find((x) => x.v === itemVal) || (from.current_processing && from.current_processing.v === itemVal ? from.current_processing : null);
    if (!item) return s;
    if (hasItem(s[pk], itemVal)) return s;
    const fromQueue = without(from.queue, itemVal);
    const fromProcessing = from.current_processing && from.current_processing.v === itemVal ? null : from.current_processing;
    return { ...s, [pk]: [...(s[pk] || []), item], designers: { ...s.designers, [fromId]: { ...from, queue: fromQueue, current_processing: fromProcessing } } };
  });
}

export function returnToCetak(itemVal, fromId) {
  return returnToPool(itemVal, fromId, "cetak_pool");
}

// ========== WA RETURN TO POOL ==========

export function returnWAToPool(waVal, fromId, poolKey = "design_pool") {
  const pk = poolKey === "cetak_pool" ? "cetak_pool" : "design_pool";
  setState((s) => {
    const from = s.designers[fromId];
    const item = (from.wa_queue || []).find((x) => x.v === waVal) || (from.wa_processing && from.wa_processing.v === waVal ? from.wa_processing : null);
    if (!item) return s;
    if (hasItem(s[pk], waVal)) return s;
    const fromQueue = (from.wa_queue || []).filter((x) => x.v !== waVal);
    const fromProcessing = from.wa_processing && from.wa_processing.v === waVal ? null : from.wa_processing;
    return { ...s, [pk]: [...(s[pk] || []), item], designers: { ...s.designers, [fromId]: { ...from, wa_queue: fromQueue, wa_processing: fromProcessing } } };
  });
}

export function returnWAToCetak(waVal, fromId) {
  return returnWAToPool(waVal, fromId, "cetak_pool");
}

// ========== DELETE ==========

export function deleteNumber(itemVal, fromId) {
  setState((s) => {
    if (fromId === "design_pool" || fromId === "cetak_pool") {
      return { ...s, [fromId]: (s[fromId] || []).filter((x) => x.v !== itemVal) };
    }
    if (fromId === "waiting" || fromId === "pool") {
      return { ...s, design_pool: (s.design_pool || []).filter((x) => x.v !== itemVal) };
    }
    const d = s.designers[fromId];
    if (!d) return s;
    const q = without(d.queue, itemVal);
    const p = d.current_processing && d.current_processing.v === itemVal ? null : d.current_processing;
    if (q.length !== (d.queue || []).length || p !== d.current_processing) {
      return { ...s, designers: { ...s.designers, [fromId]: { ...d, queue: q, current_processing: p } } };
    }
    const wq = (d.wa_queue || []).filter((x) => x.v !== itemVal);
    const wp = d.wa_processing && d.wa_processing.v === itemVal ? null : d.wa_processing;
    return { ...s, designers: { ...s.designers, [fromId]: { ...d, wa_queue: wq, wa_processing: wp } } };
  });
}

// ========== WA DIRECT ADD ==========

export function addWA(designerId, waNumber) {
  const raw = String(waNumber).replace(/\D/g, "");
  if (raw.length < 1 || raw.length > 4) return false;
  const padded = raw.padStart(4, "0");
  setState((s) => {
    const d = s.designers[designerId];
    if (d.status !== "ACTIVE") return s;
    if (hasItem(d.wa_queue, padded) || (d.wa_processing && d.wa_processing.v === padded)) return s;
    const item = { v: padded, p: "design", w: true };
    let wa_processing = d.wa_processing;
    let wa_queue = [...(d.wa_queue || [])];
    if (wa_processing == null) wa_processing = item;
    else wa_queue.push(item);
    return { ...s, designers: { ...s.designers, [designerId]: { ...d, wa_queue, wa_processing } } };
  });
  return true;
}

// ========== WA QUEUE ACTIONS ==========

export function callWA(designerId) {
  setState((s) => {
    const d = s.designers[designerId];
    if (d.status !== "ACTIVE") return s;
    let processing = d.wa_processing;
    let wa_queue = [...(d.wa_queue || [])];
    if (processing == null) {
      if (wa_queue.length === 0) return s;
      processing = wa_queue.shift();
    }
    return { ...s, designers: { ...s.designers, [designerId]: { ...d, wa_processing: processing, wa_queue } } };
  });
}

export function skipWA(designerId) {
  setState((s) => {
    const d = s.designers[designerId];
    if (!d.wa_processing) return s;
    const skipped = d.wa_processing;
    const queue = [...(d.wa_queue || [])];
    queue.splice(1, 0, skipped);
    const next = queue.shift();
    return { ...s, designers: { ...s.designers, [designerId]: { ...d, wa_processing: next, wa_queue: queue } } };
  });
}

export function deleteWAItem(designerId, itemVal) {
  setState((s) => {
    const d = s.designers[designerId];
    const queue = (d.wa_queue || []).filter((x) => x.v !== itemVal);
    const processing = d.wa_processing && d.wa_processing.v === itemVal ? null : d.wa_processing;
    return { ...s, designers: { ...s.designers, [designerId]: { ...d, wa_queue: queue, wa_processing: processing } } };
  });
}

export function finishWA(designerId) {
  setState((s) => {
    const d = s.designers[designerId];
    if (!d.wa_processing) return s;
    const [next, ...rest] = (d.wa_queue || []);
    return { ...s, designers: { ...s.designers, [designerId]: { ...d, wa_processing: next ?? null, wa_queue: next == null ? [] : rest } } };
  });
}

export function moveWABetweenDesigners(itemVal, fromId, toId) {
  setState((s) => {
    const from = s.designers[fromId];
    const to = s.designers[toId];
    if (to.status !== "ACTIVE") return s;
    const item = (from.wa_queue || []).find((x) => x.v === itemVal) || (from.wa_processing && from.wa_processing.v === itemVal ? from.wa_processing : null);
    if (!item) return s;
    if (hasItem(to.wa_queue, itemVal) || (to.wa_processing && to.wa_processing.v === itemVal)) return s;
    const fromQueue = (from.wa_queue || []).filter((x) => x.v !== itemVal);
    const fromProcessing = from.wa_processing && from.wa_processing.v === itemVal ? null : from.wa_processing;
    let wa_processing = to.wa_processing;
    let toQueue = [...(to.wa_queue || [])];
    if (wa_processing == null) wa_processing = item;
    else toQueue.push(item);
    return { ...s, designers: { ...s.designers, [fromId]: { ...from, wa_queue: fromQueue, wa_processing: fromProcessing }, [toId]: { ...to, wa_queue: toQueue, wa_processing } } };
  });
}
