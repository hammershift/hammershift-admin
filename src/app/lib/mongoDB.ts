import { MongoClient } from 'mongodb';

const options = {};

let clientPromise: Promise<MongoClient>;

function getClientPromise(): Promise<MongoClient> {
  if (clientPromise) return clientPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
  }

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    const client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }

  return clientPromise;
}

// Lazy proxy — evaluated at runtime, not at module import time
const lazyClientPromise = new Proxy({} as Promise<MongoClient>, {
  get(_target, prop) {
    const real = getClientPromise();
    return Reflect.get(real, prop, real);
  },
});

export default lazyClientPromise;