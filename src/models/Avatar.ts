import mongoose, { Schema, Document } from 'mongoose';

export interface IAvatar extends Document {
    name: string;
    image_url: string;
    type: 'default' | 'premium' | 'reward';
    unlock_condition: 'none' | 'course_completion' | 'level_up' | 'token';
    required_level: number;
    is_active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const AvatarSchema: Schema = new Schema({
    name: { type: String, required: true },
    image_url: { type: String, required: true },
    type: { type: String, enum: ['default', 'premium', 'reward'], default: 'default' },
    unlock_condition: { type: String, enum: ['none', 'course_completion', 'level_up', 'token'], default: 'none' },
    required_level: { type: Number, default: 0 }, // New field
    is_active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model<IAvatar>('Avatar', AvatarSchema);
