/**
 * Fee Handler for Polygon CLOB
 *
 * Implements variable fee structure:
 * - Taker fees: 0.5% - 1.5% (based on volume tier)
 * - Maker rebates: 25% - 30% of taker fee (incentivize liquidity provision)
 */

export interface FeeStructure {
  takerFeeRate: number; // Percentage (0.005 = 0.5%)
  makerRebateRate: number; // Percentage of taker fee (0.25 = 25%)
}

export interface FeeTier {
  minVolume: number; // 30-day volume threshold (in USDC)
  takerFeeRate: number;
  makerRebateRate: number;
}

// Fee tiers based on 30-day trading volume
export const FEE_TIERS: FeeTier[] = [
  { minVolume: 0, takerFeeRate: 0.015, makerRebateRate: 0.25 },       // 1.5% / 25% rebate
  { minVolume: 10000, takerFeeRate: 0.012, makerRebateRate: 0.26 },   // 1.2% / 26% rebate
  { minVolume: 50000, takerFeeRate: 0.010, makerRebateRate: 0.27 },   // 1.0% / 27% rebate
  { minVolume: 100000, takerFeeRate: 0.008, makerRebateRate: 0.28 },  // 0.8% / 28% rebate
  { minVolume: 500000, takerFeeRate: 0.005, makerRebateRate: 0.30 },  // 0.5% / 30% rebate
];

/**
 * Get fee structure for a user based on their 30-day trading volume
 */
export function getFeeStructure(userVolume30d: number): FeeStructure {
  // Find the highest tier the user qualifies for
  let applicableTier = FEE_TIERS[0];

  for (const tier of FEE_TIERS) {
    if (userVolume30d >= tier.minVolume) {
      applicableTier = tier;
    } else {
      break;
    }
  }

  return {
    takerFeeRate: applicableTier.takerFeeRate,
    makerRebateRate: applicableTier.makerRebateRate,
  };
}

/**
 * Calculate taker fee for an order fill
 */
export function calculateTakerFee(
  fillAmount: number,
  takerFeeRate: number
): number {
  return fillAmount * takerFeeRate;
}

/**
 * Calculate maker rebate (paid to liquidity provider)
 */
export function calculateMakerRebate(
  takerFee: number,
  makerRebateRate: number
): number {
  return takerFee * makerRebateRate;
}

/**
 * Calculate net fees for the platform (taker fee - maker rebate)
 */
export function calculateNetPlatformFee(
  takerFee: number,
  makerRebate: number
): number {
  return takerFee - makerRebate;
}

/**
 * Calculate all fees for a trade
 */
export interface TradeFeesResult {
  takerFee: number;
  makerRebate: number;
  netPlatformFee: number;
}

export function calculateTradeFees(
  fillAmount: number,
  takerVolume30d: number,
  makerVolume30d: number
): TradeFeesResult {
  const takerStructure = getFeeStructure(takerVolume30d);
  const makerStructure = getFeeStructure(makerVolume30d);

  const takerFee = calculateTakerFee(fillAmount, takerStructure.takerFeeRate);

  // Use maker's rebate rate (higher volume makers get better rebates)
  const makerRebate = calculateMakerRebate(takerFee, makerStructure.makerRebateRate);

  const netPlatformFee = calculateNetPlatformFee(takerFee, makerRebate);

  return {
    takerFee,
    makerRebate,
    netPlatformFee,
  };
}
