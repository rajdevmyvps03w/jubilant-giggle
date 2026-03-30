import { Schema } from 'mongoose'

export const GroupSchema = new Schema({
    id: { type: String, required: true, unique: true, index: true },
    mmo: { type: Boolean, default: false },
    funds: { type: Number, default: 0 },
    sethomeFee: { type: Number, default: 0 },
    exp: { type: Number, default: 0 },
    tax: {
        home: { type: Number, default: 0 },
        foreign: { type: Number, default: 0 }
    },

    // --- NEW MODERATION & COOLDOWN SETTINGS ---
    cooldowns: {
        global: { type: Number, default: 3000 },
        commands: {
            type: Map,
            of: Number,
            default: {}
        }
    },

    bans: {
        users: {
            type: [
                {
                    jid: String,
                    commands: [String],
                    categories: [String],
                    reason: String,
                    bannedAt: { type: Number, default: Date.now }
                }
            ],
            default: []
        }
    },

    features: {
        type: [
            {
                key: String,
                name: String,
                price: { type: Number, default: 0 },
                duration: { type: Number, default: null },
                active: { type: Boolean, default: false },
                minLevel: { type: Number, default: 0 },
                description: String,
                unlockedAt: { type: Number, default: Date.now },
                expiresAt: { type: Number, default: null },
                timeLeft: { type: Number, default: null }
            }
        ],
        default: [
            {
                key: 'moderation_tools',
                name: 'Moderation Tools',
                price: 0,
                active: false,
                minLevel: 0,
                description: 'Allows group moderators to manage users and anti-link.'
            },
            {
                key: 'card_spawn',
                name: 'Card Spawning System',
                price: 0,
                active: false,
                minLevel: 0,
                description: 'Automatically spawns collectible cards in the chat.'
            },
            {
                key: 'eco_game',
                name: 'Economy System',
                price: 0,
                active: true,
                minLevel: 0,
                description: 'Enables currency, betting, and group economy commands.'
            },
            {
                key: 'event_wish',
                name: 'Group Events System',
                price: 0,
                active: false,
                minLevel: 0,
                description: 'Manages notifications for user joins, leaves, etc.'
            }
        ]
    },
    users: { type: [String], default: [] },
    mute: { type: [String], default: [] },
    anitag: { type: [String], default: [] },
    lastActive: { type: Number, default: Date.now },
    dateOfLogin: { type: Date, default: Date.now }
})
