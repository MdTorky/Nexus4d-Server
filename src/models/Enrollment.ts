import mongoose, { Schema, Document } from 'mongoose';

export interface IEnrollment extends Document {
    user_id: mongoose.Types.ObjectId;
    course_id: mongoose.Types.ObjectId;
    current_package: 'basic' | 'advanced' | 'premium';
    active_since: Date;
    createdAt: Date;
    updatedAt: Date;
}

const EnrollmentSchema: Schema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    current_package: { type: String, enum: ['basic', 'advanced', 'premium'], required: true },
    active_since: { type: Date, default: Date.now },
}, { timestamps: true });

// Ensure unique enrollment per user per course
EnrollmentSchema.index({ user_id: 1, course_id: 1 }, { unique: true });

export default mongoose.model<IEnrollment>('Enrollment', EnrollmentSchema);
