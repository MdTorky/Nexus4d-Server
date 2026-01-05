import mongoose, { Schema, Document } from 'mongoose';

export interface ICoachingRequest extends Document {
    enrollment_id: mongoose.Types.ObjectId;
    tutor_id: mongoose.Types.ObjectId;
    status: 'requested' | 'scheduled' | 'completed';
    requested_at: Date;
    createdAt: Date;
    updatedAt: Date;
}

const CoachingRequestSchema: Schema = new Schema({
    enrollment_id: { type: Schema.Types.ObjectId, ref: 'Enrollment', required: true },
    tutor_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['requested', 'scheduled', 'completed'], default: 'requested' },
    requested_at: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model<ICoachingRequest>('CoachingRequest', CoachingRequestSchema);
