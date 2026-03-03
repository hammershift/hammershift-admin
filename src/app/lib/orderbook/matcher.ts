import { Types } from 'mongoose';
import PolygonOrder from '@/app/models/PolygonOrder.model';
import PolygonMarket from '@/app/models/PolygonMarket.model';
import PolygonPosition from '@/app/models/PolygonPosition.model';
import { calculateTradeFees } from './feeHandler';
import {
  emitOrderBookUpdate,
  emitOrderMatched,
  getOrderBookServer,
} from '../websocket/orderBookServer';

/**
 * Order Matching Engine for Polygon CLOB
 *
 * Implements price-time priority matching:
 * - Buy orders sorted by price DESC, then time ASC (best price first)
 * - Sell orders sorted by price ASC, then time ASC (best price first)
 * - Match where buyPrice >= sellPrice
 * - Taker gets price improvement (executes at maker's price)
 * - Support partial fills
 */

export interface MatchResult {
  success: boolean;
  fills: Fill[];
  remainingSize: number;
  totalFilled: number;
  error?: string;
}

export interface Fill {
  makerOrderId: Types.ObjectId;
  takerOrderId: Types.ObjectId;
  price: number;
  size: number;
  takerFee: number;
  makerRebate: number;
  timestamp: Date;
}

export interface OrderBookSnapshot {
  bids: OrderBookLevel[]; // Buy orders (price DESC)
  asks: OrderBookLevel[]; // Sell orders (price ASC)
}

export interface OrderBookLevel {
  price: number;
  size: number;
  orders: number; // Number of orders at this level
}

/**
 * Match a taker order against the order book
 */
