import mongoose, {
  Document,
  Schema,
  PaginateModel,
  AggregatePaginateModel,
  Types,
} from "mongoose";
import aggregatePaginate from "mongoose-aggregate-paginate-v2";
import paginate from "mongoose-paginate-v2";
export interface Comment extends Document {
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

commentSchema.plugin(aggregatePaginate);
commentSchema.plugin(paginate);
type CommentModelType =
  | AggregatePaginateModel<Comment>
  | PaginateModel<Comment>;

const Comments =
  (mongoose.models.comments as CommentModelType) ||
  mongoose.model<Comment, CommentModelType>(
    "comments",
    commentSchema,
    "comments"
  );

export default Comments;
