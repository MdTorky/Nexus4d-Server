import { Schema, model } from 'mongoose';

interface IMaterial {
    title: string;
    type: 'video' | 'pdf' | 'link' | 'slide' | 'image';
    url: string; // R2 URL or external link
    min_package_tier: 'basic' | 'advanced' | 'premium';
}

const ChapterSchema: Schema = new Schema({
    course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true },
    description: { type: String },
    position: { type: Number, required: true },
    
    // Gamification
    xp_reward: { type: Number, default: 50 },
    is_free: { type: Boolean, default: false },

    // Deep Materials (No single video_url anymore)
    materials: [{
        title: { type: String, required: true },
        type: { type: String, enum: ['video', 'pdf', 'link', 'slide', 'image'], required: true },
        url: { type: String, required: true },
        min_package_tier: { type: String, enum: ['basic', 'advanced', 'premium'], default: 'basic' }
    }]
}, { timestamps: true });

export default model('Chapter', ChapterSchema);
