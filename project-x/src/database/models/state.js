// ═══════════════════════════════════════════════════════════════════════════
//  PATCH: src/database/models/state.js
//
//  Remove `required: true` from expiresAt — auction states don't set an
//  expiry (they are deleted manually by endAuction), so the required
//  constraint causes saveState to throw for auction keys.
// ═══════════════════════════════════════════════════════════════════════════

import { Schema } from 'mongoose'

export const StateSchema = new Schema({
    key: { type: String, required: true, unique: true },
    data: { type: Schema.Types.Mixed, default: {} },
    updatedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null } // null = never expires automatically
})

// MongoDB TTL index — only fires when expiresAt is a real date, not null
StateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true })
