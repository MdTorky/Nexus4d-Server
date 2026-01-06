import mongoose, { Schema, Document } from 'mongoose';

export interface IChapter extends Document {
    course_id: mongoose.Types.ObjectId;
    title: string;
    order_index: number;
    xp_reward: number; // PRD v1.1
    materials: string[]; // URLs or R2 keys
    createdAt: Date;
    updatedAt: Date;
}

const ChapterSchema: Schema = new Schema({
    course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true },
    order_index: { type: Number, required: true },
    xp_reward: { type: Number, default: 0 }, // PRD v1.1
    materials: [{ type: String, default: [] }]
}, { timestamps: true });

export default mongoose.model<IChapter>('Chapter', ChapterSchema);
