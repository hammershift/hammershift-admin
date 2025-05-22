import mongoose, {
  Document,
  Schema,
  PaginateModel,
  AggregatePaginateModel,
  Types,
} from "mongoose";
import aggregatePaginate from "mongoose-aggregate-paginate-v2";
import paginate from "mongoose-paginate-v2";
export interface Admin extends Document {
  _id: Types.ObjectId;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password: string;
  role: string;
}

const adminSchema = new Schema(
  {
    _id: { type: Types.ObjectId, required: true },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, required: true },
  },
  { collection: "admins", timestamps: true }
);

adminSchema.plugin(aggregatePaginate);
adminSchema.plugin(paginate);

type AdminModelType = AggregatePaginateModel<Admin> | PaginateModel<Admin>;

const Admins =
  (mongoose.models.admins as AdminModelType) ||
  mongoose.model<Admin, AdminModelType>("admins", adminSchema, "admins");

export default Admins;
