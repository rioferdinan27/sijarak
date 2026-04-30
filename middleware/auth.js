const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware: cek apakah user sudah login
const proteksi = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      berhasil: false,
      pesan: 'Akses ditolak. Silakan login terlebih dahulu.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.aktif) {
      return res.status(401).json({
        berhasil: false,
        pesan: 'Sesi tidak valid. Silakan login ulang.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      berhasil: false,
      pesan: 'Token tidak valid atau sudah kadaluarsa.'
    });
  }
};

// Middleware: hanya admin yang boleh akses
const adminSaja = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      berhasil: false,
      pesan: 'Akses ditolak. Hanya admin yang diizinkan.'
    });
  }
};

module.exports = { proteksi, adminSaja };