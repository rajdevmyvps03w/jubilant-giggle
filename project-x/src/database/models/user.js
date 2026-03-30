import { Schema } from 'mongoose'

const CardSchema = new Schema({
    id: { type: String, required: true },
    title: { type: String, required: true },
    source: { type: String },
    forced: { type: Boolean, default: false },
    tier: { type: String },
    image: { type: String },
    url: { type: String },
    price: { type: Number },
    basePrice: { type: Number },
    type: {
        type: String,
        enum: ['shoob', 'maz'],
        default: 'shoob'
    },
    obtainedAt: { type: Date, default: Date.now }
})

const AfkSchema = new Schema(
    {
        active: { type: Boolean, default: false },
        reason: { type: String, default: '' },
        since: { type: Number, default: null },
        pingCount: { type: Number, default: 0 } // tracks missed pings while AFK
    },
    { _id: false }
)

const CustomBioSchema = new Schema(
    {
        text: { type: String, default: null }, // The bio content
        setAt: { type: Number, default: null }, // When it was set (ms timestamp)
        expiresAt: { type: Number, default: null } // When it expires (ms timestamp)
    },
    { _id: false }
)

const PetStatsSchema = new Schema(
    {
        hunger: { type: Number, default: 100 },
        happiness: { type: Number, default: 100 },
        energy: { type: Number, default: 100 },
        xp: { type: Number, default: 0 },
        level: { type: Number, default: 1 }
    },
    { _id: false }
)

const CustomPfpSchema = new Schema(
    {
        url: { type: String, default: null },
        mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
        mimeType: { type: String, default: null },
        setAt: { type: Number, default: null },
        expiresAt: { type: Number, default: null }
    },
    { _id: false }
)

const CustomDeckSchema = new Schema(
    {
        url: { type: String, default: null },
        mimeType: { type: String, default: null },
        setAt: { type: Number, default: null },
        expiresAt: { type: Number, default: null }
    },
    { _id: false }
)

const PetSchema = new Schema(
    {
        type: { type: String, default: null },
        variant: { type: String, default: 'default' },
        name: { type: String, default: null },

        stats: {
            type: PetStatsSchema,
            default: () => ({})
        },

        mood: { type: String, default: 'idle' },
        isAlive: { type: Boolean, default: true },

        // cooldown timestamps
        lastFed: { type: Number, default: 0 },
        lastPlay: { type: Number, default: 0 },
        lastSleep: { type: Number, default: 0 },
        lonelySince: { type: Number, default: null },

        // ⭐ REQUIRED: sleep lock system
        sleepUntil: { type: Number, default: 0 },

        // passive decay anchor
        lastDecay: { type: Number, default: Date.now },

        // lifecycle
        adoptedAt: { type: Number, default: Date.now },

        // ⭐ OPTIONAL BUT SMART (future-proof)
        meta: {
            type: Object,
            default: {}
        }
    },
    { _id: false }
)

