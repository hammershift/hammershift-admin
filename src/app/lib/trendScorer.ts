/**
 * Trend Scorer — rates auctions for auto-market generation
 */

export function getAttributeValue(
  attributes: Array<{ key: string; value: unknown }> | undefined,
  key: string
): string {
  if (!attributes) return '';
  const attr = attributes.find((a) => a.key.toLowerCase() === key.toLowerCase());
  return attr ? String(attr.value) : '';
}

export function getPrestigeScore(
  make: string,
  model: string,
  era?: string,
  category?: string
): number {
  const m = make.toLowerCase();
  const mo = model.toLowerCase();
  const e = (era || '').toLowerCase();
  const cat = (category || '').toLowerCase();

  // Tier 1: 1.0
  if (m.includes('porsche') && mo.includes('911')) return 1.0;
  if (m.includes('ferrari')) return 1.0;
  if (m.includes('lamborghini')) return 1.0;
  if (m.includes('mclaren')) return 1.0;

  // Tier 2: 0.85
  if (m.includes('porsche')) return 0.85;
  if (m.includes('bmw') && mo.includes('m')) return 0.85;
  if (m.includes('mercedes') && (mo.includes('sl') || mo.includes('amg'))) return 0.85;
  if (m.includes('alfa romeo')) return 0.85;

  // Tier 3: 0.75
  if (m.includes('chevrolet') && mo.includes('corvette')) return 0.75;
  if (m.includes('ford') && (mo.includes('shelby') || mo.includes('gt500'))) return 0.75;
  if (m.includes('dodge') && (mo.includes('viper') || mo.includes('hellcat'))) return 0.75;

  // Tier 4: 0.65
  if (m.includes('toyota') && mo.includes('supra')) return 0.65;
  if (m.includes('honda') && (mo.includes('nsx') || mo.includes('s2000'))) return 0.65;
  if (m.includes('mazda') && mo.includes('rx-7')) return 0.65;
  if (m.includes('nissan') && (mo.includes('gt-r') || mo.includes('skyline'))) return 0.65;

  // Tier 5: 0.50
  if (e.includes('1960') || e.includes('1970') || cat.includes('american muscle')) return 0.50;

  return 0.20;
}

export function getTimingBonus(deadline: Date): number {
  const hoursRemaining = (deadline.getTime() - Date.now()) / 3_600_000;
  if (hoursRemaining >= 48 && hoursRemaining <= 96) return 1.0;
  if (hoursRemaining > 96 && hoursRemaining <= 168) return 0.5;
  return 0.0;
}

export function computeTrendScore(auction: any): number {
  const bids = auction.sort?.bids || 0;
  const views = auction.views || 0;
  const predictions = auction.prediction_count || 0;

  const bidsSignal = Math.min(bids / 25, 1.0);
  const viewsSignal = Math.min(views / 500, 1.0);
  const predsSignal = Math.min(predictions / 10, 1.0);

  const attrs = auction.attributes || [];
  const make = getAttributeValue(attrs, 'make');
  const model = getAttributeValue(attrs, 'model');
  const era = getAttributeValue(attrs, 'era');
  const category = getAttributeValue(attrs, 'category');
  const prestige = getPrestigeScore(make, model, era, category);

  const deadline = auction.sort?.deadline ? new Date(auction.sort.deadline) : null;
  const timing = deadline ? getTimingBonus(deadline) : 0;

  const score = 0.35 * bidsSignal + 0.20 * viewsSignal + 0.25 * predsSignal + 0.15 * prestige + 0.05 * timing;
  return Math.round(score * 1000) / 1000;
}
