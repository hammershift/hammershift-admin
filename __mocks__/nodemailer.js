// Mock for nodemailer
module.exports = {
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(),
  })),
};
