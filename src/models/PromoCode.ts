import mongoose, { Schema, Document } from 'mongoose';

export interface IPromoCode extends Document {
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    validFrom: Date;
    validUntil: Date;
    usageLimit?: number;
    usedCount: number;
    isActive: boolean;
    applicableCourses: mongoose.Types.ObjectId[];
    applicablePackages: string[]; // 'basic', 'advanced', 'premium'
}

const PromoCodeSchema: Schema = new Schema({
    code: { 
        type: String, 
        required: true, 
        unique: true, 
        uppercase: true,
        trim: true
    },
    discountType: { 
        type: String, 
        enum: ['percentage', 'fixed'], 
        required: true 
    },
    discountValue: { 
        type: Number, 
        required: true,
        min: 0 
    },
    validFrom: { 
        type: Date, 
        required: true 
    },
    validUntil: { 
        type: Date, 
        required: true 
    },
    usageLimit: { 
        type: Number 
    },
    usedCount: { 
        type: Number, 
        default: 0 
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    applicableCourses: [{ 
        type: Schema.Types.ObjectId, 
        ref: 'Course' 
    }],
    applicablePackages: [{
        type: String,
        enum: ['basic', 'advanced', 'premium']
    }]
}, {
    timestamps: true
});

// Index for faster validation
PromoCodeSchema.index({ code: 1, isActive: 1 });

export default mongoose.model<IPromoCode>('PromoCode', PromoCodeSchema);
