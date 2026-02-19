// Mock for mongoose connection in tests
// This prevents the API routes from trying to connect to a different database
const connectToDB = async () => {
  // Do nothing - we already have a test database connection
  return Promise.resolve();
};

module.exports = connectToDB;
