const mongoose = require('mongoose');

const komentarSchema = new mongoose.Schema({
  pengguna: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  namaPengguna: String,
  teks: {
    type: String,
    required: true,
    maxlength: 500
  },
  tanggal: {
    type: Date,
    default: Date.now
  }
});

const riwayatStatusSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['pending', 'diproses', 'selesai', 'ditolak']
  },
  catatan: String,
  diubahOleh: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tanggal: {
    type: Date,
    default: Date.now
  }
});

const laporanSchema = new mongoose.Schema({
  pelapor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  judul: {
    type: String,
    required: [true, 'Judul laporan wajib diisi'],
    trim: true,
    maxlength: [100, 'Judul maksimal 100 karakter']
  },
  deskripsi: {
    type: String,
    required: [true, 'Deskripsi wajib diisi'],
    maxlength: [1000, 'Deskripsi maksimal 1000 karakter']
  },
  lokasi: {
    alamat: {
      type: String,
      required: [true, 'Alamat lokasi wajib diisi']
    },
    kecamatan: String,
    kota: String,
    provinsi: String,
    koordinat: {
      lat: Number,
      lng: Number
    }
  },
  foto: [{
    type: String
  }],
  tingkatKerusakan: {
    type: String,
    enum: ['ringan', 'sedang', 'berat', 'sangat_berat'],
    required: [true, 'Tingkat kerusakan wajib dipilih']
  },
  jenisKerusakan: {
    type: String,
    enum: ['berlubang', 'retak', 'amblas', 'longsor', 'banjir', 'lainnya'],
    required: true
  },
  panjangKerusakan: {
    type: Number,
    min: 0,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'diproses', 'selesai', 'ditolak'],
    default: 'pending'
  },
  riwayatStatus: [riwayatStatusSchema],
  poinDiberikan: {
    type: Number,
    default: 0
  },
  komentar: [komentarSchema],
  totalLike: {
    type: Number,
    default: 0
  },
  disukai: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  prioritas: {
    type: String,
    enum: ['rendah', 'normal', 'tinggi', 'darurat'],
    default: 'normal'
  },
  catatanAdmin: {
    type: String,
    default: ''
  },
  tanggalPenyelesaian: Date,
  verifikasi: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Hitung poin otomatis berdasarkan tingkat kerusakan
laporanSchema.methods.hitungPoin = function() {
  const poinMap = {
    'ringan': 10,
    'sedang': 20,
    'berat': 35,
    'sangat_berat': 50
  };
  return poinMap[this.tingkatKerusakan] || 10;
};

module.exports = mongoose.model('Laporan', laporanSchema);