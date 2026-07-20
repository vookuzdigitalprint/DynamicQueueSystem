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

export function createInitialState() {
  return {
    shop_status: {
      current_date: new Date().toISOString().slice(0, 10),
      global_limit_per_designer: GLOBAL_LIMIT_PER_DESIGNER,
    },
    waiting_pool: [15, 16, 22],
    designers: {
      designer_1: { name: "Operator 1", status: "ACTIVE", current_processing: 4, queue: [7, 15] },
      designer_2: { name: "Operator 2", status: "INACTIVE", current_processing: null, queue: [] },
      designer_3: { name: "Operator 3", status: "ACTIVE", current_processing: 50, queue: [12, 18, 19] },
      designer_4: { name: "Operator 4", status: "ACTIVE", current_processing: null, queue: [] },
      designer_5: { name: "Operator 5", status: "ACTIVE", current_processing: null, queue: [] },
    },
    broadcast_trigger: null,
  };
}
