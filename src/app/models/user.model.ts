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

userSchema.plugin(aggregatePaginate);
userSchema.plugin(paginate);

type UserModelType = AggregatePaginateModel<User> | PaginateModel<User>;

const Users =
  (mongoose.models.User as UserModelType) ||
  mongoose.model<User, UserModelType>("User", userSchema, "users");

export default Users;
