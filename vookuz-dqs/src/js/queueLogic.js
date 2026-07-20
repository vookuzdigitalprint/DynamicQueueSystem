import { GLOBAL_LIMIT_PER_DESIGNER } from "./constants.js";
import { getState, setState, designerCount } from "./store.js";

export function addToWaitingPool(number) {
  const n = Number(number);
  if (!Number.isInteger(n) || n < 1 || n > 100) return false;
  setState((s) => {
    if ((s.waiting_pool || []).includes(n)) return s;
    return { ...s, waiting_pool: [...(s.waiting_pool || []), n] };
  });
  return true;
}

export function moveToDesigner(number, designerId) {
  setState((s) => {
    const d = s.designers[designerId];
    if (d.status !== "ACTIVE") return s;
    if (designerCount(designerId) >= GLOBAL_LIMIT_PER_DESIGNER) return s;
    if ((d.queue || []).includes(number) || d.current_processing === number) return s;
    const waiting = (s.waiting_pool || []).filter((x) => x !== number);
    const designers = {
      ...s.designers,
      [designerId]: { ...d, queue: [...(d.queue || []), number] },
    };
    return { ...s, waiting_pool: waiting, designers };
  });
}

export function moveBetweenDesigners(number, fromId, toId) {
  setState((s) => {
    const from = s.designers[fromId];
    const to = s.designers[toId];
    if (to.status !== "ACTIVE") return s;
    if (designerCount(toId) >= GLOBAL_LIMIT_PER_DESIGNER) return s;
    if ((to.queue || []).includes(number) || to.current_processing === number) return s;
    const fromQueue = (from.queue || []).filter((x) => x !== number);
    const fromProcessing = from.current_processing === number ? null : from.current_processing;
    const designers = {
      ...s.designers,
      [fromId]: { ...from, queue: fromQueue, current_processing: fromProcessing },
      [toId]: { ...to, queue: [...(to.queue || []), number] },
    };
    return { ...s, designers };
  });
}

export function toggleDesigner(designerId) {
  setState((s) => {
    const d = s.designers[designerId];
    const nextStatus = d.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    let waiting_pool = s.waiting_pool || [];
    if (nextStatus === "INACTIVE") {
      const returned = [...(d.queue || [])];
      if (d.current_processing != null) returned.push(d.current_processing);
      waiting_pool = [...(s.waiting_pool || []), ...returned];
      return {
        ...s,
        waiting_pool,
        designers: { ...s.designers, [designerId]: { ...d, status: "INACTIVE", current_processing: null, queue: [] } },
      };
    }
    return { ...s, designers: { ...s.designers, [designerId]: { ...d, status: "ACTIVE" } } };
  });
}

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
    const designers = { ...s.designers, [designerId]: { ...d, current_processing: processing, queue } };
    const broadcast_trigger = { queue_number: processing, designer_name: d.name, timestamp: Date.now() };
    return { ...s, designers, broadcast_trigger };
  });
}

export function skipNumber(designerId) {
  setState((s) => {
    const d = s.designers[designerId];
    if (d.current_processing == null) return s;
    const skipped = d.current_processing;
    const queue = [...(d.queue || [])];
    queue.splice(1, 0, skipped);
    const next = queue.shift();
    const designers = { ...s.designers, [designerId]: { ...d, current_processing: next, queue } };
    const broadcast_trigger = { queue_number: next, designer_name: d.name, timestamp: Date.now() };
    return { ...s, designers, broadcast_trigger };
  });
}

export function finishNumber(designerId) {
  setState((s) => {
    const d = s.designers[designerId];
    if (d.current_processing == null) return s;
    const [next, ...rest] = (d.queue || []);
    const designers = { ...s.designers, [designerId]: { ...d, current_processing: next ?? null, queue: next == null ? [] : rest } };
    if (next != null) {
      const broadcast_trigger = { queue_number: next, designer_name: d.name, timestamp: Date.now() };
      return { ...s, designers, broadcast_trigger };
    }
    return { ...s, designers };
  });
}

export function requestFromPool(designerId) {
  setState((s) => {
    const d = s.designers[designerId];
    if (d.status !== "ACTIVE") return s;
    if ((d.queue || []).length || d.current_processing != null) return s;
    if (!(s.waiting_pool || []).length) return s;
    const [first, ...rest] = s.waiting_pool || [];
    const designers = { ...s.designers, [designerId]: { ...d, queue: [first] } };
    return { ...s, waiting_pool: rest, designers };
  });
}

export function selfAdd(designerId, number) {
  const n = Number(number);
  if (!Number.isInteger(n) || n < 1 || n > 100) return false;
  setState((s) => {
    const d = s.designers[designerId];
    if (d.status !== "ACTIVE") return s;
    if (designerCount(designerId) >= GLOBAL_LIMIT_PER_DESIGNER) return s;
    if ((d.queue || []).includes(n) || d.current_processing === n) return s;
    return { ...s, designers: { ...s.designers, [designerId]: { ...d, queue: [...(d.queue || []), n] } } };
  });
  return true;
}

export function returnToPool(number, fromId) {
  setState((s) => {
    const from = s.designers[fromId];
    if ((s.waiting_pool || []).includes(number)) return s;
    const fromQueue = (from.queue || []).filter((x) => x !== number);
    const fromProcessing = from.current_processing === number ? null : from.current_processing;
    const designers = {
      ...s.designers,
      [fromId]: { ...from, queue: fromQueue, current_processing: fromProcessing },
    };
    return { ...s, waiting_pool: [...(s.waiting_pool || []), number], designers };
  });
}
