const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { proteksi } = require('../middleware/auth');

// Buat JWT Token
const buatToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// POST /api/auth/daftar - Register akun baru
router.post('/daftar', [
  body('nama').trim().isLength({ min: 3 }).withMessage('Nama minimal 3 karakter'),
  body('email').isEmail().withMessage('Format email tidak valid').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ berhasil: false, errors: errors.array() });
    }

    const { nama, email, password, nomorTelepon, alamat } = req.body;

    // Cek apakah email sudah digunakan
    const userAda = await User.findOne({ email });
    if (userAda) {
      return res.status(400).json({ berhasil: false, pesan: 'Email sudah terdaftar. Gunakan email lain.' });
    }

    // Buat user baru
    const user = await User.create({ nama, email, password, nomorTelepon, alamat });
    const token = buatToken(user._id);

    res.status(201).json({
      berhasil: true,
      pesan: 'Akun berhasil dibuat! Selamat datang di SIJARAK.',
      token,
      user: {
        id: user._id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        totalPoin: user.totalPoin
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ berhasil: false, pesan: 'Terjadi kesalahan server.' });
  }
});

// POST /api/auth/masuk - Login
router.post('/masuk', [
  body('email').isEmail().withMessage('Email tidak valid').normalizeEmail(),
  body('password').notEmpty().withMessage('Password wajib diisi'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ berhasil: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Cari user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ berhasil: false, pesan: 'Email atau password salah.' });
    }

    // Cek password
    const passwordCocok = await user.cocokkanPassword(password);
    if (!passwordCocok) {
      return res.status(401).json({ berhasil: false, pesan: 'Email atau password salah.' });
    }

    if (!user.aktif) {
      return res.status(403).json({ berhasil: false, pesan: 'Akun Anda telah dinonaktifkan.' });
    }

    const token = buatToken(user._id);

    res.json({
      berhasil: true,
      pesan: `Selamat datang kembali, ${user.nama}!`,
      token,
      user: {
        id: user._id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        totalPoin: user.totalPoin,
        totalLaporan: user.totalLaporan
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ berhasil: false, pesan: 'Terjadi kesalahan server.' });
  }
});

// GET /api/auth/profil - Lihat profil sendiri (harus login)
router.get('/profil', proteksi, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ berhasil: true, data: user });
  } catch (error) {
    res.status(500).json({ berhasil: false, pesan: 'Gagal mengambil data profil.' });
  }
});

// PUT /api/auth/profil - Update profil
router.put('/profil', proteksi, async (req, res) => {
  try {
    const { nama, nomorTelepon, alamat } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { nama, nomorTelepon, alamat },
      { new: true, runValidators: true }
    );
    res.json({ berhasil: true, pesan: 'Profil berhasil diperbarui.', data: user });
  } catch (error) {
    res.status(500).json({ berhasil: false, pesan: 'Gagal memperbarui profil.' });
  }
});

// GET /api/auth/leaderboard - Top pelapor berdasarkan poin
router.get('/leaderboard', async (req, res) => {
  try {
    const topUser = await User.find({ role: 'user', aktif: true })
      .sort({ totalPoin: -1 })
      .limit(10)
      .select('nama totalPoin totalLaporan laporanDiterima');
    res.json({ berhasil: true, data: topUser });
  } catch (error) {
    res.status(500).json({ berhasil: false, pesan: 'Gagal mengambil leaderboard.' });
  }
});

module.exports = router;