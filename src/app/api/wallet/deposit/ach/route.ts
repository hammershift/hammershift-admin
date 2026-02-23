import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { withRateLimit, RateLimitPresets } from '@/app/lib/rateLimiter';
import ACHAccounts from '@/app/models/achAccount.model';
import WalletTransactions from '@/app/models/walletTransaction.model';
import Users from '@/app/models/user.model';
import connectToDB from '@/app/lib/mongoose';
import { Types } from 'mongoose';

/**
 * POST /api/wallet/deposit/ach
 *
 * Initiate ACH deposit (stubbed - does not actually process payment)
 */
export const POST = withRateLimit(
  RateLimitPresets.STANDARD,
  async (req: NextRequest) => {
    try {
      // 1. Validate session
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // 2. Parse request body
      const body = await req.json();
      const { amount, routingNumber, accountNumber, accountType } = body;

      if (!amount || !routingNumber || !accountNumber || !accountType) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }

      if (amount <= 0) {
        return NextResponse.json(
          { error: 'Amount must be positive' },
          { status: 400 }
        );
      }

      if (!['checking', 'savings'].includes(accountType)) {
        return NextResponse.json(
          { error: 'Invalid account type' },
          { status: 400 }
        );
      }

      // 3. Connect to database
      await connectToDB();

      // 4. Get user
      const user = await Users.findById(session.user.id);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // 5. Save/update ACH account (store only last 4 digits)
      const accountNumberLast4 = accountNumber.slice(-4);

      const existingAccount = await ACHAccounts.findOne({
        user_id: user._id,
      });

      if (!existingAccount) {
        await ACHAccounts.create({
          user_id: user._id,
          routing_number: routingNumber, // In real impl, encrypt this
          account_number_last4: accountNumberLast4,
          account_type: accountType,
          is_verified: false,
        });
      }

      // 6. Generate mock transaction ID
      const transactionId = `ach_${Date.now()}_${user._id}`;

      // 7. Calculate available date (3 business days from now - simplified)
      const availableDate = new Date();
      availableDate.setDate(availableDate.getDate() + 3);

      // 8. Create transaction record
      await WalletTransactions.create({
        user_id: user._id,
        transaction_id: transactionId,
        type: 'deposit',
        method: 'ach',
        amount,
        status: 'pending',
        available_date: availableDate,
      });

      // 9. Increment deposit count
      user.deposit_count = (user.deposit_count || 0) + 1;
      await user.save();

      return NextResponse.json(
        {
          transactionId,
          status: 'pending',
          availableDate: availableDate.toISOString(),
        },
        { status: 200 }
      );
    } catch (error: any) {
      console.error('[ACH Deposit API] Error:', error);

      return NextResponse.json(
        { error: 'Failed to process ACH deposit', message: error.message },
        { status: 500 }
      );
    }
  }
);
