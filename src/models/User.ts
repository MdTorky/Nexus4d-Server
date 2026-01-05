import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    username: string;
    email: string;
    googleId?: string;
    password_hash: string;
    role: 'student' | 'tutor' | 'admin';
    avatar_url: string;
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
    is_verified: { type: Boolean, default: false },
    verification_code: { type: String },
    verification_code_expires: { type: Date },
    refresh_token: { type: String },
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
