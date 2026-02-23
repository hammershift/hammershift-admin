import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import connectToDB from '@/app/lib/mongoose';
import Predictions from '@/app/models/prediction.model';
import Users from '@/app/models/user.model';
import { withRateLimit, RateLimitPresets } from '@/app/lib/rateLimiter';

/**
 * POST /api/guest/migrate
 *
 * Migrates guest predictions from localStorage to authenticated user account.
 * Implements idempotent behavior - skips predictions that already exist.
 *
 * Rate limited: 10 requests per hour (prevents abuse)
 *
 * Request body:
 * {
 *   predictions: [
 *     { auctionId: string, predictedPrice: number }
 *   ]
 * }
 *
 * Response:
 * {
 *   migrated: number,  // Count of new predictions created
 *   skipped: number,   // Count of duplicates skipped
 *   details: string[]  // List of auction IDs processed
 * }
 */

interface GuestPrediction {
  auctionId: string;
  predictedPrice: number;
}

interface MigrationRequestBody {
  predictions: GuestPrediction[];
}

async function handlePOST(req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to migrate predictions' },
        { status: 401 }
      );
    }

    // 2. Connect to database
    await connectToDB();

    // 3. Parse and validate request body
    const body: MigrationRequestBody = await req.json();
    const { predictions } = body;

    if (!predictions || !Array.isArray(predictions)) {
      return NextResponse.json(
        { error: 'Invalid request - predictions array is required' },
        { status: 400 }
      );
    }

    // 4. Enforce maximum 3 predictions limit (guest limit)
    if (predictions.length > 3) {
      return NextResponse.json(
        { error: 'Maximum 3 predictions allowed for guest migration' },
        { status: 400 }
      );
    }

    // 5. Validate prediction data
    for (const pred of predictions) {
      if (!pred.auctionId || typeof pred.predictedPrice !== 'number') {
        return NextResponse.json(
          { error: 'Invalid prediction data - auctionId and predictedPrice required' },
          { status: 400 }
        );
      }

      if (pred.predictedPrice <= 0) {
        return NextResponse.json(
          { error: 'Invalid prediction - predictedPrice must be positive' },
          { status: 400 }
        );
      }
    }

    // 6. Fetch user details for prediction metadata
    const user = await Users.findById(session.user.id);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 7. Process predictions (idempotent - skip duplicates)
    let migrated = 0;
    let skipped = 0;
    const details: string[] = [];

    for (const pred of predictions) {
      // Check if prediction already exists (idempotent check)
      const existingPrediction = await Predictions.findOne({
        auction_id: pred.auctionId,
        'user.userId': session.user.id,
      });

      if (existingPrediction) {
        // Skip duplicate - prediction already exists
        skipped++;
        details.push(`Skipped: ${pred.auctionId} (already exists)`);
        continue;
      }

      // Create new prediction
      await Predictions.create({
        auction_id: pred.auctionId,
        predictedPrice: pred.predictedPrice,
        predictionType: 'STANDARD', // Guest predictions are standard type
        wagerAmount: 0, // Guest predictions have no wager
        user: {
          userId: user._id,
          fullName: user.fullName || user.username,
          username: user.username,
          role: 'USER',
        },
        isActive: true,
        refunded: false,
        bonus_modifiers: {
          early_bird: false,
          streak_bonus: false,
          bullseye: false,
          tournament_multiplier: false,
        },
      });

      migrated++;
      details.push(`Migrated: ${pred.auctionId}`);
    }

    // 8. Return success response
    return NextResponse.json({
      migrated,
      skipped,
      details,
      message: `Successfully migrated ${migrated} prediction(s), skipped ${skipped} duplicate(s)`,
    }, { status: 200 });

  } catch (error) {
    console.error('Guest migration error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error during migration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Apply rate limiting: STRICT preset (10 requests per hour)
export const POST = withRateLimit(
  RateLimitPresets.STRICT,
  handlePOST
);
