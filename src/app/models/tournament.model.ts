import mongoose from "mongoose";

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
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        startTime: {
            type: Date,
            required: true,
        },
        endTime: {
            type: Date,
            required: true,
        },
    },
    { timestamps: true }
);

const Tournament = mongoose.model("Tournament", tournamentSchema);

export default Tournament;
