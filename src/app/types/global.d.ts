import { MongoClient } from 'mongodb';

// TEST IMPLEMENTATION
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}