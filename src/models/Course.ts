import mongoose, { Schema, Document } from 'mongoose';

export interface ICourse extends Document {
    title: string;
    description: string;
    type: 'university' | 'general';
    tutor_id?: mongoose.Types.ObjectId;
    packages: {
        basic: { price: number; features: string[] };
        advanced: { price: number; features: string[] };
        premium: { price: number; features: string[] };
    };
    // PRD v1.1 Fields
    status: 'ongoing' | 'complete';
    completion_xp_bonus?: number;
    reward_avatar_id?: mongoose.Types.ObjectId;

    is_active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CourseSchema: Schema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, enum: ['university', 'general'], required: true },
    tutor_id: { type: Schema.Types.ObjectId, ref: 'User' },
    packages: {
        basic: {
            price: { type: Number, default: 0 },
            features: [{ type: String }]
        },
        advanced: {
            price: { type: Number, default: 0 },
            features: [{ type: String }]
        },
        premium: {
            price: { type: Number, default: 0 },
            features: [{ type: String }]
        }
    },
    // PRD v1.1 Fields
    status: { type: String, enum: ['ongoing', 'complete'], default: 'ongoing' },
    completion_xp_bonus: { type: Number, default: 0 },
    reward_avatar_id: { type: Schema.Types.ObjectId, ref: 'Avatar' },

    is_active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<ICourse>('Course', CourseSchema);
