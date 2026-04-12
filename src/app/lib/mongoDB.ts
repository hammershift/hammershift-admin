import { MongoClient } from 'mongodb';

const options = {};

let _clientPromise: Promise<MongoClient> | null = null;

function getClientPromise(): Promise<MongoClient> {
  if (_clientPromise) return _clientPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
  }

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect();
    }
    _clientPromise = global._mongoClientPromise;
  } else {
    const client = new MongoClient(uri, options);
    _clientPromise = client.connect();
  }

  return _clientPromise;
}

// clientPromise is a getter-based lazy init.
// Usage: const client = await clientPromise;
// The promise is only created when first accessed at runtime,
// not at module import time (which would crash next build).
const clientPromise: Promise<MongoClient> = {
  then(resolve, reject) {
    return getClientPromise().then(resolve, reject);
  },
  catch(onRejected) {
    return getClientPromise().catch(onRejected);
  },
  finally(onFinally) {
    return getClientPromise().finally(onFinally);
  },
  [Symbol.toStringTag]: 'LazyMongoClientPromise',
} as Promise<MongoClient>;

export default clientPromise;
