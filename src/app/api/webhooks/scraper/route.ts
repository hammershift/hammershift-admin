import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import PolygonMarketModel from '@/app/models/PolygonMarket.model';
import WebhookEvent, { WebhookEventStatus } from '@/app/models/webhookEvent.model';
import connectToDB from '@/app/lib/mongoose';
import { ethers } from 'ethers';

/**
 * Scraper Oracle Webhook Handler
 *
 * Receives hammer price feeds from the scraper's oracle module and automatically
 * resolves Polygon prediction markets based on auction outcomes.
 *
 * Every inbound call is persisted to the `webhook_events` collection for
 * observability — regardless of outcome.
 */

interface WebhookPayload {
  auction_id: string;
  hammerPrice: number;
  signature: string;
  title?: string;
  page_url?: string;
  verifiedAt?: string;
  warnings?: string[];
  auctionId?: string;
  source?: string;
  timestamp?: number;
  metadata?: {
    bids?: number;
    comments?: number;
    views?: number;
  };
}

function sanitizePayload(payload: any): any {
  if (!payload || typeof payload !== 'object') return payload;
  const copy: any = Array.isArray(payload) ? [...payload] : { ...payload };
  if ('signature' in copy) copy.signature = copy.signature ? '[REDACTED]' : copy.signature;
  return copy;
}

