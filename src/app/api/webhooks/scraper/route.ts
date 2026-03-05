import { NextRequest, NextResponse } from 'next/server';
import PolygonMarketModel from '@/app/models/PolygonMarket.model';
import connectToDB from '@/app/lib/mongoose';
import { ethers } from 'ethers';

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
  auction_id: string;
  hammerPrice: number;
  signature: string;
  title?: string;
  page_url?: string;
  verifiedAt?: string;
  warnings?: string[];
  // Legacy fields (for backward compatibility)
  auctionId?: string;
  source?: string;
  timestamp?: number;
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

    // Verify webhook signature from header
    const webhookSignature = req.headers.get('X-Scraper-Secret');

    if (!webhookSignature) {
      console.warn('[Scraper Webhook] Missing X-Scraper-Secret header');
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 401 }
      );
    }

    if (webhookSignature !== secret) {
      console.warn('[Scraper Webhook] Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Parse request body
    const payload: WebhookPayload = await req.json();
    const {
      auction_id,
      hammerPrice,
      signature: oracleSignature,
      title,
      page_url,
      verifiedAt,
      warnings,
      // Legacy fields
      auctionId: legacyAuctionId,
      source,
      timestamp,
      metadata
    } = payload;

    // Support both new (auction_id) and legacy (auctionId) field names
    const auctionId = auction_id || legacyAuctionId;

    // Log webhook receipt
    console.log('[Scraper Webhook] Received oracle feed:', {
      auctionId,
      hammerPrice,
      hasSignature: !!oracleSignature,
      verifiedAt,
      warnings,
    });

    // Validate required fields
    if (!auctionId) {
      console.warn('[Scraper Webhook] Missing auction_id/auctionId');
      return NextResponse.json(
        { error: 'Missing auction identifier' },
        { status: 400 }
      );
    }

    if (!hammerPrice || hammerPrice <= 0) {
      console.warn('[Scraper Webhook] Invalid hammer price:', hammerPrice);
      return NextResponse.json(
        { error: 'Invalid hammer price' },
        { status: 400 }
      );
    }

    if (!oracleSignature) {
      console.warn('[Scraper Webhook] Missing oracle signature');
      return NextResponse.json(
        { error: 'Missing oracle signature' },
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

    // STEP: Verify Oracle Signature
    console.log('[Scraper Webhook] Verifying oracle signature...');

    try {
      const oracleAddress = process.env.ORACLE_ADDRESS;

      if (!oracleAddress) {
        console.error('[Scraper Webhook] ORACLE_ADDRESS not configured');
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        );
      }

      // Convert auctionId to marketId (bytes32) - same as scraper
      const marketId = ethers.keccak256(ethers.toUtf8Bytes(auctionId));

      // Get nonce from contract (or default to 0 for unresolved markets)
      // NOTE: In production, you should query the contract for the actual nonce
      // For now, we assume nonce = 0 for first resolution
      const nonce = 0;

      // Convert hammer price to 6-decimal USDC format
      const hammerPriceWei = ethers.parseUnits(hammerPrice.toString(), 6);

      // Recreate message hash (must match scraper and contract)
      const messageHash = ethers.solidityPackedKeccak256(
        ['bytes32', 'uint256', 'uint256'],
        [marketId, hammerPriceWei, nonce]
      );

      // Verify signature
      const recoveredAddress = ethers.verifyMessage(
        ethers.getBytes(messageHash),
        oracleSignature
      );

      console.log('[Scraper Webhook] Signature verification:', {
        expectedOracle: oracleAddress,
        recoveredAddress,
        isValid: recoveredAddress.toLowerCase() === oracleAddress.toLowerCase(),
      });

      if (recoveredAddress.toLowerCase() !== oracleAddress.toLowerCase()) {
        console.error('[Scraper Webhook] Invalid oracle signature:', {
          expected: oracleAddress,
          recovered: recoveredAddress,
        });

        return NextResponse.json(
          { error: 'Invalid oracle signature' },
          { status: 401 }
        );
      }

      console.log('[Scraper Webhook] Oracle signature verified successfully');

    } catch (signatureError: any) {
      console.error('[Scraper Webhook] Signature verification error:', signatureError);

      return NextResponse.json(
        { error: 'Signature verification failed', details: signatureError.message },
        { status: 400 }
      );
    }

    // Call MarketResolver.resolveMarket() on-chain if contract is configured
    const marketResolverAddress = process.env.MARKET_RESOLVER_ADDRESS;
    const polygonRpc = process.env.POLYGON_RPC;
    const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;

    if (marketResolverAddress && polygonRpc && relayerPrivateKey) {
      try {
        const MARKET_RESOLVER_ABI = [
          'function resolveMarket(bytes32 marketId, uint256 hammerPrice, bytes calldata signature) external',
        ];

        const provider = new ethers.JsonRpcProvider(polygonRpc);
        const relayer = new ethers.Wallet(relayerPrivateKey, provider);
        const marketResolver = new ethers.Contract(marketResolverAddress, MARKET_RESOLVER_ABI, relayer);

        const onChainMarketId = ethers.keccak256(ethers.toUtf8Bytes(auctionId));
        const onChainHammerPrice = ethers.parseUnits(hammerPrice.toString(), 6);

        console.log('[Scraper Webhook] Calling MarketResolver.resolveMarket() on-chain...');
        const tx = await marketResolver.resolveMarket(onChainMarketId, onChainHammerPrice, oracleSignature);
        console.log('[Scraper Webhook] Transaction submitted:', tx.hash);

        await tx.wait(1);
        console.log('[Scraper Webhook] Transaction confirmed:', tx.hash);

        market.resolutionTxHash = tx.hash;
      } catch (onChainError: any) {
        // Log but don't fail — DB-only resolution is acceptable fallback
        console.error('[Scraper Webhook] On-chain resolution failed (proceeding with DB update):', onChainError.message);
      }
    } else {
      console.warn('[Scraper Webhook] MARKET_RESOLVER_ADDRESS/POLYGON_RPC/RELAYER_PRIVATE_KEY not set — skipping on-chain call');
    }

    console.log('[Scraper Webhook] Signature verified - resolving market in database...');

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
