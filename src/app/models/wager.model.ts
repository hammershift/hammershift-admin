import mongoose from "mongoose";

const wagersSchema = new mongoose.Schema(
  {
    auctionID: { type: mongoose.Schema.Types.ObjectId, required: true },
    priceGuessed: { type: Number },
    wagerAmount: { type: Number },
    user: {
      type: Object,
      properties: {
        fullName: String,
        username: String,
        image: String,
      },
    },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
  },
  { timestamps: true }
);

const Wagers = mongoose.models.wagers || mongoose.model("wagers", wagersSchema);

export default Wagers;
