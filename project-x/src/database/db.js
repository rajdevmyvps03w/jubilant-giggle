import { Group, User, Contact, Code, Bot, State, GroupActivity, Mod, Command } from './models/index.js'
import { getRandomInt, getRandomItem } from '../functions/helpler.js'
import { randomBytes } from 'crypto'
import mongoose from 'mongoose'

const MARKET_KEY = 'GLOBAL_STOCK_MARKET'
const SPREAD = 0.02
const MIN_PRICE = 0.1 // Lowered min price to allow penny stocks
const MAX_PRICE = 1_000_000
const WISHLIST_LIMIT = 20

const _activityQueue = new Map() // key: "groupId|userJid" → { groupId, userJid, userName, count, lastSeen }
const FLUSH_INTERVAL = 5000 // flush every 5 seconds

const ACTIVE_BOT_KEY = (groupJid) => `activeBot:${groupJid}`

const PET_LIMIT = 100
const PET_COOLDOWN = {
    feed: 30 * 60 * 1000, // 30 mins
    sleep: 2 * 60 * 60 * 1000, // 2 hours
    play: 15 * 60 * 1000 // 15 mins
}
// 100 years in ms — effectively permanent
export const PERMANENT = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000)

export const CHALLENGE_DEFS = [
    {
        id: 'daily_streak',
        label: '📅 Daily Streak',
        description: 'Claim your daily reward {goal} days in a row without missing a day.',
        goalFn: () => getRandomInt(5, 10),
        weight: 10,
        statKey: 'dailyStreak'
    },
    {
        id: 'support_msgs',
        label: '💬 Support Chatter',
        description: 'Send {goal} messages in a support group.',
        goalFn: () => getRandomInt(50, 150),
        weight: 10,
        statKey: 'supportMsgs'
    },
    {
        id: 'ttt_wins',
        label: '🎮 TTT Champion',
        description: 'Win {goal} Tic‑Tac‑Toe matches against real players.',
        goalFn: () => getRandomInt(3, 8),
        weight: 8,
        statKey: 'tttWins'
    },
    {
        id: 'poke_wins',
        label: '🐾 Pokémon Master',
        description: 'Correctly guess {goal} Pokémon in Guess The Pokémon.',
        goalFn: () => getRandomInt(5, 15),
        weight: 8,
        statKey: 'pokeWins'
    },
    {
        id: 'gamble_uses',
        label: "🎲 Gambler's Run",
        description: 'Use the gamble command {goal} times.',
        goalFn: () => getRandomInt(20, 50),
        weight: 9,
        statKey: 'gambleUses'
    },
    {
        id: 'slot_uses',
        label: '🎰 Slot Addict',
        description: 'Spin the slot machine {goal} times.',
        goalFn: () => getRandomInt(20, 50),
        weight: 9,
        statKey: 'slotUses'
    },
    {
        id: 'local_lb_top5',
        label: '🏅 Local Elite',
        description: "Reach the Top 5 on your support group's local XP leaderboard.",
        goalFn: () => 5,
        weight: 6,
        statKey: null
    },
    {
        id: 'global_lb_top10',
        label: '🌍 Global Legend',
        description: 'Reach the Top 10 on the global XP leaderboard.',
        goalFn: () => 10,
        weight: 4,
        statKey: null
    },

    // ── FIXED: snapshot-based. goal = amount to EARN, not total to reach ───────
    {
        id: 'exp_milestone',
        label: '⭐ XP Grind',
        description: 'Earn {goal} XP after starting this challenge.',
        goalFn: () => getRandomInt(5000, 30000),
        weight: 7,
        statKey: null,
        snapshotKey: 'exp' // field to snapshot at assign time
    },
    {
        id: 'wallet_milestone',
        label: '💰 Money Maker',
        description: 'Earn ₹{goal} in your wallet after starting this challenge.',
        goalFn: () => getRandomInt(50000, 300000),
        weight: 7,
        statKey: null,
        snapshotKey: 'wallet' // field to snapshot at assign time
    },

    // ── NEW: collect N cards of a specific tier after challenge starts ─────────
    {
        id: 'collect_cards',
        label: '🃏 Card Collector',
        description: 'Collect {goal} {tier} cards after starting this challenge.',
        goalFn: () => getRandomInt(3, 15),
        weight: 11,
        statKey: null,
        // tier is picked randomly at assign time — stored as targetTier on the challenge doc
        tierPool: ['C', 'Tier 1', 'Tier 2', 'Tier 3', 'R', 'Tier 4']
    }
]

const PET_COST = { feed: 50, play: 75 }
const PET_GAIN = {
    hungerFeed: 30,
    energySleep: 50,
    happinessPlay: 25,
    hungerPlay: 10, // hunger decreases when playing
    energyPlayCost: 15,
    xpPlay: 20
}

const REVALUE_TIER_DATA = {
    C: { range: [8_000, 15_000], emoji: '🔰' },
    'Tier 1': { range: [8_000, 15_000], emoji: '🔰' },

    'Tier 2': { range: [20_000, 45_000], emoji: '🪄' },

    'Tier 3': { range: [50_000, 110_000], emoji: '🔭' },

    'Tier 4': { range: [120_000, 250_000], emoji: '🔮' },
    R: { range: [120_000, 250_000], emoji: '🔮' },

    'Tier 5': { range: [260_000, 500_000], emoji: '🔯' },
    SR: { range: [260_000, 500_000], emoji: '🔯' },

    'Tier 6': { range: [550_000, 1_000_000], emoji: '🧧' },
    SSR: { range: [550_000, 1_000_000], emoji: '🧧' },

    'Tier S': { range: [1_100_000, 2_200_000], emoji: '👑' },
    UR: { range: [1_100_000, 2_200_000], emoji: '👑' }
}

const DEFAULT_ASSETS = [
    {
        id: 'BTC',
        name: 'Bitcoin',
        price: 1000,
        baseLiquidity: 50000,
        volatility: 0.08,
        buyVolumeTick: 0,
        sellVolumeTick: 0
    },
    {
        id: 'ETH',
        name: 'Ethereum',
        price: 500,
        baseLiquidity: 40000,
        volatility: 0.09,
        buyVolumeTick: 0,
        sellVolumeTick: 0
    },
    {
        id: 'SOL',
        name: 'Solana',
        price: 150,
        baseLiquidity: 30000,
        volatility: 0.11,
        buyVolumeTick: 0,
        sellVolumeTick: 0
    },
    {
        id: 'XRP',
        name: 'Ripple',
        price: 80,
        baseLiquidity: 25000,
        volatility: 0.12,
        buyVolumeTick: 0,
        sellVolumeTick: 0
    }
]

const _clamp = (v, min, max) => Math.max(min, Math.min(max, v))

export const isSupportGroup = (jid) => {
    const groups = global.config?.supportGroups ?? []
    return groups.some((g) => g.jid === jid)
}
/**
 * Gathers the global market snapshot needed for revaluation.
 * Results are cached for 5 minutes so a user doing -revalue all
 * doesn't trigger 12 separate full-collection aggregations.
 */
let _marketSnapshotCache = null
let _marketSnapshotExpiry = 0

export const getMarketSnapshot = async () => {
    const now = Date.now()
    if (_marketSnapshotCache && now < _marketSnapshotExpiry) {
        return _marketSnapshotCache
    }

    try {
        // One aggregation — unwinds both deck and collection, groups by tier
        const [tierStats] = await User.aggregate([
            {
                $project: {
                    allCards: {
                        $concatArrays: [{ $ifNull: ['$cards.deck', []] }, { $ifNull: ['$cards.collection', []] }]
                    }
                }
            },
            { $unwind: '$allCards' },
            {
                $group: {
                    _id: '$allCards.tier',
                    count: { $sum: 1 },
                    avgBasePrice: { $avg: { $ifNull: ['$allCards.basePrice', 0] } },
                    avgPrice: { $avg: { $ifNull: ['$allCards.price', 0] } }
                }
            },
            {
                $group: {
                    _id: null,
                    totalCards: { $sum: '$count' },
                    tiers: {
                        $push: {
                            tier: '$_id',
                            count: '$count',
                            avgBasePrice: '$avgBasePrice',
                            avgPrice: '$avgPrice'
                        }
                    }
                }
            }
        ])

        const totalUsers = await User.countDocuments()

        // Build a quick lookup map: tier → { count, avgBasePrice, avgPrice }
        const tierMap = {}
        const totalCards = tierStats?.totalCards || 1
        for (const t of tierStats?.tiers || []) {
            if (t.tier) {
                tierMap[t.tier] = t
            }
        }

        _marketSnapshotCache = { totalUsers, totalCards, tierMap }
        _marketSnapshotExpiry = now + 5 * 60 * 1000 // cache for 5 minutes

        return _marketSnapshotCache
    } catch (e) {
        console.error('[DB ERROR: getMarketSnapshot]', e)
        return { totalUsers: 1, totalCards: 1, tierMap: {} }
    }
}

// src/database/db.js — UPDATE these four functions + add forfeitChallenge
//
// Changes:
//   - expiresAt set to null — challenges never expire
//   - All expiry checks removed throughout
//   - forfeitChallenge added: wipes progress + removes card from wishlist

// ─── assignChallenge ──────────────────────────────────────────────────────────

export const assignChallenge = async (jid) => {
    try {
        const user = await User.findOne({ $or: [{ jid }, { lid: jid }] })
            .select('jid lid wishlist challenges stats exp wallet')
            .lean()

        if (!user) {
            return { ok: false, error: 'NOT_FOUND' }
        }

        const wishlist = user.wishlist || []
        if (wishlist.length === 0) {
            return { ok: false, error: 'NO_WISHLIST' }
        }

        const active = (user.challenges || []).filter((c) => !c.completed && !c.rewardClaimed)
        if (active.length > 0) {
            return { ok: false, error: 'ALREADY_HAS_CHALLENGE', existing: active[0] }
        }

        const usedCardIds = new Set((user.challenges || []).filter((c) => c.cardId).map((c) => c.cardId))
        const availableCards = wishlist.filter((c) => !usedCardIds.has(c.id))
        if (availableCards.length === 0) {
            return { ok: false, error: 'ALL_CARDS_USED' }
        }

        // Weighted random pick
        const totalWeight = CHALLENGE_DEFS.reduce((s, d) => s + d.weight, 0)
        let roll = Math.random() * totalWeight
        let def = CHALLENGE_DEFS[0]
        for (const d of CHALLENGE_DEFS) {
            roll -= d.weight
            if (roll <= 0) {
                def = d
                break
            }
        }

        const rewardCard = getRandomItem(availableCards)
        const goal = def.goalFn()
        const now = Date.now()

        // ── Snapshot for exp/wallet challenges ───────────────────────────────
        let snapshot = null
        if (def.snapshotKey) {
            snapshot = user[def.snapshotKey] ?? 0
        }

        // ── Pick tier for collect_cards ──────────────────────────────────────
        let targetTier = null
        if (def.id === 'collect_cards') {
            targetTier = getRandomItem(def.tierPool)
        }

        const challenge = {
            challengeId: def.id,
            assignedAt: now,
            expiresAt: null,
            completed: false,
            completedAt: null,
            notified: false,
            progress: 0, // always starts at 0 — delta from snapshot
            goal,
            rewardClaimed: false,
            cardId: rewardCard.id,
            cardType: rewardCard.type,
            snapshot, // baseline captured now
            targetTier // null for non-card challenges
        }

        await User.updateOne({ $or: [{ jid }, { lid: jid }] }, { $push: { challenges: challenge } })

        return { ok: true, challenge, def, rewardCard, availableCount: availableCards.length }
    } catch (err) {
        console.error('[DB ERROR: assignChallenge]', err)
        return { ok: false, error: 'INTERNAL_ERROR' }
    }
}

// ─── getActiveChallenge ───────────────────────────────────────────────────────
// No expiry checks — a challenge is active as long as it's not completed
// and not rewardClaimed. No cleanup of "expired" challenges.

export const getActiveChallenge = async (jid) => {
    try {
        const user = await User.findOne({ $or: [{ jid }, { lid: jid }] })
            .select('jid lid challenges stats exp wallet')
            .lean()

        if (!user) {
            return null
        }

        const challenges = user.challenges || []

        // Active = not completed and reward not yet claimed
        const active = challenges.find((c) => !c.completed && !c.rewardClaimed)
        if (!active) {
            return null
        }

        // For live-checked challenges, compute current progress on the fly
        const def = CHALLENGE_DEFS.find((d) => d.id === active.challengeId)
        if (!def) {
            return active
        }

        let liveProgress = active.progress

        if (active.challengeId === 'exp_milestone') {
            liveProgress = user.exp || 0
        } else if (active.challengeId === 'wallet_milestone') {
            liveProgress = user.wallet || 0
        }

        return { ...active, progress: liveProgress }
    } catch (err) {
        console.error('[DB ERROR: getActiveChallenge]', err)
        return null
    }
}

// ─── incrementChallengeProgress ───────────────────────────────────────────────
// Removed: `now < c.expiresAt` check — challenges don't expire

export const incrementChallengeProgress = async (jid, statKey, amount = 1, cardTier = null) => {
    try {
        const user = await User.findOne({ $or: [{ jid }, { lid: jid }] })
            .select('jid lid challenges')
            .lean()

        if (!user?.challenges?.length) {
            return null
        }

        const now = Date.now()
        const idx = user.challenges.findIndex((c) => {
            if (c.completed || c.rewardClaimed || c.notified) {
                return false
            }

            if (statKey === 'collect_cards') {
                // Only count if this challenge is collect_cards AND tier matches
                return c.challengeId === 'collect_cards' && c.targetTier === cardTier
            }

            return CHALLENGE_DEFS.find((d) => d.id === c.challengeId)?.statKey === statKey
        })

        if (idx === -1) {
            return null
        }

        const ch = user.challenges[idx]
        const newProgress = Math.min(ch.progress + amount, ch.goal)
        const completed = newProgress >= ch.goal

        const setFields = { [`challenges.${idx}.progress`]: newProgress }
        if (completed) {
            setFields[`challenges.${idx}.completed`] = true
            setFields[`challenges.${idx}.completedAt`] = now
            setFields[`challenges.${idx}.notified`] = true
        }

        // For stat-based challenges, also increment the stat counter
        const incFields = statKey !== 'collect_cards' ? { [`stats.${statKey}`]: amount } : {}

        await User.updateOne(
            { $or: [{ jid }, { lid: jid }] },
            { $set: setFields, ...(Object.keys(incFields).length ? { $inc: incFields } : {}) }
        )

        return { completed, progress: newProgress, goal: ch.goal, challengeId: ch.challengeId }
    } catch (err) {
        console.error('[DB ERROR: incrementChallengeProgress]', err)
        return null
    }
}

// ─── claimChallengeReward ─────────────────────────────────────────────────────
// Removed: expiresAt + 48h grace window — no expiry means always claimable

export const claimChallengeReward = async (jid) => {
    try {
        const user = await User.findOne({ $or: [{ jid }, { lid: jid }] })
            .select('jid lid challenges wishlist cards.deck')
            .lean()

        if (!user) {
            return { ok: false, error: 'NOT_FOUND' }
        }

        // Find completed, unclaimed challenge — no expiry window needed
        const idx = (user.challenges || []).findIndex((c) => c.completed && !c.rewardClaimed)

        if (idx === -1) {
            return { ok: false, error: 'NO_COMPLETED_CHALLENGE' }
        }

        const ch = user.challenges[idx]
        const rewardCard = (user.wishlist || []).find((c) => c.id === ch.cardId)

        if (!rewardCard) {
            return { ok: false, error: 'REWARD_CARD_NOT_IN_WISHLIST', cardId: ch.cardId }
        }

        // Mark claimed first — prevents double-claim on concurrent calls
        await User.updateOne({ $or: [{ jid }, { lid: jid }] }, { $set: { [`challenges.${idx}.rewardClaimed`]: true } })

        return { ok: true, rewardCard, challengeId: ch.challengeId }
    } catch (err) {
        console.error('[DB ERROR: claimChallengeReward]', err)
        return { ok: false, error: 'INTERNAL_ERROR' }
    }
}

