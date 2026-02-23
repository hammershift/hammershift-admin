import mongoose, {
  Document,
  Schema,
  PaginateModel,
  AggregatePaginateModel,
  Types,
} from "mongoose";
import { AgentProperties } from "../lib/interfaces";
import aggregatePaginate from "mongoose-aggregate-paginate-v2";
import paginate from "mongoose-paginate-v2";

export interface User extends Document {
  _id: Types.ObjectId;
  username: string;
  fullName: string;
  email: string;
  balance: number;
  isActive: boolean;
  isBanned: boolean;
  provider: string;
  about: string;
  createdAt: Date;
  updatedAt: Date;
  role: string;
  agentProperties?: AgentProperties;
  current_streak: number;
  longest_streak: number;
  last_prediction_at?: Date;
  rank_title: "Rookie" | "Rising Star" | "Expert" | "Legend";
  total_points: number;
  email_preferences: {
    marketing: boolean;
    digests: boolean;
    tournaments: boolean;
    results: boolean;
  };
  deposit_count: number;
  preferred_payment_method: 'ach' | 'card';
}

const userSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    username: { type: String, required: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    balance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },
    provider: { type: String, default: "email" },
    about: { type: String, default: "" },
    role: { type: String, enum: ["USER", "AGENT"], required: true },
    agentProperties: {
      systemInstruction: {
        type: String,
        required: false,
      },
    },
    current_streak: { type: Number, default: 0 },
    longest_streak: { type: Number, default: 0 },
    last_prediction_at: { type: Date, required: false },
    rank_title: {
      type: String,
      enum: ["Rookie", "Rising Star", "Expert", "Legend"],
      default: "Rookie",
    },
    total_points: { type: Number, default: 0 },
    email_preferences: {
      marketing: { type: Boolean, default: true },
      digests: { type: Boolean, default: true },
      tournaments: { type: Boolean, default: true },
      results: { type: Boolean, default: true },
    },
    deposit_count: { type: Number, default: 0 },
    preferred_payment_method: {
      type: String,
      enum: ['ach', 'card'],
      default: 'card',
    },
    createdAt: Date,
    updatedAt: Date,
  },
  { collection: "users", timestamps: true }
);

// Add indexes for query optimization
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1, isBanned: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ total_points: -1 }); // For leaderboard queries
userSchema.index({ last_prediction_at: -1 }); // For inactive user detection

userSchema.plugin(aggregatePaginate);
userSchema.plugin(paginate);

type UserModelType = AggregatePaginateModel<User> | PaginateModel<User>;

const Users =
  (mongoose.models.User as UserModelType) ||
  mongoose.model<User, UserModelType>("User", userSchema, "users");

export default Users;
