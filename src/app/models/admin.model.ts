import { model, models, Schema, Types } from "mongoose";
import { Admin } from "../lib/interfaces";

const adminsSchema = new Schema(
  {
    _id: { type: Types.ObjectId, required: true },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, required: true },
  },
  { collection: "admins", timestamps: true }
);

const Admins = models.admins || model<Admin>("admins", adminsSchema);

export default Admins;
