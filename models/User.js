const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nama: {
    type: String,
    required: [true, 'Nama wajib diisi'],
    trim: true,
    minlength: [3, 'Nama minimal 3 karakter']
  },
  email: {
    type: String,
    required: [true, 'Email wajib diisi'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Format email tidak valid']
  },
  password: {
    type: String,
    required: [true, 'Password wajib diisi'],
    minlength: [6, 'Password minimal 6 karakter']
  },
  nomorTelepon: {
    type: String,
    trim: true,
    default: ''
  },
  alamat: {
    type: String,
    trim: true,
    default: ''
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  totalPoin: {
    type: Number,
    default: 0
  },
  totalLaporan: {
    type: Number,
    default: 0
  },
  laporanDiterima: {
    type: Number,
    default: 0
  },
  avatar: {
    type: String,
    default: ''
  },
  aktif: {
    type: Boolean,
    default: true
  },
  notifikasiEmail: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password sebelum disimpan
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method cek password
userSchema.methods.cocokkanPassword = async function(passwordMasuk) {
  return await bcrypt.compare(passwordMasuk, this.password);
};

// Jangan tampilkan password di response
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);