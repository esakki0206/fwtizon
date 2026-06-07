import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // How long the driver waits before failing a connection attempt.
      // Default is 30 s which is too long for serverless cold starts.
      serverSelectionTimeoutMS: 10000,

      // Maximum number of sockets kept open in the connection pool.
      // Keep small on serverless (each function instance is ephemeral).
      maxPoolSize: 10,

      // How frequently the driver pings MongoDB to keep the connection alive.
      heartbeatFrequencyMS: 30000,

      // Time to wait for a socket to connect before giving up.
      connectTimeoutMS: 10000,

      // Time to wait for a response to a query before giving up.
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
