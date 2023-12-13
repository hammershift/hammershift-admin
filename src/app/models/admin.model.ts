import mongoose from "mongoose";

const adminsSchema = new mongoose.Schema(
  {
    admin_id: { type: String, required: true },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, required: true },
    username: { type: String, required: true },
  },
  { timestamps: true }
);

const Admins = mongoose.models.admins || mongoose.model("admins", adminsSchema);

export default Admins;
