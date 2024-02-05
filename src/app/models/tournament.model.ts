import mongoose from "mongoose";

const tournamentSchema = new mongoose.Schema(
    {
        auctionID: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Auction",
            },
        ],
        winner: [
            {
                type: mongoose.Types.ObjectId,
                ref: "User",
            },
        ],
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
        totalWagers: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

const Tournament = mongoose.model("Tournament", tournamentSchema);

export default Tournament;
