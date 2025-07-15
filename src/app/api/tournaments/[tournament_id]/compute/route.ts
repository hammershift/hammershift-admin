import connectToDB from "@/app/lib/mongoose";
import Tournaments from "@/app/models/tournament.model";
import Auctions from "@/app/models/auction.model";
import Predictions from "@/app/models/prediction.model";
import Points from "@/app/models/auction_points.model";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";

interface Player {
  userId: Types.ObjectId;
  fullName: string;
  username: string;
  role: string;
  delta: number;
  correctCount: number;
}

export async function PUT(
  req: NextRequest,
  context: { params: { tournament_id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (
      session?.user.role !== "owner" &&
      session?.user.role !== "admin" &&
      session?.user.role !== "moderator"
    ) {
      return NextResponse.json(
        {
          message:
            "Unauthorized! Your role does not have access to this function",
        },
        { status: 400 }
      );
    }

    const { tournament_id } = context.params;

    if (!tournament_id) {
      return NextResponse.json(
        { message: "tournament_id is required" },
        { status: 400 }
      );
    }

    await connectToDB();

    const tournament = await Tournaments.findOne({
      tournament_id: parseInt(tournament_id),
    });

    if (!tournament) {
      return NextResponse.json(
        { message: `Tournament ${tournament_id} not found` },
        { status: 404 }
      );
    }

    if (tournament.users.length === 0) {
      return NextResponse.json(
        { message: `Tournament ${tournament_id} has no participants` },
        { status: 400 }
      );
    }

    const auctions = await Auctions.find({
      auction_id: {
        $in: tournament.auction_ids,
      },
    });

    if (
      auctions.some(
        (a) => a.attributes[14].value === 1 || !a.statusAndPriceChecked
      )
    ) {
      return NextResponse.json(
        {
          message:
            "One or more auctions has not ended yet, and does not have the final price",
        },
        { status: 400 }
      );
    }

    if (auctions.every((a) => a.attributes[14].value === 3)) {
      //all auctions are unsuccessful

      await Predictions.updateMany(
        {
          tournament_id: tournament.tournament_id,
          isActive: true,
        },
        {
          $set: {
            isActive: false,
          },
        }
      );
      return NextResponse.json({
        message: "All auctions in the tournament are unsuccessful",
        status: 200,
      });
    }

    const auctionMap = new Map(
      auctions.map((auction) => [auction.auction_id, auction])
    );
    //start computation of user scores
    const userScores = [];
    //console.log(tournament.users);
    for (const user of tournament.users) {
      //get user's predictions for the tournament
      const userPredictions = await Predictions.find({
        "user.userId": user.userId,
        auction_id: {
          $in: tournament.auction_ids,
        },
        tournament_id: tournament.tournament_id,
      });

      let userScore = {
        userId: user.userId,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
        rank: 0,
        points: 0,
        delta: 0,
        correctCount: 0,
      };

      // check how many predictions are below the final price
      for (let prediction of userPredictions) {
        const auction = auctionMap.get(prediction.auction_id);
        if (!auction) {
          return NextResponse.json(
            {
              message: `Auction ${prediction.auction_id} not found, aborting.`,
            },
            { status: 404 }
          );
        }

        //the auction was unsuccessful, skip
        if (auction.attributes[14].value === 3) {
          continue;
        }
        //get the difference between the predicted price and the final price
        //if prediction is higher than final price, set delta to final price (tentative)
        const finalSellingPrice = auction.attributes[0].value;

        if (prediction.predictedPrice <= finalSellingPrice) {
          userScore.correctCount++;
          const delta = finalSellingPrice - prediction.predictedPrice;
          userScore.delta += delta;
        }
        // const delta =
        //   prediction.predictedPrice <= finalSellingPrice
        //     ? finalSellingPrice - prediction.predictedPrice
        //     : finalSellingPrice;
        // userScore.delta += delta;
      }
      userScores.push(userScore);
    }

    //differentiate between free play and paid, if free play use number of auctions * 10 for points, then for paid use whatever is set for the pot
    //TODO: currently defaulted to free
    const pot = 10 * tournament.auction_ids.length;
    const rankings = [];
    let currentDelta = -1;
    let currentRankingIndex = -1;

    const sortedUsers = userScores.sort((a, b) => {
      //sort correctCount in descending order
      if (a.correctCount < b.correctCount) return 1;
      if (a.correctCount > b.correctCount) return -1;

      //sort delta in ascending order if correctCount is equal
      if (a.delta < b.delta) return -1;
      if (a.delta > b.delta) return 1;

      return 0;
    });

    for (let i = 0; i < sortedUsers.length; i++) {
      const user = sortedUsers[i];
      if (currentDelta === -1) currentDelta = user.delta;
      if (currentRankingIndex === -1) currentRankingIndex = 0;

      if (currentDelta === user.delta) {
        if (!rankings[currentRankingIndex]) {
          rankings[currentRankingIndex] = {
            delta: currentDelta,
            users: [],
          };
        }

        (rankings[currentRankingIndex].users as Player[]).push(user);
      } else {
        currentDelta = user.delta;
        currentRankingIndex++;
        if (i < 3) {
          rankings[currentRankingIndex] = {
            delta: currentDelta,
            users: [user],
          };
        } else break;
      }
    }

    const distribution = [50, 30, 20];
    for (let i = 0; i < rankings.length; i++) {
      for (const user of rankings[i].users) {
        const points =
          (pot * (distribution[i] / 100)) / rankings[i].users.length;
        await Points.create({
          refId: tournament._id,
          refCollection: "tournaments",
          points: points,
          rank: i + 1,
          user: {
            userId: user.userId,
            fullName: user.fullName,
            username: user.username,
            role: user.role,
          },
        });
        //update user object in ranking
        const userIndex = tournament.users.findIndex(
          (x) => x.userId === user.userId
        );

        tournament.users[userIndex].points = points;
        tournament.users[userIndex].rank = i + 1;
        tournament.users[userIndex].delta = user.delta;
      }
    }
    //update all predictions for tournament, set isActive to false
    await Predictions.updateMany(
      {
        tournament_id: tournament.tournament_id,
        isActive: true,
      },
      {
        $set: {
          isActive: false,
        },
      }
    );

    tournament.haveWinners = true;

    await tournament.save();

    //go over all auctions and then update status
    // for (let auction of auctions) {
    //   await Auctions.updateOne(
    //     {
    //       auction_id: auction.auction_id,
    //     },
    //     {
    //       $set: {
    //         isProcessed: true,
    //         ended: true,
    //       },
    //     }
    //   );
    // }

    return NextResponse.json(
      {
        data: tournament,
        message: `Successfully computed scores for tournament ${tournament_id}`,
      },
      { status: 201 }
    );
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}
