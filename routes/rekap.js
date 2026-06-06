const express = require('express');
const router = express.Router();
const Laporan = require('../models/Laporan');
const User = require('../models/User');
const { proteksi, adminSaja } = require('../middleware/auth');

router.use(proteksi, adminSaja);

// Helper: hitung rentang tanggal
function hitungRentang(tipe, nilai) {
  const sekarang = new Date();
  let awal, akhir, label;

  if (tipe === 'minggu') {
    const hariIni = new Date(sekarang);
    const hariMingguIni = hariIni.getDay();

    awal = new Date(hariIni);
    awal.setDate(hariIni.getDate() - hariMingguIni - (parseInt(nilai) * 7));
    awal.setHours(0, 0, 0, 0);

    akhir = new Date(awal);
    akhir.setDate(awal.getDate() + 6);
    akhir.setHours(23, 59, 59, 999);

    label = `Minggu ${awal.toLocaleDateString('id-ID')} s/d ${akhir.toLocaleDateString('id-ID')}`;

  } else if (tipe === 'bulan') {
    const [tahun, bulan] = nilai.split('-').map(Number);

    if (!tahun || !bulan) throw new Error('Format bulan salah');

    awal = new Date(tahun, bulan - 1, 1, 0, 0, 0, 0);
    akhir = new Date(tahun, bulan, 0, 23, 59, 59, 999);

    label = awal.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  } else if (tipe === 'tahun') {
    const tahun = parseInt(nilai);

    if (!tahun) throw new Error('Format tahun salah');

    awal = new Date(tahun, 0, 1, 0, 0, 0, 0);
    akhir = new Date(tahun, 11, 31, 23, 59, 59, 999);

    label = `Tahun ${tahun}`;
  } else {
    throw new Error('Tipe tidak valid');
  }

  return { awal, akhir, label };
}

// GET /api/rekap/data
router.get('/data', async (req, res) => {
  try {
    const { tipe, nilai } = req.query;

    console.log("QUERY MASUK:", req.query); // DEBUG

    if (!tipe || !nilai) {
      return res.status(400).json({
        berhasil: false,
        pesan: 'Parameter tipe dan nilai wajib diisi.'
      });
    }

    const { awal, akhir, label } = hitungRentang(tipe, nilai);

    const filter = {
      createdAt: {
        $gte: new Date(awal),
        $lte: new Date(akhir)
      }
    };

    console.log("FILTER:", filter); // DEBUG

    // Statistik utama
    const totalLaporan = await Laporan.countDocuments(filter);
    const pending  = await Laporan.countDocuments({ ...filter, status: 'pending' });
    const diproses = await Laporan.countDocuments({ ...filter, status: 'diproses' });
    const selesai  = await Laporan.countDocuments({ ...filter, status: 'selesai' });
    const ditolak  = await Laporan.countDocuments({ ...filter, status: 'ditolak' });

    // Per tingkat
    const perTingkat = await Laporan.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $ifNull: ['$tingkatKerusakan', 'Tidak diketahui'] },
          jumlah: { $sum: 1 }
        }
      },
      { $sort: { jumlah: -1 } }
    ]);

    // Per jenis
    const perJenis = await Laporan.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $ifNull: ['$jenisKerusakan', 'Tidak diketahui'] },
          jumlah: { $sum: 1 }
        }
      },
      { $sort: { jumlah: -1 } }
    ]);

    // Top pelapor
    const topPelapor = await Laporan.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$pelapor',
          jumlahLaporan: { $sum: 1 },
          totalPoin: { $sum: { $ifNull: ['$poinDiberikan', 0] } }
        }
      },
      { $sort: { jumlahLaporan: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          nama: '$user.nama',
          email: '$user.email',
          jumlahLaporan: 1,
          totalPoin: 1
        }
      }
    ]);

    // Daftar laporan
    const daftarLaporan = await Laporan.find(filter)
      .populate('pelapor', 'nama email')
      .sort({ createdAt: -1 })
      .limit(100);

    // Total poin (AMAN)
    const totalPoinAgg = await Laporan.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ['$poinDiberikan', 0] } }
        }
      }
    ]);

    const totalPoin = totalPoinAgg.length > 0 ? totalPoinAgg[0].total : 0;

    // Tren harian
    const trenHarian = await Laporan.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            hari: { $dayOfMonth: '$createdAt' },
            bulan: { $month: '$createdAt' },
            tahun: { $year: '$createdAt' }
          },
          jumlah: { $sum: 1 }
        }
      },
      { $sort: { '_id.tahun': 1, '_id.bulan': 1, '_id.hari': 1 } }
    ]);

    res.json({
      berhasil: true,
      data: {
        meta: {
          label,
          tipe,
          nilai,
          dibuatOleh: req.user?.nama || 'Admin',
          awal,
          akhir,
          dibuatpada:new Date() 
        },
        ringkasan: {
          totalLaporan,
          pending,
          diproses,
          selesai,
          ditolak,
          totalPoin
        },
        perTingkat,
        perJenis,
        topPelapor,
        daftarLaporan,
        trenHarian
      }
    });

  } catch (error) {
    console.error("ERROR REKAP:", error.message); // 🔥 penting
    res.status(500).json({
      berhasil: false,
      pesan: error.message || 'Gagal mengambil data rekap.'
    });
  }
});

module.exports = router;