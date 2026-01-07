import mongoose, { Schema, Document } from 'mongoose';

export interface IUserCourse extends Document {
    user_id: mongoose.Types.ObjectId;
    course_id: mongoose.Types.ObjectId;
    bought_package: 'basic' | 'advanced' | 'premium';
    status: 'active' | 'completed';
    progress: number; // 0 to 100
    completed_chapter_ids: mongoose.Types.ObjectId[];
    last_accessed_at: Date;
    createdAt: Date;
    updatedAt: Date;
}

const UserCourseSchema: Schema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    bought_package: { type: String, enum: ['basic', 'advanced', 'premium'], required: true },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    progress: { type: Number, default: 0 },
    completed_chapter_ids: [{ type: Schema.Types.ObjectId, ref: 'Chapter' }],
    last_accessed_at: { type: Date, default: Date.now }
}, { timestamps: true });

// Compound index to ensure a user can only enroll in a course once (conceptually)
// Or maybe they can upgrade? safely unique for now.
UserCourseSchema.index({ user_id: 1, course_id: 1 }, { unique: true });

export default mongoose.model<IUserCourse>('UserCourse', UserCourseSchema);
