import mongoose, { Schema, Document } from 'mongoose';

export interface ITutorApplication extends Document {
    user_id: mongoose.Types.ObjectId;
    full_name: string;
    email: string;
    specialization: string;
    bio: string;
    linkedin_profile?: string;
    cv_url?: string; // Optional for now, or link to file
    profile_picture_url?: string;
    status: 'pending' | 'approved' | 'rejected';
    admin_notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const TutorApplicationSchema: Schema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    full_name: { type: String, required: true },
    email: { type: String, required: true },
    specialization: { type: String, required: true },
    bio: { type: String, required: true },
    linkedin_profile: { type: String },
    cv_url: { type: String }, 
    profile_picture_url: { type: String }, // New field
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    admin_notes: { type: String }
}, { timestamps: true });

export default mongoose.model<ITutorApplication>('TutorApplication', TutorApplicationSchema);
