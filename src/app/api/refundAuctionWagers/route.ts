import clientPromise from '@/app/lib/mongoDB';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    const { wager_id } = await req.json();

    //edit refunded field to true and add delete reason
    const updatedWager = await db.collection("wagers").findOneAndUpdate(
      { _id: new ObjectId(wager_id) },
      { $set: { deleteReason: "Admin Refund", refunded: true } },
      { returnDocument: "after" }
    );

    const user = await db.collection('users').findOne({ _id: new ObjectId(updatedWager?.user._id) });

    const updatedBalance = (user?.balance || 0) + updatedWager?.wagerAmount;

    //update user's balance
    await db.collection('users').updateOne({ _id: user?._id }, { $set: { balance: updatedBalance } });

    //create refund transaction
    await db.collection('transactions').insertOne({
      userID: user?._id,
      wagerID: updatedWager?._id,
      auctionID: updatedWager?.auctionID,
      transactionType: 'refund',
      amount: updatedWager?.wagerAmount,
      type: '+',
      transactionDate: new Date(),
    })

    return NextResponse.json(
      { message: 'Refund processed successfully' }, 
      { status: 200 }
    );

  } catch (error) {
    console.error('Error processing refund:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}