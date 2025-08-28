import mongoose, { Document, Schema } from "mongoose";

const chunksSchema = new Schema(
  {
    web: {
      uri: {
        type: String,
        required: false,
      },
      title: {
        type: String,
        required: false,
      },
    },
  },
  {
    _id: false,
  }
);

const groundingMetadataSchema = new Schema(
  {
    prediction_id: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Prediction",
    },
    webSearchQueries: { type: [String], required: false },
    searchEntryPoint: {
      renderedContent: {
        type: String,
        required: false,
      },
    },
    groundingChunks: [chunksSchema],
  },
  {
    collection: "grounding_metadatas",
    timestamps: true,
  }
);

const GroundingMetadata =
  mongoose.models.GroundingMetadata ||
  mongoose.model("GroundingMetadata", groundingMetadataSchema);

export default GroundingMetadata;