// ─── checkLiveChallenge ───────────────────────────────────────────────────────
// Removed: expiresAt check — no expiry

export const checkLiveChallenge = async (jid, groupId = null) => {
    try {
        const user = await User.findOne({ $or: [{ jid }, { lid: jid }] })
            .select('jid lid challenges exp wallet')
            .lean()

        if (!user?.challenges?.length) {
            return null
        }

        const now = Date.now()
        const ch = user.challenges.find((c) => !c.completed && !c.rewardClaimed && !c.notified)
        if (!ch) {
            return null
        }

        const def = CHALLENGE_DEFS.find((d) => d.id === ch.challengeId)
        if (!def || def.statKey !== null) {
            return null
        }

        // collect_cards progress is tracked via incrementChallengeProgress, not here
        if (ch.challengeId === 'collect_cards') {
            return null
        }

        let currentValue = 0

        if (ch.challengeId === 'exp_milestone') {
            // Only count XP earned AFTER the challenge started
            const baseline = ch.snapshot ?? 0
            currentValue = Math.max(0, (user.exp || 0) - baseline)
        } else if (ch.challengeId === 'wallet_milestone') {
            // Only count wallet increase AFTER the challenge started
            const baseline = ch.snapshot ?? 0
            currentValue = Math.max(0, (user.wallet || 0) - baseline)
        } else if (ch.challengeId === 'global_lb_top10') {
            currentValue = await getLeaderboardPosition(jid)
        } else if (ch.challengeId === 'local_lb_top5' && groupId) {
            const myExp = user.exp || 0
            const higherCount = await User.countDocuments({ exp: { $gt: myExp } })
            currentValue = higherCount + 1
        }

        const achieved =
            ch.challengeId === 'global_lb_top10' || ch.challengeId === 'local_lb_top5'
                ? currentValue <= ch.goal
                : currentValue >= ch.goal

        if (achieved) {
            const idx = user.challenges.findIndex((c) => c.challengeId === ch.challengeId && !c.completed)
            if (idx !== -1) {
                await User.updateOne(
                    { $or: [{ jid }, { lid: jid }] },
                    {
                        $set: {
                            [`challenges.${idx}.completed`]: true,
                            [`challenges.${idx}.completedAt`]: now,
                            [`challenges.${idx}.notified`]: true,
                            [`challenges.${idx}.progress`]: currentValue
                        }
                    }
                )
                return { completed: true, progress: currentValue, goal: ch.goal, challengeId: ch.challengeId }
            }
        }

        return { completed: false, progress: currentValue, goal: ch.goal, challengeId: ch.challengeId }
    } catch (err) {
        console.error('[DB ERROR: checkLiveChallenge]', err)
        return null
    }
}

// ─── forfeitChallenge ─────────────────────────────────────────────────────────
// Removes the active challenge entirely and pulls the reward card from the
// user's wishlist so it can never be re-used as a challenge reward.

