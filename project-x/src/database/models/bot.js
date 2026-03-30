// src/database/models/botschema.js
//
// Dedicated schema for permanent bot-level settings.
// Replaces all State-based storage for:
//   - chatbot on/off flag
//   - support group registry (list of groups)
//   - support group lock state (per group)
//   - support group usage counters (per group)
//
// NO TTL index. NO expiresAt. MongoDB will NEVER auto-delete these.
// Data lives until you explicitly modify or delete it.

import { Schema } from 'mongoose'

// ── Support group entry shape (embedded in the groups document) ───────────────
const SupportGroupSchema = new Schema(
    {
        jid: { type: String, required: true }, // group JID
        label: { type: String, default: '' }, // display name
        invite: { type: String, default: '' }, // https://chat.whatsapp.com/...
        category: { type: String, default: 'common' } // economy | cards | common
    },
    { _id: false }
)

export const BotSchema = new Schema({
    key: { type: String, required: true, unique: true, index: true },
    chatbotEnabled: { type: Boolean, default: null },
    groups: { type: [SupportGroupSchema], default: undefined },
    lock: {
        lockedAt: { type: String, default: null },
        unlocksAt: { type: String, default: null }
    },
    usageCount: { type: Number, default: 0 },
    activeBot: { type: String, default: null }, // ← ADD THIS
    updatedAt: { type: Date, default: Date.now }
})
