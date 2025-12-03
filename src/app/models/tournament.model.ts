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
  banner: string;
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
      type: Schema.Types.ObjectId,
      ref: "User",
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
      default: 0,
    },
    rank: {
      type: Number,
      required: false,
      default: 0,
    },
    points: {
      type: Number,
      required: false,
      default: 0,
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
    banner: {
      type: String,
      required: false,
      default: "",
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
      type: [Schema.Types.ObjectId],
      required: true,
      ref: "Auction",
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

// Add indexes for query optimization
tournamentSchema.index({ tournament_id: 1 }, { unique: true });
tournamentSchema.index({ isActive: 1 });
tournamentSchema.index({ haveWinners: 1 });
tournamentSchema.index({ startTime: 1 });
tournamentSchema.index({ endTime: 1 });
tournamentSchema.index({ "users.userId": 1 });
tournamentSchema.index({ createdAt: -1 });

tournamentSchema.plugin(aggregatePaginate);
tournamentSchema.plugin(paginate);

type TournamentModelType =
  | AggregatePaginateModel<Tournament>
  | PaginateModel<Tournament>;
const Tournaments =
  (mongoose.models.Tournament as TournamentModelType) ||
  mongoose.model<Tournament, TournamentModelType>(
    "Tournament",
    tournamentSchema,
    "tournaments"
  );

export default Tournaments;
