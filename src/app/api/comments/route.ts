import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import clientPromise from "@/app/lib/mongoDB";
import { ObjectId } from 'mongodb';

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db();
        const parent_id = req.nextUrl.searchParams.get("parent_id");
        const offset = Number(req.nextUrl.searchParams.get("offset")) || 0;
        const limit = Number(req.nextUrl.searchParams.get("limit")) || 0;
        const sort = req.nextUrl.searchParams.get("sort");

        switch (sort) {
            case "newest": {
                const newestComments = await db
                    .collection("comments")
                    .find()
                    .limit(limit)
                    .skip(offset)
                    .sort({ createdAt: -1 })
                    .toArray();
                return NextResponse.json(newestComments);
            }
                
            case "oldest": {
                const oldestComments = await db
                    .collection("comments")
                    .find()
                    .limit(limit)
                    .skip(offset)
                    .sort({ createdAt: 1 })
                    .toArray();
                return NextResponse.json(oldestComments);
            }
                
            case "likes": {
                const commentsByLikes = await db.collection("comments").aggregate([
                    {
                        $addFields: {
                            likesCount: { $size: "$likes" }
                        }
                    },
                    { $sort: { likesCount: -1 } },
                    { $limit: limit },
                    { $skip: offset }
                ]).toArray();

                return NextResponse.json(commentsByLikes);
            }

            case "dislikes": {
                const commentsByDislikes = await db.collection("comments").aggregate([
                    {
                        $addFields: {
                            dislikesCount: { $size: "$dislikes" }
                        }
                    },
                    { $sort: { dislikesCount: -1 } },
                    { $limit: limit },
                    { $skip: offset }
                ]).toArray();

                return NextResponse.json(commentsByDislikes);
            }
        
            default:
                break;
        }

        if (parent_id) {
            const comment = await db
                .collection("comments")
                .find({ parentID: new ObjectId(parent_id) }).toArray();

            return NextResponse.json(comment);
        }

        const comments = await db
            .collection("comments")
            .find()
            .limit(limit)
            .skip(offset).toArray();

        return NextResponse.json(comments);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Internal server error" });
    }
}

export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const { ids } = await req.json();

    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 400 });
    }

    if (!ids) {
        return NextResponse.json({ message: 'Error parsing JSON from request body' }, { status: 400 });
    }

    try {
        const client = await clientPromise;
        const db = client.db();

        const objectIDs = ids.map((id: string) => new ObjectId(id));

        await db.collection('comments').deleteMany(
            { _id: { $in: objectIDs } }
        );

        await db.collection('comments').deleteMany(
            { parentID: { $in: objectIDs } }
        );

        return NextResponse.json(
            {
                message: "comments deleted"
            },
            { status: 200 }
        );

    } catch (error) {
        console.error('Error in deleting comment', error);
        return NextResponse.json({ message: 'Server error in deleting comment' }, { status: 500 });
    }
}
