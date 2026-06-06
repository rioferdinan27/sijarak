# 🚧 SIJARAK — Sistem Cerdas Jalan Rusak

Aplikasi pelaporan jalan rusak berbasis web dengan sistem poin reward.

## 🚀 Deploy ke Railway

### Persyaratan
- Akun [Railway](https://railway.app)
- Database MongoDB (bisa pakai Railway MongoDB Plugin atau MongoDB Atlas)

### Langkah Deploy

1. **Push ke GitHub** terlebih dahulu
2. **Buka Railway** → New Project → Deploy from GitHub
3. **Tambahkan Environment Variables** di Railway Dashboard:

| Variable | Keterangan |
|----------|-----------|
| `MONGO_URI` | Connection string MongoDB Atlas (jika pakai Atlas) |
| `MONGO_URL` | Otomatis tersedia jika pakai Railway MongoDB Plugin |
| `JWT_SECRET` | String acak panjang untuk keamanan token |

> **Catatan:** `PORT` tidak perlu diset manual — Railway menyediakannya otomatis.

4. **Deploy** akan berjalan otomatis

### Buat Admin Pertama (setelah deploy)

Di Railway dashboard → klik service → Settings → bagian **Deployments** → jalankan command:

```bash
node setup-admin.js
```

Akun default yang dibuat:
- **Admin:** `admin@sijarak.id` / `admin123456`
- **Demo User:** `demo@sijarak.id` / `demo123`

> ⚠️ Segera ganti password admin setelah login!

---

## 💻 Development Lokal

```bash
# 1. Install dependencies
npm install

# 2. Salin dan isi .env
cp .env.example .env
# Edit .env sesuai konfigurasi lokal

# 3. Jalankan server
npm run dev
```

Buka browser: `http://localhost:3000`

---

## 📋 Fitur Utama

- 📸 Upload foto kerusakan jalan (maks 5 foto, 5MB/foto)
- ⭐ Sistem poin reward per laporan (10–50 poin)
- 🔔 Update status laporan real-time
- 👤 Foto profil / avatar
- 📊 Rekap laporan (mingguan/bulanan/tahunan)
- 🗺️ Leaderboard pelapor terbaik
- 🔧 Panel admin lengkap dengan manajemen laporan & user
