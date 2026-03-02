import {
  getFeeStructure,
  calculateTakerFee,
  calculateMakerRebate,
  calculateNetPlatformFee,
  calculateTradeFees,
  FEE_TIERS,
} from '@/app/lib/orderbook/feeHandler';

describe('Fee Handler', () => {
  describe('getFeeStructure', () => {
    it('should return tier 1 (1.5%/25%) for $0 volume', () => {
      const structure = getFeeStructure(0);
      expect(structure.takerFeeRate).toBe(0.015);
      expect(structure.makerRebateRate).toBe(0.25);
    });

    it('should return tier 1 for $9,999 volume', () => {
      const structure = getFeeStructure(9999);
      expect(structure.takerFeeRate).toBe(0.015);
      expect(structure.makerRebateRate).toBe(0.25);
    });

    it('should return tier 2 (1.2%/26%) for $10,000 volume', () => {
      const structure = getFeeStructure(10000);
      expect(structure.takerFeeRate).toBe(0.012);
      expect(structure.makerRebateRate).toBe(0.26);
    });

    it('should return tier 3 (1.0%/27%) for $50,000 volume', () => {
      const structure = getFeeStructure(50000);
      expect(structure.takerFeeRate).toBe(0.010);
      expect(structure.makerRebateRate).toBe(0.27);
    });

    it('should return tier 4 (0.8%/28%) for $100,000 volume', () => {
      const structure = getFeeStructure(100000);
      expect(structure.takerFeeRate).toBe(0.008);
      expect(structure.makerRebateRate).toBe(0.28);
    });

    it('should return tier 5 (0.5%/30%) for $500,000+ volume', () => {
      const structure = getFeeStructure(500000);
      expect(structure.takerFeeRate).toBe(0.005);
      expect(structure.makerRebateRate).toBe(0.30);
    });

    it('should return tier 5 for $1,000,000 volume', () => {
      const structure = getFeeStructure(1000000);
      expect(structure.takerFeeRate).toBe(0.005);
      expect(structure.makerRebateRate).toBe(0.30);
    });

    it('should handle tier boundaries correctly', () => {
      const justBefore = getFeeStructure(49999);
      const justAfter = getFeeStructure(50000);

      expect(justBefore.takerFeeRate).toBe(0.012);
      expect(justAfter.takerFeeRate).toBe(0.010);
    });
  });

  describe('calculateTakerFee', () => {
    it('should calculate 1.5% fee for $1000 trade', () => {
      const fee = calculateTakerFee(1000, 0.015);
      expect(fee).toBe(15);
    });

    it('should calculate 0.5% fee for $1000 trade', () => {
      const fee = calculateTakerFee(1000, 0.005);
      expect(fee).toBe(5);
    });

    it('should calculate fee for $100 trade at 1.0%', () => {
      const fee = calculateTakerFee(100, 0.010);
      expect(fee).toBe(1);
    });

    it('should return 0 for $0 trade', () => {
      const fee = calculateTakerFee(0, 0.015);
      expect(fee).toBe(0);
    });

    it('should handle fractional amounts', () => {
      const fee = calculateTakerFee(123.45, 0.012);
      expect(fee).toBeCloseTo(1.4814, 4);
    });
  });

  describe('calculateMakerRebate', () => {
    it('should calculate 25% rebate of $15 taker fee', () => {
      const rebate = calculateMakerRebate(15, 0.25);
      expect(rebate).toBe(3.75);
    });

    it('should calculate 30% rebate of $10 taker fee', () => {
      const rebate = calculateMakerRebate(10, 0.30);
      expect(rebate).toBe(3);
    });

    it('should calculate 26% rebate', () => {
      const rebate = calculateMakerRebate(5, 0.26);
      expect(rebate).toBe(1.3);
    });

    it('should return 0 for $0 taker fee', () => {
      const rebate = calculateMakerRebate(0, 0.30);
      expect(rebate).toBe(0);
    });

    it('should handle fractional rebates', () => {
      const rebate = calculateMakerRebate(7.89, 0.27);
      expect(rebate).toBeCloseTo(2.1303, 4);
    });
  });

  describe('calculateNetPlatformFee', () => {
    it('should calculate net fee (taker - maker rebate)', () => {
      const net = calculateNetPlatformFee(15, 3.75);
      expect(net).toBe(11.25);
    });

    it('should calculate net with 30% rebate', () => {
      const net = calculateNetPlatformFee(10, 3);
      expect(net).toBe(7);
    });

    it('should return taker fee when rebate is 0', () => {
      const net = calculateNetPlatformFee(10, 0);
      expect(net).toBe(10);
    });

    it('should handle equal taker and rebate', () => {
      const net = calculateNetPlatformFee(5, 5);
      expect(net).toBe(0);
    });
  });

  describe('calculateTradeFees', () => {
    it('should calculate all fees for $1000 trade with 0 volume', () => {
      const fees = calculateTradeFees(1000, 0, 0);

      expect(fees.takerFee).toBe(15); // 1.5%
      expect(fees.makerRebate).toBe(3.75); // 25% of 15
      expect(fees.netPlatformFee).toBe(11.25);
    });

    it('should calculate fees with taker at tier 3 ($50k volume)', () => {
      const fees = calculateTradeFees(1000, 50000, 0);

      expect(fees.takerFee).toBe(10); // 1.0%
      expect(fees.makerRebate).toBe(2.5); // 25% of 10 (maker at tier 1)
      expect(fees.netPlatformFee).toBe(7.5);
    });

    it('should calculate fees with maker at tier 5 ($500k volume)', () => {
      const fees = calculateTradeFees(1000, 0, 500000);

      expect(fees.takerFee).toBe(15); // 1.5% (taker tier 1)
      expect(fees.makerRebate).toBe(4.5); // 30% of 15 (maker tier 5)
      expect(fees.netPlatformFee).toBe(10.5);
    });

    it('should calculate fees with both at max tier', () => {
      const fees = calculateTradeFees(1000, 500000, 500000);

      expect(fees.takerFee).toBe(5); // 0.5%
      expect(fees.makerRebate).toBe(1.5); // 30% of 5
      expect(fees.netPlatformFee).toBe(3.5);
    });

    it('should handle $10,000 trade at tier 4', () => {
      const fees = calculateTradeFees(10000, 100000, 100000);

      expect(fees.takerFee).toBe(80); // 0.8%
      expect(fees.makerRebate).toBeCloseTo(22.4, 10); // 28% of 80
      expect(fees.netPlatformFee).toBeCloseTo(57.6, 10);
    });

    it('should handle small trade amounts', () => {
      const fees = calculateTradeFees(10, 0, 0);

      expect(fees.takerFee).toBe(0.15);
      expect(fees.makerRebate).toBe(0.0375);
      expect(fees.netPlatformFee).toBeCloseTo(0.1125, 10);
    });

    it('should handle $0 trade', () => {
      const fees = calculateTradeFees(0, 50000, 50000);

      expect(fees.takerFee).toBe(0);
      expect(fees.makerRebate).toBe(0);
      expect(fees.netPlatformFee).toBe(0);
    });
  });

  describe('FEE_TIERS constant', () => {
    it('should have 5 tiers', () => {
      expect(FEE_TIERS).toHaveLength(5);
    });

    it('should have ascending volume thresholds', () => {
      for (let i = 1; i < FEE_TIERS.length; i++) {
        expect(FEE_TIERS[i].minVolume).toBeGreaterThan(FEE_TIERS[i - 1].minVolume);
      }
    });

    it('should have descending taker fees', () => {
      for (let i = 1; i < FEE_TIERS.length; i++) {
        expect(FEE_TIERS[i].takerFeeRate).toBeLessThan(FEE_TIERS[i - 1].takerFeeRate);
      }
    });

    it('should have ascending maker rebates', () => {
      for (let i = 1; i < FEE_TIERS.length; i++) {
        expect(FEE_TIERS[i].makerRebateRate).toBeGreaterThanOrEqual(FEE_TIERS[i - 1].makerRebateRate);
      }
    });

    it('should start at 0 volume', () => {
      expect(FEE_TIERS[0].minVolume).toBe(0);
    });
  });
});
