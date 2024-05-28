import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/app/lib/mongoDB';

export async function POST(req: NextRequest) {
  try {
    const { transactionId, transactionNote } = await req.json();
    console.log('Decline request data:', { transactionId, transactionNote });

    const transactionID = new ObjectId(transactionId);
    const client = await clientPromise;
    const db = client.db();

    const transaction = await db.collection('transactions').findOne({ _id: transactionID });
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    console.log('Transaction found:', transaction);

    // update transaction status and add note
    await db.collection('transactions').updateOne({ _id: transactionID }, { $set: { status: 'failed', note: transactionNote } });
    console.log('Transaction status updated:', 'failed');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rejecting transaction:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
