import { plugin } from '../../utils/plugin.js'
// Updated to your new database path
import { findGroup, unlockGroupFeature } from '../../database/db.js'
import { GROUP_FEATURE_STORE, getGroupLevel } from '../../functions/stats.js'

plugin(
    {
        name: 'unlockfeature',
        aliases: ['buyfeature', 'unlockfeat', 'unlock'],
        isGroup: true,
        isAdmin: true,
        category: 'group',
        description: {
            content: 'Unlock a group feature using group funds.',
            usage: '<index|feature_key> <times>',
            example: '2 1'
        }
    },
    async (_, M, { args }) => {
        try {
            const input = args[0]
            let times = parseInt(args[1] || '1')

            if (!input) {
                return M.reply(
                    `❌ Please provide a feature index or key.\n\nExample: ${global.config.prefix}unlockfeature 2 1`
                )
            }

            if (isNaN(times) || times <= 0) {
                return M.reply('❌ Please provide a valid number of periods (1, 2, 3...).')
            }

            // 1. Await Group Data from MongoDB
            const group = await findGroup(M.from)

            if (!group.mmo) {
                return M.reply('❌ MMO mode is currently *disabled* in this group.')
            }

            // 2. Filter available features based on Level and Ownership
            const { level } = getGroupLevel(group.exp)
            const ownedKeys = new Set((group.features || []).map((f) => f.key))

            const available = GROUP_FEATURE_STORE.filter((f) => level >= f.minLevel && !ownedKeys.has(f.key)).sort(
                (a, b) => a.minLevel - b.minLevel || a.price - b.price
            )

            if (!available.length && !isNaN(Number(input))) {
                return M.reply('ℹ️ No unlockable features available at your current level.')
            }

            let feature

            if (!isNaN(Number(input))) {
                const index = Number(input) - 1
                feature = available[index]

                if (!feature) {
                    return M.reply('❌ Invalid feature index.')
                }
            } else {
                // Search by key (case-insensitive)
                feature = GROUP_FEATURE_STORE.find((f) => f.key === input.toLowerCase())

                if (!feature) {
                    return M.reply('❌ That feature does not exist in the store.')
                }
                if (ownedKeys.has(feature.key)) {
                    return M.reply('⚠️ This feature is already unlocked.')
                }
                if (level < feature.minLevel) {
                    return M.reply(`❌ Group level ${feature.minLevel} required.`)
                }
            }

            // 3. Await the DB Transaction
            // This function should deduct funds and push the feature to the array
            const result = await unlockGroupFeature(M.from, feature, times)

            if (!result.ok) {
                switch (result.error) {
                    case 'INSUFFICIENT_FUNDS':
                        return M.reply(
                            `❌ Insufficient group funds. Required: *₹${(feature.price * times).toLocaleString()}*`
                        )
                    case 'ALREADY_OWNED':
                        return M.reply('⚠️ This feature is already unlocked.')
                    case 'LEVEL_TOO_LOW':
                        return M.reply('❌ Group level too low.')
                    default:
                        return M.reply('❌ Failed to unlock feature. Please try again.')
                }
            }

            // 4. Success Response
            const totalCost = feature.price * times
            const durationText = feature.duration ? `${feature.duration * times} month(s)` : 'Permanent'

            return M.reply(
                `✅ *FEATURE UNLOCKED*\n\n` +
                    `🧩 Feature: *${feature.name}*\n` +
                    `💰 Total Cost: *₹${totalCost.toLocaleString()}*\n` +
                    `⏳ Duration: *${durationText}*\n\n` +
                    `ℹ️ Feature is currently *paused*.\n` +
                    `Use *${global.config.prefix}active ${feature.key}* to start the clock.`
            )
        } catch (err) {
            console.error('[UNLOCK FEATURE ERROR]', err)
            return M.reply('❌ An error occurred while processing the purchase.')
        }
    }
)
