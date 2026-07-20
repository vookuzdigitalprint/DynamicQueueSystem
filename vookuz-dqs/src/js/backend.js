export const backend = {
  mode: "mock",
  db: null,
  auth: null,
  fb: null,
};

export function isFirebase() {
  return backend.mode === "firebase";
}
