const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;

    // 🔍 DEBUG ENV
    console.log("🔎 Checking MONGO_URI...");
    if (!uri) {
      throw new Error("MONGO_URI tidak ditemukan di environment!");
    }

    console.log("🌐 URI ditemukan (disensor):", uri.substring(0, 20) + "...");

    // 🔌 CONNECT DB
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // biar cepat fail kalau error
    });

    console.log(`✅ MongoDB Terhubung: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}`);

  } catch (error) {
    console.error("❌ MongoDB Error:", error.message);

    // Tambahan debug
    if (error.message.includes("ECONNREFUSED")) {
      console.log("💡 Kemungkinan: URI salah / DB tidak bisa diakses");
    }

    if (error.message.includes("authentication")) {
      console.log("💡 Kemungkinan: username/password salah");
    }

    if (error.message.includes("undefined")) {
      console.log("💡 Kemungkinan: MONGO_URI belum diset di Railway");
    }

    process.exit(1);
  }
};

module.exports = connectDB;