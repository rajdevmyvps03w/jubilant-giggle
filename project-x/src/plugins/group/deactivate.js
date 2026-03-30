import { plugin } from '../../utils/plugin.js'
import { findGroup, pauseGroupFeature } from '../../database/db.js'
import { GROUP_FEATURE_STORE } from '../../functions/stats.js'

plugin(
    {
        name: 'deactivatefeature',
        aliases: ['pausefeature', 'disablefeature', 'deactivate', 'dact'],
        isGroup: true,
        isAdmin: true,
        category: 'group',
        description: {
            content: 'Pause an active group feature (time will not burn).',
            usage: '<index | feature_key>',
            example: '2'
        }
    },
    async (_, M, { args }) => {
        try {
            if (!args[0]) {
                return M.reply(
                    `❌ Please provide a feature index or key.\n\nExample: ${global.config.prefix}activatefeature 2`
                )
            }

            const group = await findGroup(M.from)

            // 2. Sort the features as per your logic
            // 1. Prepare data once
            const sortedStore = GROUP_FEATURE_STORE.slice().sort((a, b) => a.minLevel - b.minLevel || a.price - b.price)

            const ownedFeatures = group.features || []
            const ownedKeys = new Set(ownedFeatures.map((f) => f.key))

            // 2. Parse input and find the target feature in the store
            const arg = args[0]?.trim().toLowerCase()
            const index = parseInt(arg)

            const storeFeature = Number.isInteger(index)
                ? sortedStore[index - 1]
                : sortedStore.find((f) => f.key === arg)

            // 3. Validation Checks
            if (!storeFeature) {
                const errorMsg = Number.isInteger(index)
                    ? `❌ Invalid feature index. Use *${global.config.prefix}groupfeatures* to view available options.`
                    : `❌ Feature key "${arg}" not found.`
                return M.reply(errorMsg)
            }

            if (!ownedKeys.has(storeFeature.key)) {
                return M.reply(`❌ Your group does not currently own the *${storeFeature.name}* feature.`)
            }

            // 4. Assign the actual owned feature object
            const feature = ownedFeatures.find((f) => f.key === storeFeature.key)
            if (feature.active === false) {
                return M.reply('⚠️ This feature is already *inactive*.')
            }

            // 5. Await the pause logic (Calculates timeLeft and clears expiresAt in DB)
            const paused = await pauseGroupFeature(M.from, feature.key)

            if (paused) {
                return M.reply(`⏸️ *Feature paused:* \`${feature.name}\`\n⏳ Time has been preserved.`)
            } else {
                return M.reply('❌ Failed to pause the feature.')
            }
        } catch (err) {
            console.error('[DEACTIVATE FEATURE ERROR]', err)
            return M.reply('❌ An error occurred while pausing the feature.')
        }
    }
)
