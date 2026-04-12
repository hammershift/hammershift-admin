import mongoose from "mongoose";

const connectToDB = async () => {
  // In test environment, skip connection if already connected
  if (process.env.NODE_ENV === 'test') {
    if (mongoose.connection.readyState === 1) {
      return; // Already connected
    }
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
  }

  try {
    await mongoose.connect(uri, {
      dbName: process.env.DB_NAME,
    });
  } catch (err) {
    console.log(err);
  }
};

export default connectToDB;
