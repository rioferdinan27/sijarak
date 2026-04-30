const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Laporan = require('../models/Laporan');
const User = require('../models/User');
const { proteksi } = require('../middleware/auth');
const upload = require('../middleware/upload');

// GET /api/laporan - Ambil semua laporan (publik, dengan filter)
router.get('/', async (req, res) => {
  try {
    const { status, tingkat, halaman = 1, limit = 10, cari } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (tingkat) filter.tingkatKerusakan = tingkat;
    if (cari) filter.judul = { $regex: cari, $options: 'i' };

    const skip = (parseInt(halaman) - 1) * parseInt(limit);
    const total = await Laporan.countDocuments(filter);
    const laporans = await Laporan.find(filter)
      .populate('pelapor', 'nama email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      berhasil: true,
      data: laporans,
      total,
      halaman: parseInt(halaman),
      totalHalaman: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ berhasil: false, pesan: 'Gagal mengambil data laporan.' });
  }
});

// GET /api/laporan/saya - Laporan milik user yang login
router.get('/saya', proteksi, async (req, res) => {
  try {
    const laporans = await Laporan.find({ pelapor: req.user._id })
      .sort({ createdAt: -1 });
    res.json({ berhasil: true, data: laporans, total: laporans.length });
  } catch (error) {
    res.status(500).json({ berhasil: false, pesan: 'Gagal mengambil laporan Anda.' });
  }
});

// GET /api/laporan/:id - Detail satu laporan
router.get('/:id', async (req, res) => {
  try {
    const laporan = await Laporan.findById(req.params.id)
      .populate('pelapor', 'nama email totalPoin')
      .populate('komentar.pengguna', 'nama');
    if (!laporan) {
      return res.status(404).json({ berhasil: false, pesan: 'Laporan tidak ditemukan.' });
    }
    res.json({ berhasil: true, data: laporan });
  } catch (error) {
    res.status(500).json({ berhasil: false, pesan: 'Gagal mengambil detail laporan.' });
  }
});

// POST /api/laporan - Buat laporan baru (harus login)
router.post('/', proteksi, upload.array('foto', 5), [
  body('judul').trim().isLength({ min: 5, max: 100 }).withMessage('Judul 5-100 karakter'),
  body('deskripsi').trim().isLength({ min: 10 }).withMessage('Deskripsi minimal 10 karakter'),
  body('alamat').trim().notEmpty().withMessage('Alamat wajib diisi'),
  body('tingkatKerusakan').isIn(['ringan', 'sedang', 'berat', 'sangat_berat']).withMessage('Tingkat kerusakan tidak valid'),
  body('jenisKerusakan').isIn(['berlubang', 'retak', 'amblas', 'longsor', 'banjir', 'lainnya']).withMessage('Jenis kerusakan tidak valid'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ berhasil: false, errors: errors.array() });
    }

    const { judul, deskripsi, alamat, kecamatan, kota, provinsi, tingkatKerusakan, jenisKerusakan, panjangKerusakan, lat, lng } = req.body;

    // Ambil nama file foto yang diupload
    const foto = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];

    const laporan = new Laporan({
      pelapor: req.user._id,
      judul, deskripsi,
      lokasi: { alamat, kecamatan, kota, provinsi, koordinat: { lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0 } },
      foto, tingkatKerusakan, jenisKerusakan,
      panjangKerusakan: parseFloat(panjangKerusakan) || 0,
      riwayatStatus: [{ status: 'pending', catatan: 'Laporan baru masuk', diubahOleh: req.user._id }]
    });

    // Hitung poin
    const poin = laporan.hitungPoin();
    laporan.poinDiberikan = poin;

    await laporan.save();

    // Update statistik user
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { totalPoin: poin, totalLaporan: 1 }
    });

    res.status(201).json({
      berhasil: true,
      pesan: `Laporan berhasil dikirim! Anda mendapat ${poin} poin. 🎉`,
      data: laporan
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ berhasil: false, pesan: 'Gagal menyimpan laporan.' });
  }
});

