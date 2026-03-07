import { getAttributeValue } from './trendScorer';

export function roundToNearest500(price: number): number {
  return Math.round(price / 500) * 500;
}

export function buildMarketQuestion(auction: any, predictedPrice: number): string {
  const attrs = auction.attributes || [];
  const year = getAttributeValue(attrs, 'year');
  const make = getAttributeValue(attrs, 'make');

  const prefix = [year, make].filter(Boolean).join(' ');
  const question = `Will the ${prefix ? prefix + ' ' : ''}${auction.title} sell for more than $${predictedPrice.toLocaleString()}?`;
  return question.slice(0, 200);
}
