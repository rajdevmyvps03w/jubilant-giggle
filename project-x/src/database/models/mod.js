import { Schema } from 'mongoose'

// Persists every dynamically added moderator.
// The hardcoded mods in config.js are the "owner tier" and are never
// stored here — they cannot be removed via commands.
export const ModSchema = new Schema({
    jid: { type: String, required: true, unique: true, index: true },
    addedBy: { type: String, required: true }, // JID of the owner who added them
    addedAt: { type: Number, default: Date.now }
})
