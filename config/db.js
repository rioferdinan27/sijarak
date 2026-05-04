const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Prioritas: MONGO_URI (manual) atau MONGO_URL (bawaan Railway)
    const uri = process.env.MONGO_URI || process.env.MONGO_URL;

    console.log("🔎 Menghubungkan ke MongoDB...");
    
    if (!uri) {
      throw new Error("Variabel MONGO_URI/URL tidak ditemukan di environment!");
    }

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`✅ MongoDB Terhubung: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;