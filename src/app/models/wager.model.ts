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
    refunded: { type: Boolean, default: false },
    deleteReason: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
  },
  { timestamps: true }
);

// Add indexes for query optimization
wagersSchema.index({ auctionID: 1 });
wagersSchema.index({ "user._id": 1 });
wagersSchema.index({ auctionID: 1, "user._id": 1 }, { unique: true });
wagersSchema.index({ isActive: 1 });
wagersSchema.index({ createdAt: -1 });

const Wagers = mongoose.models.wagers || mongoose.model("wagers", wagersSchema);

export default Wagers;
