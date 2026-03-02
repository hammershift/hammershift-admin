import { Types } from 'mongoose';
import {
  matchOrder,
  updatePosition,
  getOrderBook,
  cancelOrder,
} from '@/app/lib/orderbook/matcher';
import PolygonOrder from '@/app/models/PolygonOrder.model';
import PolygonPosition from '@/app/models/PolygonPosition.model';

// Mock dependencies
jest.mock('@/app/models/PolygonOrder.model');
jest.mock('@/app/models/PolygonMarket.model');
jest.mock('@/app/models/PolygonPosition.model');

// Helper to create mock query chain
function createMockQuery(result: any) {
  const mockQuery = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  };
  return mockQuery;
}

describe('Order Matching Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('matchOrder', () => {
    const marketId = 'market-123';
    const userId = new Types.ObjectId();

    it('should match a buy order against a sell order at same price', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.60,
        size: 100,
        remainingSize: 100,
        userId,
      };

      const makerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.60,
        size: 100,
        remainingSize: 100,
      };

      (PolygonOrder.find as jest.Mock).mockReturnValue(createMockQuery([makerOrder]));

      (PolygonOrder.findById as jest.Mock).mockResolvedValue({
        ...makerOrder,
        remainingSize: 100,
        save: jest.fn().mockResolvedValue(true),
      });

      const result = await matchOrder(takerOrder, marketId, 0);

      expect(result.success).toBe(true);
      expect(result.fills).toHaveLength(1);
      expect(result.fills[0].size).toBe(100);
      expect(result.fills[0].price).toBe(0.60);
      expect(result.totalFilled).toBe(100);
      expect(result.remainingSize).toBe(0);
    });

    it('should match buy order at higher price (price improvement)', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.65,
        size: 100,
        remainingSize: 100,
        userId,
      };

      const makerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.60,
        size: 100,
        remainingSize: 100,
      };

      (PolygonOrder.find as jest.Mock).mockReturnValue(createMockQuery([makerOrder]));

      (PolygonOrder.findById as jest.Mock).mockResolvedValue({
        ...makerOrder,
        remainingSize: 100,
        save: jest.fn().mockResolvedValue(true),
      });

      const result = await matchOrder(takerOrder, marketId, 0);

      expect(result.success).toBe(true);
      expect(result.fills[0].price).toBe(0.60); // Gets maker's better price
      expect(result.totalFilled).toBe(100);
    });

    it('should partially fill when maker size is smaller', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.60,
        size: 100,
        remainingSize: 100,
        userId,
      };

      const makerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.60,
        size: 60,
        remainingSize: 60,
      };

      (PolygonOrder.find as jest.Mock).mockReturnValue(createMockQuery([makerOrder]));

      (PolygonOrder.findById as jest.Mock).mockResolvedValue({
        ...makerOrder,
        remainingSize: 60,
        save: jest.fn().mockResolvedValue(true),
      });

      const result = await matchOrder(takerOrder, marketId, 0);

      expect(result.success).toBe(true);
      expect(result.fills[0].size).toBe(60);
      expect(result.totalFilled).toBe(60);
      expect(result.remainingSize).toBe(40);
    });

    it('should match against multiple makers', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.60,
        size: 150,
        remainingSize: 150,
        userId,
      };

      const maker1 = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.58,
        size: 100,
        remainingSize: 100,
      };

      const maker2 = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.59,
        size: 100,
        remainingSize: 100,
      };

      (PolygonOrder.find as jest.Mock).mockReturnValue(createMockQuery([maker1, maker2]));

      (PolygonOrder.findById as jest.Mock)
        .mockResolvedValueOnce({
          ...maker1,
          remainingSize: 100,
          save: jest.fn().mockResolvedValue(true),
        })
        .mockResolvedValueOnce({
          ...maker2,
          remainingSize: 100,
          save: jest.fn().mockResolvedValue(true),
        });

      const result = await matchOrder(takerOrder, marketId, 0);

      expect(result.success).toBe(true);
      expect(result.fills).toHaveLength(2);
      expect(result.fills[0].size).toBe(100);
      expect(result.fills[0].price).toBe(0.58);
      expect(result.fills[1].size).toBe(50);
      expect(result.fills[1].price).toBe(0.59);
      expect(result.totalFilled).toBe(150);
      expect(result.remainingSize).toBe(0);
    });

    it('should not match when no opposing orders exist', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.60,
        size: 100,
        remainingSize: 100,
        userId,
      };

      (PolygonOrder.find as jest.Mock).mockReturnValue(createMockQuery([]));

      const result = await matchOrder(takerOrder, marketId, 0);

      expect(result.success).toBe(true);
      expect(result.fills).toHaveLength(0);
      expect(result.totalFilled).toBe(0);
      expect(result.remainingSize).toBe(100);
    });

    it('should not match when buy price < sell price', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.55,
        size: 100,
        remainingSize: 100,
        userId,
      };

      const makerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.60,
        size: 100,
        remainingSize: 100,
      };

      (PolygonOrder.find as jest.Mock).mockReturnValue(createMockQuery([makerOrder]));

      const result = await matchOrder(takerOrder, marketId, 0);

      expect(result.success).toBe(true);
      expect(result.fills).toHaveLength(0);
      expect(result.remainingSize).toBe(100);
    });

    it('should calculate fees correctly', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.60,
        size: 100,
        remainingSize: 100,
        userId,
      };

      const makerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.60,
        size: 100,
        remainingSize: 100,
      };

      (PolygonOrder.find as jest.Mock).mockReturnValue(createMockQuery([makerOrder]));

      (PolygonOrder.findById as jest.Mock).mockResolvedValue({
        ...makerOrder,
        remainingSize: 100,
        save: jest.fn().mockResolvedValue(true),
      });

      const result = await matchOrder(takerOrder, marketId, 0);

      expect(result.success).toBe(true);
      const fill = result.fills[0];

      // Fill value = 100 * 0.60 = 60 USDC
      // Taker fee = 60 * 0.015 = 0.9 USDC (1.5% for tier 1)
      // Maker rebate = 0.9 * 0.25 = 0.225 USDC (25% rebate)
      expect(fill.takerFee).toBeCloseTo(0.9, 10);
      expect(fill.makerRebate).toBeCloseTo(0.225, 10);
    });

    it('should handle sell order matching', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.55,
        size: 100,
        remainingSize: 100,
        userId,
      };

      const makerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.60,
        size: 100,
        remainingSize: 100,
      };

      (PolygonOrder.find as jest.Mock).mockReturnValue(createMockQuery([makerOrder]));

      (PolygonOrder.findById as jest.Mock).mockResolvedValue({
        ...makerOrder,
        remainingSize: 100,
        save: jest.fn().mockResolvedValue(true),
      });

      const result = await matchOrder(takerOrder, marketId, 0);

      expect(result.success).toBe(true);
      expect(result.fills[0].price).toBe(0.60); // Gets maker's price
      expect(result.totalFilled).toBe(100);
    });
  });

  describe('updatePosition', () => {
    const userId = new Types.ObjectId();
    const marketId = 'market-123';
    const auctionId = 'auction-456';
    const walletAddress = '0x1234';
    const tokenId = 'token-789';

    it('should create new position on first buy', async () => {
      (PolygonPosition.findOne as jest.Mock).mockResolvedValue(null);
      (PolygonPosition.create as jest.Mock).mockResolvedValue(true);

      await updatePosition(
        userId,
        walletAddress,
        marketId,
        auctionId,
        'YES',
        tokenId,
        'BUY',
        100,
        0.60
      );

      expect(PolygonPosition.create).toHaveBeenCalledWith({
        userId,
        walletAddress,
        marketId,
        auctionId,
        outcome: 'YES',
        tokenId,
        totalShares: 100,
        avgPrice: 0.60,
        totalCost: 60,
        realizedPnL: 0,
      });
    });

    it('should throw error when selling without position', async () => {
      (PolygonPosition.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        updatePosition(
          userId,
          walletAddress,
          marketId,
          auctionId,
          'YES',
          tokenId,
          'SELL',
          100,
          0.60
        )
      ).rejects.toThrow('Cannot sell without existing position');
    });

    it('should update position when buying more shares', async () => {
      const existingPosition = {
        totalShares: 100,
        avgPrice: 0.60,
        totalCost: 60,
        realizedPnL: 0,
        save: jest.fn().mockResolvedValue(true),
      };

      (PolygonPosition.findOne as jest.Mock).mockResolvedValue(existingPosition);

      await updatePosition(
        userId,
        walletAddress,
        marketId,
        auctionId,
        'YES',
        tokenId,
        'BUY',
        50,
        0.70
      );

      // New total: 100 + 50 = 150 shares
      // New cost: 60 + 35 = 95
      // New avg: 95 / 150 = 0.6333
      expect(existingPosition.totalShares).toBe(150);
      expect(existingPosition.totalCost).toBe(95);
      expect(existingPosition.avgPrice).toBeCloseTo(0.6333, 4);
      expect(existingPosition.save).toHaveBeenCalled();
    });

    it('should calculate realized P&L when selling', async () => {
      const existingPosition = {
        totalShares: 100,
        avgPrice: 0.60,
        totalCost: 60,
        realizedPnL: 0,
        save: jest.fn().mockResolvedValue(true),
      };

      (PolygonPosition.findOne as jest.Mock).mockResolvedValue(existingPosition);

      await updatePosition(
        userId,
        walletAddress,
        marketId,
        auctionId,
        'YES',
        tokenId,
        'SELL',
        50,
        0.70
      );

      // Selling 50 shares at 0.70
      // Cost basis: 50 * 0.60 = 30
      // Proceeds: 50 * 0.70 = 35
      // Realized P&L: 35 - 30 = 5
      expect(existingPosition.totalShares).toBe(50);
      expect(existingPosition.totalCost).toBe(30);
      expect(existingPosition.realizedPnL).toBe(5);
      expect(existingPosition.save).toHaveBeenCalled();
    });

    it('should handle selling all shares', async () => {
      const existingPosition = {
        totalShares: 100,
        avgPrice: 0.60,
        totalCost: 60,
        realizedPnL: 0,
        save: jest.fn().mockResolvedValue(true),
      };

      (PolygonPosition.findOne as jest.Mock).mockResolvedValue(existingPosition);

      await updatePosition(
        userId,
        walletAddress,
        marketId,
        auctionId,
        'YES',
        tokenId,
        'SELL',
        100,
        0.65
      );

      // Realized P&L: (100 * 0.65) - (100 * 0.60) = 5
      expect(existingPosition.totalShares).toBe(0);
      expect(existingPosition.totalCost).toBe(0);
      expect(existingPosition.avgPrice).toBe(0);
      expect(existingPosition.realizedPnL).toBe(5);
    });

    it('should handle selling at a loss', async () => {
      const existingPosition = {
        totalShares: 100,
        avgPrice: 0.60,
        totalCost: 60,
        realizedPnL: 0,
        save: jest.fn().mockResolvedValue(true),
      };

      (PolygonPosition.findOne as jest.Mock).mockResolvedValue(existingPosition);

      await updatePosition(
        userId,
        walletAddress,
        marketId,
        auctionId,
        'YES',
        tokenId,
        'SELL',
        50,
        0.50
      );

      // Cost basis: 50 * 0.60 = 30
      // Proceeds: 50 * 0.50 = 25
      // Loss: -5
      expect(existingPosition.realizedPnL).toBe(-5);
    });
  });

  describe('getOrderBook', () => {
    const marketId = 'market-123';

    it('should return order book with bids and asks', async () => {
      const buyOrders = [
        { price: 0.60, remainingSize: 100, createdAt: new Date() },
        { price: 0.59, remainingSize: 50, createdAt: new Date() },
      ];

      const sellOrders = [
        { price: 0.61, remainingSize: 75, createdAt: new Date() },
        { price: 0.62, remainingSize: 100, createdAt: new Date() },
      ];

      (PolygonOrder.find as jest.Mock)
        .mockReturnValueOnce(createMockQuery(buyOrders))
        .mockReturnValueOnce(createMockQuery(sellOrders));

      const orderBook = await getOrderBook(marketId, 'YES', 10);

      expect(orderBook.bids).toHaveLength(2);
      expect(orderBook.asks).toHaveLength(2);
      expect(orderBook.bids[0].price).toBe(0.60);
      expect(orderBook.asks[0].price).toBe(0.61);
    });

    it('should aggregate orders at same price level', async () => {
      const buyOrders = [
        { price: 0.60, remainingSize: 100, createdAt: new Date() },
        { price: 0.60, remainingSize: 50, createdAt: new Date() },
        { price: 0.59, remainingSize: 75, createdAt: new Date() },
      ];

      (PolygonOrder.find as jest.Mock)
        .mockReturnValueOnce(createMockQuery(buyOrders))
        .mockReturnValueOnce(createMockQuery([]));

      const orderBook = await getOrderBook(marketId, 'YES', 10);

      expect(orderBook.bids).toHaveLength(2);
      expect(orderBook.bids[0].price).toBe(0.60);
      expect(orderBook.bids[0].size).toBe(150); // 100 + 50
      expect(orderBook.bids[0].orders).toBe(2);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel an OPEN order', async () => {
      const order = {
        _id: new Types.ObjectId(),
        status: 'OPEN',
        save: jest.fn().mockResolvedValue(true),
      };

      (PolygonOrder.findById as jest.Mock).mockResolvedValue(order);

      const result = await cancelOrder(order._id);

      expect(result).toBe(true);
      expect(order.status).toBe('CANCELLED');
      expect(order.save).toHaveBeenCalled();
    });

    it('should cancel a PARTIAL order', async () => {
      const order = {
        _id: new Types.ObjectId(),
        status: 'PARTIAL',
        save: jest.fn().mockResolvedValue(true),
      };

      (PolygonOrder.findById as jest.Mock).mockResolvedValue(order);

      const result = await cancelOrder(order._id);

      expect(result).toBe(true);
      expect(order.status).toBe('CANCELLED');
    });

    it('should not cancel a FILLED order', async () => {
      const order = {
        _id: new Types.ObjectId(),
        status: 'FILLED',
        save: jest.fn().mockResolvedValue(true),
      };

      (PolygonOrder.findById as jest.Mock).mockResolvedValue(order);

      const result = await cancelOrder(order._id);

      expect(result).toBe(false);
      expect(order.save).not.toHaveBeenCalled();
    });

    it('should not cancel a CANCELLED order', async () => {
      const order = {
        _id: new Types.ObjectId(),
        status: 'CANCELLED',
        save: jest.fn().mockResolvedValue(true),
      };

      (PolygonOrder.findById as jest.Mock).mockResolvedValue(order);

      const result = await cancelOrder(order._id);

      expect(result).toBe(false);
    });

    it('should return false if order not found', async () => {
      (PolygonOrder.findById as jest.Mock).mockResolvedValue(null);

      const result = await cancelOrder(new Types.ObjectId());

      expect(result).toBe(false);
    });
  });
});
