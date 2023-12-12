import mongoose from "mongoose";

const auctionSchema = new mongoose.Schema(
  {
    auction_id: { type: "string" },
    attributes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string" },
          value: {
            anyOf: [
              { type: "string" },
              { type: "integer" },
              { type: "boolean" },
              { type: "number" },
              { type: "null" }
            ]
          }
        }
      }
    },
    description: {
      type: "array",
      items: { type: "string" }
    },
    image: { type: "string" },
    images_list: {
      type: "array",
      items: {
        type: "object",
        properties: {
          placing: { type: "integer" },
          src: { type: "string" }
        }
      }
    },
    listing_details: {
      type: "array",
      items: { type: "string" }
    },
    page_url: { type: "string" },
    website: { type: "string" },
    sort: {
      type: "object",
      properties: { price: { type: "number" }, bids: { type: "number" }, deadline: { type: "string", format: "date-time" } }
    }
  }, {
  timestamps: true
}

);

const Auctions = mongoose.models.auctions || mongoose.model("auctions", auctionSchema);

export default Auctions;

