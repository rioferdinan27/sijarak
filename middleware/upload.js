const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Buat folder uploads jika belum ada
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi penyimpanan file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const namaUnik = `laporan_${Date.now()}_${Math.round(Math.random() * 1E9)}`;
    const ekstensi = path.extname(file.originalname);
    cb(null, namaUnik + ekstensi);
  }
});

// Filter: hanya izinkan gambar
const filterFile = (req, file, cb) => {
  const tipeIzin = /jpeg|jpg|png|webp/;
  const ekstensiOk = tipeIzin.test(path.extname(file.originalname).toLowerCase());
  const mimetypeOk = tipeIzin.test(file.mimetype);

  if (ekstensiOk && mimetypeOk) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar (JPG, PNG, WEBP) yang diizinkan!'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5MB
  fileFilter: filterFile
});

module.exports = upload;