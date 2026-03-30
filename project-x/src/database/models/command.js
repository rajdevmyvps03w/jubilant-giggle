import { Schema } from 'mongoose'

export const CommandSchema = new Schema({
    name: { type: String, required: true, unique: true, index: true },
    reason: { type: String, default: 'Disabled by developer.' },
    disabledBy: { type: String, required: true },
    disabledAt: { type: Number, default: Date.now }
})