export async function matchOrder(
  takerOrder: any,
  marketId: string,
  takerVolume30d: number = 0
): Promise<MatchResult> {
  const fills: Fill[] = [];
  let remainingSize = takerOrder.size;

  try {
    // Get opposing orders (sorted by price-time priority)
    const opposingOrders = await getOpposingOrders(
      marketId,
      takerOrder.side,
      takerOrder.outcome,
      takerOrder.price
    );

    // Match against each opposing order
    for (const makerOrder of opposingOrders) {
      if (remainingSize <= 0) break;

      // Check if orders can match
      const canMatch = takerOrder.side === 'BUY'
        ? takerOrder.price >= makerOrder.price
        : takerOrder.price <= makerOrder.price;

      if (!canMatch) break; // No more matches possible (price-time priority)

      // Calculate fill size
      const fillSize = Math.min(remainingSize, makerOrder.remainingSize);

      // Get maker's 30-day volume (simplified - in production would query from DB)
      const makerVolume30d = 0; // TODO: Implement volume tracking

      // Calculate fees
      const fillValue = fillSize * makerOrder.price;
      const fees = calculateTradeFees(fillValue, takerVolume30d, makerVolume30d);

      // Create fill record
      const fill: Fill = {
        makerOrderId: makerOrder._id,
        takerOrderId: takerOrder._id,
        price: makerOrder.price, // Taker gets maker's price (price improvement)
        size: fillSize,
        takerFee: fees.takerFee,
        makerRebate: fees.makerRebate,
        timestamp: new Date(),
      };

      fills.push(fill);

      // Update remaining size
      remainingSize -= fillSize;

      // Update maker order status
      await updateOrderAfterFill(makerOrder._id, fillSize);

      // Emit order matched event via WebSocket
      if (getOrderBookServer()) {
        emitOrderMatched({
          marketId,
          orderId: takerOrder._id.toString(),
          side: takerOrder.side,
          outcome: takerOrder.outcome,
          price: makerOrder.price,
          size: fillSize,
          timestamp: new Date(),
        });
      }

      // Update taker order (handled by caller)
    }

    // Emit updated order book snapshot after matching
    if (fills.length > 0 && getOrderBookServer()) {
      const updatedOrderBook = await getOrderBook(marketId, takerOrder.outcome, 10);
      emitOrderBookUpdate(marketId, updatedOrderBook);
    }

    return {
      success: true,
      fills,
      remainingSize,
      totalFilled: takerOrder.size - remainingSize,
    };
  } catch (error) {
    return {
      success: false,
      fills: [],
      remainingSize: takerOrder.size,
      totalFilled: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get opposing orders sorted by price-time priority
 */
async function getOpposingOrders(
  marketId: string,
  takerSide: 'BUY' | 'SELL',
  outcome: 'YES' | 'NO',
  limitPrice?: number
): Promise<any[]> {
  const opposingSide = takerSide === 'BUY' ? 'SELL' : 'BUY';

  // Build query
  const query: any = {
    marketId,
    side: opposingSide,
    outcome,
    status: { $in: ['OPEN', 'PARTIAL'] },
    remainingSize: { $gt: 0 },
  };

  // Apply price filter based on side
  if (limitPrice !== undefined) {
    if (takerSide === 'BUY') {
      // Buyer willing to pay up to limitPrice, so get sellers at or below that price
      query.price = { $lte: limitPrice };
    } else {
      // Seller willing to accept down to limitPrice, so get buyers at or above that price
      query.price = { $gte: limitPrice };
    }
  }

  // Sort by price-time priority
  const sort: any = takerSide === 'BUY'
    ? { price: 1, createdAt: 1 } // Sell orders: lowest price first
    : { price: -1, createdAt: 1 }; // Buy orders: highest price first

  return await PolygonOrder.find(query).sort(sort).lean();
}

/**
 * Update order after a fill
 */
async function updateOrderAfterFill(
  orderId: Types.ObjectId,
  fillSize: number
): Promise<void> {
  const order = await PolygonOrder.findById(orderId);
  if (!order) throw new Error('Order not found');

  order.remainingSize -= fillSize;

  // Update status
  if (order.remainingSize <= 0) {
    order.status = 'FILLED';
  } else if (order.remainingSize < order.size) {
    order.status = 'PARTIAL';
  }

  await order.save();
}

/**
 * Update user position after a fill
 */
export async function updatePosition(
  userId: Types.ObjectId,
  walletAddress: string,
  marketId: string,
  auctionId: string,
  outcome: 'YES' | 'NO',
  tokenId: string,
  side: 'BUY' | 'SELL',
  fillSize: number,
  fillPrice: number
): Promise<void> {
  const position = await PolygonPosition.findOne({
    userId,
    marketId,
    outcome,
  });

  if (!position) {
    // Create new position
    if (side === 'BUY') {
      await PolygonPosition.create({
        userId,
        walletAddress,
        marketId,
        auctionId,
        outcome,
        tokenId,
        totalShares: fillSize,
        avgPrice: fillPrice,
        totalCost: fillSize * fillPrice,
        realizedPnL: 0,
      });
    }
    // Selling without a position is invalid (can't sell what you don't own)
    else {
      throw new Error('Cannot sell without existing position');
    }
  } else {
    // Update existing position
    if (side === 'BUY') {
      // Buying more shares - update average price
      const newTotalShares = position.totalShares + fillSize;
      const newTotalCost = position.totalCost + (fillSize * fillPrice);
      position.totalShares = newTotalShares;
      position.totalCost = newTotalCost;
      position.avgPrice = newTotalCost / newTotalShares;
    } else {
      // Selling shares - realize P&L
      const costBasis = position.avgPrice * fillSize;
      const proceeds = fillSize * fillPrice;
      const realizedPnL = proceeds - costBasis;

      position.totalShares -= fillSize;
      position.totalCost -= costBasis;
      position.realizedPnL += realizedPnL;

      // If all shares sold, avgPrice becomes undefined
      if (position.totalShares <= 0) {
        position.totalShares = 0;
        position.totalCost = 0;
        position.avgPrice = 0;
      }
    }

    await position.save();
  }
}

/**
 * Get order book snapshot for a market
 */
export async function getOrderBook(
  marketId: string,
  outcome: 'YES' | 'NO',
  depth: number = 10
): Promise<OrderBookSnapshot> {
  // Get open buy orders (bids)
  const buyOrders = await PolygonOrder.find({
    marketId,
    outcome,
    side: 'BUY',
    status: { $in: ['OPEN', 'PARTIAL'] },
    remainingSize: { $gt: 0 },
  })
    .sort({ price: -1, createdAt: 1 })
    .limit(depth * 10) // Get more than needed for aggregation
    .lean();

  // Get open sell orders (asks)
  const sellOrders = await PolygonOrder.find({
    marketId,
    outcome,
    side: 'SELL',
    status: { $in: ['OPEN', 'PARTIAL'] },
    remainingSize: { $gt: 0 },
  })
    .sort({ price: 1, createdAt: 1 })
    .limit(depth * 10)
    .lean();

  // Aggregate by price level
  const bids = aggregateByPrice(buyOrders, depth);
  const asks = aggregateByPrice(sellOrders, depth);

  return { bids, asks };
}

/**
 * Aggregate orders by price level
 */
function aggregateByPrice(orders: any[], depth: number): OrderBookLevel[] {
  const levels = new Map<number, { size: number; orders: number }>();

  for (const order of orders) {
    const existing = levels.get(order.price) || { size: 0, orders: 0 };
    existing.size += order.remainingSize;
    existing.orders += 1;
    levels.set(order.price, existing);
  }

  return Array.from(levels.entries())
    .map(([price, data]) => ({
      price,
      size: data.size,
      orders: data.orders,
    }))
    .slice(0, depth);
}

/**
 * Cancel an order
 */
export async function cancelOrder(orderId: Types.ObjectId): Promise<boolean> {
  const order = await PolygonOrder.findById(orderId);
  if (!order) return false;

  // Can only cancel OPEN or PARTIAL orders
  if (order.status !== 'OPEN' && order.status !== 'PARTIAL') {
    return false;
  }

  order.status = 'CANCELLED';
  await order.save();

  // Emit order cancelled event via WebSocket
  if (getOrderBookServer()) {
    const { emitOrderCancelled } = await import('../websocket/orderBookServer');
    emitOrderCancelled({
      marketId: order.marketId,
      orderId: orderId.toString(),
      userId: order.userId.toString(),
    });

    // Emit updated order book
    const updatedOrderBook = await getOrderBook(order.marketId, order.outcome, 10);
    emitOrderBookUpdate(order.marketId, updatedOrderBook);
  }

  return true;
}
