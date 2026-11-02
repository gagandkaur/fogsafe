import mongoose from 'mongoose';

export async function connectDb() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fogsafe';
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    // Never log the URI: it contains the database username and password.
    console.log('MongoDB connected');
    return true;
  } catch (err) {
    console.warn('MongoDB unavailable, continuing with in-memory-only state:', err.message);
    return false; // prototype must keep working without a DB
  }
}

export async function disconnectDb() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
