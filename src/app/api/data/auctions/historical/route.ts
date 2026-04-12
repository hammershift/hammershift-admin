import { NextRequest, NextResponse } from 'next/server';
import connectToDB from '@/app/lib/mongoose';
import mongoose from 'mongoose';
import MMApiKeyModel from '@/app/models/MMApiKey.model';

export const dynamic = 'force-dynamic';

async function validateApiKey(req: NextRequest): Promise<boolean> {
  const apiKey = req.headers.get('x-api-key');
  if (!apiKey || !apiKey.startsWith('mm_')) return false;

  await connectToDB();
  const keys = await MMApiKeyModel.find({ isActive: true }).lean();
  for (const key of keys) {
    const isValid = await MMApiKeyModel.validateKey(apiKey, key.apiKey);
    if (isValid) {
      // Update last used (fire and forget)
      MMApiKeyModel.updateOne({ _id: key._id }, { $set: { lastUsedAt: new Date() } }).exec();
      return true;
    }
  }
  return false;
}

function titleCase(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractAttr(
  attributes: Array<{ key: string; value: unknown }>,
  key: string
): string | null {
  const attr = attributes.find(
    (a) => a.key?.toLowerCase() === key.toLowerCase()
  );
  if (!attr || attr.value == null || String(attr.value).trim() === '') return null;
  return String(attr.value).trim();
}

export async function GET(req: NextRequest) {
  try {
    const authorized = await validateApiKey(req);
    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized — provide a valid API key via x-api-key header' },
        { status: 401 }
      );
    }

    await connectToDB();
    const db = mongoose.connection.db!;
    const params = req.nextUrl.searchParams;

    // Parse query params
    const make = params.get('make');
    const model = params.get('model');
    const trim = params.get('trim');
    const yearMin = params.get('yearMin') ? parseInt(params.get('yearMin')!, 10) : null;
    const yearMax = params.get('yearMax') ? parseInt(params.get('yearMax')!, 10) : null;
    const priceMin = params.get('priceMin') ? parseFloat(params.get('priceMin')!) : null;
    const priceMax = params.get('priceMax') ? parseFloat(params.get('priceMax')!) : null;
    const from = params.get('from');
    const to = params.get('to');
    const page = Math.max(1, parseInt(params.get('page') || '1', 10));
    const pageSize = Math.min(5000, Math.max(1, parseInt(params.get('pageSize') || '500', 10)));
    const sort = params.get('sort') === 'date_desc' ? -1 : 1;

    // Stage 1: Join auctions with polygon_markets to get hammer prices
    const pipeline: Record<string, unknown>[] = [
      {
        $lookup: {
          from: 'polygon_markets',
          localField: 'auction_id',
          foreignField: 'auctionId',
          as: 'market',
        },
      },
      { $unwind: { path: '$market', preserveNullAndEmptyArrays: false } },
      // Only resolved auctions with a hammer price
      {
        $match: {
          'market.hammerPrice': { $exists: true, $ne: null, $gt: 0 },
          'market.status': 'RESOLVED',
        },
      },
    ];

    // Stage 2: Extract attributes into flat fields
    pipeline.push({
      $addFields: {
        _make: {
          $let: {
            vars: {
              found: {
                $filter: {
                  input: { $ifNull: ['$attributes', []] },
                  as: 'a',
                  cond: { $eq: [{ $toLower: '$$a.key' }, 'make'] },
                },
              },
            },
            in: { $arrayElemAt: ['$$found.value', 0] },
          },
        },
        _model: {
          $let: {
            vars: {
              found: {
                $filter: {
                  input: { $ifNull: ['$attributes', []] },
                  as: 'a',
                  cond: { $eq: [{ $toLower: '$$a.key' }, 'model'] },
                },
              },
            },
            in: { $arrayElemAt: ['$$found.value', 0] },
          },
        },
        _trim: {
          $let: {
            vars: {
              found: {
                $filter: {
                  input: { $ifNull: ['$attributes', []] },
                  as: 'a',
                  cond: { $eq: [{ $toLower: '$$a.key' }, 'trim'] },
                },
              },
            },
            in: { $arrayElemAt: ['$$found.value', 0] },
          },
        },
        _year: {
          $let: {
            vars: {
              found: {
                $filter: {
                  input: { $ifNull: ['$attributes', []] },
                  as: 'a',
                  cond: { $eq: [{ $toLower: '$$a.key' }, 'year'] },
                },
              },
            },
            in: { $toInt: { $ifNull: [{ $arrayElemAt: ['$$found.value', 0] }, 0] } },
          },
        },
        _date: { $ifNull: ['$market.resolvedAt', '$sort.deadline', '$updatedAt'] },
        _price: '$market.hammerPrice',
      },
    });

    // Stage 3: Require make and price (skip incomplete data)
    pipeline.push({
      $match: {
        _make: { $exists: true, $ne: null },
        _price: { $gt: 0 },
      },
    });

    // Stage 4: Apply filters
    const filterMatch: Record<string, unknown> = {};
    if (make) filterMatch._make = { $regex: new RegExp(`^${make}$`, 'i') };
    if (model) filterMatch._model = { $regex: new RegExp(`^${model}$`, 'i') };
    if (trim) filterMatch._trim = { $regex: new RegExp(trim, 'i') };
    if (yearMin || yearMax) {
      filterMatch._year = {};
      if (yearMin) (filterMatch._year as Record<string, number>).$gte = yearMin;
      if (yearMax) (filterMatch._year as Record<string, number>).$lte = yearMax;
    }
    if (priceMin || priceMax) {
      filterMatch._price = {};
      if (priceMin) (filterMatch._price as Record<string, number>).$gte = priceMin;
      if (priceMax) (filterMatch._price as Record<string, number>).$lte = priceMax;
    }
    if (from || to) {
      filterMatch._date = {};
      if (from) (filterMatch._date as Record<string, Date>).$gte = new Date(from);
      if (to) (filterMatch._date as Record<string, Date>).$lte = new Date(to);
    }
    if (Object.keys(filterMatch).length > 0) {
      pipeline.push({ $match: filterMatch });
    }

    // Stage 5: Sort
    pipeline.push({ $sort: { _date: sort } });

    // Get total count via facet
    const facetPipeline = [
      ...pipeline,
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize },
            {
              $project: {
                _id: 0,
                date: { $dateToString: { format: '%Y-%m-%d', date: '$_date' } },
                price: { $toInt: '$_price' },
                make: '$_make',
                model: '$_model',
                trim: '$_trim',
                year: '$_year',
              },
            },
          ],
        },
      },
    ];

    const [result] = await db.collection('auctions').aggregate(facetPipeline).toArray();
    const total = result.metadata[0]?.total || 0;
    const data = (result.data as Array<Record<string, unknown>>).map((row) => ({
      date: row.date as string,
      price: row.price as number,
      make: titleCase(String(row.make || '')),
      model: titleCase(String(row.model || '')),
      trim: row.trim ? titleCase(String(row.trim)) : null,
      year: (row.year as number) || null,
    }));

    return NextResponse.json({
      count: total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      data,
    });
  } catch (error) {
    console.error('Historical auctions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
