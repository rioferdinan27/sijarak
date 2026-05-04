require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();

// Log deteksi port & URI untuk debugging Railway
console.log("🛠️  INFO: Mencoba inisialisasi server...");
console.log("🌐 PORT ENV:", process.env.PORT || "3000 (Default)");

// =====================
// DATABASE CONNECTION
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
// SERVER BINDING (RAILWAY FIX)
// =====================
// Railway secara dinamis memberikan port melalui process.env.PORT
const PORT = process.env.PORT || 3000;

// WAJIB: Gunakan 0.0.0.0 agar bisa diakses dari luar container Railway
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║    🚧 SIJARAK SERVER ONLINE 🚧       ║
  ║    Port   : ${PORT}                  ║
  ║    Status : Running (0.0.0.0)        ║
  ╚══════════════════════════════════════╝
  `);
});

// Error handling agar server tidak langsung mati tanpa log
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});