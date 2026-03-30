import { plugin } from '../../utils/plugin.js'
// Updated to your new database path
import { findGroup, resumeGroupFeature } from '../../database/db.js'
import { GROUP_FEATURE_STORE } from '../../functions/stats.js'

plugin(
    {
        name: 'activatefeature',
        aliases: ['enablefeature', 'playfeature', 'activate', 'act'],
        isGroup: true,
        isAdmin: true,
        category: 'group',
        description: {
            content: 'Activate an unlocked group feature.',
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

            // 3. Check for MMO status
            if (!group.mmo && !['moderation_tools', 'event_wish', 'card_spawn', 'eco_game'].includes(feature.key)) {
                return M.reply(
                    `❌ MMO mode is disabled in this group.\nUse *${global.config.prefix}mmo on* to enable MMO.`
                )
            }

            // 4. Check if already active
            if (feature.active === true) {
                return M.reply('⚠️ This feature is already *active*.')
            }

            // 5. Await the resume function to update MongoDB
            const activated = await resumeGroupFeature(M.from, feature.key)

            if (activated) {
                return M.reply(`▶️ *Feature activated:* \`${feature.name}\``)
            } else {
                return M.reply('❌ Failed to activate feature. It may have expired or is not owned.')
            }
        } catch (err) {
            console.error('[ACTIVATE FEATURE ERROR]', err)
            return M.reply('❌ An error occurred while activating the feature.')
        }
    }
)
