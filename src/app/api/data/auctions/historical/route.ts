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

// Extract a string attribute value from the attributes array
function attrVal(key: string) {
  return {
    $let: {
      vars: {
        el: {
          $first: {
            $filter: { input: '$attributes', as: 'a', cond: { $eq: ['$$a.key', key] } },
          },
        },
      },
      in: '$$el.value',
    },
  };
}

// Extract an integer attribute value with safe conversion
function attrValInt(key: string) {
  return {
    $let: {
      vars: {
        el: {
          $first: {
            $filter: { input: '$attributes', as: 'a', cond: { $eq: ['$$a.key', key] } },
          },
        },
      },
      in: { $convert: { input: '$$el.value', to: 'int', onError: 0, onNull: 0 } },
    },
  };
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

    // Stage 1: Match ended auctions with price and make attribute
    const pipeline: Record<string, unknown>[] = [
      {
        $match: {
          ended: true,
          'sort.price': { $gt: 0 },
          'attributes.key': 'make',
        },
      },
      // Stage 2: Slim down docs before sort (critical for 32MB sort limit)
      { $project: { attributes: 1, 'sort.price': 1, 'sort.deadline': 1, updatedAt: 1 } },
    ];

    // Stage 3: Extract attributes needed for filtering before the facet
    // Only extract what's needed for filters at this stage
    const needsPreExtract = make || model || trim || yearMin || yearMax || priceMin || priceMax;
    if (needsPreExtract) {
      const addFields: Record<string, unknown> = {};
      if (make) addFields._make = attrVal('make');
      if (model) addFields._model = attrVal('model');
      if (trim) addFields._trim = attrVal('trim');
      if (yearMin || yearMax) addFields._year = attrValInt('year');
      pipeline.push({ $addFields: addFields });

      // Apply filters
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
        filterMatch['sort.price'] = {};
        if (priceMin) (filterMatch['sort.price'] as Record<string, number>).$gte = priceMin;
        if (priceMax) (filterMatch['sort.price'] as Record<string, number>).$lte = priceMax;
      }
      pipeline.push({ $match: filterMatch });
    }

    // Date range filter (on sort.deadline)
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.$gte = new Date(from);
      if (to) dateFilter.$lte = new Date(to);
      pipeline.push({ $match: { 'sort.deadline': dateFilter } });
    }

    // Stage 4: Sort (on slim docs after filtering)
    pipeline.push({ $sort: { 'sort.deadline': sort } });

    // Stage 5: Facet — count + paginate, then extract remaining attributes inside data branch
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          { $skip: (page - 1) * pageSize },
          { $limit: pageSize },
          {
            $addFields: {
              _make: attrVal('make'),
              _model: attrVal('model'),
              _trim: attrVal('trim'),
              _year: attrValInt('year'),
            },
          },
          {
            $project: {
              _id: 0,
              date: { $dateToString: { format: '%Y-%m-%d', date: { $ifNull: ['$sort.deadline', '$updatedAt'] } } },
              price: { $toInt: '$sort.price' },
              make: '$_make',
              model: '$_model',
              trim: '$_trim',
              year: '$_year',
            },
          },
        ],
      },
    });

    const [result] = await db.collection('auctions').aggregate(pipeline).toArray();
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
