// src/config/db.js 
// ---------------------------------------------------------------------
// Connects to MongoDB using MONGODB_URI; logs success or exits on failure.
// ---------------------------------------------------------------------
import mongoose from 'mongoose';

export async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1); // fail fast — don't run a server with no DB
  }
}