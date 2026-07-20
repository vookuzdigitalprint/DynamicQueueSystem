const ACCOUNTS = [
  { user: "admin", pass: "admin123", role: "admin", designerId: null, label: "Admin" },
  { user: "designer1", pass: "d1", role: "designer", designerId: "designer_1", label: "Operator 1" },
  { user: "designer2", pass: "d2", role: "designer", designerId: "designer_2", label: "Operator 2" },
  { user: "designer3", pass: "d3", role: "designer", designerId: "designer_3", label: "Operator 3" },
  { user: "designer4", pass: "d4", role: "designer", designerId: "designer_4", label: "Operator 4" },
  { user: "designer5", pass: "d5", role: "designer", designerId: "designer_5", label: "Operator 5" },
  { user: "owner", pass: "owner123", role: "owner", designerId: null, label: "Owner" },
  { user: "tv", pass: "tv123", role: "tv", designerId: null, label: "TV Display" },
];

const KEY = "vookuz_session";

export function login(user, pass) {
  const acc = ACCOUNTS.find((a) => a.user === user && a.pass === pass);
  if (!acc) return null;
  const sess = { user: acc.user, role: acc.role, designerId: acc.designerId, label: acc.label };
  localStorage.setItem(KEY, JSON.stringify(sess));
  return sess;
}

export function logout() {
  localStorage.removeItem(KEY);
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}
