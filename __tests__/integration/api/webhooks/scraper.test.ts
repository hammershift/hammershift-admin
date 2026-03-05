import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/webhooks/scraper/route';
import { setupTestDb, teardownTestDb, resetTestDb } from '../../../helpers/testDb';
import PolygonMarketModel from '@/app/models/PolygonMarket.model';
import { Types } from 'mongoose';
import { ethers } from 'ethers';

describe('Scraper Webhook API', () => {
  const VALID_SECRET = 'test-scraper-secret-12345';
  const originalEnv = process.env;

  // Create test oracle wallet
  const oracleWallet = ethers.Wallet.createRandom();
  const attackerWallet = ethers.Wallet.createRandom();

  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
    process.env = originalEnv;
  });

  beforeEach(async () => {
    await resetTestDb();
    jest.clearAllMocks();
    // Set valid secret for tests
    process.env.SCRAPER_SECRET = VALID_SECRET;
    process.env.ORACLE_ADDRESS = oracleWallet.address;
  });

  afterEach(() => {
    // Restore env after each test
    process.env = { ...originalEnv, SCRAPER_SECRET: VALID_SECRET };
  });

  /**
   * Helper function to generate valid oracle signature
   */
  function generateSignature(auctionId: string, hammerPrice: number, nonce: number = 0): string {
    const marketId = ethers.keccak256(ethers.toUtf8Bytes(auctionId));
    const hammerPriceWei = ethers.parseUnits(hammerPrice.toString(), 6);

    const messageHash = ethers.solidityPackedKeccak256(
      ['bytes32', 'uint256', 'uint256'],
      [marketId, hammerPriceWei, nonce]
    );

    return oracleWallet.signMessageSync(ethers.getBytes(messageHash));
  }

  describe('GET /api/webhooks/scraper', () => {
    it('should return health check response', async () => {
      const req = new NextRequest('http://localhost:3000/api/webhooks/scraper');
      const response = await GET(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({
        message: 'Scraper oracle webhook endpoint',
        status: 'active',
        version: '1.0',
      });
    });
  });

  describe('POST /api/webhooks/scraper', () => {
    describe('Authentication', () => {
      it('should reject requests without webhook secret header', async () => {
        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          body: JSON.stringify({
            auction_id: 'bat-12345',
            hammerPrice: 100000,
            signature: generateSignature('bat-12345', 100000),
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toBe('Missing webhook signature');
      });

      it('should reject requests with invalid signature', async () => {
        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': 'invalid-secret',
          },
          body: JSON.stringify({
            auctionId: 'bat-12345',
            hammerPrice: 100000,
            source: 'verified',
            timestamp: Date.now(),
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toBe('Invalid webhook signature');
      });

      it('should return 500 if SCRAPER_SECRET is not configured', async () => {
        delete process.env.SCRAPER_SECRET;

        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auctionId: 'bat-12345',
            hammerPrice: 100000,
            source: 'verified',
            timestamp: Date.now(),
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toBe('Server configuration error');
      });
    });

    describe('Oracle Signature Verification', () => {
      it('should reject requests without oracle signature', async () => {
        const market = await PolygonMarketModel.create({
          auctionId: 'bat-sig-test-1',
          contractAddress: '0x123',
          yesTokenId: 'yes-1',
          noTokenId: 'no-1',
          status: 'ACTIVE',
          predictedPrice: 100000,
        });

        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auction_id: 'bat-sig-test-1',
            hammerPrice: 125000,
            // No signature field
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Missing oracle signature');
      });

      it('should accept valid oracle signature', async () => {
        const market = await PolygonMarketModel.create({
          auctionId: 'bat-sig-test-2',
          contractAddress: '0x123',
          yesTokenId: 'yes-1',
          noTokenId: 'no-1',
          status: 'ACTIVE',
          predictedPrice: 100000,
        });

        const hammerPrice = 125000;
        const signature = generateSignature('bat-sig-test-2', hammerPrice);

        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auction_id: 'bat-sig-test-2',
            hammerPrice,
            signature,
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.winningOutcome).toBe('YES');
      });

      it('should reject signature from non-oracle address', async () => {
        const market = await PolygonMarketModel.create({
          auctionId: 'bat-sig-test-3',
          contractAddress: '0x123',
          yesTokenId: 'yes-1',
          noTokenId: 'no-1',
          status: 'ACTIVE',
          predictedPrice: 100000,
        });

        const hammerPrice = 125000;
        const marketId = ethers.keccak256(ethers.toUtf8Bytes('bat-sig-test-3'));
        const hammerPriceWei = ethers.parseUnits(hammerPrice.toString(), 6);

        // Attacker signs the message
        const messageHash = ethers.solidityPackedKeccak256(
          ['bytes32', 'uint256', 'uint256'],
          [marketId, hammerPriceWei, 0]
        );
        const attackerSignature = attackerWallet.signMessageSync(ethers.getBytes(messageHash));

        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auction_id: 'bat-sig-test-3',
            hammerPrice,
            signature: attackerSignature,
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toBe('Invalid oracle signature');
      });

      it('should reject signature with wrong message data', async () => {
        const market = await PolygonMarketModel.create({
          auctionId: 'bat-sig-test-4',
          contractAddress: '0x123',
          yesTokenId: 'yes-1',
          noTokenId: 'no-1',
          status: 'ACTIVE',
          predictedPrice: 100000,
        });

        // Oracle signs for $125k
        const correctPrice = 125000;
        const signature = generateSignature('bat-sig-test-4', correctPrice);

        // Attacker tries to submit $1 with oracle's signature for $125k
        const fakePrice = 1;

        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auction_id: 'bat-sig-test-4',
            hammerPrice: fakePrice,
            signature, // Signature is for correctPrice, not fakePrice
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toBe('Invalid oracle signature');
      });

      it('should return 500 if ORACLE_ADDRESS not configured', async () => {
        delete process.env.ORACLE_ADDRESS;

        const market = await PolygonMarketModel.create({
          auctionId: 'bat-sig-test-5',
          contractAddress: '0x123',
          yesTokenId: 'yes-1',
          noTokenId: 'no-1',
          status: 'ACTIVE',
          predictedPrice: 100000,
        });

        const signature = generateSignature('bat-sig-test-5', 125000);

        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auction_id: 'bat-sig-test-5',
            hammerPrice: 125000,
            signature,
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toBe('Server configuration error');
      });
    });

    describe('Validation', () => {
      it('should reject invalid hammer price (zero)', async () => {
        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auctionId: 'bat-12345',
            hammerPrice: 0,
            source: 'verified',
            timestamp: Date.now(),
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Invalid hammer price');
      });

      it('should reject invalid hammer price (negative)', async () => {
        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auctionId: 'bat-12345',
            hammerPrice: -1000,
            source: 'verified',
            timestamp: Date.now(),
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Invalid hammer price');
      });

      it('should return 404 if market not found', async () => {
        const hammerPrice = 100000;
        const signature = generateSignature('nonexistent-auction', hammerPrice);

        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auction_id: 'nonexistent-auction',
            hammerPrice,
            signature,
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.error).toBe('Market not found');
      });

      it('should reject if market already resolved', async () => {
        // Create a resolved market
        const market = await PolygonMarketModel.create({
          auctionId: 'bat-12345',
          contractAddress: '0x123',
          yesTokenId: 'yes-token-1',
          noTokenId: 'no-token-1',
          status: 'RESOLVED',
          predictedPrice: 100000,
          hammerPrice: 120000,
          winningOutcome: 'YES',
          resolvedAt: new Date(),
        });

        const hammerPrice = 130000;
        const signature = generateSignature('bat-12345', hammerPrice);

        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auction_id: 'bat-12345',
            hammerPrice,
            signature,
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Market already resolved');

        // Verify market was not updated
        const unchangedMarket = await PolygonMarketModel.findById(market._id);
        expect(unchangedMarket?.hammerPrice).toBe(120000);
        expect(unchangedMarket?.winningOutcome).toBe('YES');
      });
    });

    describe('Market Resolution - YES wins', () => {
      it('should resolve market with YES outcome when hammer price exceeds predicted price', async () => {
        // Create an active market
        const market = await PolygonMarketModel.create({
          auctionId: 'bat-12345-porsche',
          contractAddress: '0xABC123',
          yesTokenId: 'yes-token-1',
          noTokenId: 'no-token-1',
          status: 'ACTIVE',
          predictedPrice: 100000,
        });

        const hammerPrice = 125000;
        const signature = generateSignature('bat-12345-porsche', hammerPrice);

        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
            'X-Oracle-Source': 'scraper',
            'X-Oracle-Version': '1.0',
          },
          body: JSON.stringify({
            auction_id: 'bat-12345-porsche',
            hammerPrice,
            signature,
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.marketId).toBe(market._id.toString());
        expect(data.auctionId).toBe('bat-12345-porsche');
        expect(data.predictedPrice).toBe(100000);
        expect(data.hammerPrice).toBe(125000);
        expect(data.winningOutcome).toBe('YES');
        expect(data.resolvedAt).toBeDefined();

        // Verify database was updated
        const updatedMarket = await PolygonMarketModel.findById(market._id);
        expect(updatedMarket).toBeDefined();
        expect(updatedMarket?.status).toBe('RESOLVED');
        expect(updatedMarket?.hammerPrice).toBe(125000);
        expect(updatedMarket?.winningOutcome).toBe('YES');
        expect(updatedMarket?.resolvedAt).toBeInstanceOf(Date);
      });

      it('should resolve market with YES outcome when hammer price is significantly higher', async () => {
        const market = await PolygonMarketModel.create({
          auctionId: 'bat-99999-ferrari',
          contractAddress: '0xDEF456',
          yesTokenId: 'yes-token-2',
          noTokenId: 'no-token-2',
          status: 'ACTIVE',
          predictedPrice: 50000,
        });

        const hammerPrice = 200000;
        const signature = generateSignature('bat-99999-ferrari', hammerPrice);

        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auction_id: 'bat-99999-ferrari',
            hammerPrice, // 4x predicted
            signature,
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.winningOutcome).toBe('YES');

        const updatedMarket = await PolygonMarketModel.findById(market._id);
        expect(updatedMarket?.winningOutcome).toBe('YES');
      });
    });

    describe('Market Resolution - NO wins', () => {
      it('should resolve market with NO outcome when hammer price equals predicted price', async () => {
        const market = await PolygonMarketModel.create({
          auctionId: 'bat-55555-corvette',
          contractAddress: '0xGHI789',
          yesTokenId: 'yes-token-3',
          noTokenId: 'no-token-3',
          status: 'ACTIVE',
          predictedPrice: 75000,
        });

        const hammerPrice = 75000;
        const signature = generateSignature('bat-55555-corvette', hammerPrice);

        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auction_id: 'bat-55555-corvette',
            hammerPrice, // Exactly equal
            signature,
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.winningOutcome).toBe('NO');

        const updatedMarket = await PolygonMarketModel.findById(market._id);
        expect(updatedMarket?.status).toBe('RESOLVED');
        expect(updatedMarket?.hammerPrice).toBe(75000);
        expect(updatedMarket?.winningOutcome).toBe('NO');
      });

      it('should resolve market with NO outcome when hammer price is below predicted price', async () => {
        const market = await PolygonMarketModel.create({
          auctionId: 'bat-77777-mustang',
          contractAddress: '0xJKL012',
          yesTokenId: 'yes-token-4',
          noTokenId: 'no-token-4',
          status: 'ACTIVE',
          predictedPrice: 150000,
        });

        const hammerPrice = 120000;
        const signature = generateSignature('bat-77777-mustang', hammerPrice);

        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auction_id: 'bat-77777-mustang',
            hammerPrice, // Below predicted
            signature,
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.winningOutcome).toBe('NO');

        const updatedMarket = await PolygonMarketModel.findById(market._id);
        expect(updatedMarket?.winningOutcome).toBe('NO');
      });

      it('should resolve market with NO outcome when hammer price is significantly lower', async () => {
        const market = await PolygonMarketModel.create({
          auctionId: 'bat-88888-camaro',
          contractAddress: '0xMNO345',
          yesTokenId: 'yes-token-5',
          noTokenId: 'no-token-5',
          status: 'ACTIVE',
          predictedPrice: 200000,
        });

        const hammerPrice = 50000;
        const signature = generateSignature('bat-88888-camaro', hammerPrice);

        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auction_id: 'bat-88888-camaro',
            hammerPrice, // Much lower
            signature,
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.winningOutcome).toBe('NO');
      });
    });

    describe('Edge Cases', () => {
      it('should handle PENDING market status', async () => {
        const market = await PolygonMarketModel.create({
          auctionId: 'bat-11111-pending',
          contractAddress: '0xPQR678',
          yesTokenId: 'yes-token-6',
          noTokenId: 'no-token-6',
          status: 'PENDING',
          predictedPrice: 80000,
        });

        const hammerPrice = 90000;
        const signature = generateSignature('bat-11111-pending', hammerPrice);

        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auction_id: 'bat-11111-pending',
            hammerPrice,
            signature,
          }),
        });

        const response = await POST(req);

        // Should succeed - PENDING markets can be resolved
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.winningOutcome).toBe('YES');
      });

      it('should handle very small hammer prices', async () => {
        const market = await PolygonMarketModel.create({
          auctionId: 'bat-22222-cheap',
          contractAddress: '0xSTU901',
          yesTokenId: 'yes-token-7',
          noTokenId: 'no-token-7',
          status: 'ACTIVE',
          predictedPrice: 1000,
        });

        const hammerPrice = 1;
        const signature = generateSignature('bat-22222-cheap', hammerPrice);

        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auction_id: 'bat-22222-cheap',
            hammerPrice, // Very small but valid
            signature,
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.hammerPrice).toBe(1);
        expect(data.winningOutcome).toBe('NO');
      });

      it('should handle very large hammer prices', async () => {
        const market = await PolygonMarketModel.create({
          auctionId: 'bat-33333-expensive',
          contractAddress: '0xVWX234',
          yesTokenId: 'yes-token-8',
          noTokenId: 'no-token-8',
          status: 'ACTIVE',
          predictedPrice: 1000000,
        });

        const hammerPrice = 25000000;
        const signature = generateSignature('bat-33333-expensive', hammerPrice);

        const req = new NextRequest('http://localhost:3000/api/webhooks/scraper', {
          method: 'POST',
          headers: {
            'X-Scraper-Secret': VALID_SECRET,
          },
          body: JSON.stringify({
            auction_id: 'bat-33333-expensive',
            hammerPrice, // $25M
            signature,
          }),
        });

        const response = await POST(req);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.hammerPrice).toBe(25000000);
        expect(data.winningOutcome).toBe('YES');
      });
    });
  });
});
