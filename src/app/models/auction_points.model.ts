import mongoose, { Schema } from "mongoose";
const pointsSchema = new Schema(
  {
    refId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    refCollection: {
      type: String,
      required: true,
    },
    user: {
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      fullName: { type: String, required: true },
      username: { type: String, required: true },
      role: { type: String, enum: ["USER", "AGENT"], required: true },
    },
    image: { type: String, required: false },
    points: { type: Number, required: true },
    rank: { type: Number, required: true },
  },
  {
    timestamps: true,
    collection: "auction_points",
  }
);

const Points = mongoose.models.Point || mongoose.model("Point", pointsSchema);

export default Points;
