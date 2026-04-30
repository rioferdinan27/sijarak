require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

// Koneksi database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (frontend HTML/CSS/JS)
app.use(express.static(path.join(__dirname, 'public')));

// Serve foto laporan dan avatar
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes API
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/laporan', require('./routes/laporan'));
app.use('/api/admin',   require('./routes/admin'));
app.use('/api/avatar',  require('./routes/avatar'));   // BARU: upload foto profil
app.use('/api/rekap',   require('./routes/rekap'));    // BARU: rekap PDF

// Halaman utama
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ pesan: 'Endpoint tidak ditemukan' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║    🚧 SIJARAK Server Berjalan! 🚧        ║
  ║    http://localhost:${PORT}                ║
  ║    Fitur baru: Avatar + Rekap PDF        ║
  ╚══════════════════════════════════════════╝
  `);
});