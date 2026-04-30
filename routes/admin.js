const express = require('express');
const router = express.Router();
const Laporan = require('../models/Laporan');
const User = require('../models/User');
const { proteksi, adminSaja } = require('../middleware/auth');

// Semua route admin memerlukan login + role admin
router.use(proteksi, adminSaja);

// GET /api/admin/dashboard - Statistik ringkas untuk admin
router.get('/dashboard', async (req, res) => {
  try {
    const totalLaporan = await Laporan.countDocuments();
    const totalUser = await User.countDocuments({ role: 'user' });
    const pending = await Laporan.countDocuments({ status: 'pending' });
    const diproses = await Laporan.countDocuments({ status: 'diproses' });
    const selesai = await Laporan.countDocuments({ status: 'selesai' });
    const ditolak = await Laporan.countDocuments({ status: 'ditolak' });

    // Laporan terbaru
    const laporanTerbaru = await Laporan.find()
      .populate('pelapor', 'nama')
      .sort({ createdAt: -1 })
      .limit(5);

    // Laporan per bulan (6 bulan terakhir)
    const enamBulanLalu = new Date();
    enamBulanLalu.setMonth(enamBulanLalu.getMonth() - 6);
    const perBulan = await Laporan.aggregate([
      { $match: { createdAt: { $gte: enamBulanLalu } } },
      { $group: { _id: { bulan: { $month: '$createdAt' }, tahun: { $year: '$createdAt' } }, jumlah: { $sum: 1 } } },
      { $sort: { '_id.tahun': 1, '_id.bulan': 1 } }
    ]);

    res.json({
      berhasil: true, data: {
        totalLaporan, totalUser, pending, diproses, selesai, ditolak,
        laporanTerbaru, perBulan
      }
    });
  } catch (error) {
    res.status(500).json({ berhasil: false, pesan: 'Gagal mengambil data dashboard.' });
  }
});

// GET /api/admin/laporan - Semua laporan dengan filter lengkap
router.get('/laporan', async (req, res) => {
  try {
    const { status, tingkat, halaman = 1, limit = 20, cari } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (tingkat) filter.tingkatKerusakan = tingkat;
    if (cari) {
      filter.$or = [
        { judul: { $regex: cari, $options: 'i' } },
        { 'lokasi.alamat': { $regex: cari, $options: 'i' } }
      ];
    }

    const skip = (parseInt(halaman) - 1) * parseInt(limit);
    const total = await Laporan.countDocuments(filter);
    const laporans = await Laporan.find(filter)
      .populate('pelapor', 'nama email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ berhasil: true, data: laporans, total, halaman: parseInt(halaman), totalHalaman: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ berhasil: false, pesan: 'Gagal mengambil laporan.' });
  }
});

// PUT /api/admin/laporan/:id/status - Update status laporan
router.put('/laporan/:id/status', async (req, res) => {
  try {
    const { status, catatan, prioritas } = req.body;
    const statusValid = ['pending', 'diproses', 'selesai', 'ditolak'];
    if (!statusValid.includes(status)) {
      return res.status(400).json({ berhasil: false, pesan: 'Status tidak valid.' });
    }

    const laporan = await Laporan.findById(req.params.id).populate('pelapor', 'nama email');
    if (!laporan) return res.status(404).json({ berhasil: false, pesan: 'Laporan tidak ditemukan.' });

    const statusLama = laporan.status;
    laporan.status = status;
    laporan.riwayatStatus.push({ status, catatan: catatan || '', diubahOleh: req.user._id });
    if (prioritas) laporan.prioritas = prioritas;
    if (catatan) laporan.catatanAdmin = catatan;
    if (status === 'selesai') laporan.tanggalPenyelesaian = new Date();

    // Tambah poin bonus jika selesai
    if (status === 'selesai' && statusLama !== 'selesai') {
      const poinBonus = 15;
      laporan.poinDiberikan += poinBonus;
      await User.findByIdAndUpdate(laporan.pelapor._id, {
        $inc: { totalPoin: poinBonus, laporanDiterima: 1 }
      });
    }

    // Kurangi poin jika ditolak (dari pending)
    if (status === 'ditolak' && statusLama === 'pending') {
      await User.findByIdAndUpdate(laporan.pelapor._id, {
        $inc: { totalPoin: -laporan.poinDiberikan, totalLaporan: -1 }
      });
      laporan.poinDiberikan = 0;
    }

    await laporan.save();
    res.json({ berhasil: true, pesan: `Status laporan diubah ke "${status}".`, data: laporan });
  } catch (error) {
    res.status(500).json({ berhasil: false, pesan: 'Gagal mengubah status.' });
  }
});

// DELETE /api/admin/laporan/:id - Hapus laporan (admin)
router.delete('/laporan/:id', async (req, res) => {
  try {
    const laporan = await Laporan.findByIdAndDelete(req.params.id);
    if (!laporan) return res.status(404).json({ berhasil: false, pesan: 'Laporan tidak ditemukan.' });
    res.json({ berhasil: true, pesan: 'Laporan berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ berhasil: false, pesan: 'Gagal menghapus laporan.' });
  }
});

// GET /api/admin/users - Daftar semua user
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .sort({ totalPoin: -1 })
      .select('-password');
    res.json({ berhasil: true, data: users, total: users.length });
  } catch (error) {
    res.status(500).json({ berhasil: false, pesan: 'Gagal mengambil data user.' });
  }
});

// PUT /api/admin/users/:id/status - Aktifkan/nonaktifkan user
router.put('/users/:id/status', async (req, res) => {
  try {
    const { aktif } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { aktif }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ berhasil: false, pesan: 'User tidak ditemukan.' });
    res.json({ berhasil: true, pesan: `User ${aktif ? 'diaktifkan' : 'dinonaktifkan'}.`, data: user });
  } catch (error) {
    res.status(500).json({ berhasil: false, pesan: 'Gagal mengubah status user.' });
  }
});

// POST /api/admin/buat-admin - Buat akun admin baru (hanya dari admin yang ada)
router.post('/buat-admin', async (req, res) => {
  try {
    const { nama, email, password } = req.body;
    const ada = await User.findOne({ email });
    if (ada) return res.status(400).json({ berhasil: false, pesan: 'Email sudah digunakan.' });
    const admin = await User.create({ nama, email, password, role: 'admin' });
    res.status(201).json({ berhasil: true, pesan: 'Akun admin berhasil dibuat.', data: { id: admin._id, nama: admin.nama, email: admin.email } });
  } catch (error) {
    res.status(500).json({ berhasil: false, pesan: 'Gagal membuat akun admin.' });
  }
});

module.exports = router;