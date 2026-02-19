// Jest setup file
// This runs before each test file

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/hammershift-test';
process.env.DB_NAME = 'hammershift-test';
process.env.AUTH_SECRET = 'test-secret-key-for-testing-only';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// Mock Next.js specific modules that don't work well in test environment
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock mongoose connection to prevent API routes from connecting to real DB
jest.mock('@/app/lib/mongoose', () => {
  return jest.fn(() => Promise.resolve());
});

// Mock MongoDB client to prevent raw MongoDB connections
jest.mock('@/app/lib/mongoDB', () => {
  return Promise.resolve({
    db: jest.fn(() => ({
      collection: jest.fn(() => ({
        findOne: jest.fn(),
        find: jest.fn(() => ({
          toArray: jest.fn(() => Promise.resolve([])),
        })),
        insertOne: jest.fn(),
        updateOne: jest.fn(),
        deleteOne: jest.fn(),
      })),
    })),
  });
});

// Increase timeout for all tests
jest.setTimeout(30000);
