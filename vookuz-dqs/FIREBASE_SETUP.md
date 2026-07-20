# Setup Firebase RTDB untuk Vookuz DQS

Login tetap pakai akun demo lokal (admin/admin123, designer1/d1, dst).
Yang disambungkan ke Firebase hanyalah **Realtime Database** untuk sinkron real-time
(antrian masuk → TV di device lain bunyi).

## 1. Realtime Database
- Firebase Console → **Realtime Database → Create Database**.
- Pilih region **Singapore (asia-southeast1)**.
- Mode awal: **test mode** (biar cepat; ganti rules nanti).

## 2. Isi config
Buka Project Settings → Your apps → Web app → salin config.
Edit `src/js/firebase.js`, ganti placeholder:

```
export const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "vookuz-dqs.firebaseapp.com",
  databaseURL: "https://vookuz-dqs-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "vookuz-dqs",
};
```

## 3. Security Rules (opsional, untuk publik internal)
Buka Realtime Database → Rules → paste:

```
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

> Ini test-mode: siapa pun bisa baca/tulis. Cukup kalau cuma internal toko.
> Kalau mau per-role (designer cuma kolomnya), pakai `firebase-rules.json` + Firebase Auth.

## 4. Jalankan
```
npm start
```
Buka http://localhost:5500 → login dengan akun demo.
- Kalau config masih placeholder → tag **OFFLINE** (data lokal, tidak sync).
- Kalau config benar → tag **LIVE** (real-time; TV bunyi saat antrian masuk).

## Catatan
- Email/password login TIDAK dipakai. Auth tetap mock lokal.
- Data tersimpan flat di bawah `/` sesuai skema PRD.
