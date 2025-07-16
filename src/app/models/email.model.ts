import mongoose from "mongoose";

const emailsSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

const Emails = mongoose.models.Email || mongoose.model("Email", emailsSchema);

export default Emails;
