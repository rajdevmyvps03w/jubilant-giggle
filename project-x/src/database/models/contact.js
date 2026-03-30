import { Schema } from 'mongoose'

export const ContactSchema = new Schema({
    id: { type: String, required: true, unique: true, index: true },
    username: { type: String, default: 'User' }
})
