import { findGroup } from '../database/db.js'

export const ranks = {
    Warrior: 0,
    'Elite III': 1000,
    'Elite II': 2500,
    'Elite I': 5000,
    'Master IV': 8000,
    'Master III': 12000,
    'Master II': 17000,
    'Master I': 23000,
    'Grandmaster V': 30000,
    'Grandmaster IV': 38000,
    'Grandmaster III': 47000,
    'Grandmaster II': 57000,
    'Grandmaster I': 68000,
    'Epic V': 80000,
    'Epic IV': 93000,
    'Epic III': 107000,
    'Epic II': 122000,
    'Epic I': 138000,
    'Legend V': 155000,
    'Legend IV': 173000,
    'Legend III': 192000,
    'Legend II': 212000,
    'Legend I': 233000,
    Mythic: 255000,
    'Mythic Glory': 300000,
    Immortal: 400000,
    Eternal: 600000,
    Celestial: 900000,
    Divine: 1300000,
    Supreme: 1800000,
    Infinity: 2500000
}

export const getRank = (exp) => {
    const entries = Object.entries(ranks)
    const [name, xp] = entries.reduce(
        ([curName, curXp], [rank, reqXp]) => (exp >= reqXp ? [rank, reqXp] : [curName, curXp]),
        ['Warrior', ranks['Warrior']]
    )
    return { name, exp: xp }
}

export const getNextRank = (exp) => {
    const entries = Object.entries(ranks)
    for (let i = 0; i < entries.length; i++) {
        const next = entries[i + 1]
        if (!next) return null // already at top rank
        if (exp < next[1]) {
            return {
                nextRank: next[0],
                xpToNext: next[1] - exp
            }
        }
    }
    return null
}

export const getLockedGroupFeatures = (group) => {
    const unlockable = getUnlockableGroupFeatures(group.level)
    const activeKeys = new Set((group.features || []).map((f) => f.key))
    return unlockable.filter((f) => !activeKeys.has(f))
}

export const getGroupLevel = (exp) => {
    let level = 0
    let need = 0

    while (true) {
        need = 500 * (level + 1) * (level + 1) + 200 * (level + 1)

        if (exp < need) break
        level++
    }

    return {
        level,
        nextLevelExp: need,
        currentExp: exp,
        remaining: need - exp
    }
}

export const getUnlockableGroupFeatures = (level) => {
    const unlockable = []

    for (const lvl of Object.keys(GROUP_FEATURES).map(Number)) {
        if (level >= lvl) {
            unlockable.push(...GROUP_FEATURES[lvl])
        }
    }

    return [...new Set(unlockable)]
}

export const GROUP_FEATURE_STORE = [
    // LEVEL 3 — Basic Tax
    {
        key: 'basic_tax',
        name: 'Basic Tax System',
        price: 15000, // fixed cost
        duration: 1, // in months
        minLevel: 3,
        description: 'Enables normal tax system for home members.'
    },

    // LEVEL 4 — Foreign Tax
    {
        key: 'foreign_tax',
        name: 'Foreign Member Tax',
        price: 25000,
        duration: 1,
        minLevel: 4,
        description: 'Allows taxing foreign members at custom rates.'
    },

    // LEVEL 6 — Dynamic Store Pricing
    {
        key: 'dynamic_store_pricing',
        name: 'Dynamic Store Pricing',
        price: 40000,
        duration: 1,
        minLevel: 6,
        description: 'Store prices change based on group wealth & users.'
    },

    // LEVEL 10 — Exclusive Card Spawn
    {
        key: 'exclusive_card_spawn',
        name: 'Exclusive Card Spawns',
        price: 60000,
        duration: 1,
        minLevel: 10,
        description: 'Unlocks exclusive rare cards for your group.'
    },

    // LEVEL 15 — Paid SetHome
    {
        key: 'paid_sethome',
        name: 'Paid SetHome',
        price: 80000,
        duration: 1,
        minLevel: 15,
        description: 'Users must pay credits to set this group as home.'
    },

    // LEVEL 20 — Lucky Users Boost
    {
        key: 'lucky_users',
        name: 'Lucky User Boost',
        price: 120000,
        duration: 1,
        minLevel: 20,
        description: 'Boosts win-rate of gamble/slots for group members.'
    },
    {
        key: 'moderation_tools',
        name: 'Moderation Tools',
        price: 0,
        duration: 19,
        minLevel: 0,
        description: 'Allows group moderators to mute/unmute users and anti link.'
    },

    {
        key: 'eco_game',
        name: 'Economy System',
        price: 0,
        active: false,
        minLevel: 0,
        description: 'Enables currency, betting, and group economy commands.'
    },
    {
        key: 'card_spawn',
        name: 'Card Spawning System',
        price: 0,
        duration: 19,
        minLevel: 0,
        description: 'Spawns card in a group chat.'
    },
    {
        key: 'event_wish',
        name: 'Event Wish System',
        price: 0,
        duration: 19,
        minLevel: 0,
        description: 'Enables group events user joining, leaving, etc..'
    }
]

export const checkGroupLevelUnlocks = async (id, oldLevel, newLevel) => {
    try {
        // Collect features whose minLevel falls in the range (oldLevel, newLevel]
        // These are the ones that just became available due to this level up
        const newlyUnlocked = GROUP_FEATURE_STORE.filter((f) => f.minLevel > oldLevel && f.minLevel <= newLevel).map(
            (f) => f.name
        )

        return newlyUnlocked
    } catch (e) {
        console.error('[STATS ERROR: checkGroupLevelUnlocks]', e)
        return []
    }
}
