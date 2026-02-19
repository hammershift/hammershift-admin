import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongoServer: MongoMemoryReplSet;
// Each connectTestDb() call gets its own database name so parallel workers
// never share collections — even if they somehow connect to the same mongod instance.
let currentDbName: string;

/**
 * Connect to the in-memory database with replica set support
 * (Required for MongoDB transactions)
 */
export async function connectTestDb() {
  // Ensure any leftover connection from a previous test file (same worker) is gone
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  mongoServer = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' }
  });
  const mongoUri = mongoServer.getUri();

  // Unique db name per invocation — parallel workers use different databases
  // so their transactions and collection locks never interfere with each other.
  currentDbName = `hammershift-test-${process.pid}-${Date.now()}`;

  await mongoose.connect(mongoUri, {
    dbName: currentDbName,
  });
}

/**
 * Drop database, close the connection and stop mongod
 */
export async function closeTestDb() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect(); // fully resets mongoose state so the next test file starts clean
  if (mongoServer) {
    await mongoServer.stop();
  }
}

/**
 * Remove all the data for all db collections
 */
export async function clearTestDb() {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
}

/**
 * Setup - run before all tests
 */
export async function setupTestDb() {
  await connectTestDb();
}

/**
 * Teardown - run after all tests
 */
export async function teardownTestDb() {
  await closeTestDb();
}

/**
 * Clear between tests
 */
export async function resetTestDb() {
  await clearTestDb();
}
