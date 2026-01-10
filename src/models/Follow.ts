import mongoose, { Schema, Document } from 'mongoose';

export interface IFollow extends Document {
    follower_id: mongoose.Types.ObjectId;
    following_id: mongoose.Types.ObjectId;
    createdAt: Date;
}

const FollowSchema: Schema = new Schema({
    follower_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    following_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

// Prevent duplicate follows
FollowSchema.index({ follower_id: 1, following_id: 1 }, { unique: true });

export default mongoose.model<IFollow>('Follow', FollowSchema);