export const forfeitChallenge = async (jid) => {
    try {
        const user = await User.findOne({ $or: [{ jid }, { lid: jid }] })
            .select('jid lid challenges wishlist')
            .lean()

        if (!user) {
            return { ok: false, error: 'NOT_FOUND' }
        }

        const challenge = (user.challenges || []).find((c) => !c.completed && !c.rewardClaimed)
        if (!challenge) return { ok: false, error: 'NO_ACTIVE_CHALLENGE' }

        const cardId = challenge.cardId
        const rewardCard = (user.wishlist || []).find((c) => c.id === cardId)

        // 1. Remove the challenge from the array
        // 2. Remove the card from the wishlist
        await User.updateOne(
            { $or: [{ jid }, { lid: jid }] },
            {
                $pull: {
                    challenges: { challengeId: challenge.challengeId, completed: false, rewardClaimed: false },
                    wishlist: { id: cardId }
                }
            }
        )

        return {
            ok: true,
            challenge,
            rewardCard, // null if card was already removed from wishlist
            cardId
        }
    } catch (err) {
        console.error('[DB ERROR: forfeitChallenge]', err)
        return { ok: false, error: 'INTERNAL_ERROR' }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// incrementUserStat  (generic — used by daily streak, support msgs, etc.)
// ─────────────────────────────────────────────────────────────────────────────
export const incrementUserStat = async (jid, statKey, amount = 1) => {
    try {
        await User.updateOne({ $or: [{ jid }, { lid: jid }] }, { $inc: { [`stats.${statKey}`]: amount } })
        return true
    } catch (err) {
        console.error(`[DB ERROR: incrementUserStat ${statKey}]`, err)
        return false
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateDailyStreak
// Call this from daily.js right after a successful claim.
// Returns the new streak number.
// ─────────────────────────────────────────────────────────────────────────────
export const updateDailyStreak = async (jid) => {
    try {
        const user = await User.findOne({ $or: [{ jid }, { lid: jid }] })
            .select('jid lid stats')
            .lean()

        if (!user) return 0

        const now = Date.now()
        const last = user.stats?.lastDailyClaim || 0
        const hoursSince = (now - last) / 3600000

        // Allow a 26h window to count as "next day" (covers timezone drift + late claims)
        const isConsecutive = hoursSince >= 20 && hoursSince <= 50

        const newStreak = isConsecutive ? (user.stats?.dailyStreak || 0) + 1 : 1

        await User.updateOne(
            { $or: [{ jid }, { lid: jid }] },
            {
                $set: {
                    'stats.dailyStreak': newStreak,
                    'stats.lastDailyClaim': now
                }
            }
        )

        return newStreak
    } catch (err) {
        console.error('[DB ERROR: updateDailyStreak]', err)
        return 0
    }
}

/**
 * Disable a command globally.
 * If the command is already disabled, updates the reason + disabledBy + disabledAt.
 *
 * @param {string} name       - canonical command name (e.g. 'gamble')
 * @param {string} reason     - reason shown to users
 * @param {string} disabledBy - JID of the dev disabling it
 * @returns {object} the saved document
 */
export const disableCommand = async (name, reason, disabledBy) => {
    try {
        return await Command.findOneAndUpdate(
            { name },
            { name, reason, disabledBy, disabledAt: Date.now() },
            { upsert: true, new: true }
        )
    } catch (e) {
        console.error('[DB ERROR: disableCommand]', e)
        return null
    }
}

/**
 * Add a new dynamic moderator.
 * Returns { ok: true } on success, { ok: false, error } on failure.
 */
export const addMod = async (jid, addedBy) => {
    try {
        const existing = await Mod.findOne({ jid })
        if (existing) return { ok: false, error: 'ALREADY_MOD' }

        await Mod.create({ jid, addedBy, addedAt: Date.now() })

        // Sync into live global config immediately so isDev checks work without restart
        if (!global.config.mods.includes(jid)) {
            global.config.mods.push(jid)
        }

        return { ok: true }
    } catch (e) {
        console.error('[DB ERROR: addMod]', e)
        return { ok: false, error: 'INTERNAL_ERROR' }
    }
}

/**
 * Remove a dynamic moderator.
 * Returns { ok: true } if removed, { ok: false, error } if not found or is a hardcoded owner.
 */
export const removeMod = async (jid, hardcodedOwners = []) => {
    try {
        // Never allow removing a hardcoded config owner via this function
        if (hardcodedOwners.includes(jid)) {
            return { ok: false, error: 'IS_OWNER' }
        }

        const result = await Mod.deleteOne({ jid })
        if (result.deletedCount === 0) return { ok: false, error: 'NOT_FOUND' }

        // Remove from live global config array
        global.config.mods = global.config.mods.filter((m) => m !== jid)

        return { ok: true }
    } catch (e) {
        console.error('[DB ERROR: removeMod]', e)
        return { ok: false, error: 'INTERNAL_ERROR' }
    }
}

/**
 * Fetch all dynamic moderators (excludes hardcoded owners).
 */
export const getDynamicMods = async () => {
    try {
        return await Mod.find({}).lean()
    } catch (e) {
        console.error('[DB ERROR: getDynamicMods]', e)
        return []
    }
}

/**
 * Called once at startup to merge persisted dynamic mods into global.config.mods.
 * Should be called right after the bot connects and global.config is set.
 */
export const loadDynamicMods = async () => {
    try {
        const mods = await Mod.find({}).lean()
        for (const mod of mods) {
            if (!global.config.mods.includes(mod.jid)) {
                global.config.mods.push(mod.jid)
            }
        }
        if (mods.length > 0) {
            console.log(`[Mods] ✅ Loaded ${mods.length} dynamic mod(s) from database.`)
        }
    } catch (e) {
        console.error('[DB ERROR: loadDynamicMods]', e)
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  ADD TO: src/database/db.js
//
//  Two new atomic move functions that replace the two-step
//  remove → add pattern in c2d and d2c.
//
//  Each uses a single findOneAndUpdate with an aggregation pipeline so
//  MongoDB executes the entire operation in one round-trip — no window
//  for a crash or timeout to leave the card in neither array.
// ═══════════════════════════════════════════════════════════════════════════

export const moveCollectionToDeck = async (jid, index) => {
    try {
        const peek = await User.findOne(
            { $or: [{ jid }, { lid: jid }] },
            { 'cards.collection': { $slice: [index, 1] }, jid: 1 }
        ).lean()

        const card = peek?.cards?.collection?.[0]
        if (!card?._id) return null

        const result = await User.findOneAndUpdate(
            {
                jid: peek.jid,
                [`cards.collection.${index}._id`]: card._id,
                $expr: { $lt: [{ $size: { $ifNull: ['$cards.deck', []] } }, 12] }
            },
            [
                {
                    $set: {
                        'cards.collection': {
                            $filter: {
                                input: '$cards.collection',
                                as: 'c',
                                cond: { $ne: ['$$c._id', card._id] }
                            }
                        },
                        'cards.deck': { $concatArrays: ['$cards.deck', [card]] }
                    }
                }
            ],
            { new: true, lean: true, updatePipeline: true, projection: { 'cards.deck': 1 } }
        )

        if (!result) return null

        return {
            card,
            newDeckSize: result.cards?.deck?.length ?? 0
        }
    } catch (e) {
        console.error('[DB ERROR: moveCollectionToDeck]', e)
        return null
    }
}

export const moveDeckToCollection = async (jid, index) => {
    try {
        const peek = await User.findOne(
            { $or: [{ jid }, { lid: jid }] },
            { 'cards.deck': { $slice: [index, 1] }, jid: 1 }
        ).lean()

        const card = peek?.cards?.deck?.[0]
        if (!card?._id) return null

        const result = await User.findOneAndUpdate(
            {
                jid: peek.jid,
                [`cards.deck.${index}._id`]: card._id
            },
            [
                {
                    $set: {
                        'cards.deck': {
                            $filter: {
                                input: '$cards.deck',
                                as: 'd',
                                cond: { $ne: ['$$d._id', card._id] }
                            }
                        },
                        'cards.collection': { $concatArrays: ['$cards.collection', [card]] }
                    }
                }
            ],
            { new: true, lean: true, updatePipeline: true, projection: { 'cards.deck': 1 } }
        )

        if (!result) return null

        return {
            card,
            newDeckSize: result.cards?.deck?.length ?? 0
        }
    } catch (e) {
        console.error('[DB ERROR: moveDeckToCollection]', e)
        return null
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  PATCH: src/database/db.js
//
//  Step 1 — add Bot to the model import at the top of db.js:
//
//    import { Group, User, Contact, Code, State, GroupActivity,
//             Mod, Command, Bot }
//        from './models/index.js'
//
//  Step 2 — REPLACE these existing functions with the versions below:
//    addSupportGroup, removeSupportGroup, loadSupportGroups,
//    updateSupportGroupInvite, lockSupportGroup, unlockSupportGroup,
//    getSupportGroupLock, incrementSupportUsage, resetSupportUsage,
//    getSupportUsage
//
//  Step 3 — ADD the new chatbot functions (isChatbotEnabled, setChatbotEnabled)
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
//  CHATBOT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the chatbot is enabled, false if disabled.
 * Defaults to true if the document has never been set.
 */
export const isChatbotEnabled = async () => {
    try {
        const doc = await Bot.findOne({ key: 'chatbot' }).lean()
        if (!doc || doc.chatbotEnabled === null) {
            return true
        }
        return doc.chatbotEnabled === true
    } catch (e) {
        console.error('[DB ERROR: isChatbotEnabled]', e)
        return true // fail open — don't break the bot
    }
}

/**
 * Set the chatbot on (true) or off (false).
 */
export const setChatbotEnabled = async (enabled) => {
    try {
        await Bot.findOneAndUpdate(
            { key: 'chatbot' },
            { $set: { chatbotEnabled: enabled, updatedAt: new Date() } },
            { upsert: true }
        )
        return true
    } catch (e) {
        console.error('[DB ERROR: setChatbotEnabled]', e)
        return false
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SUPPORT GROUP REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add a support group to the persistent registry.
 * entry = { jid, label, invite, category }
 */
export const addSupportGroup = async (entry) => {
    try {
        const doc = await Bot.findOne({ key: 'support:groups' }).lean()
        const current = doc?.groups ?? []

        if (current.find((g) => g.jid === entry.jid)) {
            return false
        }

        await Bot.findOneAndUpdate(
            { key: 'support:groups' },
            {
                $push: { groups: entry },
                $set: { updatedAt: new Date() }
            },
            { upsert: true }
        )

        // Hot-patch runtime config
        if (!global.config.supportGroups.find((g) => g.jid === entry.jid)) {
            global.config.supportGroups.push(entry)
        }

        return true
    } catch (e) {
        console.error('[DB ERROR: addSupportGroup]', e)
        return false
    }
}

/**
 * Remove a support group from the registry by JID.
 */
export const removeSupportGroup = async (jid) => {
    try {
        await Bot.findOneAndUpdate(
            { key: 'support:groups' },
            {
                $pull: { groups: { jid } },
                $set: { updatedAt: new Date() }
            }
        )

        global.config.supportGroups = global.config.supportGroups.filter((g) => g.jid !== jid)
        return true
    } catch (e) {
        console.error('[DB ERROR: removeSupportGroup]', e)
        return false
    }
}

/**
 * Update the invite link for a support group.
 */
export const updateSupportGroupInvite = async (jid, invite) => {
    try {
        await Bot.findOneAndUpdate(
            { key: 'support:groups', 'groups.jid': jid },
            {
                $set: {
                    'groups.$.invite': invite,
                    updatedAt: new Date()
                }
            }
        )

        // Hot-patch runtime config
        const idx = global.config.supportGroups?.findIndex((g) => g.jid === jid)
        if (idx !== -1 && idx !== undefined) {
            global.config.supportGroups[idx].invite = invite
        }
    } catch (e) {
        console.error('[DB ERROR: updateSupportGroupInvite]', e)
    }
}

/**
 * Load all DB-stored support groups into global.config.supportGroups at startup.
 */
export const loadSupportGroups = async () => {
    try {
        const doc = await Bot.findOne({ key: 'support:groups' }).lean()
        const dbGroups = doc?.groups ?? []

        for (const g of dbGroups) {
            if (!global.config.supportGroups.find((c) => c.jid === g.jid)) {
                global.config.supportGroups.push(g)
            }
        }
        console.log(`[Support] ✅ Loaded ${global.config.supportGroups.length} support group(s)`)
    } catch (e) {
        console.error('[DB ERROR: loadSupportGroups]', e)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SUPPORT GROUP USAGE COUNTER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reset the usage counter for a support group back to 0.
 */
export const resetSupportUsage = async (groupJid) => {
    try {
        await Bot.findOneAndUpdate(
            { key: `support:usage:${groupJid}` },
            { $set: { usageCount: 0, updatedAt: new Date() } },
            { upsert: true }
        )
    } catch (e) {
        console.error('[DB ERROR: resetSupportUsage]', e)
    }
}

/**
 * Automatically revalues every card (deck + collection) for every user.
 * Processes users in batches to avoid memory spikes on large DBs.
 * Called by the cron in index.js — no user interaction needed.
 *
 * @returns {{ users: number, cards: number }} counts of what was updated
 */
export const runGlobalRevalue = async () => {
    const BATCH_SIZE = 50 // process 50 users at a time
    let skip = 0
    let totalUsers = 0
    let totalCards = 0

    // One snapshot for the entire run — same market data applies to all
    const snapshot = await getMarketSnapshot()

    while (true) {
        const batch = await User.find(
            {
                $or: [{ 'cards.deck.0': { $exists: true } }, { 'cards.collection.0': { $exists: true } }]
            },
            'jid lid cards.deck cards.collection'
        )
            .lean()
            .skip(skip)
            .limit(BATCH_SIZE)

        if (!batch.length) break

        const ops = []

        for (const user of batch) {
            const deck = user.cards?.deck || []
            const col = user.cards?.collection || []

            // ── Deck cards ────────────────────────────────────────────────
            deck.forEach((card, i) => {
                if (!card.tier) return
                const { newPrice, newBasePrice } = calculateCardRevalue(card, snapshot)
                ops.push({
                    updateOne: {
                        filter: {
                            $or: [{ jid: user.jid }, { lid: user.lid }],
                            'cards.deck._id': card._id
                        },
                        update: {
                            $set: {
                                'cards.deck.$.price': newPrice,
                                'cards.deck.$.basePrice': newBasePrice
                            }
                        }
                    }
                })
                totalCards++
            })

            // ── Collection cards ──────────────────────────────────────────
            col.forEach((card, i) => {
                if (!card.tier) return
                const { newPrice, newBasePrice } = calculateCardRevalue(card, snapshot)
                ops.push({
                    updateOne: {
                        filter: {
                            $or: [{ jid: user.jid }, { lid: user.lid }],
                            'cards.collection._id': card._id
                        },
                        update: {
                            $set: {
                                'cards.collection.$.price': newPrice,
                                'cards.collection.$.basePrice': newBasePrice
                            }
                        }
                    }
                })
                totalCards++
            })

            totalUsers++
        }

        // Fire all updates for this batch in one round-trip
        if (ops.length > 0) {
            await User.bulkWrite(ops, { ordered: false })
        }

        skip += BATCH_SIZE

        // Stop if we got fewer than a full batch — means we hit the end
        if (batch.length < BATCH_SIZE) break
    }

    // Bust the market snapshot cache so next -revalue call sees fresh data
    _marketSnapshotCache = null
    _marketSnapshotExpiry = 0

    return { users: totalUsers, cards: totalCards }
}

/**
 * Atomically retrieves AND deletes the spawned card state for a group.
 * Uses findOneAndDelete so the document is gone the moment it is read —
 * a second concurrent claim in the same group will find nothing.
 *
 * @param {string} groupJid  - the group JID (M.from)
 * @returns {object|null}    - the card data, or null if no card / already claimed
 */
export const claimCardState = async (groupJid) => {
    try {
        const doc = await State.findOneAndDelete({ key: `${groupJid}:card` })
        if (!doc) {
            return null
        }

        // Respect the expiresAt TTL — if the card has already expired, discard it
        if (doc.expiresAt && new Date() > doc.expiresAt) {
            return null
        }

        return doc.data
    } catch (e) {
        console.error('[DB ERROR: claimCardState]', e)
        return null
    }
}

/**
 * Re-enable a command by removing its document.
 *
 * @param {string} name - canonical command name
 * @returns {boolean} true if a document was deleted, false if it wasn't disabled
 */
export const enableCommand = async (name) => {
    try {
        const result = await Command.deleteOne({ name })
        return result.deletedCount > 0
    } catch (e) {
        console.error('[DB ERROR: enableCommand]', e)
        return false
    }
}

/**
 * Check if a single command is disabled.
 *
 * @param {string} name - canonical command name
 * @returns {object|null} the DisabledCommand document, or null if not disabled
 */
export const getDisabledCommand = async (name) => {
    try {
        return await Command.findOne({ name }).lean()
    } catch (e) {
        console.error('[DB ERROR: getDisabledCommand]', e)
        return null
    }
}

/**
 * Fetch all currently disabled commands (for a dev listing).
 *
 * @returns {object[]} array of DisabledCommand documents
 */
export const getAllDisabledCommands = async () => {
    try {
        return await Command.find({}).lean()
    } catch (e) {
        console.error('[DB ERROR: getAllDisabledCommands]', e)
        return []
    }
}

/**
 * Calculates the revalued price for a single card.
 * Pure function — no DB calls. Pass the market snapshot in.
 *
 * @param {object} card           - card object from the user document
 * @param {object} marketSnapshot - result of getMarketSnapshot()
 * @returns {{ newPrice: number, newBasePrice: number, breakdown: object }}
 */
export const calculateCardRevalue = (card, marketSnapshot) => {
    const { totalUsers, totalCards, tierMap } = marketSnapshot
    const tier = card.tier

    // Tier reference range
    const tierData = REVALUE_TIER_DATA[tier]
    const tierRange = tierData?.range || [500, 1000]
    const tierBase = (tierRange[0] + tierRange[1]) / 2

    // ── 1. SCARCITY FACTOR ────────────────────────────────────────────────
    const tierInfo = tierMap[tier] || { count: 1, avgBasePrice: tierBase, avgPrice: tierBase }
    const scarcityRatio = tierInfo.count / Math.max(totalCards, 1)
    // Lower ratio = rarer = higher multiplier. Denominator prevents div-by-zero.
    const scarcityMult = _clamp(1 / (scarcityRatio * 10 + 0.5), 0.7, 2.5)

    // ── 2. ECONOMY SCALE FACTOR ───────────────────────────────────────────
    // sqrt gives a smooth curve. 100 users = 1.0 baseline.
    const economyFactor = _clamp(Math.sqrt(100 / Math.max(totalUsers, 1)), 0.5, 2.0)

    // ── 3. MARKET CORRECTION ──────────────────────────────────────────────
    // Blend of tier's avg basePrice (40%) and avg current price (60%).
    // Weights recent market prices more than spawn prices.
    const avgBlend = 0.4 * tierInfo.avgBasePrice + 0.6 * tierInfo.avgPrice
    const correctionFactor = _clamp(avgBlend / tierBase, 0.5, 2.0)

    // ── 4. RAW PRICE ──────────────────────────────────────────────────────
    const rawPrice = tierBase * scarcityMult * economyFactor * correctionFactor

    // ── 5. SOFT-ANCHOR to this card's own basePrice ───────────────────────
    // Prevents wild swings for individual cards that are atypically priced.
    const cardBase = card.basePrice || tierBase
    const anchoredPrice = 0.6 * rawPrice + 0.4 * cardBase

    // ── 6. CLAMP to tier range × [0.5, 3.0] ──────────────────────────────
    const floorPrice = tierRange[0] * 0.5
    const ceilPrice = tierRange[1] * 3.0
    const newPrice = Math.round(_clamp(anchoredPrice, floorPrice, ceilPrice))

    // New basePrice is the mid-point between old basePrice and new market fair value
    const newBasePrice = Math.round((cardBase + rawPrice) / 2)

    return {
        newPrice,
        newBasePrice,
        breakdown: {
            tierBase,
            scarcityMult: Math.round(scarcityMult * 100) / 100,
            economyFactor: Math.round(economyFactor * 100) / 100,
            correctionFactor: Math.round(correctionFactor * 100) / 100,
            rawPrice: Math.round(rawPrice),
            totalUsers,
            totalCards,
            tierCount: tierInfo.count
        }
    }
}

/**
 * Atomically applies a revalued price to a single deck card by its _id.
 * Returns true on success, false if the card was not found.
 */
export const applyCardRevalue = async (jid, cardId, newPrice, newBasePrice) => {
    try {
        const result = await User.updateOne(
            {
                $or: [{ jid }, { lid: jid }],
                'cards.deck._id': cardId
            },
            {
                $set: {
                    'cards.deck.$.price': newPrice,
                    'cards.deck.$.basePrice': newBasePrice
                }
            }
        )
        return result.modifiedCount > 0
    } catch (e) {
        console.error('[DB ERROR: applyCardRevalue]', e)
        return false
    }
}

/**
 * Applies revalued prices to ALL deck cards for a user in one bulkWrite.
 * cardUpdates: Array of { cardId, newPrice, newBasePrice }
 */
export const applyAllCardRevalues = async (jid, cardUpdates) => {
    try {
        if (!cardUpdates.length) {
            return false
        }

        const ops = cardUpdates.map(({ cardId, newPrice, newBasePrice }) => ({
            updateOne: {
                filter: {
                    $or: [{ jid }, { lid: jid }],
                    'cards.deck._id': cardId
                },
                update: {
                    $set: {
                        'cards.deck.$.price': newPrice,
                        'cards.deck.$.basePrice': newBasePrice
                    }
                }
            }
        }))

        const result = await User.bulkWrite(ops, { ordered: false })
        return result.modifiedCount > 0
    } catch (e) {
        console.error('[DB ERROR: applyAllCardRevalues]', e)
        return false
    }
}

export const loadMarket = async () => {
    let market = await getState(MARKET_KEY)
    if (!market || !market.assets) {
        market = { assets: DEFAULT_ASSETS, lastTick: Date.now() }
        await saveState(MARKET_KEY, market)
    }
    return market
}

export const saveMarket = async (market) => await saveState(MARKET_KEY, market)

export const getAsset = (market, symbol) => market.assets.find((a) => a.id.toLowerCase() === symbol.toLowerCase())

// FIXED: Removed Math.round to allow precise calculations for quantity > 1
export const getTradePrices = (asset) => ({
    buyPrice: asset.price * (1 + SPREAD / 2),
    sellPrice: asset.price * (1 - SPREAD / 2)
})

export const registerBuyVolume = (asset, amount) => {
    const cap = asset.baseLiquidity * 0.05
    asset.buyVolumeTick += Math.min(amount, cap)
}

export const registerSellVolume = (asset, amount) => {
    const cap = asset.baseLiquidity * 0.05
    asset.sellVolumeTick += Math.min(amount, cap)
}

const _flushActivityQueue = async () => {
    if (_activityQueue.size === 0) {
        return
    }

    const entries = [..._activityQueue.values()]
    _activityQueue.clear()

    const now = new Date()
    const todayKey = now.toISOString().slice(0, 10) // "YYYY-MM-DD"

    // Build the cutoff date for pruning old daily keys (keep last 7 days)
    const pruneKeys = []
    for (let i = 7; i <= 30; i++) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        pruneKeys.push(d.toISOString().slice(0, 10))
    }

    // One bulkWrite — all pending increments in a single round-trip
    const ops = entries.map(({ groupId, userJid, userName, count, lastSeen }) => {
        const unsetOldDays = {}
        for (const k of pruneKeys) {
            unsetOldDays[`dailyCounts.${k}`] = ''
        }

        return {
            updateOne: {
                filter: { groupId, userJid },
                update: [
                    {
                        $set: {
                            userName,
                            lastSeen,
                            firstSeen: {
                                $cond: {
                                    if: { $eq: ['$firstSeen', null] },
                                    then: lastSeen,
                                    else: '$firstSeen'
                                }
                            },
                            msgCount: { $add: [{ $ifNull: ['$msgCount', 0] }, count] },
                            [`dailyCounts.${todayKey}`]: {
                                $add: [{ $ifNull: [`$dailyCounts.${todayKey}`, 0] }, count]
                            }
                        }
                    },
                    // Prune old day keys in a second pipeline stage
                    { $unset: pruneKeys.map((k) => `dailyCounts.${k}`) }
                ],
                upsert: true,
                // pipeline array update requires this flag in mongoose
                updatePipeline: true
            }
        }
    })

    try {
        await GroupActivity.bulkWrite(ops, { ordered: false })
    } catch (e) {
        console.error('[DB ERROR: _flushActivityQueue]', e)
    }
}

// Start the flush loop
setInterval(_flushActivityQueue, FLUSH_INTERVAL)

/**
 * Called on every group message. Queues the increment — never awaited,
 * never blocks the message handler.
 */
export const trackGroupActivity = (groupId, userJid, userName) => {
    const key = `${groupId}|${userJid}`
    const existing = _activityQueue.get(key)
    if (existing) {
        existing.count++
        existing.userName = userName // always keep the latest display name
        existing.lastSeen = new Date()
    } else {
        _activityQueue.set(key, { groupId, userJid, userName, count: 1, lastSeen: new Date() })
    }
}

/**
 * Returns activity data for all tracked users in a group.
 * Splits them into active (messaged within windowDays) and inactive.
 *
 * @param {string}   groupId       - group JID
 * @param {string[]} allMemberJids - full participant list from WhatsApp metadata
 * @param {number}   windowDays    - how many days to look back (default 5)
 * @returns {{ active: [], inactive: [] }}
 */
export const getGroupActivityReport = async (groupId, allMemberJids, windowDays = 5) => {
    try {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - windowDays)
        cutoff.setHours(0, 0, 0, 0)

        // Build list of date keys for the window
        const windowKeys = []
        for (let i = 0; i < windowDays; i++) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            windowKeys.push(d.toISOString().slice(0, 10))
        }

        // Fetch all tracked records for this group
        const records = await GroupActivity.find({ groupId }).lean()

        // Map jid → record for quick lookup
        const recordMap = new Map(records.map((r) => [r.userJid, r]))

        const active = []
        const inactive = []

        // Build sets for fast membership checks
        const memberSet = new Set(allMemberJids)

        // 1. Users we have records for
        for (const record of records) {
            // Skip if they're no longer in the group
            if (!memberSet.has(record.userJid)) {
                continue
            }

            // Sum messages within the window
            const windowCount = windowKeys.reduce((sum, k) => {
                return sum + (record.dailyCounts?.[k] || 0)
            }, 0)

            const entry = {
                jid: record.userJid,
                name: record.userName || record.userJid.split('@')[0],
                totalMsgs: record.msgCount || 0,
                windowMsgs: windowCount,
                lastSeen: record.lastSeen ? new Date(record.lastSeen) : null,
                firstSeen: record.firstSeen ? new Date(record.firstSeen) : null,
                tracked: true
            }

            if (windowCount > 0) {
                active.push(entry)
            } else {
                inactive.push(entry)
            }
        }

        // 2. Members with NO record at all (joined after tracking started, or never messaged)
        for (const jid of allMemberJids) {
            if (!recordMap.has(jid)) {
                inactive.push({
                    jid,
                    name: jid.split('@')[0],
                    totalMsgs: 0,
                    windowMsgs: 0,
                    lastSeen: null,
                    firstSeen: null,
                    tracked: false
                })
            }
        }

        // Sort active by window message count desc, then total desc
        active.sort((a, b) => b.windowMsgs - a.windowMsgs || b.totalMsgs - a.totalMsgs)

        // Sort inactive: tracked-but-silent first (they have history), then never-tracked
        inactive.sort((a, b) => {
            if (a.tracked !== b.tracked) {
                return a.tracked ? -1 : 1
            }
            // Both tracked: sort by lastSeen desc (most recently silent first)
            if (a.lastSeen && b.lastSeen) {
                return b.lastSeen - a.lastSeen
            }
            if (a.lastSeen) {
                return -1
            }
            if (b.lastSeen) {
                return 1
            }
            return 0
        })

        return { active, inactive }
    } catch (e) {
        console.error('[DB ERROR: getGroupActivityReport]', e)
        return { active: [], inactive: [] }
    }
}

export const runMarketTick = async () => {
    const market = await loadMarket()
    for (const asset of market.assets) {
        const net = (asset.buyVolumeTick || 0) - (asset.sellVolumeTick || 0)
        const demandMove = (net / asset.baseLiquidity) * asset.volatility
        const noise = (Math.random() - 0.5) * 0.02 // Slightly more noise for realism

        let newPrice = asset.price * (1 + demandMove + noise)
        newPrice = Math.max(MIN_PRICE, Math.min(MAX_PRICE, newPrice))

        asset.price = Number(newPrice.toFixed(2))
        asset.buyVolumeTick = 0
        asset.sellVolumeTick = 0
    }
    market.lastTick = Date.now()
    await saveMarket(market)
}

export const connect = async (url) => {
    if (!url) {
        console.error('❌ Database Error: No MongoDB URL provided!')
        process.exit(1)
    }

    try {
        const connectionOptions = {
            autoIndex: false,
            maxPoolSize: 100,
            minPoolSize: 10,
            family: 4,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 45000
        }

        await mongoose.connect(url, connectionOptions)

        console.log('✅ Database: Connected to MongoDB successfully.')
        mongoose.connection.on('error', (err) => {
            console.error(`❌ Database: Connection lost. Error: ${err}`)
        })

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ Database: Disconnected. Attempting to reconnect...')
        })
    } catch (error) {
        console.error('❌ Database: Initial connection failed!')
        console.error(error.message)
        process.exit(1)
    }
}

export const setActiveBotState = async (groupJid, value) => {
    try {
        await Bot.findOneAndUpdate(
            { key: ACTIVE_BOT_KEY(groupJid) },
            {
                $set: {
                    activeBot: value, // sessionId | 'none' | null
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        )
        return true
    } catch (e) {
        console.error('[DB ERROR: setActiveBotState]', e)
        return false
    }
}

export const getActiveBotState = async (groupJid) => {
    try {
        const doc = await Bot.findOne({ key: ACTIVE_BOT_KEY(groupJid) })
            .select('activeBot')
            .lean()
        return doc?.activeBot ?? null
    } catch (e) {
        console.error('[DB ERROR: getActiveBotState]', e)
        return null
    }
}

export const saveState = async (key, value, durationMs = null) => {
    const update = {
        data: value,
        updatedAt: Date.now()
    }

    if (durationMs) {
        update.expiresAt = new Date(Date.now() + durationMs)
    }

    return await State.findOneAndUpdate({ key }, update, { upsert: true, new: true })
}

export const getState = async (key) => {
    const state = await State.findOne({ key })

    if (!state) {
        return null
    }

    if (state.expiresAt && new Date() > state.expiresAt) {
        await State.deleteOne({ key }) // Clean up immediately
        return null
    }

    return state.data
}

export const deleteState = async (key) => {
    return await State.deleteOne({ key })
}

export const updateContact = async (list) => {
    try {
        const bulkOps = list
            .filter((contact) => contact?.id)
            .map((contact) => ({
                updateOne: {
                    filter: { id: contact.id },
                    update: { $set: { username: contact.notify ?? '' } },
                    upsert: true
                }
            }))

        if (bulkOps.length > 0) {
            await Contact.bulkWrite(bulkOps)
        }
    } catch (e) {
        console.error('Bulk Contact Update Error:', e)
    }
}

export const getContact = async (id) => {
    let searchId = id
    if (id.endsWith('@s.whatsapp.net')) {
        const user = await User.findOne({ jid: id })
        if (user) searchId = user.lid
    }
    const contact = await Contact.findOne({ id: searchId })
    return contact ? contact.username : 'User'
}

export const generateSecureCode = async (meta) => {
    const codeStr = randomBytes(5).toString('hex').toUpperCase()
    const codeMeta = {
        code: codeStr,
        type: meta.type,
        by: meta.by,
        discountPercent: meta.discountPercent,
        minPurchase: meta.minPurchase,
        reward: meta.reward,
        createdAt: Date.now()
    }

    await Code.create(codeMeta)
    return codeStr
}

export const removeCode = async (code) => {
    const result = await Code.deleteOne({ code })
    return result.deletedCount > 0
}

export const getRedeemCodeInfo = async (code) => {
    return await Code.findOne({ code })
}

export const setGroup = async ({ id }) => {
    if (!id.endsWith('g.us')) {
        return false
    }
    const exists = await Group.findOne({ id })
    if (exists) {
        return false
    }

    await Group.create({ id, mmo: false, funds: 0 })
    return true
}

export const findGroup = async (id) => {
    if (!id || !id.endsWith('g.us')) {
        return false
    }
    try {
        let group = await Group.findOne({ id })
        if (!group) {
            console.log(`Creating new group for ID: ${id}`)
            group = await Group.create({ id }) // Default features are added via Schema
        }
        return group
    } catch (e) {
        return false
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  ADD THESE FUNCTIONS TO src/database/db.js
//  They handle the group-level command/category ban system.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch a user's ban record for a specific group.
 * Returns null if the user has no ban entry.
 */
export const getUserBan = async (groupId, jid) => {
    try {
        const group = await Group.findOne({ id: groupId }).select('bans').lean()
        if (!group?.bans?.users) {
            return null
        }
        return group.bans.users.find((b) => b.jid === jid) ?? null
    } catch (e) {
        console.error('[DB ERROR: getUserBan]', e)
        return null
    }
}

/**
 * Add or update a command ban for a user in a group.
 *
 * @param {string}   groupId   - Group JID
 * @param {string}   jid       - Target user JID
 * @param {string[]} commands  - Command names to ban (resolved from categories already)
 * @param {string[]} categories - Category labels to store (for display only)
 * @param {string}   reason    - Ban reason
 *
 * If the user already has a ban entry, the new commands/categories are MERGED
 * with the existing ones (no duplicates).
 */
export const addCommandBan = async (groupId, jid, commands = [], categories = [], reason = '') => {
    try {
        const group = await Group.findOne({ id: groupId }).select('bans')
        if (!group) {
            return { ok: false, error: 'GROUP_NOT_FOUND' }
        }

        if (!group.bans) {
            group.bans = { users: [] }
        }
        if (!group.bans.users) {
            group.bans.users = []
        }

        const existing = group.bans.users.find((b) => b.jid === jid)

        if (existing) {
            // Merge — deduplicate commands and categories
            const mergedCmds = [...new Set([...existing.commands, ...commands])]
            const mergedCats = [...new Set([...existing.categories, ...categories])]

            await Group.updateOne(
                { id: groupId, 'bans.users.jid': jid },
                {
                    $set: {
                        'bans.users.$.commands': mergedCmds,
                        'bans.users.$.categories': mergedCats,
                        'bans.users.$.reason': reason || existing.reason,
                        'bans.users.$.bannedAt': Date.now()
                    }
                }
            )
            return { ok: true, action: 'updated', commands: mergedCmds, categories: mergedCats }
        } else {
            // New entry
            const entry = { jid, commands, categories, reason, bannedAt: Date.now() }
            await Group.updateOne({ id: groupId }, { $push: { 'bans.users': entry } })
            return { ok: true, action: 'created', commands, categories }
        }
    } catch (e) {
        console.error('[DB ERROR: addCommandBan]', e)
        return { ok: false, error: 'INTERNAL_ERROR' }
    }
}

/**
 * Remove specific commands and/or categories from a user's ban entry.
 * If after removal both arrays are empty, the entire ban entry is deleted.
 *
 * @param {string}   groupId    - Group JID
 * @param {string}   jid        - Target user JID
 * @param {string[]} commands   - Commands to unban (empty array = skip)
 * @param {string[]} categories - Categories to unban (also removes their resolved commands)
 * @param {Map}      categoryCommandMap - { category -> [cmdNames] } from live plugins
 */
export const removeCommandBan = async (groupId, jid, commands = [], categories = [], categoryCommandMap = {}) => {
    try {
        const group = await Group.findOne({ id: groupId }).select('bans')
        if (!group?.bans?.users) {
            return { ok: false, error: 'NO_BAN' }
        }

        const entry = group.bans.users.find((b) => b.jid === jid)
        if (!entry) {
            return { ok: false, error: 'NO_BAN' }
        }

        // Build the set of command names that belong to the removed categories
        const cmdsByCat = categories.flatMap((cat) => categoryCommandMap[cat] ?? [])

        const newCmds = entry.commands.filter((c) => !commands.includes(c) && !cmdsByCat.includes(c))
        const newCats = entry.categories.filter((c) => !categories.includes(c))

        if (newCmds.length === 0 && newCats.length === 0) {
            // Full removal — delete the entry entirely
            await Group.updateOne({ id: groupId }, { $pull: { 'bans.users': { jid } } })
            return { ok: true, action: 'removed_all' }
        }

        await Group.updateOne(
            { id: groupId, 'bans.users.jid': jid },
            {
                $set: {
                    'bans.users.$.commands': newCmds,
                    'bans.users.$.categories': newCats
                }
            }
        )
        return { ok: true, action: 'partial_remove', commands: newCmds, categories: newCats }
    } catch (e) {
        console.error('[DB ERROR: removeCommandBan]', e)
        return { ok: false, error: 'INTERNAL_ERROR' }
    }
}

/**
 * Fully lift all command bans from a user in a group.
 */
export const clearCommandBan = async (groupId, jid) => {
    try {
        const res = await Group.updateOne({ id: groupId }, { $pull: { 'bans.users': { jid } } })
        return res.modifiedCount > 0
    } catch (e) {
        console.error('[DB ERROR: clearCommandBan]', e)
        return false
    }
}

/**
 * Check if a user is banned from using a specific command in a group.
 * Returns { banned: true, reason, categories } or { banned: false }
 */
export const isCommandBanned = async (groupId, jid, cmdName) => {
    try {
        const group = await Group.findOne({ id: groupId }).select('bans').lean()
        if (!group?.bans?.users?.length) {
            return { banned: false }
        }

        const entry = group.bans.users.find((b) => b.jid === jid)
        if (!entry) {
            return { banned: false }
        }

        const isBanned = entry.commands.includes(cmdName)
        return isBanned ? { banned: true, reason: entry.reason, categories: entry.categories } : { banned: false }
    } catch (e) {
        console.error('[DB ERROR: isCommandBanned]', e)
        return { banned: false }
    }
}

/**
 * Get all ban records for a group (for -banlist display).
 */
export const getAllBans = async (groupId) => {
    try {
        const group = await Group.findOne({ id: groupId }).select('bans').lean()
        return group?.bans?.users ?? []
    } catch (e) {
        console.error('[DB ERROR: getAllBans]', e)
        return []
    }
}

export const editGroup = async (id, updates) => {
    try {
        const result = await Group.updateOne({ id }, { $set: updates })
        return result.modifiedCount > 0
    } catch (e) {
        return false
    }
}

// AUTO CLEANUP EXPIRED FEATURES
export const cleanupExpiredFeatures = async (groupId) => {
    const group = await Group.findOne({ id: groupId })
    if (!group || !group.features) {
        return false
    }

    const now = Date.now()
    const originalCount = group.features.length

    // Filter out expired timed features or dead paused features
    const filtered = group.features.filter((f) => {
        if (!f.expiresAt && !f.timeLeft) {
            return true
        }
        if (f.active && f.expiresAt && now >= f.expiresAt) {
            return false
        }
        if (!f.active && f.timeLeft !== null && f.timeLeft <= 0) {
            return false
        }
        return true
    })

    if (filtered.length !== originalCount) {
        await editGroup(groupId, { features: filtered })
    }
    return true
}

/**
 * Retrieves all users in a specific group who have at least one active warning.
 */
export const getAllWarnedUsers = async (groupId) => {
    try {
        // Search for any user who has a warning entry matching this groupId
        const users = await User.find(
            { 'warnings.groupId': groupId },
            'name jid warnings' // Only fetch necessary fields
        ).lean()

        // Filter out those who might have 0 warns (empty arrays)
        return users.filter((u) => {
            const groupWarn = u.warnings.find((w) => w.groupId === groupId)
            return groupWarn && groupWarn.level > 0
        })
    } catch (e) {
        console.error('[DB ERROR: getAllWarnedUsers]', e)
        return []
    }
}

/**
 * Adds a warning. If typeId is null, it increments 1, 2, 3...
 */
export const addWarn = async (jid, groupId, typeId = null, isPermanent = false, reason = '') => {
    try {
        const user = await User.findOne({ $or: [{ jid }, { lid: jid }] })
        if (!user.warnings) {
            user.warnings = []
        }
        // 1. Find the index instead of the object
        let groupIndex = user.warnings.findIndex((w) => w.groupId === groupId)

        // 2. If not found, create it and get the new index
        if (groupIndex === -1) {
            user.warnings.push({ groupId, level: 0, types: [] })
            groupIndex = user.warnings.length - 1
        }

        // 3. Reference the actual object inside the user document
        const groupWarn = user.warnings[groupIndex]
        const finalType = typeId || groupWarn.level + 1
        const expiresAt = isPermanent ? null : Date.now() + 7 * 24 * 60 * 60 * 1000

        groupWarn.types.push({
            typeId: Number(finalType),
            reason,
            isPermanent,
            issuedAt: Date.now(),
            expiresAt
        })

        // 4. Update the level
        groupWarn.level = groupWarn.types.length

        // 5. CRITICAL: Tell Mongoose that the 'warnings' array has changed
        user.markModified('warnings')

        await user.save()
        return groupWarn
    } catch (e) {
        console.error('[DB ERROR: addWarn]', e)
        return null
    }
}

export const getWarns = async (id, groupId) => {
    try {
        const user = await findUser(id, 'warnings')

        // BUG 7 FIX: removed the duplicate unreachable `if (!user.warnings)` block
        if (!user?.warnings) {
            return { groupId, level: 0, types: [] }
        }

        const groupWarn = user.warnings.find((w) => w.groupId === groupId)
        return groupWarn || { groupId, level: 0, types: [] }
    } catch (e) {
        console.error('[DB ERROR: getWarns]', e)
        return { groupId, level: 0, types: [] }
    }
}

export const cleanExpiredWarns = async (jid, groupId) => {
    try {
        const user = await User.findOne({ $or: [{ jid }, { lid: jid }] })

        // BUG 8 FIX: user could be null if jid doesn't exist in DB
        if (!user) {
            return
        }
        if (!user.warnings) {
            user.warnings = []
            return
        }

        const groupWarn = user.warnings.find((w) => w.groupId === groupId)
        if (!groupWarn) {
            return
        }

        const now = Date.now()
        const initialCount = groupWarn.types.length
        groupWarn.types = groupWarn.types.filter((t) => t.isPermanent || t.expiresAt > now)

        if (groupWarn.types.length !== initialCount) {
            groupWarn.level = groupWarn.types.length
            user.markModified('warnings')
            await user.save()
        }
    } catch (e) {
        console.error('[DB ERROR: cleanExpiredWarns]', e)
    }
}

/**
 * Checks if a user has a specific warning type active in a group.
 */
export const hasWarnType = async (jid, groupId, typeId) => {
    try {
        // BUG 4 FIX: clean first, THEN fetch — don't use stale pre-clean data
        await cleanExpiredWarns(jid, groupId)

        const user = await findUser(jid, 'warnings')
        if (!user?.warnings) {
            return false
        }

        const groupWarn = user.warnings.find((w) => w.groupId === groupId)
        return groupWarn?.types.some((t) => t.typeId === Number(typeId)) ?? false
    } catch (e) {
        console.error('[DB ERROR: hasWarnType]', e)
        return false
    }
}

/**
 * Clears warnings. Can clear a specific type or all temporary warnings.
 */
export const clearWarns = async (jid, groupId, typeId = null) => {
    try {
        if (typeId) {
            // BUG 5 FIX: don't use $inc -1 blindly — fetch, splice, then save
            // so level always equals types.length even if the type was already gone
            const user = await User.findOne({ $or: [{ jid }, { lid: jid }] })
            if (!user) {
                return false
            }

            if (!user.warnings) {
                user.warnings = []
                return false
            }

            const groupWarn = user.warnings.find((w) => w.groupId === groupId)
            if (!groupWarn) {
                return false
            }

            const before = groupWarn.types.length
            groupWarn.types = groupWarn.types.filter((t) => t.typeId !== Number(typeId))

            if (groupWarn.types.length === before) {
                // Type wasn't found — nothing to remove
                return false
            }

            groupWarn.level = groupWarn.types.length
            user.markModified('warnings')
            await user.save()
            return true
        } else {
            // Clear all temporary warns for this group
            const user = await User.findOne({ $or: [{ jid }, { lid: jid }] })
            if (!user?.warnings) {
                return false
            }

            const groupWarn = user.warnings.find((w) => w.groupId === groupId)
            if (!groupWarn) {
                return false
            }

            groupWarn.types = groupWarn.types.filter((t) => t.isPermanent)
            groupWarn.level = groupWarn.types.length
            user.markModified('warnings')
            await user.save()
            return true
        }
    } catch (e) {
        console.error('[DB ERROR: clearWarns]', e)
        return false
    }
}

export const getCommandCooldown = async (groupId, commandName) => {
    try {
        const group = await Group.findOne({ id: groupId }).select('cooldowns').lean()
        if (!group) {
            return 3000
        }

        const commands = group.cooldowns?.commands || {}

        // Check if commandName exists in the object/map
        const customCD = commands instanceof Map ? commands.get(commandName) : commands[commandName]

        return customCD ?? 0
    } catch (e) {
        console.error('[DB ERROR: getCommandCooldown]', e)
        return 3000
    }
}

export const setCommandCooldown = async (groupId, command, ms) => {
    try {
        const res = await Group.updateOne(
            { id: groupId },
            {
                $set: {
                    [`cooldowns.commands.${command}`]: ms
                }
            }
        )
        return res.modifiedCount > 0
    } catch (e) {
        console.error('[DB ERROR: setCommandCooldown]', e)
        return false
    }
}

export const resetCommandCooldown = async (groupId, command) => {
    try {
        const res = await Group.updateOne(
            { id: groupId },
            {
                $unset: {
                    [`cooldowns.commands.${command}`]: ''
                }
            }
        )
        return res.modifiedCount > 0
    } catch (e) {
        console.error('[DB ERROR: resetCommandCooldown]', e)
        return false
    }
}

export const setTimeoutUser = async (jid, groupId, durationMs, reason = '') => {
    const user = await User.findOne({ $or: [{ jid }, { lid: jid }] }).select('timeouts')

    if (!user || !groupId) {
        return null
    }

    const now = Date.now()

    if (!user.timeouts) {
        user.timeouts = []
    }
    let timeout = user.timeouts.find((t) => t.groupId === groupId)

    if (!timeout) {
        const newUntil = now + durationMs

        const newEntry = {
            groupId,
            until: newUntil,
            reason: reason || 'No reason provided'
        }

        await User.updateOne({ _id: user._id }, { $push: { timeouts: newEntry } })

        return {
            previousUntil: null,
            newUntil,
            reason: newEntry.reason
        }
    }

    const isCurrentlyTimedOut = timeout.until > now
    const previousUntil = isCurrentlyTimedOut ? timeout.until : now
    const newUntil = previousUntil + durationMs

    const finalReason = reason || (isCurrentlyTimedOut ? timeout.reason : 'No reason provided')

    await User.updateOne(
        { _id: user._id, 'timeouts.groupId': groupId },
        {
            $set: {
                'timeouts.$.until': newUntil,
                'timeouts.$.reason': finalReason
            }
        }
    )

    return {
        previousUntil: isCurrentlyTimedOut ? previousUntil : null,
        newUntil,
        reason: finalReason
    }
}

export const isUserTimedOut = async (jid, groupId) => {
    const user = await User.findOne({ $or: [{ jid }, { lid: jid }] })
        .select('timeouts')
        .lean()

    if (!user || !groupId || !user.timeouts?.length) {
        return false
    }

    if (!user.timeouts) {
        user.timeouts = []
    }

    const timeout = user.timeouts.find((t) => t.groupId === groupId)

    if (!timeout || !timeout.until) {
        return false
    }

    const now = Date.now()

    if (now > timeout.until) {
        // remove expired timeout
        await User.updateOne({ _id: user._id }, { $pull: { timeouts: { groupId } } })
        return false
    }

    return timeout
}

export const clearTimeoutUser = async (jid, groupId) => {
    try {
        if (!jid || !groupId) {
            return false
        }

        const res = await User.updateOne({ $or: [{ jid }, { lid: jid }] }, { $pull: { timeouts: { groupId } } })

        return res.modifiedCount > 0
    } catch (e) {
        console.error('[DB ERROR: clearTimeoutUser]', e)
        return false
    }
}

export const isGroupFeatureActive = async (groupId, key) => {
    try {
        // 1. Cleanup expired features before checking
        // (Ensure cleanupExpiredFeatures also uses selective updates!)
        await cleanupExpiredFeatures(groupId)

        // 2. Fetch ONLY the specific feature matching the key
        const group = await Group.findOne({ id: groupId, 'features.key': key }, { 'features.$': 1 }).lean()

        // 3. Return activity status
        const feature = group?.features?.[0]
        return feature ? feature.active === true : false
    } catch (e) {
        console.error('[DB ERROR: isGroupFeatureActive]', e)
        return false
    }
}
/**
 * Pauses a group feature and converts remaining time into 'timeLeft'.
 * Efficiently targets only the specific feature array element.
 */
export const pauseGroupFeature = async (groupId, key) => {
    try {
        // 1. Fetch ONLY the specific feature that matches the key
        const group = await Group.findOne({ id: groupId, 'features.key': key }, { 'features.$': 1 }).lean()

        const feature = group?.features?.[0]
        if (!feature || !feature.active) {
            return false
        }

        // 2. Prepare atomic updates using the positional operator
        const updates = { 'features.$.active': false }

        if (feature.expiresAt) {
            const expiryTime = new Date(feature.expiresAt).getTime()
            const remaining = Math.max(0, expiryTime - Date.now())

            updates['features.$.timeLeft'] = remaining
            updates['features.$.expiresAt'] = null
        }

        // 3. Perform the update directly on the matched element
        const res = await Group.updateOne({ id: groupId, 'features.key': key }, { $set: updates })

        return res.modifiedCount > 0
    } catch (e) {
        console.error('[DB ERROR: pauseGroupFeature]', e)
        return false
    }
}

/**
 * Resumes a paused group feature.
 * Calculates new 'expiresAt' using the stored 'timeLeft'.
 */
export const resumeGroupFeature = async (groupId, key) => {
    try {
        // 1. Fetch ONLY the specific feature array element matching the key
        const group = await Group.findOne({ id: groupId, 'features.key': key }, { 'features.$': 1 }).lean()

        const feature = group?.features?.[0]
        if (!feature || feature.active) {
            return false
        }

        // 2. Logic: Permanent vs Timed features
        const updates = { 'features.$.active': true }

        // If it's a timed feature, calculate the new expiration date
        if (feature.timeLeft && feature.timeLeft > 0) {
            const newExpiry = Date.now() + feature.timeLeft
            updates['features.$.expiresAt'] = newExpiry
            updates['features.$.timeLeft'] = null
        }
        // Handle expired features or permanent ones
        else if (!feature.timeLeft && !feature.expiresAt) {
            // Permanent feature - just set to active
        } else {
            // Likely expired; trigger cleanup
            await cleanupExpiredFeatures(groupId)
            return false
        }

        // 3. Atomic Update: Resume the feature at the exact matched index
        const res = await Group.updateOne({ id: groupId, 'features.key': key }, { $set: updates })

        return res.modifiedCount > 0
    } catch (e) {
        console.error('[DB ERROR: resumeGroupFeature]', e)
        return false
    }
}

export const setGroupMMO = async (id, status) => {
    return await editGroup(id, { mmo: Boolean(status) })
}

/**
 * Efficiently removes funds from a group.
 * Atomic Guard: Only subtracts if the group exists and has sufficient funds.
 */
export const removeGroupFunds = async (groupId, amount) => {
    try {
        if (!amount || amount <= 0) {
            return false
        }

        /**
         * Atomic Transaction:
         * We only update if the 'funds' field is greater than or equal to the amount.
         * This prevents negative balances even if multiple commands hit at once.
         */
        const result = await Group.updateOne(
            {
                id: groupId,
                funds: { $gte: amount }
            },
            { $inc: { funds: -amount } }
        )

        // Returns true if the group had enough money and was updated
        return result.modifiedCount > 0
    } catch (e) {
        console.error('[DB ERROR: removeGroupFunds]', e)
        return false
    }
}

/**
 * Efficiently calculates the total wealth of a group.
 * Total Wealth = Group Funds + Sum of all Home User Bank Balances.
 */
export const getGroupWealth = async (id) => {
    try {
        // 1. Fetch ONLY the funds field from the group
        const group = await Group.findOne({ id }).select('funds').lean()

        if (!group) {
            return 0
        }

        // 2. Aggregate the sum of bank values for all users whose home is this group
        //
        const result = await User.aggregate([
            {
                $match: {
                    'bank.id': id,
                    'bank.value': { $gt: 0 } // Optimization: ignore empty banks
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$bank.value' }
                }
            }
        ])

        const homeBankFunds = result.length > 0 ? result[0].total : 0

        // Return the combined total
        return (group.funds || 0) + homeBankFunds
    } catch (e) {
        console.error('[DB ERROR: getGroupWealth]', e)
        return 0
    }
}

export const addGroupFunds = async (groupId, amount) => {
    if (!amount || amount <= 0) {
        return false
    }
    const result = await Group.updateOne({ id: groupId }, { $inc: { funds: amount } })
    return result.modifiedCount > 0
}

// CALCULATE GROUP TAX (Atomic check)
/**
 * Efficiently calculates tax based on user status and active group features.
 * Fetches tax rates and feature statuses in a single lightweight query.
 */
export const calculateGroupTax = async (jid, groupId, amount) => {
    try {
        if (!amount || amount <= 0) {
            return { tax: 0, net: amount }
        }

        // 1. Fetch ONLY the tax rates and features array
        const group = await Group.findOne({ id: groupId }).select('tax features').lean()

        if (!group) {
            return { tax: 0, net: amount }
        }

        // 2. Check feature status from the already-loaded group object
        // This avoids calling 'isGroupFeatureActive' and making extra DB trips
        const hasForeignTax = group.features?.some((f) => f.key === 'foreign_tax' && f.active)
        const hasBasicTax = group.features?.some((f) => f.key === 'basic_tax' && f.active)

        // 3. Determine if user is "Foreign"
        const isForeign = await isForeignUser(jid, groupId)

        let taxPercent = 0

        if (isForeign && hasForeignTax) {
            taxPercent = group.tax?.foreign || 0
        } else if (!isForeign && hasBasicTax) {
            taxPercent = group.tax?.home || 0
        }

        const tax = Math.floor((amount * taxPercent) / 100)
        return { tax, net: amount - tax }
    } catch (e) {
        console.error('[DB ERROR: calculateGroupTax]', e)
        return { tax: 0, net: amount }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  ADD THESE TO src/database/db.js
// ═══════════════════════════════════════════════════════════════════════════

// Also add 'afk' field to UserSchema (in src/database/models/user.js):
//
//   afk: {
//       type: new Schema({
//           active:    { type: Boolean, default: false },
//           reason:    { type: String,  default: '' },
//           since:     { type: Number,  default: null },
//           pingCount: { type: Number,  default: 0 }
//       }, { _id: false }),
//       default: null
//   }

// ─────────────────────────────────────────────────────────────────────────────

export const setAfk = async (jid, reason = '') => {
    try {
        const result = await User.updateOne(
            { $or: [{ jid }, { lid: jid }] },
            {
                $set: {
                    afk: {
                        active: true,
                        reason: reason.trim() || 'AFK',
                        since: Date.now(),
                        pingCount: 0
                    }
                }
            }
        )
        return result.modifiedCount > 0
    } catch (e) {
        console.error('[DB ERROR: setAfk]', e)
        return false
    }
}

export const clearAfk = async (jid) => {
    try {
        // Returns the afk data before clearing so we can show a summary
        const user = await User.findOneAndUpdate(
            { $or: [{ jid }, { lid: jid }] },
            { $set: { afk: null } },
            { new: false } // return old doc
        )
            .select('afk')
            .lean()

        return user?.afk ?? null
    } catch (e) {
        console.error('[DB ERROR: clearAfk]', e)
        return null
    }
}

export const getAfk = async (jid) => {
    try {
        const user = await User.findOne({ $or: [{ jid }, { lid: jid }] })
            .select('afk')
            .lean()
        return user?.afk?.active ? user.afk : null
    } catch (e) {
        console.error('[DB ERROR: getAfk]', e)
        return null
    }
}

export const incrementAfkPing = async (jid) => {
    try {
        await User.updateOne({ $or: [{ jid }, { lid: jid }] }, { $inc: { 'afk.pingCount': 1 } })
    } catch (e) {
        console.error('[DB ERROR: incrementAfkPing]', e)
    }
}

// src/database/db.js  —  REPLACE updateGroupExp

export const updateGroupExp = async (id, { isForeign = false }) => {
    try {
        const group = await Group.findOne({ id }).select('users exp').lean()

        if (!group) return false

        const wealth = await getGroupWealth(id)
        const memberCount = group.users?.length || 0

        let gain = isForeign ? 5 + Math.floor(wealth / 20000) : 2 + Math.floor(wealth / 40000)

        gain += Math.floor(memberCount / 10)
        if (gain < 1) gain = 1

        // Small group penalty
        if (memberCount < 31) gain = Math.max(1, Math.floor(gain * 0.7))

        // Low wealth penalty
        if (wealth < 50000) gain = Math.max(1, Math.floor(gain * 0.6))

        // FIX: use findOneAndUpdate with { new: true } so we get the updated doc back
        // and can return the new TOTAL exp — the old version returned only `gain`
        // which caused getGroupLevel(newExp) to always compute level 0
        const updated = await Group.findOneAndUpdate(
            { id },
            {
                $inc: { exp: gain },
                $set: { lastActive: Date.now() }
            },
            { new: true, lean: true, select: 'exp' }
        )

        // Return new TOTAL exp so the caller can compute the new level correctly
        return updated?.exp ?? false
    } catch (e) {
        console.error('[DB ERROR: updateGroupExp]', e)
        return false
    }
}

export const getGroupLuckBonus = async (jid, groupId) => {
    const active = await isGroupFeatureActive(groupId, 'lucky_users')
    if (!active) {
        return 0
    }

    const isForeign = await isForeignUser(jid, groupId)
    return isForeign ? 0.1 : 0.3 // +10% for guests, +30% for home members
}

/**
 * Efficiently calculates dynamic card prices based on group economy.
 * Multipliers are determined by total group wealth and member count.
 */
export const getDynamicCardPrice = async (basePrice, groupId) => {
    try {
        if (!groupId) {
            return basePrice
        }

        // 1. Fetch feature status and user list length in one light query
        const group = await Group.findOne({ id: groupId }).select('features users').lean()

        if (!group) {
            return basePrice
        }

        // 2. Check if dynamic pricing is enabled from the pre-loaded array
        const isDynamicEnabled = group.features?.some((f) => f.key === 'dynamic_store_pricing' && f.active)
        if (!isDynamicEnabled) {
            return basePrice
        }

        // 3. Calculate Wealth (Uses our optimized aggregation helper)
        const wealth = await getGroupWealth(groupId)
        const userCount = group.users?.length || 1

        let multiplier = 1

        // Wealth-based Multipliers (Ordered logically from highest to lowest)
        if (wealth > 1000000) {
            multiplier += 0.6
        } else if (wealth > 300000) {
            multiplier += 0.3
        } else if (wealth < 50000) {
            multiplier -= 0.2
        }

        // Population-based Multipliers
        if (userCount < 10) {
            multiplier -= 0.1
        } else if (userCount > 30) {
            multiplier += 0.2
        }

        // 4. Clamp the multiplier between 0.6x and 1.8x
        multiplier = Math.max(0.6, Math.min(1.8, multiplier))

        return Math.floor(basePrice * multiplier)
    } catch (e) {
        console.error('[DB ERROR: getDynamicCardPrice]', e)
        return basePrice
    }
}

// DYNAMIC PRICING LOGIC
/**
 * Efficiently calculates dynamic item prices based on group economy scores.
 * Uses a weighted power score (60% Wealth, 40% Population).
 */
export const getDynamicPrice = async (item, groupId) => {
    try {
        if (!groupId || !item) {
            return item
        }

        // 1. Fetch feature status and user count in one light query
        //
        const group = await Group.findOne({ id: groupId }).select('features users').lean()

        if (!group) {
            return item
        }

        // 2. Check if dynamic pricing is active from the pre-loaded features array
        const isDynamic = group.features?.some((f) => f.key === 'dynamic_store_pricing' && f.active)
        if (!isDynamic) {
            return item
        }

        // 3. Logic: Weighted Economy Score
        const wealth = await getGroupWealth(groupId)
        const usersCount = group.users?.length || 0

        // Normalize scores (Wealth cap at 800k, Users cap at 50)
        const wealthScore = Math.min(wealth / 800000, 1)
        const userScore = Math.min(usersCount / 50, 1)

        // Combine scores: 60% Wealth, 40% User density
        //
        const power = wealthScore * 0.6 + userScore * 0.4

        // 4. Calculate Multiplier
        // If power < 0.5: Discount (up to -30%)
        // If power > 0.5: Surcharge (up to +20%)
        let multiplier = power < 0.5 ? 1 - (0.5 - power) * 0.6 : 1 + (power - 0.5) * 0.4

        // Clamp between 0.7x and 1.2x for economic stability
        multiplier = Math.max(0.7, Math.min(1.2, multiplier))

        // 5. Apply pricing to item clones (prevents modifying the original template)
        const pricedItem = { ...item, _dynamicMultiplier: multiplier }

        if (item.type === 'POTION' && item.pricePerDay) {
            pricedItem.pricePerDay = Math.floor(item.pricePerDay * multiplier)
        } else if (item.price) {
            pricedItem.price = Math.floor(item.price * multiplier)
        }

        return pricedItem
    } catch (e) {
        console.error('[DB ERROR: getDynamicPrice]', e)
        return item
    }
}

/**
 * Unlocks a new group feature using group funds.
 * Uses atomic checks to prevent duplicate features and ensure sufficient funds.
 */
export const unlockGroupFeature = async (groupId, storeFeature, times) => {
    try {
        const totalPrice = storeFeature.price * times

        // 1. Single-fetch: Get only funds and the specific feature list
        const group = await Group.findOne({ id: groupId }).select('funds features').lean()

        if (!group) {
            return { ok: false, error: 'GROUP_NOT_FOUND' }
        }

        // 2. Logic Checks
        if ((group.funds || 0) < totalPrice) {
            return { ok: false, error: 'INSUFFICIENT_FUNDS' }
        }

        // Check if the feature key already exists in the features array
        const alreadyExists = group.features?.some((f) => f.key === storeFeature.key)
        if (alreadyExists) {
            return { ok: false, error: 'ALREADY_OWNED' }
        }

        // 3. Deduct Funds Atomics (Prevents race conditions)
        //
        const deduction = await removeGroupFunds(groupId, totalPrice)
        if (!deduction) {
            return { ok: false, error: 'TRANSACTION_FAILED' }
        }

        // 4. Prepare Feature Object
        const durationMs = storeFeature.duration ? storeFeature.duration * 30 * 24 * 60 * 60 * 1000 * times : null

        const feature = {
            key: storeFeature.key,
            name: storeFeature.name,
            active: false, // Starts as paused/inactive
            expiresAt: null,
            timeLeft: durationMs
        }

        // 5. Atomic Push: Add the feature to the array
        await Group.updateOne({ id: groupId }, { $push: { features: feature } })

        return { ok: true, feature }
    } catch (e) {
        console.error('[DB ERROR: unlockGroupFeature]', e)
        return { ok: false, error: 'DATABASE_ERROR' }
    }
}

export const isForeignUser = async (jid, groupId) => {
    try {
        const user = await User.findOne({ $or: [{ jid }, { lid: jid }] })
            .select('bank.id jid')
            .lean()

        if (!user) {
            return false
        }

        // No home set at all → always treated as foreign everywhere
        if (!user.bank?.id) {
            return true
        }

        // Has a home set — foreign if their home is a different group
        return user.bank.id !== groupId
    } catch (e) {
        console.error('[DB ERROR: isForeignUser]', e)
        return false
    }
}

export const getGroupsByFeatureState = async (featureKey, state = 'active') => {
    try {
        if (state === 'active') {
            const now = Date.now()
            return await Group.find({
                features: {
                    $elemMatch: {
                        key: featureKey,
                        active: true,
                        $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }]
                    }
                }
            }).lean()
        }

        if (state === 'inactive') {
            const now = Date.now()
            return await Group.find({
                features: {
                    $elemMatch: {
                        key: featureKey,
                        $or: [{ active: false }, { expiresAt: { $lte: now } }]
                    }
                }
            }).lean()
        }

        // state === 'all'
        return await Group.find({
            'features.key': featureKey
        }).lean()
    } catch (e) {
        console.error('[DB ERROR: getGroupsByFeatureState]', e)
        return []
    }
}

export const getCards = async (id, type = 'all') => {
    try {
        let projection = ''
        if (type === 'deck') projection = 'cards.deck'
        else if (type === 'collection') projection = 'cards.collection'
        else projection = 'cards.deck cards.collection'

        const user = await User.findOne({ $or: [{ jid: id }, { lid: id }] })
            .select(projection)
            .lean()

        if (!user || !user.cards) {
            return { deck: [], collection: [] }
        }

        return {
            deck: user.cards.deck || [],
            collection: user.cards.collection || []
        }
    } catch (e) {
        console.error('[DB ERROR: getCards]', e)
        return { deck: [], collection: [] }
    }
}

/**
 * Add a card to a user's wishlist.
 * Returns { ok: true } | { ok: false, error: 'ALREADY_IN_WISHLIST' | 'LIMIT_REACHED' | 'NOT_FOUND' }
 */
export const addToWishlist = async (jid, cardEntry) => {
    try {
        const user = await User.findOne({ $or: [{ jid }, { lid: jid }] })
            .select('jid wishlist')
            .lean()

        if (!user) return { ok: false, error: 'NOT_FOUND' }

        const wishlist = user.wishlist || []

        if (wishlist.some((c) => c.id === cardEntry.id)) {
            return { ok: false, error: 'ALREADY_IN_WISHLIST' }
        }

        if (wishlist.length >= WISHLIST_LIMIT) {
            return { ok: false, error: 'LIMIT_REACHED' }
        }

        await User.updateOne({ $or: [{ jid }, { lid: jid }] }, { $push: { wishlist: cardEntry } })

        return { ok: true }
    } catch (e) {
        console.error('[DB ERROR: addToWishlist]', e)
        return { ok: false, error: 'INTERNAL_ERROR' }
    }
}

/**
 * Remove a card from a user's wishlist by index (1-based).
 */
export const removeFromWishlist = async (jid, cardId) => {
    try {
        const result = await User.updateOne({ $or: [{ jid }, { lid: jid }] }, { $pull: { wishlist: { id: cardId } } })
        return result.modifiedCount > 0
    } catch (e) {
        console.error('[DB ERROR: removeFromWishlist]', e)
        return false
    }
}

/**
 * Get a user's full wishlist.
 */
export const getWishlist = async (jid) => {
    try {
        const user = await User.findOne({ $or: [{ jid }, { lid: jid }] })
            .select('wishlist name')
            .lean()
        return user ?? null
    } catch (e) {
        console.error('[DB ERROR: getWishlist]', e)
        return null
    }
}

export const getBalance = async (id) => {
    try {
        const user = await User.findOne({ $or: [{ jid: id }, { lid: id }] })
            .select('name wallet bank')
            .lean()

        if (!user) {
            return null
        }

        return {
            name: user.name,
            wallet: user.wallet || 0,
            bankValue: user.bank?.value || 0,
            bankCapacity: user.bank?.capacity || 0,
            total: (user.wallet || 0) + (user.bank?.value || 0)
        }
    } catch (e) {
        console.error('[DB ERROR: getBalance]', e)
        return null
    }
}
/**
 * Atomically claims one slot spin for today.
 *
 * Logic:
 *  - If slotDailyReset is from a previous calendar day → reset count to 0 first
 *  - Only proceed if count is below the daily limit
 *  - $inc the count in the same operation
 *
 * Returns the updated user doc (AFTER increment) if a spin was available,
 * or null if the daily limit is already reached.
 *
 * Using findOneAndUpdate with an aggregation pipeline lets us do the
 * midnight-reset and the count check atomically in one DB round-trip —
 * so concurrent spam calls can't sneak past the limit.
 */
export const claimSlotUse = async (jid, dailyLimit) => {
    try {
        const now = new Date()

        // Midnight of the current calendar day (server local time)
        const midnight = new Date(now)
        midnight.setHours(0, 0, 0, 0)

        const result = await User.findOneAndUpdate(
            {
                // Match the user by jid or lid
                $and: [
                    { $or: [{ jid }, { lid: jid }] },
                    // Allow spin if:
                    //   A) last spin was before today (will be reset to 1) — OR
                    //   B) field is missing/null (first ever spin) — OR
                    //   C) last spin was today but count is still under the limit
                    {
                        $or: [
                            { slotDailyReset: { $lt: midnight } },
                            { slotDailyReset: null },
                            { slotDailyReset: { $exists: false } },
                            {
                                slotDailyReset: { $gte: midnight },
                                slotDailyCount: { $not: { $gte: dailyLimit } }
                            }
                        ]
                    }
                ]
            },
            [
                // Aggregation pipeline update — lets us branch on field values
                {
                    $set: {
                        // If slotDailyReset is null/missing/from a previous day → reset to 1
                        // Otherwise → increment the existing count
                        slotDailyCount: {
                            $cond: {
                                if: {
                                    $or: [
                                        { $eq: ['$slotDailyReset', null] },
                                        { $not: ['$slotDailyReset'] },
                                        { $lt: ['$slotDailyReset', midnight] }
                                    ]
                                },
                                then: 1,
                                else: { $add: ['$slotDailyCount', 1] }
                            }
                        },
                        slotDailyReset: now
                    }
                }
            ],
            { new: true, lean: true, updatePipeline: true }
        )

        // After the update, verify the count is within limit
        // (handles the edge case where reset + increment put us right at the limit)
        if (!result) {
            return null
        }
        if (result.slotDailyCount > dailyLimit) {
            return null
        }

        return result
    } catch (e) {
        console.error('[DB ERROR: claimSlotUse]', e)
        return null
    }
}

/**
 * Atomically claims one gamble use for today.
 * Identical logic to claimSlotUse — midnight reset, spam-safe.
 *
 * Returns updated doc (AFTER increment) if a bet slot was available,
 * or null if the daily limit is already reached.
 */
export const claimGambleUse = async (jid, dailyLimit) => {
    try {
        const now = new Date()

        const midnight = new Date(now)
        midnight.setHours(0, 0, 0, 0)

        const result = await User.findOneAndUpdate(
            {
                $and: [
                    { $or: [{ jid }, { lid: jid }] },
                    {
                        $or: [
                            { gambleDailyReset: { $lt: midnight } }, // last bet was before today → will reset
                            { gambleDailyReset: null }, // never bet before
                            { gambleDailyReset: { $exists: false } }, // field missing entirely
                            {
                                gambleDailyReset: { $gte: midnight },
                                gambleDailyCount: { $not: { $gte: dailyLimit } } // today but still under limit
                            }
                        ]
                    }
                ]
            },
            [
                {
                    $set: {
                        gambleDailyCount: {
                            $cond: {
                                if: {
                                    $or: [
                                        { $eq: ['$gambleDailyReset', null] },
                                        { $not: ['$gambleDailyReset'] },
                                        { $lt: ['$gambleDailyReset', midnight] }
                                    ]
                                },
                                then: 1, // fresh day → start at 1
                                else: { $add: ['$gambleDailyCount', 1] } // same day → increment
                            }
                        },
                        gambleDailyReset: now
                    }
                }
            ],
            { new: true, lean: true, updatePipeline: true }
        )

        if (!result) {
            return null
        }
        if (result.gambleDailyCount > dailyLimit) {
            return null
        }

        return result
    } catch (e) {
        console.error('[DB ERROR: claimGambleUse]', e)
        return null
    }
}
/**
 * Atomic lootbox slot claim.
 * Returns the updated user doc (AFTER increment) if a slot was available,
 * or null if the user is already at the session/daily limit.
 *
 * Because this is a single findOneAndUpdate, MongoDB serialises concurrent
 * calls at the DB level — making it impossible for two calls to claim the
 * same slot number. This is what stops "1/10 appearing 20 times".
 */
export const claimLootboxSlot = async (jid, maxTries, dailyLimit, resetDaily = false) => {
    try {
        const now = new Date()

        // If daily counter was already reset client-side, zero it in the condition too
        const dailyCondition = resetDaily
            ? {} // daily was already reset, no condition needed
            : { lbDailyCount: { $not: { $gte: dailyLimit } } } // handles missing field as 0

        const result = await User.findOneAndUpdate(
            {
                $or: [{ jid }, { lid: jid }],
                // $not:$gte handles missing field (null/undefined) as "not at limit"
                // $lt alone would fail for users whose lbCount field doesn't exist yet
                lbCount: { $not: { $gte: maxTries } },
                ...dailyCondition
            },
            [
                // Aggregation pipeline update so we can conditionally set lbResetTime
                {
                    $set: {
                        lbCount: { $add: ['$lbCount', 1] },
                        lbDailyCount: resetDaily ? 1 : { $add: ['$lbDailyCount', 1] },
                        lbDailyReset: now,
                        lastLB: now,
                        // Only stamp lbResetTime when this is the FIRST open of a new streak
                        // ($lbCount is the value BEFORE the increment in a pipeline update)
                        lbResetTime: {
                            $cond: {
                                if: { $eq: ['$lbCount', 0] },
                                then: now,
                                else: '$lbResetTime'
                            }
                        }
                    }
                }
            ],
            { new: true, lean: true, updatePipeline: true } // updatePipeline required for array pipeline syntax
        )

        return result // null → no slot available (limit reached or user not found)
    } catch (e) {
        console.error('[DB ERROR: claimLootboxSlot]', e)
        return null
    }
}

/**
 * Atomically resets the session counter after a cooldown expires.
 * Called once when the bot detects the cooldown has passed.
 */
export const releaseLootboxSlot = async (jid) => {
    try {
        await User.updateOne({ $or: [{ jid }, { lid: jid }] }, { $set: { lbCount: 0, lbResetTime: null } })
    } catch (e) {
        console.error('[DB ERROR: releaseLootboxSlot]', e)
    }
}

/**
 * Atomically removes one lootbox from inventory.
 * Matches by _id if available (prevents double-removal on concurrent calls),
 * falls back to matching by type+name.
 */
export const removeLootboxFromInventory = async (jid, item) => {
    try {
        const filter = { $or: [{ jid }, { lid: jid }] }
        const pull = item?._id
            ? { $pull: { inventory: { _id: item._id } } }
            : { $pull: { inventory: { type: 'LOOTBOX', name: item?.name || 'Standard Lootbox' } } }

        const result = await User.updateOne(filter, pull)
        return result.modifiedCount > 0
    } catch (e) {
        console.error('[DB ERROR: removeLootboxFromInventory]', e)
        return false
    }
}

export const addExp = async (jid, amount) => {
    if (!amount || amount <= 0) {
        return false
    }
    try {
        const result = await User.updateOne({ $or: [{ jid }, { lid: jid }] }, { $inc: { exp: amount } })
        return result.modifiedCount > 0
    } catch (e) {
        console.error('[DB ERROR: addExp]', e)
        return false
    }
}

export const swapUserCardPositions = async (id, field, i1, i2) => {
    try {
        if (!id || !field) {
            return false
        }
        if (i1 === i2) {
            return true
        }

        // Read the LIVE array from DB — never trust the caller's stale snapshot
        const user = await User.findOne({ $or: [{ jid: id }, { lid: id }] }, { [field]: 1, jid: 1 }).lean()

        if (!user) {
            return false
        }

        const arr = user[field.split('.')[1]] // e.g. 'cards.deck' → arr from user.cards.deck
        // Handle nested field path (cards.deck / cards.collection)
        const parts = field.split('.')
        let liveArray = user
        for (const p of parts) {
            liveArray = liveArray?.[p]
        }

        if (!Array.isArray(liveArray)) {
            return false
        }

        const v1 = liveArray[i1]
        const v2 = liveArray[i2]

        if (!v1 || !v2) {
            return false
        }

        // Atomic swap using the live values
        const res = await User.updateOne(
            {
                jid: user.jid,
                // Confirm both cards are still at these positions (prevents stale swap)
                [`${field}.${i1}._id`]: v1._id,
                [`${field}.${i2}._id`]: v2._id
            },
            {
                $set: {
                    [`${field}.${i1}`]: v2,
                    [`${field}.${i2}`]: v1
                }
            }
        )

        return res.modifiedCount > 0
    } catch (err) {
        console.error('[DB SWAP ERROR]', err)
        return false
    }
}

export const getInventory = async (id) => {
    try {
        const user = await User.findOne({ $or: [{ jid: id }, { lid: id }] })
            .select('inventory')
            .lean()

        // If user doesn't exist or inventory is missing, return empty array
        return user?.inventory || []
    } catch (e) {
        console.error('[DB ERROR: getInventory]', e)
        return []
    }
}

export const setHome = async (jid, id) => {
    try {
        // 1. Light-weight existence check (Selective Projection)
        const user = await User.findOne({ $or: [{ jid }, { lid: jid }] })
            .select('jid')
            .lean()

        const group = await Group.findOne({ id }).select('id').lean()

        if (!user || !group) {
            return false
        }

        // 2. Atomic Update for Group: Add user to member list
        // $addToSet ensures the user is only added if they aren't already there
        await Group.updateOne({ id }, { $addToSet: { users: user.jid } })

        // 3. Atomic Update for User: Set the bank ID
        const result = await User.updateOne({ jid: user.jid }, { $set: { 'bank.id': id } })

        return result.modifiedCount > 0
    } catch (e) {
        console.error('[DB ERROR: setHome]', e)
        return false
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PASTE THIS INTO db.js — replaces the old processPetDecay export
// and adds the new runGlobalPetDecay export below it.
//
// BUGS FIXED:
//   1. user.lid was undefined when fetched with select('pet jid ban') —
//      the $or write silently failed for LID-only accounts. Now builds
//      the query dynamically from only the fields that actually exist.
//
//   2. deathReason was computed but never written to the DB. Added
//      'pet.deathReason' to the $set so petstatus + message handler
//      can always read the cause of death from the DB.
//
//   3. Pets of inactive users never decayed because processPetDecay
//      only fires on-demand (when the user sends any command). Added
//      runGlobalPetDecay() — call it on a 1-hour setInterval in index.js.
// ─────────────────────────────────────────────────────────────────────────────

export const processPetDecay = async (user) => {
    if (!user || !user.pet || !user.pet.isAlive) {
        return null
    }

    const now = Date.now()
    const lastDecay = user.pet.lastDecay || user.pet.adoptedAt
    const hours = (now - lastDecay) / 3600000

    if (hours < 1) return null

    const stats = user.pet.stats

    // ── HUNGER DECAY — 2%/hr, capped at 30% per tick ─────────────────────────
    const hungerDecay = Math.min(Math.floor(hours * 2), 30)
    const newHunger = Math.max(0, stats.hunger - hungerDecay)

    // ── ENERGY DECAY — 3%/hr, capped at 40% per tick ─────────────────────────
    const energyDecay = Math.min(Math.floor(hours * 3), 40)
    const newEnergy = Math.max(0, stats.energy - energyDecay)

    // ── HAPPINESS DECAY — 1%/hr, capped at 20% per tick ─────────────────────
    const happinessDecay = Math.min(Math.floor(hours * 1), 20)
    const newHappiness = Math.max(0, stats.happiness - happinessDecay)

    // ── LONELINESS DEATH CLOCK ────────────────────────────────────────────────
    let lonelySince = user.pet.lonelySince ?? null

    if (newHappiness <= 0) {
        if (!lonelySince) {
            lonelySince = now
        }
    } else {
        lonelySince = null
    }

    // ── OUTCOME ───────────────────────────────────────────────────────────────
    let isAlive = true
    let deathReason = null
    let mood = user.pet.mood
    const warnings = []

    if (newHunger <= 0) {
        // Hunger hit 0 → instant death from starvation
        isAlive = false
        deathReason = 'starved'
        mood = 'dead'
    } else if (lonelySince && now - lonelySince >= 24 * 3600000) {
        // 24 consecutive hours at 0 happiness → died from loneliness
        isAlive = false
        deathReason = 'lonely'
        mood = 'dead'
    } else {
        if (newHunger <= 20) warnings.push('hungry')
        if (newHappiness <= 0) warnings.push('lonely')
        else if (newHappiness <= 20) warnings.push('sad')
        if (newEnergy <= 0) warnings.push('sleepy')

        // Mood priority: lonely > sleepy > hungry > sad > idle
        // Don't override the sleeping mood while the pet is napping
        if (!isSleeping(user.pet)) {
            if (warnings.includes('lonely')) mood = 'lonely'
            else if (warnings.includes('sleepy')) mood = 'sleepy'
            else if (warnings.includes('hungry')) mood = 'hungry'
            else if (warnings.includes('sad')) mood = 'sad'
            else mood = 'idle'
        }
    }

    // ── FIX 1: safe $or — only include jid/lid if they actually exist ─────────
    // message.js fetches user with select('pet jid ban'), so user.lid is
    // undefined. Passing { lid: undefined } into $or is harmless for jid users
    // but causes a silent no-match for LID-only accounts → stats never save.
    const orConditions = []
    if (user.jid) orConditions.push({ jid: user.jid })
    if (user.lid) orConditions.push({ lid: user.lid })

    if (orConditions.length === 0) {
        console.error('user has neither jid nor lid skipping save')
        return null
    }

    // ── FIX 2: persist deathReason so UI can always read it from DB ──────────
    await User.updateOne(
        { $or: orConditions },
        {
            $set: {
                'pet.stats.hunger': newHunger,
                'pet.stats.energy': newEnergy,
                'pet.stats.happiness': newHappiness,
                'pet.lastDecay': now,
                'pet.isAlive': isAlive,
                'pet.mood': mood,
                'pet.lonelySince': lonelySince,
                'pet.deathReason': deathReason // FIX: was computed but never saved
            }
        }
    )

    if (!isAlive) return { died: true, reason: deathReason }
    if (warnings.length > 0) return warnings
    return null
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 3: background decay scheduler
//
// processPetDecay only fires when a user sends a command. Inactive users'
// pets never decay and can never die. This function scans the DB every hour
// for alive pets whose lastDecay is stale and runs decay on all of them.
//
// HOW TO USE — in src/index.js, after the bot connects and DB is ready:
//
//   import { runGlobalPetDecay } from './database/db.js'
//
//   setInterval(async () => {
//       await runGlobalPetDecay()
//   }, 60 * 60 * 1000)   // every 1 hour
// ─────────────────────────────────────────────────────────────────────────────

export const runGlobalPetDecay = async () => {
    try {
        const oneHourAgo = Date.now() - 3600000

        // Only fetch users with a live pet that hasn't been decayed in 1+ hour
        const users = await User.find({
            'pet.isAlive': true,
            'pet.lastDecay': { $lt: oneHourAgo }
        })
            .select('jid lid pet')
            .lean()

        if (!users.length) {
            return
        }

        let processed = 0
        for (const user of users) {
            const result = await processPetDecay(user)
            if (result !== null) {
                processed++
            }
        }

        if (processed > 0) {
            console.log(`Ran on ${processed} / ${users.length} stale pets`)
        }
    } catch (err) {
        console.error('[runGlobalPetDecay ERROR]', err)
    }
}

export const findUser = async (id, fields = null) => {
    try {
        const filter = [{ jid: id }, { lid: id }]

        if (fields) {
            const select = `jid lid ${fields}`
            // Run both index lookups in parallel, take whichever returns first
            const [byJid, byLid] = await Promise.all([
                User.findOne({ jid: id }).select(select).lean(),
                User.findOne({ lid: id }).select(select).lean()
            ])
            return byJid ?? byLid ?? null
        }

        // ── Full fetch (no fields specified) ──────────────────────────────────
        const [byJid, byLid] = await Promise.all([User.findOne({ jid: id }).lean(), User.findOne({ lid: id }).lean()])
        return byJid ?? byLid ?? null
    } catch (e) {
        console.error('[DB ERROR: findUser]', e)
        return null
    }
}

export const isRegUser = async (id) => {
    try {
        const user = await User.findOne({ $or: [{ jid: id }, { lid: id }] })
            .select('_id')
            .lean()

        return Boolean(user)
    } catch (e) {
        console.error('Error in isRegUser:', e)
        return false
    }
}

/**
 * Efficiently fetches only the user's name without loading
 * their entire profile, cards, or inventory.
 */
export const getUserName = async (id) => {
    try {
        // 1. Fetch ONLY the name field for the specific user
        const user = await User.findOne({ $or: [{ jid: id }, { lid: id }] })
            .select('name')
            .lean()

        // 2. Return the name if found, otherwise return null
        return user ? user.name : null
    } catch (err) {
        console.error('[DATABASE ERROR: getUserName]', err)
        return null
    }
}

export const setUser = async ({ age, name, gender, jid, lid }) => {
    try {
        if (await isRegUser(jid)) {
            return false
        }

        const newUser = new User({
            lid,
            jid,
            name,
            age,
            gender,
            slug: { isMarried: false, data: {} },
            wallet: 0,
            bank: { id: null, capacity: 10000, value: 0 },
            cards: { collection: [], deck: [] },
            inventory: [],
            relationship: { status: false, name: '', lid: '', jid: '', date: 0 },
            ban: { status: false, reason: '', dateOfLogin: 0 }
        })

        await newUser.save()
        return true
    } catch (e) {
        console.error('Error setting user:', e)
        return false
    }
}

export const editUser = async (jid, updates) => {
    try {
        const result = await User.updateOne({ $or: [{ jid }, { lid: jid }] }, { $set: updates })

        return result.matchedCount > 0
    } catch (e) {
        console.error('[DB ERROR: editUser]', e)
        return false
    }
}

export const getLeaderboardPosition = async (jid) => {
    try {
        // 1. Fetch ONLY the exp field for the specific user
        const user = await User.findOne({ $or: [{ jid }, { lid: jid }] })
            .select('exp')
            .lean()

        if (!user) {
            return 0
        }

        // 2. Count how many users have more exp than this user
        // Using an index on 'exp' makes this count operation extremely fast
        const higherRankedCount = await User.countDocuments({
            exp: { $gt: user.exp || 0 }
        })

        return higherRankedCount + 1
    } catch (err) {
        console.error('[DATABASE ERROR: getLeaderboardPosition]', err)
        return 0
    }
}

export const addUserExp = async (id, exp) => {
    const result = await User.updateOne({ $or: [{ jid: id }, { lid: id }] }, { $inc: { exp: exp } })
    return result.modifiedCount > 0
}

export const addToWallet = async (jid, amount) => {
    if (amount <= 0) {
        return false
    }
    const result = await User.updateOne({ $or: [{ jid: jid }, { lid: jid }] }, { $inc: { wallet: amount } })
    return result.modifiedCount > 0
}

export const removeFromWallet = async (jid, amount) => {
    try {
        if (!amount || amount <= 0) {
            return false
        }

        /**
         * Atomic Guard:
         * We only update if 'wallet' is greater than or equal to the amount.
         * This prevents the balance from ever going negative (Race Condition Protection).
         */
        const result = await User.updateOne(
            {
                $or: [{ jid }, { lid: jid }],
                wallet: { $gte: amount }
            },
            { $inc: { wallet: -amount } }
        )

        // Returns true if the wallet was successfully reduced
        return result.modifiedCount > 0
    } catch (e) {
        console.error('[DB ERROR: removeFromWallet]', e)
        return false
    }
}

export const addToBank = async (jid, amount) => {
    try {
        if (!amount || amount <= 0) {
            return false
        }

        /**
         * Atomic Capacity Guard:
         * We use an aggregation expression ($expr) within the filter to check:
         * (Current Value + New Amount) <= Capacity
         * This happens entirely on the Database side.
         */
        const result = await User.updateOne(
            {
                $or: [{ jid }, { lid: jid }],
                $expr: {
                    $lte: [{ $add: ['$bank.value', amount] }, '$bank.capacity']
                }
            },
            { $inc: { 'bank.value': amount } }
        )

        // Returns true if the deposit was successful and within capacity
        return result.modifiedCount > 0
    } catch (e) {
        console.error('[DB ERROR: addToBank]', e)
        return false
    }
}

export const removeFromBank = async (jid, amount) => {
    try {
        if (!amount || amount <= 0) {
            return false
        }

        /**
         * Atomic Guard:
         * We only update if 'bank.value' is greater than or equal to the amount.
         * This prevents the balance from ever going negative (Race Condition Protection).
         */
        const result = await User.updateOne(
            {
                $or: [{ jid }, { lid: jid }],
                'bank.value': { $gte: amount }
            },
            { $inc: { 'bank.value': -amount } }
        )

        // Returns true if the balance was successfully reduced
        return result.modifiedCount > 0
    } catch (e) {
        console.error('[DB ERROR: removeFromBank]', e)
        return false
    }
}

export const addCardToCollection = async (jid, card) => {
    if (!card?.id) {
        return false
    }

    const result = await User.updateOne({ $or: [{ jid: jid }, { lid: jid }] }, { $push: { 'cards.collection': card } })

    return result.modifiedCount > 0
}

export const removeCardFromCollection = async (jid, index) => {
    try {
        // Step 1: read the card at the target index
        const user = await User.findOne(
            { $or: [{ jid }, { lid: jid }] },
            { 'cards.collection': { $slice: [index, 1] }, jid: 1 }
        ).lean()

        const card = user?.cards?.collection?.[0]
        if (!card || Object.keys(card).length === 0) {
            return null
        }

        // Step 2: atomic single-operation removal matched by card _id.
        // If a concurrent call already removed this card, modifiedCount === 0
        // and we return null — preventing double extraction.
        const result = await User.updateOne(
            {
                jid: user.jid,
                [`cards.collection.${index}._id`]: card._id
            },
            { $pull: { 'cards.collection': { _id: card._id } } }
        )

        if (result.modifiedCount === 0) {
            return null
        }

        return card
    } catch (e) {
        console.error('[DB ERROR: removeCardFromCollection]', e)
        return null
    }
}

export const removeCardFromDeck = async (jid, index) => {
    try {
        // Step 1: read the card at the target index
        const user = await User.findOne(
            { $or: [{ jid }, { lid: jid }] },
            { 'cards.deck': { $slice: [index, 1] }, jid: 1 }
        ).lean()

        const card = user?.cards?.deck?.[0]
        if (!card || Object.keys(card).length === 0) {
            return null
        }

        // Step 2: atomic single-operation removal.
        // We match on the card's own _id so a concurrent call that already
        // removed this card finds no matching element and modifies nothing —
        // preventing the same card from being extracted twice.
        const cardId = card._id?.toString()
        const result = await User.updateOne(
            {
                jid: user.jid,
                // Ensure the element at `index` is still the same card we read
                [`cards.deck.${index}._id`]: card._id
            },
            { $pull: { 'cards.deck': { _id: card._id } } }
        )

        // If nothing was modified, the card was already removed by a concurrent call
        if (result.modifiedCount === 0) {
            return null
        }

        return card
    } catch (e) {
        console.error('[DB ERROR: removeCardFromDeck]', e)
        return null
    }
}
/**
 * Efficiently retrieves a specific card by its combined index.
 * Index 1-12 = Deck, 13+ = Collection.
 */
export const getCard = async (jid, index) => {
    try {
        // 1. Fetch ONLY the deck and collection arrays
        const user = await User.findOne({ $or: [{ jid }, { lid: jid }] })
            .select('cards.deck cards.collection')
            .lean()

        if (!user || !user.cards) return null

        // 2. Combine arrays locally
        // [Image of array concatenation logic]
        const deck = user.cards.deck || []
        const collection = user.cards.collection || []
        const combined = [...deck, ...collection]

        // 3. Return the card at the specific index
        return combined[index] || null
    } catch (e) {
        console.error('[DB ERROR: getCard]', e)
        return null
    }
}

const clamp = (n) => Math.max(0, Math.min(PET_LIMIT, n))

const isSleeping = (pet) => {
    if (!pet?.sleepUntil) {
        return false
    }
    return Date.now() < pet.sleepUntil
}

const checkLevelUp = (pet) => {
    const xpNeeded = pet.stats.level * 100
    if (pet.stats.xp >= xpNeeded) {
        pet.stats.xp -= xpNeeded
        pet.stats.level += 1
        return true
    }
    return false
}

/* ---------- UPDATED FUNCTIONS WITH RANDOMIZATION ---------- */

export const feedPet = async (jid) => {
    try {
        // 1. Fetch only necessary fields (Pet, Wallet, JID/LID)
        const user = await User.findOne({ $or: [{ jid }, { lid: jid }] })
            .select('pet wallet jid lid')
            .lean()

        if (!user?.pet) {
            return { ok: false, error: 'NO_PET' }
        }

        const pet = user.pet
        if (!pet.isAlive) {
            return { ok: false, error: 'PET_DEAD' }
        }
        if (isSleeping(pet)) {
            return { ok: false, error: 'PET_SLEEPING' }
        }
        if (pet.stats.hunger >= 100) {
            return { ok: false, error: 'PET_FULL' }
        }

        // Cooldown Check
        const timePassed = Date.now() - (pet.lastFed || 0)
        if (timePassed < PET_COOLDOWN.feed) {
            const remaining = Math.ceil((PET_COOLDOWN.feed - timePassed) / 60000)
            return { ok: false, error: 'FEED_COOLDOWN', remaining }
        }

        // Wallet Check
        if ((user.wallet || 0) < PET_COST.feed) {
            return { ok: false, error: 'INSUFFICIENT_FUNDS' }
        }

        // 2. Logic: Randomized gains
        const hungerGain = getRandomInt(1, PET_GAIN.hungerFeed)
        const happinessGain = getRandomInt(1, 5)

        const updatedPet = {
            ...pet,
            lastFed: Date.now(),
            mood: 'happy',
            stats: {
                ...pet.stats,
                hunger: clamp(pet.stats.hunger + hungerGain),
                happiness: clamp(pet.stats.happiness + happinessGain)
            }
        }

        // 3. Atomic Update: Deduct money and update pet simultaneously
        //
        const result = await User.updateOne(
            { jid: user.jid, wallet: { $gte: PET_COST.feed } },
            {
                $inc: { wallet: -PET_COST.feed },
                $set: { pet: updatedPet }
            }
        )

        if (result.modifiedCount === 0) {
            return { ok: false, error: 'TRANSACTION_FAILED' }
        }

        return { ok: true, pet: updatedPet, hungerGain }
    } catch (e) {
        console.error('[DB ERROR: feedPet]', e)
        return { ok: false, error: 'INTERNAL_ERROR' }
    }
}

export const playWithPet = async (jid) => {
    try {
        // 1. Fetch ONLY the necessary fields for validation and calculation
        const user = await User.findOne({ $or: [{ jid }, { lid: jid }] })
            .select('pet wallet name jid lid')
            .lean()

        if (!user?.pet) {
            return { ok: false, error: 'NO_PET' }
        }

        const pet = user.pet
        if (!pet.isAlive) {
            return { ok: false, error: 'PET_DEAD' }
        }
        if (isSleeping(pet)) {
            return { ok: false, error: 'PET_SLEEPING' }
        }
        if (pet.stats.energy < 20) {
            return { ok: false, error: 'PET_TOO_TIRED' }
        }

        // Cooldown Check
        if (Date.now() - (pet.lastPlay || 0) < PET_COOLDOWN.play) {
            return { ok: false, error: 'PLAY_COOLDOWN' }
        }

        // Wallet Check
        if ((user.wallet || 0) < PET_COST.play) {
            return { ok: false, error: 'INSUFFICIENT_FUNDS' }
        }

        // 2. Logic: Randomized gameplay stats
        const happyGain = getRandomInt(1, PET_GAIN.happinessPlay)
        const hungerLoss = getRandomInt(1, PET_GAIN.hungerPlay)
        const energyCost = getRandomInt(1, PET_GAIN.energyPlayCost)
        const xpGain = getRandomInt(1, PET_GAIN.xpPlay)

        pet.stats.happiness = clamp(pet.stats.happiness + happyGain)
        pet.stats.hunger = clamp(pet.stats.hunger - hungerLoss)
        pet.stats.energy = clamp(pet.stats.energy - energyCost)
        pet.stats.xp += xpGain

        const leveledUp = checkLevelUp(pet)

        // 3. Atomic Update: Update wallet and pet in one single database call
        const result = await User.updateOne(
            { jid: user.jid, wallet: { $gte: PET_COST.play } }, // Security: double check wallet
            {
                $inc: { wallet: -PET_COST.play },
                $set: {
                    pet: {
                        ...pet,
                        lastPlay: Date.now(),
                        mood: 'playful'
                    }
                }
            }
        )

        if (result.modifiedCount === 0) {
            return { ok: false, error: 'TRANSACTION_FAILED' }
        }

        return { ok: true, pet, leveledUp, xpGain }
    } catch (e) {
        console.error('[DB ERROR: playWithPet]', e)
        return { ok: false, error: 'INTERNAL_ERROR' }
    }
}

export const sleepPet = async (jid) => {
    try {
        const user = await User.findOne({ $or: [{ jid }, { lid: jid }] })
            .select('pet jid lid')
            .lean()

        if (!user?.pet) {
            return { ok: false, error: 'NO_PET' }
        }

        const pet = user.pet

        if (!pet.isAlive) {
            return { ok: false, error: 'PET_DEAD' }
        }

        if (isSleeping(pet)) {
            return { ok: false, error: 'ALREADY_SLEEPING' }
        }

        // FIX: enforce 2h cooldown between sleeps
        const lastSleep = pet.lastSleep || 0
        if (Date.now() - lastSleep < PET_COOLDOWN.sleep) {
            const remaining = Math.ceil((PET_COOLDOWN.sleep - (Date.now() - lastSleep)) / 60000)
            return { ok: false, error: 'SLEEP_COOLDOWN', remaining }
        }

        const energyGain = getRandomInt(1, PET_GAIN.energySleep)
        const updates = {
            'pet.sleepUntil': Date.now() + 20 * 60 * 1000,
            'pet.lastSleep': Date.now(),
            'pet.mood': 'sleeping',
            'pet.stats.energy': clamp(pet.stats.energy + energyGain)
        }

        const result = await User.updateOne({ jid: user.jid }, { $set: updates })

        if (result.modifiedCount === 0) {
            return { ok: false, error: 'UPDATE_FAILED' }
        }

        return {
            ok: true,
            pet: { ...pet, 'stats.energy': updates['pet.stats.energy'], sleepUntil: updates['pet.sleepUntil'] },
            energyGain
        }
    } catch (e) {
        console.error('[DB ERROR: sleepPet]', e)
        return { ok: false, error: 'INTERNAL_ERROR' }
    }
}

export const addCardToDeck = async (jid, card) => {
    if (!card?.id) {
        return false
    }

    const DECK_LIMIT = 12

    const result = await User.updateOne(
        {
            $or: [{ jid }, { lid: jid }],
            $expr: { $lt: [{ $size: { $ifNull: ['$cards.deck', []] } }, DECK_LIMIT] }
        },
        { $push: { 'cards.deck': card } }
    )

    return result.modifiedCount > 0
}

export const removeCodeFromInventory = async (jid, itemName) => {
    const result = await User.updateOne({ $or: [{ jid }, { lid: jid }] }, { $pull: { inventory: { name: itemName } } })
    return result.modifiedCount > 0
}

// GET CODES BY TYPE
export const getCodesByType = async (type) => {
    return await Code.find({ type: type.toLowerCase() })
}

// GET USERS BY GENDER
export const getUsersByGender = async (gender) => {
    return await User.find({ gender: gender.toLowerCase() })
}

export const getUserByRfCode = async (code) => {
    try {
        if (!code) return null
        const user = await User.findOne({
            rfcode: code,
            'ban.status': { $ne: true } // FIX 2: correct ban field path
        }).lean()
        return user
    } catch (err) {
        console.error('[DATABASE ERROR: getUserByRfCode]', err)
        return null
    }
}

export const getRfEnabledUsers = async ({ gender, excludeId }) => {
    try {
        const query = {
            $or: [{ jid: { $ne: excludeId } }, { lid: { $ne: excludeId } }],
            gender: gender,
            rf: true, // FIX 1: correct field name
            'ban.status': { $ne: true } // FIX 2: correct ban field path
        }
        const users = await User.find(query).select('name jid lid age gender rfcode').lean()
        return users || []
    } catch (err) {
        console.error('[DATABASE ERROR: getRfEnabledUsers]', err)
        return []
    }
}

export const decreaseBankCapacity = async (jid, amount) => {
    try {
        if (!amount || amount <= 0) {
            return false
        }

        /**
         * We update only if:
         * 1. The user exists.
         * 2. The current capacity minus the amount is still >= 10,000.
         * This prevents the capacity from ever dropping below the floor.
         */
        const result = await User.updateOne(
            {
                $or: [{ jid }, { lid: jid }],
                'bank.capacity': { $gte: 10000 + amount }
            },
            { $inc: { 'bank.capacity': -amount } }
        )

        // If the above condition failed (meaning capacity would go below 10k),
        // we manually force it to 10,000 to ensure consistency.
        if (result.matchedCount === 0) {
            await User.updateOne({ $or: [{ jid }, { lid: jid }] }, { $set: { 'bank.capacity': 10000 } })
            return true
        }

        return result.modifiedCount > 0
    } catch (e) {
        console.error('[DB ERROR: decreaseBankCapacity]', e)
        return false
    }
}
// BANK CAPACITY MANAGEMENT
export const increaseBankCapacity = async (jid, amount) => {
    if (amount <= 0) {
        return false
    }
    const result = await User.updateOne({ $or: [{ jid }, { lid: jid }] }, { $inc: { 'bank.capacity': amount } })
    return result.modifiedCount > 0
}

// CHECK CODE IN INVENTORY
export const hasCodeInInventory = async (jid, name, type = 'REDEEMCODE') => {
    const user = await User.findOne({
        $or: [{ jid }, { lid: jid }],
        inventory: { $elemMatch: { name: new RegExp(`^${name}$`, 'i'), type: type.toUpperCase() } }
    })
    return Boolean(user)
}

export const addItemToInventory = async (jid, item) => {
    try {
        if (!item?.name) return false

        const now = new Date()
        const isTimePotion = item.type?.toUpperCase() === 'POTION' && item.usage === 'TIMEPERIOD'

        if (isTimePotion) {
            // 1. Try to find and update an existing potion in one go
            const addedDuration = item.duration * 24 * 60 * 60 * 1000

            // We fetch only the specific matching item to calculate the new expiry
            const user = await User.findOne(
                { $or: [{ jid }, { lid: jid }], 'inventory.name': item.name },
                { 'inventory.$': 1, jid: 1 }
            ).lean()

            if (user?.inventory?.[0]) {
                const existing = user.inventory[0]
                const currentExpiry = new Date(existing.duration) > now ? new Date(existing.duration) : now
                const newExpiry = new Date(currentExpiry.getTime() + addedDuration)

                const res = await User.updateOne(
                    { jid: user.jid, 'inventory.name': item.name },
                    { $set: { 'inventory.$.duration': newExpiry, 'inventory.$.purchasedAt': now } }
                )
                return res.modifiedCount > 0
            }
        }

        // 2. Default logic: Prepare and push a new item
        const newItem = { ...item, purchasedAt: now }
        if (item.duration && typeof item.duration === 'number') {
            newItem.duration = new Date(now.getTime() + item.duration * 24 * 60 * 60 * 1000)
        }

        const result = await User.updateOne({ $or: [{ jid }, { lid: jid }] }, { $push: { inventory: newItem } })
        return result.modifiedCount > 0
    } catch (e) {
        console.error('[DB ERROR: addItemToInventory]', e)
        return false
    }
}

export const isPotionValid = async (jid, itemName) => {
    try {
        // 1. Fetch ONLY the specific inventory item using $elemMatch
        const user = await User.findOne(
            { $or: [{ jid }, { lid: jid }], 'inventory.name': itemName },
            { 'inventory.$': 1, jid: 1 } // Only return the matched item
        ).lean()

        // 2. If user or item doesn't exist, return false
        const item = user?.inventory?.[0]
        if (!item || item.type !== 'POTION') {
            return false
        }

        const now = new Date()

        // 3. Check for expiration
        if (item.duration && new Date(item.duration) < now) {
            // Cleanup expired potion directly in DB without fetching full array
            await User.updateOne({ jid: user.jid }, { $pull: { inventory: { name: itemName } } })
            return false
        }

        return true
    } catch (e) {
        console.error('[DB ERROR: isPotionValid]', e)
        return false
    }
}

export const getActivePotionItems = async (jid) => {
    try {
        // 1. Fetch ONLY the inventory and the user's primary JID/LID
        const user = await User.findOne({ $or: [{ jid }, { lid: jid }] })
            .select('inventory jid lid')
            .lean()

        if (!user || !user.inventory) {
            return []
        }

        const now = new Date()

        // 2. Filter the items in memory
        const validItems = user.inventory.filter((item) => {
            if (item.type === 'POTION' && item.duration) {
                return new Date(item.duration) > now
            }
            return true
        })

        // 3. Update the DB only if something was actually removed (expired)
        if (validItems.length !== user.inventory.length) {
            await User.updateOne({ _id: user._id }, { $set: { inventory: validItems } })
        }

        return validItems
    } catch (e) {
        console.error('[DB ERROR: getActivePotionItems]', e)
        return []
    }
}
