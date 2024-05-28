import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/app/lib/mongoDB';

export async function POST(req: NextRequest) {
  try {
    const { transactionId } = await req.json();
    console.log('Approval request data:', { transactionId });

    const transactionID = new ObjectId(transactionId);
    const client = await clientPromise;
    const db = client.db();

    const transaction = await db.collection('transactions').findOne({ _id: transactionID });
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    console.log('Transaction found:', transaction);

    const userID = transaction.userID;
    console.log('User ID:', userID);
    const user = await db.collection('users').findOne({ _id: userID });
    if (!user) {
      throw new Error('User not found');
    }
    console.log('User found:', user);

    // check for wallet balance
    if (user.balance < transaction.amount) {
      console.error('Insufficient balance', user.balance);
      throw new Error('Insufficient balance');
    }
    console.log('Sufficient balance:', user.balance);

    // deduct amount from wallet
    const newBalance = user.balance - transaction.amount;
    await db.collection('users').updateOne({ _id: userID }, { $set: { balance: newBalance } });
    console.log('User balance updated:', newBalance);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error approving transaction:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { transactionId, transactionNote } = await req.json();
    console.log('Update request data:', { transactionId, transactionNote });

    const transactionID = new ObjectId(transactionId);
    const client = await clientPromise;
    const db = client.db();

    const transaction = await db.collection('transactions').findOne({ _id: transactionID });
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    console.log('Transaction found:', transaction);

    // update transaction status and add note
    await db.collection('transactions').updateOne({ _id: transactionID }, { $set: { status: 'successful', note: transactionNote } });
    console.log('Transaction status updated:', 'successful');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
