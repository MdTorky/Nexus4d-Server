import mongoose, { Schema, Document } from 'mongoose';

export interface ICourse extends Document {
    title: string;
    description: string;
    thumbnail_url: string;
    tutor_id: mongoose.Types.ObjectId;
    packages: {
        basic: { price: number; features: string[] };
        advanced: { price: number; features: string[] };
        premium: { price: number; features: string[] };
    };
    status: 'ongoing' | 'complete';
    category: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    total_duration: string;
    total_chapters: number;
    average_rating: number;
    enrolled_students: number;
    completion_xp_bonus: number;
    reward_avatar_id?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const CourseSchema: Schema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    thumbnail_url: { type: String, required: true }, 
    tutor_id: { type: Schema.Types.ObjectId, ref: 'User' }, // Optional at creation, assigned by Admin
    packages: {
        basic: {
            price: { type: Number, required: true },
            features: [{ type: String }]
        },
        advanced: {
            price: { type: Number, required: true },
            features: [{ type: String }]
        },
        premium: {
            price: { type: Number, required: true },
            features: [{ type: String }]
        }
    },
    status: { type: String, enum: ['ongoing', 'complete', 'disabled'], default: 'ongoing' },
    category: { type: String, required: true },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
    
    // Gamification
    total_duration: { type: String, default: '' },
    total_chapters: { type: Number, default: 0 },
    average_rating: { type: Number, default: 0 },
    enrolled_students: { type: Number, default: 0 },
    completion_xp_bonus: { type: Number, default: 100 },
    reward_avatar_id: { type: Schema.Types.ObjectId, ref: 'Avatar' }
}, { timestamps: true });

export default mongoose.model<ICourse>('Course', CourseSchema);
