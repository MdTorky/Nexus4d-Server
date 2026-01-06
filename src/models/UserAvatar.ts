import mongoose, { Schema, Document } from 'mongoose';

export interface IUserAvatar extends Document {
    user_id: mongoose.Types.ObjectId;
    avatar_id: mongoose.Types.ObjectId;
    unlocked_at: Date;
}

const UserAvatarSchema: Schema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    avatar_id: { type: Schema.Types.ObjectId, ref: 'Avatar', required: true },
    unlocked_at: { type: Date, default: Date.now }
}, { timestamps: false });

export default mongoose.model<IUserAvatar>('UserAvatar', UserAvatarSchema);
