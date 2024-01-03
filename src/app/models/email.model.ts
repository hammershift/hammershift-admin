import mongoose from "mongoose";

const emailsSchema = new mongoose.Schema({

name: {type: String, required: true},
email: {type: String, required: true},
password: {type: String, required: true},
},
{ timestamps: true }
)

const Emails = mongoose.models.emails || mongoose.model("emails", emailsSchema);

export default Emails;