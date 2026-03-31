import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGuessTheHammer extends Document {
  user: mongoose.Types.ObjectId;
  auction: mongoose.Types.ObjectId;
  guessedPrice: number;
  actualPrice: number | null;
  absoluteError: number | null;
  penalizedError: number | null;
  rank: number | null;
  entryFee: number;
  prizePaid: number;
  isVirtual: boolean;
  status: "pending" | "graded" | "paid";
  createdAt: Date;
  updatedAt: Date;
}

const GuessTheHammerSchema = new Schema<IGuessTheHammer>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    auction: { type: Schema.Types.ObjectId, ref: "Auction", required: true },
    guessedPrice: { type: Number, required: true, min: 0 },
    actualPrice: { type: Number, default: null },
    absoluteError: { type: Number, default: null },
    penalizedError: { type: Number, default: null },
    rank: { type: Number, default: null },
    entryFee: { type: Number, required: true, default: 0 },
    prizePaid: { type: Number, default: 0 },
    isVirtual: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "graded", "paid"],
      default: "pending",
    },
  },
  { timestamps: true }
);

GuessTheHammerSchema.index({ auction: 1, penalizedError: 1 });
GuessTheHammerSchema.index({ user: 1, createdAt: -1 });
GuessTheHammerSchema.index({ status: 1, createdAt: -1 });

const GuessTheHammer: Model<IGuessTheHammer> =
  (mongoose.models.GuessTheHammer as Model<IGuessTheHammer>) ||
  mongoose.model<IGuessTheHammer>(
    "GuessTheHammer",
    GuessTheHammerSchema,
    "guesstehammers"
  );

export default GuessTheHammer;
