import mongoose, { Schema, Document } from 'mongoose';

export interface ICourse extends Document {
    title: string;
    description: string;
    thumbnail_url: string;
    tutor_id: mongoose.Types.ObjectId;
    price: number;
    status: 'draft' | 'published';
    category: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    total_duration: number;
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
    
    // PRD v1.1 Packages
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

    // Course Type & Taxonomy
    type: { type: String, enum: ['university', 'general'], required: true, default: 'general' },
    major: { type: String }, // Required if type === 'university'
    category: { type: String }, // Required if type === 'general' (or both?)
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
    status: { type: String, enum: ['ongoing', 'complete'], default: 'ongoing' },
    
    // Gamification
    total_duration: { type: String, default: '' },
    total_chapters: { type: Number, default: 0 },
    average_rating: { type: Number, default: 0 },
    enrolled_students: { type: Number, default: 0 },
    completion_xp_bonus: { type: Number, default: 100 },
    reward_avatar_id: { type: Schema.Types.ObjectId, ref: 'Avatar' }
}, { timestamps: true });

export default mongoose.model<ICourse>('Course', CourseSchema);
