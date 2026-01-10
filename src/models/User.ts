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
    expertise?: string;
    tutor_profile_image?: string;
    xp_points: number;
    level: number;
    current_avatar_url?: string;
    avatar_unlock_tokens: number;
    privacy_settings?: {
        show_nexons: boolean;
        show_courses: boolean;
    };

    is_verified: boolean;
    is_active: boolean; // New Field: Account Status
    deactivation_reason?: string;
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
    expertise: { type: String }, // New field for Tutors
    tutor_profile_image: { type: String }, // Link to real photo from application
    xp_points: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    current_avatar_url: { type: String },
    avatar_unlock_tokens: { type: Number, default: 0 }, // New field for unlock tokens
    
    privacy_settings: {
        show_nexons: { type: Boolean, default: true },
        show_courses: { type: Boolean, default: true }
    },

    is_verified: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true }, // Default to active
    deactivation_reason: { type: String },
    verification_code: { type: String },
    verification_code_expires: { type: Date },
    refresh_token: { type: String },
}, { timestamps: true });

// Auto-calculate level on XP change
// Auto-calculate level on XP change
UserSchema.pre<IUser>('save', function(next) {
    if (this.isModified('xp_points')) {
        // Formula: Linear 500 XP per level
        // 0-499 XP -> Lvl 1
        // 500-999 XP -> Lvl 2
        const newLevel = Math.floor(this.xp_points / 500) + 1;
        // const newLevel = Math.floor(Math.sqrt(this.xp_points / 100)) + 1;
        if (newLevel > this.level) {
            const levelsGained = newLevel - this.level;
            // Award 1 token per level gained
            this.avatar_unlock_tokens = (this.avatar_unlock_tokens || 0) + levelsGained;
            this.level = newLevel;
        } else if (newLevel !== this.level) {
            // Level adjustment (e.g. formula change) - Sync level without tokens
            this.level = newLevel;
        }
    }
    next();
});

export default mongoose.model<IUser>('User', UserSchema);
