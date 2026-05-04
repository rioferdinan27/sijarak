const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Railway biasanya memberikan MONGO_URL secara default, 
    // tapi kita buat fallback agar tetap fleksibel.
    const uri = process.env.MONGO_URI || process.env.MONGO_URL;

    console.log("🔎 Checking Database Connection...");
    
    if (!uri) {
      console.error("❌ Error: MONGO_URI atau MONGO_URL tidak ditemukan!");
      console.log("💡 Pastikan sudah setting Variables di Dashboard Railway.");
      process.exit(1);
    }

    // Menampilkan sedikit bagian URI untuk memastikan variabel terbaca
    console.log(`🌐 Connecting to: ${uri.substring(0, 15)}...`);

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      // Opsi di bawah membantu stabilitas koneksi di server cloud
      socketTimeoutMS: 45000, 
    });

    console.log(`✅ MongoDB Terhubung: ${conn.connection.host}`);
    console.log(`📦 Database Name: ${conn.connection.name}`);

  } catch (error) {
    console.error("❌ MongoDB Connection Error:");
    console.error(error.message);

    // Tips spesifik berdasarkan pesan error
    if (error.message.includes("ENOTFOUND")) {
      console.log("💡 Tips: Masalah DNS. Cek apakah database di Railway sudah 'Online'.");
    } else if (error.message.includes("authentication")) {
      console.log("💡 Tips: Username atau Password di URI salah.");
    }

    process.exit(1);
  }
};

module.exports = connectDB;