async function logEvent(params: {
  status: WebhookEventStatus;
  httpStatus: number;
  auctionId?: string;
  marketId?: any;
  hammerPrice?: number;
  winningOutcome?: 'YES' | 'NO';
  resolutionTxHash?: string;
  payload?: any;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  startedAt: number;
}) {
  try {
    await WebhookEvent.create({
      source: 'bat-scraper',
      endpoint: '/api/webhooks/scraper',
      method: 'POST',
      status: params.status,
      httpStatus: params.httpStatus,
      auctionId: params.auctionId,
      marketId: params.marketId,
      hammerPrice: params.hammerPrice,
      winningOutcome: params.winningOutcome,
      resolutionTxHash: params.resolutionTxHash,
      payload: params.payload ? sanitizePayload(params.payload) : undefined,
      errorMessage: params.errorMessage,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      durationMs: Date.now() - params.startedAt,
      timestamp: new Date(),
    });
  } catch (e) {
    console.error('[Scraper Webhook] Failed to persist webhook_event:', e);
  }
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    undefined;
  const userAgent = req.headers.get('user-agent') || undefined;
  let payload: WebhookPayload | undefined;

  try {
    const secret = process.env.SCRAPER_SECRET;

    if (!secret) {
      console.error('[Scraper Webhook] SCRAPER_SECRET not configured');
      // DB may be unavailable — try to connect for logging, but don't block the response.
      await connectToDB().catch(() => null);
      await logEvent({
        status: 'error',
        httpStatus: 500,
        errorMessage: 'SCRAPER_SECRET not configured',
        ipAddress,
        userAgent,
        startedAt,
      });
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const webhookSignature = req.headers.get('X-Scraper-Secret');

    if (!webhookSignature) {
      await connectToDB().catch(() => null);
      await logEvent({
        status: 'unauthorized',
        httpStatus: 401,
        errorMessage: 'Missing X-Scraper-Secret header',
        ipAddress,
        userAgent,
        startedAt,
      });
      return NextResponse.json({ error: 'Missing webhook signature' }, { status: 401 });
    }

    const sigBuf = Buffer.from(webhookSignature);
    const secretBuf = Buffer.from(secret);
    const safeLength = Math.max(sigBuf.length, secretBuf.length);
    const paddedSig = Buffer.concat([sigBuf, Buffer.alloc(safeLength - sigBuf.length)]);
    const paddedSecret = Buffer.concat([secretBuf, Buffer.alloc(safeLength - secretBuf.length)]);
    const signatureValid =
      sigBuf.length === secretBuf.length &&
      crypto.timingSafeEqual(paddedSig, paddedSecret);

    if (!signatureValid) {
      await connectToDB().catch(() => null);
      await logEvent({
        status: 'unauthorized',
        httpStatus: 401,
        errorMessage: 'Invalid X-Scraper-Secret',
        ipAddress,
        userAgent,
        startedAt,
      });
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    payload = (await req.json()) as WebhookPayload;
    const {
      auction_id,
      hammerPrice,
      signature: oracleSignature,
      auctionId: legacyAuctionId,
    } = payload;

    const auctionId = auction_id || legacyAuctionId;

    console.log('[Scraper Webhook] Received oracle feed:', {
      auctionId,
      hammerPrice,
      hasSignature: !!oracleSignature,
    });

    await connectToDB();

    if (!auctionId) {
      await logEvent({
        status: 'invalid_payload',
        httpStatus: 400,
        errorMessage: 'Missing auction identifier',
        payload,
        ipAddress,
        userAgent,
        startedAt,
      });
      return NextResponse.json({ error: 'Missing auction identifier' }, { status: 400 });
    }

    if (!hammerPrice || hammerPrice <= 0) {
      await logEvent({
        status: 'invalid_payload',
        httpStatus: 400,
        auctionId,
        errorMessage: `Invalid hammer price: ${hammerPrice}`,
        payload,
        ipAddress,
        userAgent,
        startedAt,
      });
      return NextResponse.json({ error: 'Invalid hammer price' }, { status: 400 });
    }

    if (!oracleSignature) {
      await logEvent({
        status: 'invalid_payload',
        httpStatus: 400,
        auctionId,
        errorMessage: 'Missing oracle signature',
        payload,
        ipAddress,
        userAgent,
        startedAt,
      });
      return NextResponse.json({ error: 'Missing oracle signature' }, { status: 400 });
    }

    const market = await PolygonMarketModel.findOne({ auctionId });

    if (!market) {
      await logEvent({
        status: 'market_not_found',
        httpStatus: 404,
        auctionId,
        hammerPrice,
        payload,
        ipAddress,
        userAgent,
        startedAt,
      });
      return NextResponse.json({ error: 'Market not found' }, { status: 404 });
    }

    if (market.status === 'RESOLVED') {
      await logEvent({
        status: 'already_resolved',
        httpStatus: 400,
        auctionId,
        marketId: market._id,
        hammerPrice,
        payload,
        ipAddress,
        userAgent,
        startedAt,
      });
      return NextResponse.json({ error: 'Market already resolved' }, { status: 400 });
    }

    try {
      const oracleAddress = process.env.ORACLE_ADDRESS;

      if (!oracleAddress) {
        await logEvent({
          status: 'error',
          httpStatus: 500,
          auctionId,
          marketId: market._id,
          hammerPrice,
          errorMessage: 'ORACLE_ADDRESS not configured',
          payload,
          ipAddress,
          userAgent,
          startedAt,
        });
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }

      const marketId = ethers.keccak256(ethers.toUtf8Bytes(auctionId));
      const nonce = 0;
      const hammerPriceWei = ethers.parseUnits(hammerPrice.toString(), 6);

      const messageHash = ethers.solidityPackedKeccak256(
        ['bytes32', 'uint256', 'uint256'],
        [marketId, hammerPriceWei, nonce]
      );

      const recoveredAddress = ethers.verifyMessage(
        ethers.getBytes(messageHash),
        oracleSignature
      );

      if (recoveredAddress.toLowerCase() !== oracleAddress.toLowerCase()) {
        await logEvent({
          status: 'signature_invalid',
          httpStatus: 401,
          auctionId,
          marketId: market._id,
          hammerPrice,
          errorMessage: `Recovered ${recoveredAddress}, expected ${oracleAddress}`,
          payload,
          ipAddress,
          userAgent,
          startedAt,
        });
        return NextResponse.json({ error: 'Invalid oracle signature' }, { status: 401 });
      }
    } catch (signatureError: any) {
      await logEvent({
        status: 'signature_invalid',
        httpStatus: 400,
        auctionId,
        marketId: market._id,
        hammerPrice,
        errorMessage: signatureError.message,
        payload,
        ipAddress,
        userAgent,
        startedAt,
      });
      return NextResponse.json(
        { error: 'Signature verification failed', details: signatureError.message },
        { status: 400 }
      );
    }

    const marketResolverAddress = process.env.MARKET_RESOLVER_ADDRESS;
    const polygonRpc = process.env.POLYGON_RPC;
    const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;
    let onchainFailed = false;
    let onchainError: string | undefined;

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

        const tx = await marketResolver.resolveMarket(onChainMarketId, onChainHammerPrice, oracleSignature);
        await tx.wait(1);
        market.resolutionTxHash = tx.hash;
      } catch (onChainError: any) {
        onchainFailed = true;
        onchainError = onChainError.message;
        console.error('[Scraper Webhook] On-chain resolution failed:', onChainError.message);
      }
    }

    const winningOutcome = hammerPrice > market.predictedPrice ? 'YES' : 'NO';

    market.status = 'RESOLVED';
    market.hammerPrice = hammerPrice;
    market.winningOutcome = winningOutcome;
    market.resolvedAt = new Date();

    await market.save();

    await logEvent({
      status: onchainFailed ? 'onchain_failed' : 'resolved',
      httpStatus: 200,
      auctionId,
      marketId: market._id,
      hammerPrice,
      winningOutcome,
      resolutionTxHash: market.resolutionTxHash,
      errorMessage: onchainError,
      payload,
      ipAddress,
      userAgent,
      startedAt,
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
    await connectToDB().catch(() => null);
    await logEvent({
      status: 'error',
      httpStatus: 500,
      auctionId: payload?.auction_id || payload?.auctionId,
      errorMessage: error.message,
      payload,
      ipAddress,
      userAgent,
      startedAt,
    });
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'Scraper oracle webhook endpoint',
    status: 'active',
    version: '1.0',
  });
}
