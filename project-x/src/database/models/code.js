import { Schema } from 'mongoose'

export const CodeSchema = new Schema({
    code: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    by: { type: String },
    reward: Schema.Types.Mixed,
    discountPercent: Number,
    minPurchase: Number,
    createdAt: { type: Number, default: Date.now }
})
