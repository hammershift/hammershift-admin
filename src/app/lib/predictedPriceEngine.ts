import Auctions from '@/app/models/auction.model';
import { app } from '@/app/lib/firebase';
import { getAI, getGenerativeModel, VertexAIBackend } from 'firebase/ai';
import { getAttributeValue } from './trendScorer';
import { roundToNearest500 } from './marketQuestionBuilder';

export async function getHistoricalComps(
  make: string,
  model: string,
  year: number
): Promise<number[]> {
  if (!make || !year) return [];

  try {
    const yearMin = year - 3;
    const yearMax = year + 3;

    const comps = await Auctions.find({
      ended: true,
      avg_predicted_price: { $gt: 0 },
      attributes: {
        $all: [
          { $elemMatch: { key: 'make', value: { $regex: new RegExp(make, 'i') } } },
          { $elemMatch: { key: 'year', value: { $gte: String(yearMin), $lte: String(yearMax) } } },
        ],
      },
    })
      .select('avg_predicted_price')
      .limit(10)
      .lean() as any[];

    return comps.map((c) => c.avg_predicted_price).filter((p) => p > 0);
  } catch {
    return [];
  }
}

export async function callGeminiForPrice(auction: any): Promise<number | null> {
  try {
    const description = Array.isArray(auction.description)
      ? auction.description.join(' ')
      : String(auction.description || auction.title || '');

    if (!description) return null;

    const vertexAI = getAI(app, { backend: new VertexAIBackend('global') });
    const model = getGenerativeModel(vertexAI, {
      model: process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash-lite',
      tools: [{ googleSearch: {} }],
    });

    const result = await model.generateContent({
      systemInstruction: {
        text: 'You are a classic car auction expert. Predict the final hammer price for the following auction. Respond with ONLY the predicted price in this exact format: [125000] where the number is the price in USD. No other text.',
      },
      contents: [{ role: 'user', parts: [{ text: description }] }],
    });

    const response = result.response.text();
    const match = response.match(/\[(\d+)\]/);
    if (!match) return null;

    return parseInt(match[1], 10);
  } catch {
    return null;
  }
}

export async function computePredictedPrice(
  auction: any,
  geminiCallsUsed: { count: number },
  maxGeminiCalls: number
): Promise<number> {
  const attrs = auction.attributes || [];
  const make = getAttributeValue(attrs, 'make');
  const model = getAttributeValue(attrs, 'model');
  const yearStr = getAttributeValue(attrs, 'year');
  const year = parseInt(yearStr, 10) || 0;

  // Step 1: Historical comps
  const comps = await getHistoricalComps(make, model, year);
  if (comps.length >= 3) {
    const sorted = [...comps].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    return roundToNearest500(median);
  }

  // Step 2: Existing avg_predicted_price
  if (auction.avg_predicted_price && auction.avg_predicted_price > 0) {
    return roundToNearest500(auction.avg_predicted_price);
  }

  // Step 3: Gemini
  if (geminiCallsUsed.count < maxGeminiCalls) {
    geminiCallsUsed.count++;
    const geminiPrice = await callGeminiForPrice(auction);
    if (geminiPrice && geminiPrice > 0) {
      return roundToNearest500(geminiPrice);
    }
  }

  // Step 4: Multiplier fallback
  const currentPrice = auction.sort?.price || 0;
  if (currentPrice > 0) {
    const makeL = make.toLowerCase();
    let multiplier = 1.4;
    if (makeL.includes('ferrari') || makeL.includes('lamborghini') || makeL.includes('mclaren')) multiplier = 2.5;
    else if (makeL.includes('porsche')) multiplier = 2.0;
    else if (makeL.includes('corvette') || makeL.includes('shelby')) multiplier = 1.7;
    return roundToNearest500(currentPrice * multiplier);
  }

  return 0;
}
