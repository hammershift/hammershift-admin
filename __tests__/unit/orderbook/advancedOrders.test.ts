import { Types } from 'mongoose';
import {
  matchOrder,
  getOrderBook,
} from '@/app/lib/orderbook/matcher';
import PolygonOrder from '@/app/models/PolygonOrder.model';

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

describe('Advanced Order Types', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const marketId = 'market-123';
  const userId = new Types.ObjectId();

  describe('Fill-or-Kill (FOK) Orders', () => {
    it('should fill FOK order completely when sufficient liquidity exists', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.60,
        size: 100,
        remainingSize: 100,
        userId,
        timeInForce: 'FOK',
      };

      const makerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.60,
        size: 150,
        remainingSize: 150,
      };

      (PolygonOrder.find as jest.Mock).mockReturnValue(createMockQuery([makerOrder]));

      (PolygonOrder.findById as jest.Mock).mockResolvedValue({
        ...makerOrder,
        remainingSize: 150,
        save: jest.fn().mockResolvedValue(true),
      });

      const result = await matchOrder(takerOrder, marketId, 0);

      expect(result.success).toBe(true);
      expect(result.fills).toHaveLength(1);
      expect(result.fills[0].size).toBe(100);
      expect(result.totalFilled).toBe(100);
      expect(result.remainingSize).toBe(0);
    });

    it('should reject FOK order when cannot fill completely', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.60,
        size: 100,
        remainingSize: 100,
        userId,
        timeInForce: 'FOK',
      };

      const makerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.60,
        size: 80,
        remainingSize: 80,
      };

      (PolygonOrder.find as jest.Mock).mockReturnValue(createMockQuery([makerOrder]));

      const result = await matchOrder(takerOrder, marketId, 0);

      expect(result.success).toBe(false);
      expect(result.fills).toHaveLength(0);
      expect(result.totalFilled).toBe(0);
      expect(result.remainingSize).toBe(100);
      expect(result.error).toBe('FOK order cannot be filled completely');
    });

    it('should reject FOK when multiple makers insufficient', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.65,
        size: 200,
        remainingSize: 200,
        userId,
        timeInForce: 'FOK',
      };

      const maker1 = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.60,
        size: 80,
        remainingSize: 80,
      };

      const maker2 = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.62,
        size: 80,
        remainingSize: 80,
      };

      (PolygonOrder.find as jest.Mock).mockReturnValue(createMockQuery([maker1, maker2]));

      const result = await matchOrder(takerOrder, marketId, 0);

      expect(result.success).toBe(false);
      expect(result.fills).toHaveLength(0);
      expect(result.error).toBe('FOK order cannot be filled completely');
    });

    it('should fill FOK across multiple makers when total sufficient', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.65,
        size: 150,
        remainingSize: 150,
        userId,
        timeInForce: 'FOK',
      };

      const maker1 = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.60,
        size: 100,
        remainingSize: 100,
      };

      const maker2 = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.62,
        size: 80,
        remainingSize: 80,
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
          remainingSize: 80,
          save: jest.fn().mockResolvedValue(true),
        });

      const result = await matchOrder(takerOrder, marketId, 0);

      expect(result.success).toBe(true);
      expect(result.fills).toHaveLength(2);
      expect(result.totalFilled).toBe(150);
      expect(result.remainingSize).toBe(0);
    });

    it('should reject FOK when price crosses but size insufficient', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.70,
        size: 200,
        remainingSize: 200,
        userId,
        timeInForce: 'FOK',
      };

      const maker1 = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.60,
        size: 100,
        remainingSize: 100,
      };

      const maker2 = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.75,
        size: 150,
        remainingSize: 150,
      };

      (PolygonOrder.find as jest.Mock).mockReturnValue(createMockQuery([maker1, maker2]));

      const result = await matchOrder(takerOrder, marketId, 0);

      expect(result.success).toBe(false);
      expect(result.error).toBe('FOK order cannot be filled completely');
    });
  });

  describe('Immediate-or-Cancel (IOC) Orders', () => {
    it('should fill IOC order completely when liquidity available', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.60,
        size: 100,
        remainingSize: 100,
        userId,
        timeInForce: 'IOC',
      };

      const makerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.60,
        size: 150,
        remainingSize: 150,
      };

      (PolygonOrder.find as jest.Mock).mockReturnValue(createMockQuery([makerOrder]));

      (PolygonOrder.findById as jest.Mock).mockResolvedValue({
        ...makerOrder,
        remainingSize: 150,
        save: jest.fn().mockResolvedValue(true),
      });

      const result = await matchOrder(takerOrder, marketId, 0);

      expect(result.success).toBe(true);
      expect(result.fills).toHaveLength(1);
      expect(result.fills[0].size).toBe(100);
      expect(result.totalFilled).toBe(100);
      expect(result.remainingSize).toBe(0);
    });

    it('should partially fill IOC order and cancel remainder', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.60,
        size: 100,
        remainingSize: 100,
        userId,
        timeInForce: 'IOC',
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
      expect(result.fills).toHaveLength(1);
      expect(result.fills[0].size).toBe(60);
      expect(result.totalFilled).toBe(60);
      expect(result.remainingSize).toBe(40); // Should be cancelled, not resting
      expect(result.cancelled).toBe(true);
    });

    it('should fill IOC across multiple makers and cancel unfilled', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.65,
        size: 200,
        remainingSize: 200,
        userId,
        timeInForce: 'IOC',
      };

      const maker1 = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.60,
        size: 100,
        remainingSize: 100,
      };

      const maker2 = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.62,
        size: 50,
        remainingSize: 50,
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
          remainingSize: 50,
          save: jest.fn().mockResolvedValue(true),
        });

      const result = await matchOrder(takerOrder, marketId, 0);

      expect(result.success).toBe(true);
      expect(result.fills).toHaveLength(2);
      expect(result.totalFilled).toBe(150);
      expect(result.remainingSize).toBe(50);
      expect(result.cancelled).toBe(true);
    });

    it('should cancel IOC order when no liquidity available', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.60,
        size: 100,
        remainingSize: 100,
        userId,
        timeInForce: 'IOC',
      };

      (PolygonOrder.find as jest.Mock).mockReturnValue(createMockQuery([]));

      const result = await matchOrder(takerOrder, marketId, 0);

      expect(result.success).toBe(true);
      expect(result.fills).toHaveLength(0);
      expect(result.totalFilled).toBe(0);
      expect(result.remainingSize).toBe(100);
      expect(result.cancelled).toBe(true);
    });
  });

  describe('Post-Only Orders', () => {
    it('should accept post-only order when no immediate match', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.58,
        size: 100,
        remainingSize: 100,
        userId,
        postOnly: true,
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
      expect(result.totalFilled).toBe(0);
      expect(result.remainingSize).toBe(100);
    });

    it('should reject post-only buy order when would cross spread', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.62,
        size: 100,
        remainingSize: 100,
        userId,
        postOnly: true,
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

      expect(result.success).toBe(false);
      expect(result.fills).toHaveLength(0);
      expect(result.error).toBe('Post-only order would cross spread');
    });

    it('should reject post-only sell order when would cross spread', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.58,
        size: 100,
        remainingSize: 100,
        userId,
        postOnly: true,
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

      const result = await matchOrder(takerOrder, marketId, 0);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Post-only order would cross spread');
    });

    it('should accept post-only order at best price without crossing', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.59,
        size: 100,
        remainingSize: 100,
        userId,
        postOnly: true,
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

    it('should accept post-only order when no opposing orders exist', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.60,
        size: 100,
        remainingSize: 100,
        userId,
        postOnly: true,
      };

      (PolygonOrder.find as jest.Mock).mockReturnValue(createMockQuery([]));

      const result = await matchOrder(takerOrder, marketId, 0);

      expect(result.success).toBe(true);
      expect(result.fills).toHaveLength(0);
      expect(result.remainingSize).toBe(100);
    });
  });

  describe('Stop-Loss Orders', () => {
    it('should not trigger stop-loss when market price below stop price (BUY)', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.70,
        size: 100,
        remainingSize: 100,
        userId,
        stopPrice: 0.65,
        triggerCondition: 'GTE',
        orderType: 'STOP_LOSS',
      };

      // Market price is 0.60 (best ask)
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

      expect(result.success).toBe(false);
      expect(result.fills).toHaveLength(0);
      expect(result.error).toBe('Stop-loss condition not met');
    });

    it('should trigger stop-loss when market price hits stop price (BUY GTE)', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.70,
        size: 100,
        remainingSize: 100,
        userId,
        stopPrice: 0.65,
        triggerCondition: 'GTE',
        orderType: 'STOP_LOSS',
      };

      // Market price is 0.66 (best ask) - triggers stop
      const makerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.66,
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
      expect(result.totalFilled).toBe(100);
    });

    it('should trigger stop-loss when market price falls below stop price (SELL LTE)', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.50,
        size: 100,
        remainingSize: 100,
        userId,
        stopPrice: 0.55,
        triggerCondition: 'LTE',
        orderType: 'STOP_LOSS',
      };

      // Market price is 0.54 (best bid) - triggers stop
      const makerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.54,
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
      expect(result.totalFilled).toBe(100);
    });

    it('should not trigger stop-loss when market price above stop price (SELL LTE)', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.50,
        size: 100,
        remainingSize: 100,
        userId,
        stopPrice: 0.55,
        triggerCondition: 'LTE',
        orderType: 'STOP_LOSS',
      };

      // Market price is 0.60 (best bid) - does not trigger
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

      const result = await matchOrder(takerOrder, marketId, 0);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stop-loss condition not met');
    });

    it('should trigger stop-loss at exact stop price', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.70,
        size: 100,
        remainingSize: 100,
        userId,
        stopPrice: 0.65,
        triggerCondition: 'GTE',
        orderType: 'STOP_LOSS',
      };

      const makerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.65,
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
    });

    it('should handle stop-loss with no liquidity after trigger', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.70,
        size: 100,
        remainingSize: 100,
        userId,
        stopPrice: 0.65,
        triggerCondition: 'GTE',
        orderType: 'STOP_LOSS',
      };

      (PolygonOrder.find as jest.Mock).mockReturnValue(createMockQuery([]));

      const result = await matchOrder(takerOrder, marketId, 0);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stop-loss condition not met');
    });
  });

  describe('Edge Cases - Empty Order Book', () => {
    it('should handle FOK with empty order book', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.60,
        size: 100,
        remainingSize: 100,
        userId,
        timeInForce: 'FOK',
      };

      (PolygonOrder.find as jest.Mock).mockReturnValue(createMockQuery([]));

      const result = await matchOrder(takerOrder, marketId, 0);

      expect(result.success).toBe(false);
      expect(result.error).toBe('FOK order cannot be filled completely');
    });

    it('should handle IOC with empty order book', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.60,
        size: 100,
        remainingSize: 100,
        userId,
        timeInForce: 'IOC',
      };

      (PolygonOrder.find as jest.Mock).mockReturnValue(createMockQuery([]));

      const result = await matchOrder(takerOrder, marketId, 0);

      expect(result.success).toBe(true);
      expect(result.cancelled).toBe(true);
      expect(result.remainingSize).toBe(100);
    });
  });

  describe('Edge Cases - Price Gaps', () => {
    it('should handle FOK with price gap preventing fill', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.60,
        size: 100,
        remainingSize: 100,
        userId,
        timeInForce: 'FOK',
      };

      const makerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.75,
        size: 200,
        remainingSize: 200,
      };

      (PolygonOrder.find as jest.Mock).mockReturnValue(createMockQuery([makerOrder]));

      const result = await matchOrder(takerOrder, marketId, 0);

      expect(result.success).toBe(false);
      expect(result.error).toBe('FOK order cannot be filled completely');
    });

    it('should handle IOC with price gap', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.60,
        size: 100,
        remainingSize: 100,
        userId,
        timeInForce: 'IOC',
      };

      const makerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.75,
        size: 200,
        remainingSize: 200,
      };

      (PolygonOrder.find as jest.Mock).mockReturnValue(createMockQuery([makerOrder]));

      const result = await matchOrder(takerOrder, marketId, 0);

      expect(result.success).toBe(true);
      expect(result.fills).toHaveLength(0);
      expect(result.cancelled).toBe(true);
    });
  });

  describe('Combined Order Types', () => {
    it('should handle GTC order (default) differently from FOK', async () => {
      const gtcOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.60,
        size: 100,
        remainingSize: 100,
        userId,
        timeInForce: 'GTC',
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

      const result = await matchOrder(gtcOrder, marketId, 0);

      expect(result.success).toBe(true);
      expect(result.fills).toHaveLength(1);
      expect(result.totalFilled).toBe(60);
      expect(result.remainingSize).toBe(40); // Rests on book
      expect(result.cancelled).toBeUndefined();
    });

    it('should handle post-only with GTC', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.59,
        size: 100,
        remainingSize: 100,
        userId,
        postOnly: true,
        timeInForce: 'GTC',
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
  });

  describe('Performance Tests', () => {
    it('should process FOK order type check in <50ms', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.60,
        size: 100,
        remainingSize: 100,
        userId,
        timeInForce: 'FOK',
      };

      const makerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'SELL',
        outcome: 'YES',
        price: 0.60,
        size: 150,
        remainingSize: 150,
      };

      (PolygonOrder.find as jest.Mock).mockReturnValue(createMockQuery([makerOrder]));

      (PolygonOrder.findById as jest.Mock).mockResolvedValue({
        ...makerOrder,
        remainingSize: 150,
        save: jest.fn().mockResolvedValue(true),
      });

      const start = Date.now();
      await matchOrder(takerOrder, marketId, 0);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);
    });

    it('should process post-only check in <50ms', async () => {
      const takerOrder = {
        _id: new Types.ObjectId(),
        marketId,
        side: 'BUY',
        outcome: 'YES',
        price: 0.62,
        size: 100,
        remainingSize: 100,
        userId,
        postOnly: true,
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

      const start = Date.now();
      await matchOrder(takerOrder, marketId, 0);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);
    });
  });
});
