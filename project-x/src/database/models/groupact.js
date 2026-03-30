import { Schema, model } from 'mongoose'

// One document per (groupId + userJid) pair.
// Tracks message counts per day so we can build rolling activity windows.
export const GroupActivitySchema = new Schema({
    groupId: { type: String, required: true, index: true },
    userJid: { type: String, required: true },
    userName: { type: String, default: 'Unknown' },

    // Total messages tracked since firstSeen
    msgCount: { type: Number, default: 0 },

    // Per-day counts keyed as "YYYY-MM-DD"
    // e.g. { "2025-06-01": 14, "2025-06-02": 3 }
    // Old keys (>7 days) are pruned on every write to keep the document small.
    dailyCounts: {
        type: Map,
        of: Number,
        default: {}
    },

    lastSeen: { type: Date, default: null },
    firstSeen: { type: Date, default: null }
})

// Compound unique index — the primary lookup key for every tracked message
GroupActivitySchema.index({ groupId: 1, userJid: 1 }, { unique: true })
