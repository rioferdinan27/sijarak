require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

// Log awal untuk memastikan ENV terbaca sebelum koneksi DB
console.log("🔎 ENV Check - MONGO_URI:", process.env.MONGO_URI ? "Ditemukan" : "TIDAK ADA");
console.log("🔎 ENV Check - PORT:", process.env.PORT || "3000 (Default)");

// =====================
// CONNECT DATABASE
// =====================
connectDB();

// =====================
// MIDDLEWARE
// =====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================
// STATIC FILES
// =====================
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =====================
// ROUTES
// =====================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/laporan', require('./routes/laporan'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/avatar', require('./routes/avatar'));
app.use('/api/rekap', require('./routes/rekap'));

// =====================
// HOME ROUTE
// =====================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =====================
// 404 HANDLER
// =====================
app.use((req, res) => {
  res.status(404).json({ pesan: 'Endpoint tidak ditemukan' });
});

// =====================
// SERVER (RAILWAY SAFE)
// =====================
const PORT = process.env.PORT || 3000;

// Railway menyukai listen tanpa IP spesifik atau menggunakan host default
const server = app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║    🚧 SIJARAK SERVER ONLINE 🚧       ║
  ║    Port   : ${PORT}                  ║
  ║    Status : Ready for Railway        ║
  ╚══════════════════════════════════════╝
  `);
});

// =====================
// ERROR HANDLING GLOBAL
// =====================
process.on('unhandledRejection', (err) => {
  console.log('❌ Unhandled Rejection:', err.message);
  // Memberikan waktu log untuk tertulis sebelum exit
  setTimeout(() => {
    server.close(() => process.exit(1));
  }, 1000);
});