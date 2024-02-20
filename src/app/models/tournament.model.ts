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
        title: {
            type: String,
            required: true,
        },
        // winner: [winnerSchema],
        buyInFee: {
            type: Number,
            required: true,
        },
        pot: {
            type: Number,
            default: 0,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        status: {
            type: Number,
            default: 1,
        },
        startTime: {
            type: String,
            required: true,
        },
        endTime: {
            type: String,
            required: true,
        },
        tournamentEndTime: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const Tournaments =
    mongoose.models.tournaments ||
    mongoose.model("tournaments", tournamentSchema);

export default Tournaments;