// PUT /api/laporan/:id - Edit laporan sendiri
router.put('/:id', proteksi, async (req, res) => {
  try {
    const laporan = await Laporan.findById(req.params.id);
    if (!laporan) return res.status(404).json({ berhasil: false, pesan: 'Laporan tidak ditemukan.' });
    if (laporan.pelapor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ berhasil: false, pesan: 'Tidak berwenang mengubah laporan ini.' });
    }
    if (laporan.status !== 'pending' && req.user.role !== 'admin') {
      return res.status(400).json({ berhasil: false, pesan: 'Laporan yang sudah diproses tidak bisa diedit.' });
    }

    const { judul, deskripsi, tingkatKerusakan, jenisKerusakan } = req.body;
    Object.assign(laporan, { judul, deskripsi, tingkatKerusakan, jenisKerusakan });
    await laporan.save();

    res.json({ berhasil: true, pesan: 'Laporan berhasil diperbarui.', data: laporan });
  } catch (error) {
    res.status(500).json({ berhasil: false, pesan: 'Gagal memperbarui laporan.' });
  }
});

// DELETE /api/laporan/:id - Hapus laporan sendiri
router.delete('/:id', proteksi, async (req, res) => {
  try {
    const laporan = await Laporan.findById(req.params.id);
    if (!laporan) return res.status(404).json({ berhasil: false, pesan: 'Laporan tidak ditemukan.' });
    if (laporan.pelapor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ berhasil: false, pesan: 'Tidak berwenang menghapus laporan ini.' });
    }

    // Kurangi poin jika laporan dihapus
    if (laporan.poinDiberikan > 0) {
      await User.findByIdAndUpdate(laporan.pelapor, {
        $inc: { totalPoin: -laporan.poinDiberikan, totalLaporan: -1 }
      });
    }

    await laporan.deleteOne();
    res.json({ berhasil: true, pesan: 'Laporan berhasil dihapus.' });
  } catch (error) {
    res.status(500).json({ berhasil: false, pesan: 'Gagal menghapus laporan.' });
  }
});

// POST /api/laporan/:id/komentar - Tambah komentar
router.post('/:id/komentar', proteksi, async (req, res) => {
  try {
    const { teks } = req.body;
    if (!teks || teks.trim().length < 3) {
      return res.status(400).json({ berhasil: false, pesan: 'Komentar minimal 3 karakter.' });
    }
    const laporan = await Laporan.findById(req.params.id);
    if (!laporan) return res.status(404).json({ berhasil: false, pesan: 'Laporan tidak ditemukan.' });

    laporan.komentar.push({ pengguna: req.user._id, namaPengguna: req.user.nama, teks: teks.trim() });
    await laporan.save();
    res.json({ berhasil: true, pesan: 'Komentar berhasil ditambahkan.', data: laporan.komentar });
  } catch (error) {
    res.status(500).json({ berhasil: false, pesan: 'Gagal menambahkan komentar.' });
  }
});

// POST /api/laporan/:id/like - Like laporan
router.post('/:id/like', proteksi, async (req, res) => {
  try {
    const laporan = await Laporan.findById(req.params.id);
    if (!laporan) return res.status(404).json({ berhasil: false, pesan: 'Laporan tidak ditemukan.' });

    const sudahLike = laporan.disukai.includes(req.user._id);
    if (sudahLike) {
      laporan.disukai.pull(req.user._id);
      laporan.totalLike = Math.max(0, laporan.totalLike - 1);
    } else {
      laporan.disukai.push(req.user._id);
      laporan.totalLike += 1;
    }
    await laporan.save();
    res.json({ berhasil: true, sudahLike: !sudahLike, totalLike: laporan.totalLike });
  } catch (error) {
    res.status(500).json({ berhasil: false, pesan: 'Gagal memproses like.' });
  }
});

// GET /api/laporan/statistik/ringkasan - Statistik untuk dashboard
router.get('/statistik/ringkasan', async (req, res) => {
  try {
    const total = await Laporan.countDocuments();
    const pending = await Laporan.countDocuments({ status: 'pending' });
    const diproses = await Laporan.countDocuments({ status: 'diproses' });
    const selesai = await Laporan.countDocuments({ status: 'selesai' });
    const ditolak = await Laporan.countDocuments({ status: 'ditolak' });
    const bulanIni = await Laporan.countDocuments({
      createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
    });

    const perTingkat = await Laporan.aggregate([
      { $group: { _id: '$tingkatKerusakan', jumlah: { $sum: 1 } } }
    ]);

    res.json({ berhasil: true, data: { total, pending, diproses, selesai, ditolak, bulanIni, perTingkat } });
  } catch (error) {
    res.status(500).json({ berhasil: false, pesan: 'Gagal mengambil statistik.' });
  }
});

module.exports = router;