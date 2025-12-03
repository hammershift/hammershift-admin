import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongoServer: MongoMemoryReplSet;

/**
 * Connect to the in-memory database with replica set support
 * (Required for MongoDB transactions)
 */
export async function connectTestDb() {
  mongoServer = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' }
  });
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri, {
    dbName: "hammershift-test",
  });
}

/**
 * Drop database, close the connection and stop mongod
 */
export async function closeTestDb() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
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
