import mongoose from "mongoose";

const wagersSchema = new mongoose.Schema({

auction_id: {type: String, required: true},
priceGuessed: {type: Number},
wagerAmount: {type: Number},
user: {type: Object, properties: {
    fullName: String,
    username: String,
    image: String,
}},
createdAt: {type: Date, default: Date.now},
updatedAt: {type: Date},
},
{ timestamps: true }
)

const Wagers = mongoose.models.wagers || mongoose.model("wagers", wagersSchema);

export default Wagers;