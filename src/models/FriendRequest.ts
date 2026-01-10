import mongoose, { Schema, Document } from 'mongoose';

export interface IFriendRequest extends Document {
    requester_id: mongoose.Types.ObjectId;
    recipient_id: mongoose.Types.ObjectId;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: Date;
    updatedAt: Date;
}

const FriendRequestSchema: Schema = new Schema({
    requester_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipient_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
}, { timestamps: true });

// Ensure unique request per pair to prevent duplicates
FriendRequestSchema.index({ requester_id: 1, recipient_id: 1 }, { unique: true });

export default mongoose.model<IFriendRequest>('FriendRequest', FriendRequestSchema);
