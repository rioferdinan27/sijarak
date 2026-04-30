const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Terhubung: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ Error koneksi MongoDB: ${error.message}`);
    console.error('Pastikan MongoDB Compass sudah berjalan!');
    process.exit(1);
  }
};

module.exports = connectDB;