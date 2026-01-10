import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
    user_id: mongoose.Types.ObjectId;
    course_id: mongoose.Types.ObjectId;
    method: 'paypal' | 'duitnow';
    receipt_url: string;
    status: 'pending' | 'approved' | 'rejected';
    amount: number;
    createdAt: Date;
    updatedAt: Date;
}

const PaymentSchema: Schema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    method: { type: String, enum: ['paypal', 'duitnow'], required: true },
    receipt_url: { type: String, required: true }, // Verification proof from R2
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    amount: { type: Number, required: true },
}, { timestamps: true });

export default mongoose.model<IPayment>('Payment', PaymentSchema);
