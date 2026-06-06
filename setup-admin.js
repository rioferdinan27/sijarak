// setup-admin.js
// Jalankan SEKALI SAJA untuk buat akun admin pertama:
// node setup-admin.js

require('dotenv').config();
const mongoose = require('mongoose');

async function buatAdmin() {
  try {
    // Support Railway (MONGO_URL) atau manual (MONGO_URI)
    const uri = process.env.MONGO_URI || process.env.MONGO_URL;
    if (!uri) {
      console.error('❌ Variabel MONGO_URI atau MONGO_URL tidak ditemukan!');
      process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('✅ Terhubung ke MongoDB');

    // Import model setelah koneksi
    const User = require('./models/User');

    // Cek apakah admin sudah ada
    const adminAda = await User.findOne({ email: 'admin@sijarak.id' });
    if (adminAda) {
      console.log('⚠️  Admin sudah ada! Email: admin@sijarak.id');
      console.log('   Password: admin123456');
      process.exit(0);
    }

    // Buat admin baru
    const admin = await User.create({
      nama: 'Super Admin SIJARAK',
      email: 'admin@sijarak.id',
      password: 'admin123456',
      role: 'admin',
      aktif: true
    });

    console.log('\n🎉 Admin berhasil dibuat!');
    console.log('================================');
    console.log('📧 Email   : admin@sijarak.id');
    console.log('🔑 Password: admin123456');
    console.log('================================');
    console.log('⚠️  Segera ganti password setelah login!');

    // Buat juga user demo
    const demoAda = await User.findOne({ email: 'demo@sijarak.id' });
    if (!demoAda) {
      await User.create({
        nama: 'Demo User',
        email: 'demo@sijarak.id',
        password: 'demo123',
        role: 'user',
        aktif: true
      });
      console.log('\n👤 User demo juga dibuat:');
      console.log('   Email: demo@sijarak.id | Password: demo123');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

buatAdmin();
