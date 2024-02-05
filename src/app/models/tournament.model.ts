import mongoose from "mongoose";
import TournamentsPage from "../dashboard/tournaments/page";

const winnerSchema = new mongoose.Schema(
    {
        id: mongoose.Types.ObjectId,
        username: String,
        winnings: Number,
    },
    { _id: false }
);

const tournamentSchema = new mongoose.Schema(
    {
        auctionID: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Auction",
            },
        ],
        // winner: [winnerSchema],
        buyInFee: {
            type: Number,
            required: true,
        },
        finalPrize: {
            type: Number,
            required: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        startTime: {
            type: String,
            required: true,
        },
        endTime: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const Tournaments =
    mongoose.models.tournaments ||
    mongoose.model("tournament", tournamentSchema);

export default Tournaments;
