import { login } from "../js/auth.js";

export function renderLogin(root, onSuccess) {
  root.innerHTML = `
    <div class="login-wrap">
      <div class="login-card">
        <div class="brand big"><span class="dot"></span>VOOKUZ <span>DQS</span></div>
        <p class="login-sub">Dynamic Queue System &mdash; silakan masuk</p>
        <form id="login-form">
          <label>Username<input name="user" type="text" autocomplete="username" required placeholder="admin"></label>
          <label>Password<input name="pass" type="password" autocomplete="current-password" required></label>
          <button class="btn accent" type="submit">MASUK</button>
          <div class="login-err" id="login-err"></div>
        </form>
        <div class="login-hint">
          <strong>Akun demo:</strong><br>
          admin / admin123 &middot; owner / owner123 &middot; tv / tv123<br>
          designer1 / d1 &middot; designer2 / d2 &middot; designer3 / d3 &middot; designer4 / d4 &middot; designer5 / d5
        </div>
      </div>
    </div>
  `;

  root.querySelector("#login-form").onsubmit = (e) => {
    e.preventDefault();
    const f = e.target;
    const sess = login(f.user.value.trim(), f.pass.value);
    if (!sess) {
      root.querySelector("#login-err").textContent = "Username atau password salah.";
      return;
    }
    onSuccess();
  };
}
