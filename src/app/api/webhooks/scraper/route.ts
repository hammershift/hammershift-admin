import { NextRequest, NextResponse } from 'next/server';
import PolygonMarketModel from '@/app/models/PolygonMarket.model';
import connectToDB from '@/app/lib/mongoose';

/**
 * Scraper Oracle Webhook Handler
 *
 * Receives hammer price feeds from the scraper's oracle module and automatically
 * resolves Polygon prediction markets based on auction outcomes.
 *
 * Webhook Events Handled:
 * - Auction hammer price received from BaT scraper
 * - Market resolution based on predicted vs actual price
 *
 * Security:
 * - Verifies webhook signature using SCRAPER_SECRET
 * - Simple header-based authentication
 *
 * Environment Variables Required:
 * - SCRAPER_SECRET: Shared secret for verifying webhook requests
 *
 * Request Format:
 * {
 *   "auctionId": "bat-12345-1963-porsche-356",
 *   "hammerPrice": 125000,
 *   "source": "verified",
 *   "timestamp": 1234567890,
 *   "metadata": {
 *     "bids": 45,
 *     "comments": 123,
 *     "views": 5678
 *   }
 * }
 *
 * Resolution Logic:
 * - YES wins if hammerPrice > predictedPrice
 * - NO wins if hammerPrice <= predictedPrice
 */

interface WebhookPayload {
  auctionId: string;
  hammerPrice: number;
  source: string;
  timestamp: number;
  metadata?: {
    bids?: number;
    comments?: number;
    views?: number;
  };
}

/**
 * POST handler for scraper oracle webhooks
 */
export async function POST(req: NextRequest) {
  try {
    // Check if webhook secret is configured
    const secret = process.env.SCRAPER_SECRET;

    if (!secret) {
      console.error('[Scraper Webhook] SCRAPER_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Verify webhook signature
    const signature = req.headers.get('X-Scraper-Secret');

    if (!signature) {
      console.warn('[Scraper Webhook] Missing X-Scraper-Secret header');
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 401 }
      );
    }

    if (signature !== secret) {
      console.warn('[Scraper Webhook] Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Parse request body
    const payload: WebhookPayload = await req.json();
    const { auctionId, hammerPrice, source, timestamp, metadata } = payload;

    // Log webhook receipt
    console.log('[Scraper Webhook] Received oracle feed:', {
      auctionId,
      hammerPrice,
      source,
      timestamp,
    });

    // Validate hammer price
    if (!hammerPrice || hammerPrice <= 0) {
      console.warn('[Scraper Webhook] Invalid hammer price:', hammerPrice);
      return NextResponse.json(
        { error: 'Invalid hammer price' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDB();

    // Find market by auctionId
    const market = await PolygonMarketModel.findOne({ auctionId });

    if (!market) {
      console.warn('[Scraper Webhook] Market not found:', auctionId);
      return NextResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      );
    }

    // Check if market is already resolved
    if (market.status === 'RESOLVED') {
      console.warn('[Scraper Webhook] Market already resolved:', {
        marketId: market._id,
        auctionId,
        existingHammerPrice: market.hammerPrice,
      });
      return NextResponse.json(
        { error: 'Market already resolved' },
        { status: 400 }
      );
    }

    // Determine winning outcome
    // YES wins if actual hammer price exceeds predicted price
    // NO wins if actual hammer price is at or below predicted price
    const winningOutcome = hammerPrice > market.predictedPrice ? 'YES' : 'NO';

    console.log('[Scraper Webhook] Resolving market:', {
      marketId: market._id,
      auctionId,
      predictedPrice: market.predictedPrice,
      hammerPrice,
      winningOutcome,
    });

    // Update market with resolution data
    market.status = 'RESOLVED';
    market.hammerPrice = hammerPrice;
    market.winningOutcome = winningOutcome;
    market.resolvedAt = new Date();

    await market.save();

    console.log('[Scraper Webhook] Market resolved successfully:', {
      marketId: market._id,
      auctionId,
      winningOutcome,
    });

    return NextResponse.json({
      success: true,
      marketId: market._id.toString(),
      auctionId,
      predictedPrice: market.predictedPrice,
      hammerPrice,
      winningOutcome,
      resolvedAt: market.resolvedAt,
    });
  } catch (error: any) {
    console.error('[Scraper Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET handler for webhook health check
 *
 * Allows the scraper to verify the webhook endpoint is accessible.
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'Scraper oracle webhook endpoint',
    status: 'active',
    version: '1.0',
  });
}
