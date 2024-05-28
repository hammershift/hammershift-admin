import clientPromise from '@/app/lib/mongoDB';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const transaction_id = req.nextUrl.searchParams.get('transaction_id');
    const offset = Number(req.nextUrl.searchParams.get('offset')) || 0;
    const limit = Number(req.nextUrl.searchParams.get('limit')) || 10;

    // Fetch a single withdraw transaction by transaction_id
    if (transaction_id) {
      const transaction = await db.collection('transactions').findOne({
        _id: new ObjectId(transaction_id),
        transactionType: 'withdraw',
      });
      if (!transaction) {
        return NextResponse.json({ message: 'Transaction not found' }, { status: 404 });
      }
      return NextResponse.json(transaction);
    }

    // Fetch all withdraw transactions with status 'processing'
    const transactions = await db.collection('transactions').find({ transactionType: 'withdraw' }).toArray();
    // console.log('Fetched transactions:', transactions);

    return NextResponse.json(transactions);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}