/**
 * Seed Polygon Markets Script
 *
 * Creates PolygonMarket documents for active auctions that don't already have one.
 * Sets all seeded markets to status: 'ACTIVE' immediately.
 *
 * Usage:
 *   npm run db:seed-markets
 *   npm run db:seed-markets:dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import crypto from 'crypto';
import mongoose from 'mongoose';
import Auctions from '../src/app/models/auction.model';
import PolygonMarketModel from '../src/app/models/PolygonMarket.model';

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || '';
const DRY_RUN = process.argv.includes('--dry-run');

function roundToNearest500(value: number): number {
  return Math.round(value / 500) * 500;
}

function getAttr(attributes: Array<{ key: string; value: unknown }> | undefined, key: string): string {
  if (!attributes) return '';
  const attr = attributes.find((a) => a.key === key);
  return attr ? String(attr.value) : '';
}

async function seedMarkets() {
  if (!MONGODB_URI) throw new Error('MONGODB_URI not set in .env.local');

  console.log('\n' + '='.repeat(48));
  console.log('SEED POLYGON MARKETS');
  console.log('='.repeat(48));
  if (DRY_RUN) console.log('\n[DRY RUN] No changes will be applied.\n');

  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected\n');

  const now = new Date();
  const auctions = await Auctions.find({
    isActive: true,
    'sort.deadline': { $gt: now },
  })
    .sort({ 'sort.deadline': 1 })
    .limit(10)
    .lean() as any[];

  console.log(`Found ${auctions.length} active auction(s) with future deadlines.\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const auction of auctions) {
    try {
      const auctionId = auction._id.toString();

      const existing = await PolygonMarketModel.findOne({ auctionId });
      if (existing) {
        console.log(`  SKIP  "${auction.title}" — market already exists`);
        skipped++;
        continue;
      }

      const rawPrice = auction.avg_predicted_price || auction.sort?.price || 0;
      const predictedPrice = roundToNearest500(rawPrice);

      const deadline = new Date(auction.sort.deadline);
      const twoHoursMs = 2 * 60 * 60 * 1000;
      let endDate: Date;
      if (deadline.getTime() - now.getTime() <= twoHoursMs) {
        endDate = new Date(deadline.getTime() - 5 * 60 * 1000);
        console.log(`  WARN  "${auction.title}" deadline is within 2h — endDate set to 5min before deadline`);
      } else {
        endDate = new Date(deadline.getTime() - twoHoursMs);
      }
      void endDate; // used for display only; PolygonMarket schema doesn't store endDate

      const attrs: Array<{ key: string; value: unknown }> = auction.attributes || [];
      const make = getAttr(attrs, 'make');
      const year = getAttr(attrs, 'year');
      const prefix = [year, make].filter(Boolean).join(' ');
      const raw = `Will the ${prefix ? prefix + ' ' : ''}${auction.title} sell for more than $${predictedPrice.toLocaleString()}?`;
      const question = raw.slice(0, 200);

      const marketId = crypto.randomBytes(16).toString('hex');
      const contractAddress = `0x${crypto.randomBytes(20).toString('hex')}`;

      if (DRY_RUN) {
        console.log(`  DRY   "${auction.title}"`);
        console.log(`        predictedPrice: $${predictedPrice.toLocaleString()}`);
        console.log(`        question: ${question}`);
        created++;
        continue;
      }

      await PolygonMarketModel.create({
        auctionId,
        contractAddress,
        yesTokenId: `token-yes-${marketId}`,
        noTokenId: `token-no-${marketId}`,
        status: 'ACTIVE',
        predictedPrice,
        totalVolume: 0,
        totalLiquidity: 0,
        totalFees: 0,
        makerRebatesPaid: 0,
      });

      console.log(`  CREATED  "${auction.title}" — $${predictedPrice.toLocaleString()}`);
      created++;
    } catch (e: any) {
      if (e.code === 11000) {
        console.log(`  SKIP  "${auction.title}" — duplicate (race condition)`);
        skipped++;
      } else {
        console.error(`  ERROR "${auction.title}":`, e.message);
        errors++;
      }
    }
  }

  console.log('\n' + '='.repeat(48));
  console.log('SUMMARY');
  console.log('='.repeat(48));
  console.log(`Auctions checked:    ${auctions.length}`);
  console.log(`Markets created:     ${created}`);
  console.log(`Skipped (existing):  ${skipped}`);
  console.log(`Errors:              ${errors}`);
  if (DRY_RUN) console.log('\n[DRY RUN] No changes applied.');
  console.log('='.repeat(48) + '\n');
}

(async () => {
  try {
    await seedMarkets();
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
})();
