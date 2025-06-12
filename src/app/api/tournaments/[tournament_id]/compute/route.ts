import connectToDB from "@/app/lib/mongoose";
import Tournaments from "@/app/models/tournament.model";
import Auctions from "@/app/models/auction.model";
import Predictions from "@/app/models/prediction.model";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";

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

    const auctionMap = new Map(
      auctions.map((auction) => [auction.auction_id, auction])
    );
    //start computation of user scores
    const userScores = [];
    for (let user of tournament.users) {
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
        username: user.username,
        role: user.role,
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

    //get the highest value of correctCount
    const highestCount = Math.max(
      ...userScores.map((user) => user.correctCount)
    );

    //get userScore with highest correctCount
    const usersToCheck = userScores.filter(
      (user) => user.correctCount === highestCount
    );

    //check if there is a tie
    if (usersToCheck.length > 1) {
      //TODO: sort scores via their delta and get the lowest
    } else {
      //TODO: award the winner
    }

    //sort users by delta, asc
    const sortedScores = userScores.sort((a, b) => a.delta - b.delta);

    //TODO: figure out how many winners are needed
    //TODO: implement tiebreakers
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}
