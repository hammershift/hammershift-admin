import mongoose from "mongoose";

const usersSchema = new mongoose.Schema({

email: {type: String, required: true},
password: {type: String, required: true},
image: {type: String},
emailVerified: { type: Boolean, default: null },
aboutMe: {type: String},
country: {type: String,  required: true},
fullName: {type: String,  required: true},
state: {type: String,  required: true},
username: {type: String,  required: true},
isActive: {type: Boolean,  default: true},
},
{ timestamps: true }
)

const Users = mongoose.models.users || mongoose.model("users", usersSchema);

export default Users;