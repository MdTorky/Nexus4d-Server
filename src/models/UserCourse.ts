import mongoose, { Schema, Document } from 'mongoose';

export interface IUserCourse extends Document {
    user_id: mongoose.Types.ObjectId;
    course_id: mongoose.Types.ObjectId;
    amount_paid: number;
    package: 'basic' | 'advanced' | 'premium';
    status: 'pending' | 'active' | 'completed' | 'rejected';
    progress: number; // 0 to 100
    completed_material_ids: mongoose.Types.ObjectId[];
    completed_chapter_ids: mongoose.Types.ObjectId[];
    claimed_chapter_ids: mongoose.Types.ObjectId[];
    is_course_reward_claimed: boolean;
    receipt_url?: string;
    promo_code?: string;
    promo_code_id?: mongoose.Types.ObjectId;
    rejection_reason?: string;
    last_accessed_at: Date;
    createdAt: Date;
    updatedAt: Date;
}

const UserCourseSchema: Schema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    package: { type: String, enum: ['basic', 'advanced', 'premium'], required: true },
    amount_paid: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'active', 'completed', 'rejected'], default: 'pending' },
    progress: { type: Number, default: 0 },
    completed_material_ids: [{ type: Schema.Types.ObjectId }], // Track individual materials
    completed_chapter_ids: [{ type: Schema.Types.ObjectId, ref: 'Chapter' }],
    claimed_chapter_ids: [{ type: Schema.Types.ObjectId, ref: 'Chapter' }], // New: Track claimed XP
    is_course_reward_claimed: { type: Boolean, default: false }, // New: Track course completion reward
    receipt_url: { type: String },
    promo_code: { type: String }, // Store the code string for easy display
    promo_code_id: { type: Schema.Types.ObjectId, ref: 'PromoCode' },
    rejection_reason: { type: String },
    last_accessed_at: { type: Date, default: Date.now }
}, { timestamps: true });

// Compound index to ensure a user can only enroll in a course once (conceptually)
// Or maybe they can upgrade? safely unique for now.
UserCourseSchema.index({ user_id: 1, course_id: 1 }, { unique: true });

export default mongoose.model<IUserCourse>('UserCourse', UserCourseSchema);
