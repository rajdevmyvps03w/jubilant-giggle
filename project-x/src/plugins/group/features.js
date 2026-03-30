import { plugin } from '../../utils/plugin.js'
import { findGroup, isGroupFeatureActive } from '../../database/db.js'
import { GROUP_FEATURE_STORE, getGroupLevel } from '../../functions/stats.js'

plugin(
    {
        name: 'groupfeatures',
        aliases: ['features', 'gfeatures'],
        isGroup: true,
        category: 'group',
        description: {
            content: 'View all group features, their status, and remaining time.'
        }
    },
    async (_, M) => {
        try {
            // 1. Fetch group data (Awaited)
            const group = await findGroup(M.from)
            const { level } = getGroupLevel(group.exp)

            /* ---------- BUILD FULL FEATURE LIST ---------- */
            const defaults = group.features
                .filter((f) => !GROUP_FEATURE_STORE.some((s) => s.key === f.key))
                .sort((a, b) => (a.minLevel || 0) - (b.minLevel || 0))

            const store = [...GROUP_FEATURE_STORE].sort((a, b) => a.minLevel - b.minLevel || a.price - b.price)
            const fullList = [...defaults, ...store]

            /* ---------- MESSAGE HEADER ---------- */
            let message = `🏪 *Group Features Overview*\n\n`
            message += `🏆 Group Level: *${level}*\n`
            message += `💰 Group Funds: *₹${(group.funds || 0).toLocaleString()}*\n\n`

            /* ---------- RENDER FEATURES WITH INDEX ---------- */
            for (let i = 0; i < fullList.length; i++) {
                const feature = fullList[i]
                const owned = group.features?.find((f) => f.key === feature.key)

                // 2. isGroupFeatureActive triggers cleanupExpiredFeatures (Awaited)
                const isActive = await isGroupFeatureActive(M.from, feature.key)

                message += `*${i + 1}.* 🔹 *${feature.name}*\n`
                message += `   🆔 Key: *${feature.key}*\n`

                if (!owned) {
                    message += `   🔒 Status: *Locked*\n`
                    message += `   🎯 Required Level: *${feature.minLevel}*\n`
                    message += `   💸 Price: *₹${feature.price.toLocaleString()}*\n`
                } else {
                    message += `   🔓 Status: *Unlocked*\n`
                    message += `   ⚙️ State: *${isActive ? 'Active' : 'Paused'}*\n`

                    // Logic for Timed Features
                    if (owned.expiresAt || owned.timeLeft) {
                        const remainingMs = owned.active
                            ? new Date(owned.expiresAt).getTime() - Date.now()
                            : owned.timeLeft

                        if (remainingMs > 0) {
                            const totalMinutes = Math.floor(remainingMs / (60 * 1000))
                            const days = Math.floor(totalMinutes / (24 * 60))
                            const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
                            const mins = totalMinutes % 60

                            let timeStr = ''
                            if (days > 0) timeStr += `${days}d `
                            if (hours > 0) timeStr += `${hours}h `
                            timeStr += `${mins}m`

                            message += `   ⏳ ${owned.active ? 'Expires in' : 'Remaining'}: *${timeStr}*\n`
                        } else if (owned.active) {
                            message += `   ⛔ *Expired (Refreshing...)*\n`
                        }
                    } else {
                        message += `   ♾️ Duration: *Permanent*\n`
                    }
                }
                message += `   📝 ${feature.description}\n\n`
            }

            /* ---------- USAGE HELP ---------- */
            message += `ℹ️ *Commands:*\n`
            message += `• *${global.config.prefix}active <index|key>* — Activate feature\n`
            message += `• *${global.config.prefix}deactivate <index|key>* — Pause feature\n`

            return M.reply(message.trim())
        } catch (err) {
            console.error('[GROUP FEATURES ERROR]', err)
            return M.reply('❌ Error loading group features.')
        }
    }
)
