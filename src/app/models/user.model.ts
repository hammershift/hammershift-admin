import { Schema, model, models } from "mongoose";
import { User } from "../lib/interfaces";

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
    role: { type: String, enum: ["USER", "AGENT"], required: true},
    agentProperties: {
      systemInstruction: {
        type: String,
        required: false,
      }
    },
    createdAt: Date,
    updatedAt: Date,
  },
  { collection: "users", timestamps: true }
);

const Users = models.users || model<User>("users", userSchema);

export default Users;
