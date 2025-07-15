import mongoose, {
  Document,
  Schema,
  PaginateModel,
  AggregatePaginateModel,
  Types,
} from "mongoose";
import aggregatePaginate from "mongoose-aggregate-paginate-v2";
import paginate from "mongoose-paginate-v2";

export interface TournamentUser {
  // _id: Types.ObjectId;
  userId: Types.ObjectId;
  fullName: string;
  username: string;
  role: string;
  delta?: number;
  rank?: number;
  points?: number;
}

export interface Tournament extends Document {
  _id: Types.ObjectId;
  tournament_id: number;
  name: string;
  description: string;
  type: string;
  prizePool: number;
  buyInFee: number;
  haveWinners: boolean;
  isActive: boolean;
  startTime: Date;
  endTime: Date;
  auction_ids: string[];
  users: TournamentUser[];
  maxUsers: number;
  createdAt: Date;
}

const tournamentUserSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["USER", "AGENT"],
      required: true,
    },
    delta: {
      type: Number,
      required: false,
    },
    rank: {
      type: Number,
      required: false,
    },
    points: {
      type: Number,
      required: false,
    },
  },
  { _id: false }
);

const tournamentWinnerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Types.ObjectId,
  },
});

// const winnerSchema = new mongoose.Schema(
//   {
//     id: mongoose.Types.ObjectId,
//     username: String,
//     winnings: Number,
//   },
//   { _id: false }
// );

const tournamentSchema = new Schema(
  {
    tournament_id: {
      type: Number,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    prizePool: {
      type: Number,
      required: true,
      default: 0,
    },
    buyInFee: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    haveWinners: {
      type: Boolean,
      default: false,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    auction_ids: {
      type: [String],
      default: [],
    },
    users: {
      type: [tournamentUserSchema],
      default: [],
    },
    maxUsers: {
      type: Number,
      required: true,
    },
    // winners: {
    //   type: [TournamentWinner],
    //   default: [],
    // }
  },
  { collection: "tournaments", timestamps: true }
);

tournamentSchema.plugin(aggregatePaginate);
tournamentSchema.plugin(paginate);

type TournamentModelType =
  | AggregatePaginateModel<Tournament>
  | PaginateModel<Tournament>;
const Tournaments =
  (mongoose.models.tournaments as TournamentModelType) ||
  mongoose.model<Tournament, TournamentModelType>(
    "tournaments",
    tournamentSchema,
    "tournaments"
  );

export default Tournaments;
