import mongoose, { model, models, Schema, Types } from "mongoose";
export interface Comment {
  _id: Types.ObjectId;
  comment: string;
  pageID: string;
  pageType: string;
  parentID?: Types.ObjectId;
  user: {
    userId: string;
    username: string;
    profilePicture?: string;
  };
  likes: [];
  dislikes: [];
  createdAt: Date;
  isDeleted?: boolean;
  deletedAt?: Date;
}

const commentSchema = new Schema(
  {
    _id: { type: Types.ObjectId, required: true },
    comment: {
      type: String,
      required: true,
    },
    pageID: {
      type: String,
      required: true,
    },
    pageType: {
      type: String,
      required: true,
    },
    parentID: {
      type: Types.ObjectId,
      required: false,
    },
    user: {
      userId: {
        type: String,
        required: true,
      },
      username: {
        type: String,
        required: true,
      },
      profilePicture: {
        type: String,
      },
    },
    likes: [
      {
        userId: {
          type: String,
          required: true,
        },
        username: {
          type: String,
          required: true,
        },
      },
    ],
    dislikes: [
      {
        userId: {
          type: String,
          required: true,
        },
        username: {
          type: String,
          required: true,
        },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    isDeleted: {
      type: Boolean,
      required: false,
    },
    deletedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: "comments", timestamps: true }
);

const Comments = models.comments || model<Comment>("comments", commentSchema);

export default Comments;
