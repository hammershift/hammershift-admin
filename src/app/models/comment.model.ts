import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
    comment: {
        type: String,
        required: true,
    },
    auctionID: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
    },
    tournamentID: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
    },
    parentID: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
    },
    user: {
        type: Object,
        required: true,
        properties: {
            UserId: {
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
        }

    },
    likes: {
        type: Array
    },
    dislikes: {
        type: Array
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Comments = mongoose.models.Comment || mongoose.model('Comments', commentSchema);

export default Comments;