export const UserSchema = new Schema({
    jid: { type: String, required: true, unique: true, index: true },
    lid: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    age: { type: Number, default: 0 },
    gender: { type: String, default: 'unknown' },
    exp: { type: Number, default: 0 },
    wallet: { type: Number, default: 0 },
    bank: {
        id: { type: String, default: null },
        capacity: { type: Number, default: 10000 },
        value: { type: Number, default: 0 }
    },
    daily: {
        type: Date,
        default: null
    },
    lastLB: {
        type: Date,
        default: null
    },
    customBio: {
        type: CustomBioSchema,
        default: null
    },
    customPfp: {
        type: CustomPfpSchema,
        default: null
    },
    customDeck: {
        type: CustomDeckSchema,
        default: null
    },
    slotDailyCount: {
        type: Number,
        default: 0 // how many slot spins used today
    },
    slotDailyReset: {
        type: Date,
        default: null // timestamp of the last spin — used to detect day change
    },
    gambleDailyCount: {
        type: Number,
        default: 0 // how many gamble bets used today
    },
    gambleDailyReset: {
        type: Date,
        default: null // timestamp of last bet — used to detect day rollover
    },

    afk: {
        type: AfkSchema,
        default: null
    },
    wishlist: {
        type: [
            {
                id: { type: String, required: true }, // card id / uuid
                title: { type: String, default: '' },
                source: { type: String, default: '' },
                tier: { type: String, default: '' },
                image: { type: String, default: '' },
                type: { type: String, enum: ['shoob', 'maz'], required: true },
                addedAt: { type: Number, default: Date.now }
            }
        ],
        default: []
    },
    warnings: {
        type: [
            {
                groupId: { type: String, required: true },
                level: { type: Number, default: 0 },
                types: [
                    {
                        typeId: Number, // 1-6
                        reason: { type: String, default: '' },
                        isPermanent: { type: Boolean, default: false },
                        issuedAt: { type: Date, default: Date.now },
                        expiresAt: { type: Date, default: null }
                    }
                ]
            }
        ],
        default: []
    },
    lbCount: {
        type: Number,
        default: 0
    },
    lbResetTime: {
        type: Date,
        default: null
    },
    lbDailyCount: {
        // ← ADD: how many boxes opened today
        type: Number,
        default: 0
    },
    lbDailyReset: {
        // ← ADD: timestamp of the last open (used to detect day change)
        type: Date,
        default: null
    },
    cards: {
        collection: [CardSchema],
        deck: [CardSchema]
    },
    inventory: {
        type: [
            {
                name: { type: String },
                type: { type: String, enum: ['POTION', 'ITEM', 'REDEEMCODE', 'LOOTBOX'] },
                usage: { type: String },
                duration: { type: Schema.Types.Mixed },
                purchasedAt: { type: Date, default: Date.now }
            }
        ],
        default: []
    },
    stocks: { type: Object, default: {} },
    relationship: {
        status: { type: Boolean, default: false },
        name: { type: String, default: '' },
        jid: { type: String, default: '' },
        lid: { type: String, default: '' },
        date: { type: Number, default: 0 }
    },
    challenges: {
        type: [
            {
                challengeId: { type: String, required: true },
                assignedAt: { type: Number, default: Date.now },
                expiresAt: { type: Number, required: true },
                completed: { type: Boolean, default: false },
                completedAt: { type: Number, default: null },
                notified: { type: Boolean, default: false }, // ← ADD THIS
                progress: { type: Number, default: 0 },
                goal: { type: Number, required: true },
                rewardClaimed: { type: Boolean, default: false },
                cardId: { type: String, default: null },
                cardType: { type: String, enum: ['maz', 'shoob', null], default: null }
            }
        ],
        default: []
    },
    stats: {
        tttWins: { type: Number, default: 0 },
        pokeWins: { type: Number, default: 0 },
        gambleUses: { type: Number, default: 0 },
        slotUses: { type: Number, default: 0 },
        dailyStreak: { type: Number, default: 0 },
        lastDailyClaim: { type: Number, default: null },
        supportMsgs: { type: Number, default: 0 }
    },
    pet: {
        type: PetSchema,
        default: null
    },
    ban: {
        status: { type: Boolean, default: false },
        reason: { type: String, default: '' },
        dateOfLogin: { type: Number, default: 0 }
    },
    slug: {
        isMarried: { type: Boolean, default: false },
        data: {
            id: { type: String, default: null },
            name: { type: String, default: null },
            image: { type: String, default: null },
            origin: { type: String, default: null },
            url: { type: String, default: null },
            type: { type: String, enum: ['husbando', 'waifu', null], default: null },
            marriedAt: { type: Number, default: null },

            // ── ADD THESE ──────────────────────────────────────
            loveXp: { type: Number, default: 0 },
            bondLevel: { type: Number, default: 0 },
            last_kiss: { type: Number, default: 0 },
            last_cuddle: { type: Number, default: 0 },
            last_date: { type: Number, default: 0 },
            last_mating: { type: Number, default: 0 },
            last_intercourse: { type: Number, default: 0 },
            last_rival: { type: Number, default: 0 }
            // ───────────────────────────────────────────────────
        }
    },
    timeouts: {
        type: [
            {
                groupId: { type: String },
                until: { type: Number },
                reason: { type: String }
            }
        ],
        default: []
    },
    rf: { type: Boolean, default: false },
    rfcode: { type: String, default: '' },
    rflist: {
        type: [
            {
                name: { type: String },
                jid: { type: String, required: true },
                age: { type: Number },
                gender: { type: String },
                rfcode: { type: String },
                date: { type: String }
            }
        ],
        default: []
    },
    dateOfLogin: { type: Date, default: Date.now }
})
