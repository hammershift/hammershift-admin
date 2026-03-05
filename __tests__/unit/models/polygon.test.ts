import { describe, it, expect } from '@jest/globals';
import PolygonOrder from '../../../src/app/models/PolygonOrder.model';
import PolygonMarket from '../../../src/app/models/PolygonMarket.model';
import PolygonPosition from '../../../src/app/models/PolygonPosition.model';

describe('Polygon CLOB Models', () => {
  describe('PolygonOrder Model', () => {
    it('should have correct schema structure', () => {
      const schema = PolygonOrder.schema;

      expect(schema.path('marketId')).toBeDefined();
      expect(schema.path('auctionId')).toBeDefined();
      expect(schema.path('userId')).toBeDefined();
      expect(schema.path('walletAddress')).toBeDefined();
      expect(schema.path('side')).toBeDefined();
      expect(schema.path('outcome')).toBeDefined();
      expect(schema.path('price')).toBeDefined();
      expect(schema.path('size')).toBeDefined();
      expect(schema.path('remainingSize')).toBeDefined();
      expect(schema.path('status')).toBeDefined();
      expect(schema.path('orderType')).toBeDefined();
      expect(schema.path('makerFee')).toBeDefined();
      expect(schema.path('takerFee')).toBeDefined();
    });

    it('should have required indexes', () => {
      const indexes = PolygonOrder.schema.indexes();

      // Check that critical indexes exist
      const indexKeys = indexes.map((idx: any) => Object.keys(idx[0]));

      expect(indexKeys.some((keys: string[]) => keys.includes('marketId'))).toBe(true);
      expect(indexKeys.some((keys: string[]) => keys.includes('userId'))).toBe(true);
      expect(indexKeys.some((keys: string[]) => keys.includes('walletAddress'))).toBe(true);
    });

    it('should validate enum values', () => {
      const sideEnum = PolygonOrder.schema.path('side').enumValues;
      const outcomeEnum = PolygonOrder.schema.path('outcome').enumValues;
      const statusEnum = PolygonOrder.schema.path('status').enumValues;
      const orderTypeEnum = PolygonOrder.schema.path('orderType').enumValues;

      expect(sideEnum).toEqual(['BUY', 'SELL']);
      expect(outcomeEnum).toEqual(['YES', 'NO']);
      expect(statusEnum).toEqual(['OPEN', 'PARTIAL', 'FILLED', 'CANCELLED']);
      expect(orderTypeEnum).toEqual(['LIMIT', 'MARKET', 'STOP_LOSS']);
    });
  });

  describe('PolygonMarket Model', () => {
    it('should have correct schema structure', () => {
      const schema = PolygonMarket.schema;

      expect(schema.path('auctionId')).toBeDefined();
      expect(schema.path('contractAddress')).toBeDefined();
      expect(schema.path('yesTokenId')).toBeDefined();
      expect(schema.path('noTokenId')).toBeDefined();
      expect(schema.path('status')).toBeDefined();
      expect(schema.path('totalVolume')).toBeDefined();
      expect(schema.path('totalLiquidity')).toBeDefined();
      expect(schema.path('predictedPrice')).toBeDefined();
      expect(schema.path('totalFees')).toBeDefined();
      expect(schema.path('makerRebatesPaid')).toBeDefined();
    });

    it('should have unique index on auctionId', () => {
      const indexes = PolygonMarket.schema.indexes();

      const auctionIdIndex = indexes.find((idx: any) =>
        Object.keys(idx[0]).includes('auctionId') && idx[1]?.unique
      );

      expect(auctionIdIndex).toBeDefined();
    });

    it('should validate status enum values', () => {
      const statusEnum = PolygonMarket.schema.path('status').enumValues;
      expect(statusEnum).toEqual(['PENDING', 'ACTIVE', 'RESOLVED', 'DISPUTED']);
    });
  });

  describe('PolygonPosition Model', () => {
    it('should have correct schema structure', () => {
      const schema = PolygonPosition.schema;

      expect(schema.path('userId')).toBeDefined();
      expect(schema.path('walletAddress')).toBeDefined();
      expect(schema.path('marketId')).toBeDefined();
      expect(schema.path('auctionId')).toBeDefined();
      expect(schema.path('outcome')).toBeDefined();
      expect(schema.path('tokenId')).toBeDefined();
      expect(schema.path('totalShares')).toBeDefined();
      expect(schema.path('avgPrice')).toBeDefined();
      expect(schema.path('totalCost')).toBeDefined();
      expect(schema.path('realizedPnL')).toBeDefined();
    });

    it('should have composite unique index', () => {
      const indexes = PolygonPosition.schema.indexes();

      const compositeIndex = indexes.find((idx: any) => {
        const keys = Object.keys(idx[0]);
        return keys.includes('userId') &&
               keys.includes('marketId') &&
               keys.includes('outcome') &&
               idx[1]?.unique;
      });

      expect(compositeIndex).toBeDefined();
    });
  });
});
