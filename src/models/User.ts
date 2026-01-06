import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    username: string;
    email: string;
    googleId?: string;
    password_hash: string;
    role: 'student' | 'tutor' | 'admin';
    avatar_url: string;

    // PRD v1.1 Fields
    first_name?: string;
    last_name?: string;
    major?: string;
    semester?: string;
    bio?: string;
    xp_points: number;
    level: number;
    current_avatar_url?: string;

    is_verified: boolean;
    verification_code?: string;
    verification_code_expires?: Date;
    refresh_token?: string;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema = new Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String }, // Made optional for Google Auth
    googleId: { type: String, unique: true, sparse: true }, // Added for Google Auth
    role: { type: String, enum: ['student', 'tutor', 'admin'], default: 'student' },
    avatar_url: { type: String, default: '' },
    // PRD v1.1 Fields
    first_name: { type: String },
    last_name: { type: String },
    major: { type: String },
    semester: { type: String },
    bio: { type: String },
    xp_points: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    current_avatar_url: { type: String },
    
    is_verified: { type: Boolean, default: false },
    verification_code: { type: String },
    verification_code_expires: { type: Date },
    refresh_token: { type: String },
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
