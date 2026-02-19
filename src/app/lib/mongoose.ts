import mongoose from "mongoose";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI');
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

const connectToDB = async () => {
  // In test environment, skip connection if already connected
  if (process.env.NODE_ENV === 'test') {
    if (mongoose.connection.readyState === 1) {
      return; // Already connected
    }
  }

  try {
    await mongoose.connect(uri, {
      dbName: dbName,
    });
  } catch (err) {
    console.log(err);
  }
};

export default connectToDB;
