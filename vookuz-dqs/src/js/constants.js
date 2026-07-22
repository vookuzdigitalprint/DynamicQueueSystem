export const DESIGNERS = [
  { id: "designer_1", name: "Operator 1" },
  { id: "designer_2", name: "Operator 2" },
  { id: "designer_3", name: "Operator 3" },
  { id: "designer_4", name: "Operator 4" },
  { id: "designer_5", name: "Operator 5" },
];

export const GLOBAL_LIMIT_PER_DESIGNER = 5;

export const DESIGNER_STATUSES = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
};

export const TV_OVERLAY_MS = 7000;

export function createEmptyState() {
  return {
    shop_status: {
      current_date: new Date().toISOString().slice(0, 10),
      global_limit_per_designer: GLOBAL_LIMIT_PER_DESIGNER,
    },
    design_pool: [],
    cetak_pool: [],
    designers: {
      designer_1: { name: "Operator 1", status: "ACTIVE", current_processing: null, queue: [], wa_processing: null, wa_queue: [] },
      designer_2: { name: "Operator 2", status: "ACTIVE", current_processing: null, queue: [], wa_processing: null, wa_queue: [] },
      designer_3: { name: "Operator 3", status: "ACTIVE", current_processing: null, queue: [], wa_processing: null, wa_queue: [] },
      designer_4: { name: "Operator 4", status: "ACTIVE", current_processing: null, queue: [], wa_processing: null, wa_queue: [] },
      designer_5: { name: "Operator 5", status: "ACTIVE", current_processing: null, queue: [], wa_processing: null, wa_queue: [] },
    },
    broadcast_trigger: null,
  };
}

export function createInitialState() {
  return {
    shop_status: {
      current_date: new Date().toISOString().slice(0, 10),
      global_limit_per_designer: GLOBAL_LIMIT_PER_DESIGNER,
    },
    design_pool: [{v:15, p:"design"}, {v:16, p:"design"}, {v:22, p:"design"}, {v:"0123", p:"design", w:true}],
    cetak_pool: [{v:3, p:"cetak"}, {v:8, p:"cetak"}, {v:"0456", p:"cetak", w:true}],
    designers: {
      designer_1: { name: "Operator 1", status: "ACTIVE", current_processing: {v:4, p:"design"}, queue: [{v:7, p:"design"}, {v:15, p:"design"}], wa_processing: null, wa_queue: [] },
      designer_2: { name: "Operator 2", status: "INACTIVE", current_processing: null, queue: [], wa_processing: null, wa_queue: [] },
      designer_3: { name: "Operator 3", status: "ACTIVE", current_processing: {v:50, p:"design"}, queue: [{v:12, p:"design"}, {v:18, p:"design"}, {v:19, p:"design"}], wa_processing: null, wa_queue: [] },
      designer_4: { name: "Operator 4", status: "ACTIVE", current_processing: null, queue: [], wa_processing: null, wa_queue: [] },
      designer_5: { name: "Operator 5", status: "ACTIVE", current_processing: null, queue: [], wa_processing: null, wa_queue: [] },
    },
    broadcast_trigger: null,
  };
}
