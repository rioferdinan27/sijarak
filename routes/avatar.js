const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const User = require('../models/User');
const { proteksi } = require('../middleware/auth');

// Folder khusus avatar
const avatarDir = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

// Storage khusus avatar
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Nama file pakai user id supaya mudah ditimpa
    cb(null, `avatar_${req.user._id}${ext}`);
  }
});

const uploadAvatar = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // maks 3MB
  fileFilter: (req, file, cb) => {
    const izin = /jpeg|jpg|png|webp/;
    const ok = izin.test(path.extname(file.originalname).toLowerCase()) && izin.test(file.mimetype);
    ok ? cb(null, true) : cb(new Error('Hanya file gambar (JPG, PNG, WEBP) yang diizinkan!'));
  }
});

// POST /api/avatar - Upload / ganti foto profil
router.post('/', proteksi, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ berhasil: false, pesan: 'File foto tidak ditemukan.' });
    }

    const avatarPath = `/uploads/avatars/${req.file.filename}`;

    // Simpan path ke database
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: avatarPath },
      { new: true }
    );

    res.json({
      berhasil: true,
      pesan: 'Foto profil berhasil diperbarui!',
      avatar: avatarPath,
      user: {
        id: user._id,
        nama: user.nama,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    // Hapus file yang sudah terupload jika ada error
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    console.error(error);
    res.status(500).json({ berhasil: false, pesan: 'Gagal mengupload foto profil.' });
  }
});

// DELETE /api/avatar - Hapus foto profil (kembali ke default)
router.delete('/', proteksi, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Hapus file lama jika ada
    if (user.avatar) {
      const filePath = path.join(__dirname, '..', user.avatar);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Reset avatar di database
    await User.findByIdAndUpdate(req.user._id, { avatar: '' });

    res.json({ berhasil: true, pesan: 'Foto profil berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ berhasil: false, pesan: 'Gagal menghapus foto profil.' });
  }
});

module.exports = router;