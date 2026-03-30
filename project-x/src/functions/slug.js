// src/plugins/weeb/_slug.js
// Shared constants and helpers used by all slug interaction plugins.

export const MAX_BOND_LEVEL = 10
export const LOVE_XP_PER_LEVEL = 100

export const BOND_TITLES = [
    'Strangers', // 0  — kiss available
    'Acquaintances', // 1  — cuddle unlocks
    'Friends', // 2  — rival unlocks
    'Close Friends', // 3  — date unlocks
    'Crushes', // 4
    'Dating', // 5  — mating unlocks
    'Lovers', // 6
    'Devoted', // 7  — intercourse unlocks
    'Soulmates', // 8
    'Eternally Bound', // 9
    '💎 One True Pair' // 10
]

export const ACTIONS = {
    kiss: {
        minLevel: 0,
        cooldown: 1 * 60 * 60 * 1000,
        loveGain: 5
    },
    cuddle: {
        minLevel: 1,
        cooldown: 2 * 60 * 60 * 1000,
        loveGain: 10
    },
    rival: {
        minLevel: 2,
        cooldown: 8 * 60 * 60 * 1000,
        loveGain: 15
    },
    date: {
        minLevel: 3,
        cooldown: 6 * 60 * 60 * 1000,
        loveGain: 20
    },
    mating: {
        minLevel: 5,
        cooldown: 12 * 60 * 60 * 1000,
        loveGain: 35
    },
    intercourse: {
        minLevel: 7,
        cooldown: 24 * 60 * 60 * 1000,
        loveGain: 50
    }
}

export const fmtMs = (ms) => {
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    if (h > 0 && m > 0) return `${h}h ${m}m`
    if (h > 0) return `${h}h`
    return `${m}m`
}

export const getSlug = (user) => {
    if (!user?.slug?.isMarried || !user?.slug?.data?.name) return null
    return user.slug
}

export const uid = (user) => user.jid || String(user._id)

export const checkLevel = (slug, action) => {
    const cfg = ACTIONS[action]
    const bondLevel = slug.data.bondLevel || 0
    if (bondLevel < cfg.minLevel) {
        return {
            blocked: true,
            msg:
                `❌ Bond level too low for this action.\n\n` +
                `🎀 Required: *${BOND_TITLES[cfg.minLevel]}* (Level ${cfg.minLevel})\n` +
                `🎀 Yours: *${BOND_TITLES[bondLevel]}* (Level ${bondLevel})\n\n` +
                `Keep spending time together to raise your bond level.`
        }
    }
    return { blocked: false }
}

export const checkCooldown = (slug, action) => {
    const last = slug.data[`last_${action}`] || 0
    const remaining = ACTIONS[action].cooldown - (Date.now() - last)
    return remaining > 0 ? remaining : 0
}

export const applyAction = async (userId, slug, action, editUser) => {
    const currentXp = slug.data.loveXp || 0
    const currentLevel = slug.data.bondLevel || 0
    const newXp = currentXp + ACTIONS[action].loveGain
    const newLevel = Math.min(Math.floor(newXp / LOVE_XP_PER_LEVEL), MAX_BOND_LEVEL)
    const leveledUp = newLevel > currentLevel

    const updatedData = {
        ...slug.data,
        loveXp: newXp,
        bondLevel: newLevel,
        [`last_${action}`]: Date.now()
    }

    await editUser(userId, { slug: { isMarried: true, data: updatedData } })
    return { newXp, newLevel, leveledUp, prevLevel: currentLevel }
}

export const levelUpSuffix = (leveledUp, newLevel) => {
    if (!leveledUp) return ''
    const unlocks =
        newLevel === 1
            ? '\n🔓 *Unlocked:* Cuddle (-cuddle)'
            : newLevel === 2
              ? '\n🔓 *Unlocked:* Rival Challenge (-slugrival)'
              : newLevel === 3
                ? '\n🔓 *Unlocked:* Date (-date)'
                : newLevel === 5
                  ? '\n🔓 *Unlocked:* Mating Drive (-mating)'
                  : newLevel === 7
                    ? '\n🔓 *Unlocked:* Intimate Moments (-intercourse)'
                    : ''
    return `\n\n🎉 *Bond Level Up!* You are now *${BOND_TITLES[newLevel]}* (Level ${newLevel})!${unlocks}`
}
